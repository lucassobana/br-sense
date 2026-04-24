from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc
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
    
    if not devices:
        return devices

    device_ids = [d.id for d in devices]

    rain_rows = (
        db.query(
            Reading.device_id,
            func.coalesce(func.sum(case((Reading.timestamp >= time_1h, Reading.rain_cm), else_=0.0)), 0.0).label("rain_1h"),
            func.coalesce(func.sum(case((Reading.timestamp >= time_24h, Reading.rain_cm), else_=0.0)), 0.0).label("rain_24h"),
            func.coalesce(func.sum(case((Reading.timestamp >= time_7d, Reading.rain_cm), else_=0.0)), 0.0).label("rain_7d"),
        )
        .filter(Reading.device_id.in_(device_ids))
        .group_by(Reading.device_id)
        .all()
    )

    rain_map = {
        row.device_id: {
            "rain_1h": float(row.rain_1h or 0.0),
            "rain_24h": float(row.rain_24h or 0.0),
            "rain_7d": float(row.rain_7d or 0.0),
        }
        for row in rain_rows
    }

    for dev in devices:
        metrics = rain_map.get(dev.id, {"rain_1h": 0.0, "rain_24h": 0.0, "rain_7d": 0.0})
        dev.rain_1h = metrics["rain_1h"]
        dev.rain_24h = metrics["rain_24h"]
        dev.rain_7d = metrics["rain_7d"]
    
    return devices

@router.get("/devices", response_model=List[DeviceRead])
def read_devices(
    skip: int = 0, 
    limit: int = 25, 
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user, is_admin = get_user_and_roles(db, token_payload)
    
    query = db.query(Device)
    if not is_admin:
        query = query.join(Farm, Device.farm_id == Farm.id).filter(Farm.user_id == user.id)
        
    devices = query.offset(skip).limit(limit).all()
    devices = populate_rain_metrics(db, devices)
    
    result_list = []
    for dev in devices:
        dev_data = {col.name: getattr(dev, col.name) for col in dev.__table__.columns}
        dev_data["rain_1h"] = dev.rain_1h
        dev_data["rain_24h"] = dev.rain_24h
        dev_data["rain_7d"] = dev.rain_7d
        
        recent_readings = (
            db.query(Reading)
            .filter(Reading.device_id == dev.id)
            .order_by(desc(Reading.timestamp))
            .limit(80)
            .all()
        )
        
        latest_battery = (
            db.query(Reading)
            .filter(Reading.device_id == dev.id, Reading.battery_status.isnot(None))
            .order_by(desc(Reading.timestamp))
            .first()
        )
        
        all_readings = list(recent_readings)
        
        if latest_battery and latest_battery.id not in [r.id for r in all_readings]:
            all_readings.append(latest_battery)
            
        dev_data["readings"] = all_readings
        result_list.append(dev_data)
            
    return result_list

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

    devices = (
        db.query(Device)
        
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
        if device_data.config_moisture_v1 is not None:
            db_device.config_moisture_v1 = device_data.config_moisture_v1
        if device_data.config_moisture_v2 is not None:
            db_device.config_moisture_v2 = device_data.config_moisture_v2
        if device_data.config_moisture_v3 is not None:
            db_device.config_moisture_v3 = device_data.config_moisture_v3
        if device_data.config_gradient_intensity is not None:
            db_device.config_gradient_intensity = device_data.config_gradient_intensity
    else:
        # Cria nova sonda
        db_device = Device(
            esn=clean_esn,
            farm_id=device_data.farm_id,
            name=device_data.name or f"Sonda {clean_esn}",
            latitude=device_data.latitude,
            longitude=device_data.longitude,
            config_moisture_v1=device_data.config_moisture_v1,
            config_moisture_v2=device_data.config_moisture_v2,
            config_moisture_v3=device_data.config_moisture_v3,
            config_gradient_intensity=device_data.config_gradient_intensity
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