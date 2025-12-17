from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List,Optional

from app.db.session import get_db
from app.models.farm import Farm
from app.models.device import Device
from app.schemas.device import DeviceRead, DeviceUpdate

router = APIRouter()

@router.get("/devices", response_model=List[DeviceRead])
def read_devices(
    skip: int = 0, 
    limit: int = 100, 
    user_id: Optional[int] = Query(None, description="Filtrar sondas pelo dono da fazenda"),
    db: Session = Depends(get_db)
):
    """
    Retorna a lista de sondas.
    Se user_id for informado, retorna apenas as sondas das fazendas desse usuário.
    """
    query = db.query(Device)

    # REGRA DE NEGÓCIO: Join com Farm para filtrar pelo user_id do dono
    if user_id:
        query = query.join(Farm).filter(Farm.user_id == user_id)

    devices = query.offset(skip).limit(limit).all()
    return devices

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

@router.post("/associate")
def associate_device_to_farm(
    esn: str, 
    farm_id: int, 
    db: Session = Depends(get_db)
):
    # 1. Busca se o dispositivo já existe (criado pelo Uplink)
    device = db.query(Device).filter(Device.esn == esn).first()

    if device:
        # Cenário 1: O Uplink já criou o device. Atualizamos a fazenda.
        if device.farm_id is not None and device.farm_id != farm_id:
             raise HTTPException(status_code=400, detail="Dispositivo já pertence a outra fazenda.")
        device.farm_id = farm_id
        device.name = f"Sonda {esn}" # Ou um nome que o usuário deu
    else:
        # Cenário 2: Pré-provisionamento (Usuário cadastra antes do primeiro dado chegar)
        device = Device(esn=esn, farm_id=farm_id, name=f"Sonda {esn}")
        db.add(device)
    
    db.commit()
    return {"status": "success", "device_id": device.id}