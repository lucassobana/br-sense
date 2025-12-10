from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User # Vamos precisar criar este modelo abaixo
from pydantic import BaseModel

router = APIRouter()

# Schemas locais para simplificar
class UserCreate(BaseModel):
    name: str
    login: str
    password: str

class UserLogin(BaseModel):
    login: str
    password: str

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(data: UserCreate, db: Session = Depends(get_db)):
    user_exists = db.query(User).filter(User.login == data.login).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Login já cadastrado.")

    # Nota: Em produção, use hash na senha (ex: bcrypt)!
    new_user = User(
        name=data.name,
        login=data.login,
        password=data.password, 
        role="FAZENDEIRO"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"status": "success", "user_id": new_user.id}

@router.post("/login")
def login_user(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.login == data.login).first()
    if not user or user.password != data.password:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    return {
        "status": "success",
        "user": {"id": user.id, "name": user.name, "role": user.role}
    }