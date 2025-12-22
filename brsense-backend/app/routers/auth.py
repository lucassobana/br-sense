from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User # Vamos precisar criar este modelo abaixo
from pydantic import BaseModel
from app.services.keycloak_admin import create_keycloak_user
from app.core.security import get_current_user_token
from typing import Optional

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
def register_user(user: UserCreate):
    """
    Cria um novo usuário. 
    NOTA: Em um cenário real, você deve verificar aqui se quem está chamando 
    essa rota possui o token de ADMIN.
    """
    keycloak_id = create_keycloak_user(
        username=user.login,
        email=user.login,
        password=user.password,
        role=user.role.lower() # Garanta que a role 'fazendeiro' exista no Keycloak (Realm Roles)
    )
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
    token_payload: dict = Depends(get_current_user_token) # Exige login
):
    """
    Lista usuários. Apenas ADMINs podem acessar.
    """
    # 1. Verifica se o usuário tem a role 'admin' no Keycloak
    roles = token_payload.get("realm_access", {}).get("roles", [])
    if "admin" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Acesso negado. Apenas administradores podem listar usuários."
        )

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
