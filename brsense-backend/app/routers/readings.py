# app/routers/readings.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.models.reading import Reading
from app.models.device import Device

router = APIRouter()

# Modelo de resposta para o Frontend
class ReadingResponse(BaseModel):
    timestamp: datetime
    depth_cm: float
    moisture_pct: float
    temperature_c: float
    
    class Config:
        from_attributes = True

@router.get("/device/{esn}/history", response_model=List[ReadingResponse])
def get_device_history(esn: str, db: Session = Depends(get_db)):
    """
    Retorna o histórico de leituras de um dispositivo específico (ESN).
    """
    # 1. Verifica se o dispositivo existe
    device = db.query(Device).filter(Device.esn == esn).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    
    # 2. Busca as leituras ordenadas por data
    # Limita a 2000 registros para não pesar no gráfico
    readings = db.query(Reading)\
        .filter(Reading.device_id == device.id)\
        .order_by(Reading.timestamp.asc())\
        .limit(2000)\
        .all()
        
    return readings