# brsense-backend/app/services/keycloak_admin.py
from keycloak import KeycloakAdmin
from fastapi import HTTPException
from app.settings import settings

# Configurações (Mova para settings.py em produção)
KEYCLOAK_URL = "http://localhost:8080"
REALM_NAME = "br-sense"
CLIENT_ID_BACKEND = "brsense-backend"
CLIENT_SECRET_BACKEND = settings.CLIENT_SECRET_BACKEND  # Obtido do settings.py

def get_keycloak_admin():
    try:
        # Conecta como "Service Account" (Admin do Realm)
        keycloak_admin = KeycloakAdmin(
            server_url=KEYCLOAK_URL,
            realm_name=REALM_NAME,
            client_id=CLIENT_ID_BACKEND,
            client_secret_key=CLIENT_SECRET_BACKEND,
            verify=True
        )
        return keycloak_admin
    except Exception as e:
        print(f"Erro ao conectar no Keycloak Admin: {e}")
        raise HTTPException(status_code=500, detail="Erro interno no serviço de identidade")

def create_keycloak_user(username, email, password, role="user"):
    kc = get_keycloak_admin()
    
    # 1. Criar o Payload do Usuário
    user_payload = {
        "username": username,
        "email": email,
        "enabled": True,
        "emailVerified": True,
        "credentials": [{
            "value": password,
            "type": "password",
            "temporary": False
        }]
    }

    # 2. Tentar criar
    try:
        new_user_id = kc.create_user(user_payload)
    except Exception as e:
        # Keycloak retorna erro se usuário já existe
        raise HTTPException(status_code=400, detail=f"Erro ao criar usuário no Keycloak: {str(e)}")

    # 3. Atribuir Role (Ex: 'admin' ou 'fazendeiro')
    # Nota: A role deve existir no Realm Roles do Keycloak
    try:
        # Busca a representação da role para pegar o ID interno dela se necessário
        # ou usa assign_realm_roles diretamente pelo nome
        realm_role = kc.get_realm_role(role_name=role)
        kc.assign_realm_roles(user_id=new_user_id, roles=[realm_role])
    except Exception as e:
        print(f"Aviso: Usuário criado, mas erro ao atribuir role '{role}': {e}")
    
    return new_user_id