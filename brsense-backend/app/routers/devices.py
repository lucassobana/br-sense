from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.device import Device
from app.schemas.device import DeviceRead

router = APIRouter()

@router.get("/devices", response_model=List[DeviceRead])
def read_devices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Retorna a lista de todas as sondas cadastradas.
    """
    devices = db.query(Device).offset(skip).limit(limit).all()
    return devices

@router.get("/devices/{esn}", response_model=DeviceRead)
def read_device_by_esn(esn: str, db: Session = Depends(get_db)):
    """
    Busca uma sonda específica pelo ESN (Ex: TEST-01).
    """
    device = db.query(Device).filter(Device.esn == esn).first()
    if device is None:
        raise HTTPException(status_code=404, detail="Sonda não encontrada")
    return device