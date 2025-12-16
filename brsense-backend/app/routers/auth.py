from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User # Vamos precisar criar este modelo abaixo
from pydantic import BaseModel
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

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(data: UserCreate, db: Session = Depends(get_db)):
    """
    Cria um novo usuário. 
    NOTA: Em um cenário real, você deve verificar aqui se quem está chamando 
    essa rota possui o token de ADMIN.
    """
    user_exists = db.query(User).filter(User.login == data.login).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Login já cadastrado.")

    new_user = User(
        name=data.name,
        login=data.login,
        password=data.password, 
        role=data.role # Agora usamos o role enviado pelo Admin
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"status": "success", "user_id": new_user.id, "role": new_user.role}



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
def list_users(db: Session = Depends(get_db)):
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
