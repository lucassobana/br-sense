from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload # <--- 1. IMPORTANTE: Adicionado joinedload
from typing import List, Optional

from app.db.session import get_db
from app.models.farm import Farm
from app.models.device import Device
from app.models.user import User
from app.schemas.device import DeviceRead, DeviceUpdate, DeviceCreate
from app.core.security import get_current_user_token, get_user_and_roles

from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import APIRouter, Depends

router = APIRouter()

@router.get("/devices", response_model=List[DeviceRead])
def read_devices(
    skip: int = 0, 
    limit: int = 100, 
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user, is_admin = get_user_and_roles(db, token_payload)
    
    # 2. ADICIONADO: .options(joinedload(Device.readings))
    # Isso força o banco a trazer as leituras junto com a sonda
    query = db.query(Device).options(joinedload(Device.readings))

    if is_admin:
        pass
    else:
        query = query.join(Farm, Device.farm_id == Farm.id).filter(Farm.user_id == user.id)

    # Ordenar para garantir consistência (opcional, mas recomendado)
    return query.offset(skip).limit(limit).all()

@router.get("/devices/user/{user_id}", response_model=List[DeviceRead])
def read_user_devices(
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Retorna exclusivamente as sondas pertencentes às fazendas do usuário informado.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Faz o Join com Farm para pegar apenas devices de fazendas desse usuário
    devices = (
        db.query(Device)
        .options(joinedload(Device.readings)) # <--- 3. ADICIONADO AQUI TAMBÉM
        .join(Farm)
        .filter(Farm.user_id == user_id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return devices

@router.post("/devices", response_model=DeviceRead)
def create_or_associate_device(
    device_data: DeviceCreate, 
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """
    Cria uma nova sonda ou associa uma existente (pré-criada pelo satélite)
    à fazenda do usuário.
    """
    user, is_admin = get_user_and_roles(db, token_payload)

    # Verificar se a Fazenda existe
    farm = db.query(Farm).filter(Farm.id == device_data.farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Fazenda não encontrada")

    # O usuário é dono da fazenda?
    if not is_admin and farm.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Você não tem permissão para adicionar sondas nesta fazenda."
        )

    # Lógica de Associação
    db_device = db.query(Device).filter(Device.esn == device_data.esn).first()

    if db_device:
        # Cenário A: Já existe.
        if db_device.farm_id is not None and db_device.farm_id != device_data.farm_id:
             raise HTTPException(status_code=400, detail="Esta sonda já está vinculada a outra fazenda.")
        
        # Atualiza vínculo e campos novos se enviados
        db_device.farm_id = device_data.farm_id
        db_device.name = device_data.name or f"Sonda {device_data.esn}"
        
        # Se vier latitude/longitude na criação, atualiza também
        if device_data.latitude is not None:
            db_device.latitude = device_data.latitude
        if device_data.longitude is not None:
            db_device.longitude = device_data.longitude

    else:
        # Cenário B: Novo device
        db_device = Device(
            esn=device_data.esn, 
            farm_id=device_data.farm_id, 
            name=device_data.name or f"Sonda {device_data.esn}",
            latitude=device_data.latitude,   # <--- Passando novos campos
            longitude=device_data.longitude
        )
        db.add(db_device)
    
    db.commit()
    db.refresh(db_device)
    return db_device

@router.patch("/devices/{esn}", response_model=DeviceRead)
def update_device(
    esn: str, 
    device_update: DeviceUpdate, 
    token_payload: dict = Depends(get_current_user_token), 
    db: Session = Depends(get_db)
):
    user, is_admin = get_user_and_roles(db, token_payload)

    db_device = db.query(Device).filter(Device.esn == esn).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Sonda não encontrada")

    # Verifica permissão
    if not is_admin:
        if db_device.farm_id:
            farm = db.query(Farm).filter(Farm.id == db_device.farm_id).first()
            if not farm or farm.user_id != user.id:
                raise HTTPException(status_code=403, detail="Acesso negado a esta sonda.")

    # Atualiza dados dinamicamente (incluindo lat/long)
    update_data = device_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_device, key, value)

    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

@router.delete("/devices/{esn}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(esn: str, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.esn == esn).first()
    if not device:
        raise HTTPException(status_code=404, detail="Sonda não encontrada")

    db.delete(device)
    db.commit()
    return

@router.get("/debug/db")
def debug_db(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT current_database(), current_schema(), inet_server_addr()"))
    row = result.fetchone()
    return {
        "database": row[0],
        "schema": row[1],
        "server": row[2]
    }
