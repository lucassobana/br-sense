# brsense-backend/app/core/security.py
import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.models.user import User
from sqlalchemy.orm import Session
from app.settings import settings # Assumindo que você tem configurações aqui

# Configurações (Idealmente mova para variáveis de ambiente)
KEYCLOAK_URL = settings.KEYCLOAK_URL
REALM = settings.KEYCLOAK_REALM
CLIENT_ID = settings.KEYCLOAK_CLIENT_ID
KEYCLOAK_ISSUER = f"{KEYCLOAK_URL}/realms/{REALM}"
JWKS_URL = f"{KEYCLOAK_ISSUER}/protocol/openid-connect/certs"
TOKEN_URL = f"{KEYCLOAK_ISSUER}/protocol/openid-connect/token"

# Define o esquema de segurança para o Swagger UI funcionar
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=TOKEN_URL
)

def get_current_user_token(token: str = Depends(oauth2_scheme)):
    """
    Valida o token JWT contra o JWKS do Keycloak.
    """
    try:
        # 1. Obter cabeçalho do token para saber qual chave (kid) foi usada
        unverified_header = jwt.get_unverified_header(token)
        
        # 2. Buscar as chaves públicas do Keycloak (JWKS)
        # Em produção, implemente cache para não chamar essa URL toda vez
        response = requests.get(JWKS_URL)
        jwks = response.json()
        
        rsa_key = {}
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
        
        if not rsa_key:
            raise HTTPException(status_code=401, detail="Chave pública não encontrada")

        # 3. Decodificar e validar o payload
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience="account", # O Keycloak geralmente coloca 'account' no aud padrão, ou o client_id
            issuer=KEYCLOAK_ISSUER,
            options={"verify_signature": True, "verify_aud": False} # Ajuste verify_aud conforme sua config de Mappers no Keycloak
        )
        
        return payload # Retorna os dados do usuário (sub, name, email, roles...)

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"Erro na validação: {e}")
        raise HTTPException(status_code=401, detail="Erro de autenticação")

# Função auxiliar para verificar roles (Ex: apenas ADMIN)
def verify_admin_role(token_data: dict = Depends(get_current_user_token)):
    roles = token_data.get("realm_access", {}).get("roles", [])
    if "admin" not in roles:
        raise HTTPException(status_code=403, detail="Acesso negado. Requer privilégios de administrador.")
    return token_data

def get_user_and_roles(db: Session, token_payload: dict) -> tuple[User, bool]:
    """
    Retorna o usuário local e flag de admin.
    Cria o usuário localmente se ele existir no Keycloak mas não no banco (Auto-Sync).
    """
    # 1. Extração de Roles e Dados do Token
    realm_access = token_payload.get("realm_access", {})
    roles = realm_access.get("roles", [])
    is_admin = "admin" in roles

    # Pega o login (preferred_username ou email)
    username = token_payload.get("preferred_username") or token_payload.get("email")
    name = token_payload.get("name") or username
    
    if not username:
        raise HTTPException(status_code=401, detail="Token inválido: Usuário não identificado")

    # 2. Busca no banco local
    user = db.query(User).filter(User.login == username).first()
    
    # 3. AUTO-PROVISIONING: Se não existir, cria agora!
    if not user:
        print(f"Usuário '{username}' novo detectado via Keycloak. Sincronizando...")
        try:
            # Define role inicial baseada no Token ou padrão
            local_role = "ADMIN" if is_admin else "FAZENDEIRO"
            
            new_user = User(
                name=name,
                login=username,
                password="KEYCLOAK_AUTH", # Senha dummy
                role=local_role 
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            user = new_user # Atualiza a variável para retornar o novo usuário
        except Exception as e:
            db.rollback()
            print(f"Erro ao criar usuário automático: {e}")
            raise HTTPException(status_code=500, detail="Erro ao sincronizar cadastro do usuário.")

    return user, is_admin