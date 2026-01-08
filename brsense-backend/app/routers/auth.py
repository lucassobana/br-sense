from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User # Vamos precisar criar este modelo abaixo
from pydantic import BaseModel
from app.services.keycloak_admin import create_keycloak_user
from app.core.security import get_current_user_token, get_user_and_roles
from typing import Optional
from app.settings import settings

router = APIRouter()

# Schemas locais para simplificar
class UserCreate(BaseModel):
    name: str
    login: str
    password: str
    role: str = "FAZENDEIRO"

class UserLogin(BaseModel):
    login: str
    password: str

@router.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Cria usuário no Keycloak E no banco local.
    """
    # 1. Cria no Keycloak
    try:
        keycloak_id = create_keycloak_user(
            username=user.login,
            email=user.login,
            password=user.password,
            role=user.role.lower()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro no Keycloak: {str(e)}")

    # 2. Cria no Banco Local (Para aparecer na lista imediatamente)
    # Verifica se já existe localmente para evitar erro de duplicidade
    local_user = db.query(User).filter(User.login == user.login).first()
    if not local_user:
        new_user = User(
            name=user.name,
            login=user.login,
            password="KEYCLOAK_MANAGED", # Não salvamos a senha real aqui
            role=user.role.upper()
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

    return {"msg": "Usuário criado com sucesso", "id": keycloak_id}

@router.post("/login")
def login_user(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.login == data.login).first()
    if not user or user.password != data.password:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    return {
        "status": "success",
        "user": {"id": user.id, "name": user.name, "role": user.role}
    }
    
@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_current_user_token)
):
    """
    Lista usuários. Apenas ADMINs podem acessar.
    Também sincroniza o Admin atual com o banco local.
    """
    
    # 1. O PULO DO GATO: Sincroniza o usuário atual (você) com o banco
    # Se você não existia no Postgres, vai ser criado agora.
    try:
        current_user, is_admin = get_user_and_roles(db, token_payload)
    except Exception as e:
        print(f"Erro ao sincronizar usuário: {e}")
        # Não travamos o erro aqui para tentar verificar as roles mesmo assim

    # 2. Verifica permissão (Admin)
    client_id = settings.KEYCLOAK_CLIENT_ID
    
    # Busca roles do Cliente
    resource_access = token_payload.get("resource_access", {})
    client_roles = resource_access.get(client_id, {}).get("roles", [])

    # Busca roles do Realm
    realm_access = token_payload.get("realm_access", {})
    realm_roles = realm_access.get("roles", [])

    all_roles = client_roles + realm_roles
    
    # Se quiser garantir que 'is_admin' retornado pelo sync também conta:
    # if not is_admin and "admin" not in all_roles: (Opcional, a verificação abaixo já basta)

    if "admin" not in all_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Acesso negado. Apenas administradores podem listar usuários."
        )

    # 3. Agora sim, busca no banco (agora você vai estar lá!)
    users = db.query(User).all()
    
    return {
        "status": "success",
        "users": [
            {"id": user.id, "name": user.name, "login": user.login, "role": user.role}
            for user in users
        ]
    }
    
@router.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return {
        "status": "success",
        "id": user.id,
        "name": user.name,
        "login": user.login,
        "role": user.role
    }
    
@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    db.delete(user)
    db.commit()
    return
