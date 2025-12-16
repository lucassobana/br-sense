from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.farm import Farm
from app.models.device import Device
from app.schemas.device import DeviceRead, DeviceUpdate

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

@router.patch("/devices/{esn}", response_model=DeviceRead)
def update_device(esn: str, device_update: DeviceUpdate, db: Session = Depends(get_db)):
    """
    Atualiza dados de uma sonda (Ex: Vincular a uma fazenda, mudar nome).
    """
    # 1. Buscar o dispositivo pelo ESN
    db_device = db.query(Device).filter(Device.esn == esn).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Sonda não encontrada")

    # 2. (Opcional) Se estiver atribuindo uma fazenda, verifica se ela existe
    if device_update.farm_id is not None:
        farm = db.query(Farm).filter(Farm.id == device_update.farm_id).first()
        if not farm:
            raise HTTPException(status_code=404, detail="Fazenda não encontrada")

    # 3. Atualização Parcial (Apenas campos enviados)
    # exclude_unset=True garante que campos não enviados não sobrescrevam os atuais com None
    update_data = device_update.model_dump(exclude_unset=True) 
    # Nota: Se estiver usando Pydantic v1, use .dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_device, key, value)

    # 4. Salvar no Banco
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    
    return db_device