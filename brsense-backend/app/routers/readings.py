# app/routers/readings.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


from app.db.session import get_db
from app.models.reading import Reading
from app.models.device import Device
from app.models.request_log import RequestLog

router = APIRouter()

# Modelo de resposta para o Frontend
class ReadingResponse(BaseModel):
    timestamp: datetime
    depth_cm: float
    moisture_pct: Optional[float] = None
    temperature_c: Optional[float] = None
    rain_cm: Optional[float] = None
    
    class Config:
        from_attributes = True

@router.get("/device/{esn}/history", response_model=List[ReadingResponse])
def get_device_history(
    esn: str, 
    start_date: Optional[datetime] = None, 
    end_date: Optional[datetime] = None,
    limit: int = 1000, # Padrão leve para carga inicial
    db: Session = Depends(get_db)
):
    """
    Retorna o histórico de leituras de um dispositivo específico (ESN).
    """
    # 1. Verifica se o dispositivo existe
    device = db.query(Device).filter(Device.esn == esn).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    
    query = db.query(Reading).filter(Reading.device_id == device.id)
    if start_date and start_date.tzinfo:
        start_date = start_date.replace(tzinfo=None)
        
    if end_date and end_date.tzinfo:
        end_date = end_date.replace(tzinfo=None)

    if start_date:
        query = query.filter(Reading.timestamp >= start_date)
    if end_date:
        query = query.filter(Reading.timestamp < end_date)

    if start_date or end_date:
        readings = query.order_by(Reading.timestamp.asc()).limit(50000).all()
    else:
        readings = query.order_by(Reading.timestamp.desc()).limit(limit).all()
        readings = readings[::-1]

    return readings

@router.get("/logs")
def view_uplink_logs(limit: int = 50, db: Session = Depends(get_db)):
    """
    Rota pública para visualizar os últimos payloads recebidos (capturados pelo Middleware).
    """
    logs = db.query(RequestLog).order_by(RequestLog.timestamp.desc()).limit(limit).all()
    
    # Retorna uma lista simples
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp,
            "ip": l.client_ip,
            "body": l.raw_body,
            "message": l.log_message
        }
        for l in logs
    ]