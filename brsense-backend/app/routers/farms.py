# brsense-backend/app/routers/farms.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.models.farm import Farm
from app.models.user import User
from app.schemas.farm import FarmCreate, FarmRead

router = APIRouter()

# 1. Criar Fazenda (Associaremos a um usuário fixo por enquanto ou via ID)
@router.post("/farms", response_model=FarmRead)
def create_farm(farm: FarmCreate, user_id: int, db: Session = Depends(get_db)):
    """
    Cria uma nova fazenda vinculada a um usuário.
    (Em produção, pegue o user_id do token de autenticação)
    """
    # Verifica se usuário existe
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    new_farm = Farm(
        name=farm.name,
        location=farm.location,
        user_id=user_id
    )
    db.add(new_farm)
    db.commit()
    db.refresh(new_farm)
    return new_farm

# 2. Listar Fazendas
@router.get("/farms", response_model=List[FarmRead])
def read_farms(
    skip: int = 0, 
    limit: int = 100, 
    user_id: Optional[int] = Query(None, description="Filtrar pelo ID do usuário"), 
    db: Session = Depends(get_db)
):
    query = db.query(Farm)

    # REGRA DE NEGÓCIO: Se um user_id for passado, traz apenas as fazendas dele
    if user_id:
        query = query.filter(Farm.user_id == user_id)

    farms = query.offset(skip).limit(limit).all()
    return farms