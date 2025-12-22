# brsense-backend/app/routers/farms.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.models.farm import Farm
from app.models.user import User
from app.schemas.farm import FarmCreate, FarmRead
# Importa a dependência que valida o token e extrai os dados do Keycloak
from app.core.security import get_current_user_token, get_user_and_roles

router = APIRouter()
def get_local_user(db: Session, token_payload: dict) -> User:
    """
    Busca o usuário no banco local. Se não existir, CRIA automaticamente
    baseado nos dados do Keycloak (Auto-Provisioning).
    """
    # 1. Tenta pegar o login do token (preferred_username ou email)
    username = token_payload.get("preferred_username") or token_payload.get("email")
    name = token_payload.get("name") or username
    
    if not username:
        raise HTTPException(status_code=401, detail="Token inválido: identificação do usuário ausente")
        
    # 2. Busca no banco local
    user = db.query(User).filter(User.login == username).first()
    
    # 3. SE NÃO EXISTIR -> CRIA AGORA
    if not user:
        print(f"Usuário '{username}' novo detectado via Keycloak. Criando cadastro local...")
        try:
            new_user = User(
                name=name,
                login=username,
                password="KEYCLOAK_AUTH", # Senha dummy, pois a real está no Keycloak
                role="FAZENDEIRO" # Define uma role padrão para novos usuários
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            return new_user
        except Exception as e:
            print(f"Erro ao criar usuário automático: {e}")
            db.rollback()
            raise HTTPException(status_code=500, detail="Erro ao sincronizar usuário local.")
        
    return user

# 1. Criar Fazenda
@router.post("/farms", response_model=FarmRead)
def create_farm(
    farm: FarmCreate, 
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    # 1. Identifica o usuário logado
    user, is_admin = get_user_and_roles(db, token_payload)

    # 2. Cria a fazenda vinculada a este usuário
    new_farm = Farm(
        name=farm.name,
        location=farm.location,
        user_id=user.id # Força o ID do usuário autenticado
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
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    # 1. Obter usuário e flag de admin
    user, is_admin = get_user_and_roles(db, token_payload)

    query = db.query(Farm)

    # 2. REGRA DE NEGÓCIO
    if is_admin:
        # Admin: Sem filtro, vê todas as fazendas do sistema
        pass 
    else:
        # Usuário Comum: Filtra apenas onde user_id bate com o dele
        query = query.filter(Farm.user_id == user.id)

    farms = query.offset(skip).limit(limit).all()
    return farms

# 3. Rota Legada / Específica (Opcional)
@router.get("/farms/user/{user_id}", response_model=List[FarmRead])
def read_user_farms(
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """
    Rota administrativa para ver fazendas de um usuário específico.
    """
    # Apenas admins podem usar essa rota explícita
    roles = token_payload.get("realm_access", {}).get("roles", [])
    if "admin" not in roles:
         raise HTTPException(status_code=403, detail="Acesso restrito a administradores")

    farms = db.query(Farm).filter(Farm.user_id == user_id).offset(skip).limit(limit).all()
    return farms