from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List,Optional

from app.db.session import get_db
from app.models.farm import Farm
from app.models.device import Device
from app.models.user import User
from app.schemas.device import DeviceRead, DeviceUpdate, DeviceCreate
from app.core.security import get_current_user_token, get_user_and_roles

router = APIRouter()

@router.get("/devices", response_model=List[DeviceRead])
def read_devices(
    skip: int = 0, 
    limit: int = 100, 
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user, is_admin = get_user_and_roles(db, token_payload)
    query = db.query(Device)

    if is_admin:
        pass
    else:
        query = query.join(Farm, Device.farm_id == Farm.id).filter(Farm.user_id == user.id)

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
        .join(Farm)
        .filter(Farm.user_id == user_id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return devices

@router.post("/devices", response_model=DeviceRead)
def create_or_associate_device(
    device_data: DeviceCreate, # Recebe JSON com esn, farm_id, name
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """
    Cria uma nova sonda ou associa uma existente (pré-criada pelo satélite)
    à fazenda do usuário.
    """
    # 1. Segurança: Quem é o usuário?
    user, is_admin = get_user_and_roles(db, token_payload)

    # 2. Verificar se a Fazenda existe
    farm = db.query(Farm).filter(Farm.id == device_data.farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Fazenda não encontrada")

    # 3. REGRA CRÍTICA: O usuário é dono da fazenda?
    if not is_admin and farm.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Você não tem permissão para adicionar sondas nesta fazenda."
        )

    # 4. Lógica de Associação (Seu código original melhorado)
    # Verifica se o device já existe (veio via Uplink antes)
    db_device = db.query(Device).filter(Device.esn == device_data.esn).first()

    if db_device:
        # Cenário A: Já existe.
        # Verifica se já está em outra fazenda
        if db_device.farm_id is not None and db_device.farm_id != device_data.farm_id:
             raise HTTPException(status_code=400, detail="Esta sonda já está vinculada a outra fazenda.")
        
        # Atualiza vínculo
        db_device.farm_id = device_data.farm_id
        db_device.name = device_data.name or f"Sonda {device_data.esn}"
    else:
        # Cenário B: Novo device (Pré-provisionamento)
        db_device = Device(
            esn=device_data.esn, 
            farm_id=device_data.farm_id, 
            name=device_data.name or f"Sonda {device_data.esn}"
        )
        db.add(db_device)
    
    db.commit()
    db.refresh(db_device)
    return db_device

# --- 3. ATUALIZAÇÃO SEGURA ---
@router.patch("/devices/{esn}", response_model=DeviceRead)
def update_device(
    esn: str, 
    device_update: DeviceUpdate, 
    token_payload: dict = Depends(get_current_user_token), # Adicionado Auth
    db: Session = Depends(get_db)
):
    user, is_admin = get_user_and_roles(db, token_payload)

    # Busca device
    db_device = db.query(Device).filter(Device.esn == esn).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Sonda não encontrada")

    # Verifica permissão (se não for admin, tem que ser dono da fazenda atual da sonda)
    if not is_admin:
        # Se a sonda já tem fazenda, checa se é do user
        if db_device.farm_id:
            farm = db.query(Farm).filter(Farm.id == db_device.farm_id).first()
            if not farm or farm.user_id != user.id:
                raise HTTPException(status_code=403, detail="Acesso negado a esta sonda.")

    # Atualiza dados
    update_data = device_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_device, key, value)

    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device