from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models.farm import Farm
from app.models.device import Device
from app.models.reading import Reading
from app.models.user import User
from app.schemas.device import DeviceRead, DeviceUpdate, DeviceCreate
from app.core.security import get_current_user_token, get_user_and_roles

router = APIRouter()

# --- FUNÇÃO AUXILIAR PARA CALCULAR CHUVA (Reutilizável) ---
def populate_rain_metrics(db: Session, devices: List[Device]) -> List[Device]:
    """
    Recebe uma lista de dispositivos, calcula a chuva acumulada (1h, 24h, 7d)
    e injeta os valores nos objetos antes de retornar.
    """
    now = datetime.utcnow()
    time_1h = now - timedelta(hours=1)
    time_24h = now - timedelta(hours=24)
    time_7d = now - timedelta(days=7)

    for dev in devices:
        # Query auxiliar para somar
        def get_sum(since_date):
            total = db.query(func.sum(Reading.rain_cm))\
                .filter(Reading.device_id == dev.id)\
                .filter(Reading.timestamp >= since_date)\
                .scalar()
            return float(total) if total is not None else 0.0

        # Injeta os valores no objeto SQLAlchemy
        # O Pydantic (DeviceRead) lerá esses atributos automaticamente
        dev.rain_1h = get_sum(time_1h)
        dev.rain_24h = get_sum(time_24h)
        dev.rain_7d = get_sum(time_7d)
    
    return devices

# ---------------------------------------------------------

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
        
    devices = query.offset(skip).limit(limit).all()
    
    # APLICA O CÁLCULO DE CHUVA AQUI
    devices = populate_rain_metrics(db, devices)
            
    return devices

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
    devices = populate_rain_metrics(db, devices)

    return devices

@router.post("/devices", response_model=DeviceRead)
def create_or_associate_device(
    device_data: DeviceCreate, 
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user, is_admin = get_user_and_roles(db, token_payload)

    # Se farm_id for fornecido, valida a fazenda
    if device_data.farm_id is not None:
        farm = db.query(Farm).filter(Farm.id == device_data.farm_id).first()
        if not farm:
            raise HTTPException(status_code=404, detail="Fazenda não encontrada")

        if not is_admin and farm.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Você não tem permissão para adicionar sondas nesta fazenda."
            )

    clean_esn = device_data.esn.strip()
    db_device = db.query(Device).filter(Device.esn == clean_esn).first()

    if db_device:
        # Atualiza dados existentes
        db_device.farm_id = device_data.farm_id
        db_device.name = device_data.name or f"Sonda {clean_esn}"
        if device_data.latitude is not None:
            db_device.latitude = device_data.latitude
        if device_data.longitude is not None:
            db_device.longitude = device_data.longitude
    else:
        # Cria nova sonda
        db_device = Device(
            esn=clean_esn,
            farm_id=device_data.farm_id,  # Pode ser None agora
            name=device_data.name or f"Sonda {clean_esn}",
            latitude=device_data.latitude,
            longitude=device_data.longitude
        )
        db.add(db_device)
    
    db.commit()
    db.refresh(db_device)
    
    db_device.rain_1h = 0.0
    db_device.rain_24h = 0.0
    db_device.rain_7d = 0.0
    
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

    if not is_admin:
        if db_device.farm_id:
            farm = db.query(Farm).filter(Farm.id == db_device.farm_id).first()
            if not farm or farm.user_id != user.id:
                raise HTTPException(status_code=403, detail="Acesso negado a esta sonda.")

    update_data = device_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_device, key, value)

    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    
    # Recalcula chuva para devolver atualizado
    # (Envolvemos numa lista pois a função espera lista)
    updated_list = populate_rain_metrics(db, [db_device])
    return updated_list[0]

@router.delete("/devices/{esn}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(esn: str, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.esn == esn).first()
    if not device:
        raise HTTPException(status_code=404, detail="Sonda não encontrada")
    db.delete(device)
    db.commit()
    return
