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
    battery_status: Optional[int] = None
    rain_cm: Optional[float] = None
    
    class Config:
        from_attributes = True

@router.get("/device/{esn}/history", response_model=List[ReadingResponse])
def get_device_history(
    esn: str, 
    start_date: Optional[datetime] = None, 
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """
    Retorna o histórico otimizado, suportando grandes períodos de tempo.
    """
    device = db.query(Device).filter(Device.esn == esn).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    
    query = db.query(
        Reading.timestamp,
        Reading.depth_cm,
        Reading.moisture_pct,
        Reading.temperature_c,
        Reading.battery_status,
        Reading.rain_cm
    ).filter(Reading.device_id == device.id)
    
    # Tratamento de Timezone e Filtros
    if start_date:
        if start_date.tzinfo:
            start_date = start_date.replace(tzinfo=None)
        query = query.filter(Reading.timestamp >= start_date)
        
    if end_date:
        if end_date.tzinfo:
            end_date = end_date.replace(tzinfo=None)
        query = query.filter(Reading.timestamp <= end_date)
        
    if not start_date and not end_date:
        query = query.limit(10000)

    readings = query.order_by(Reading.timestamp.asc()).all()

    return [
        {
            "timestamp": r.timestamp,
            "depth_cm": r.depth_cm,
            "moisture_pct": r.moisture_pct,
            "temperature_c": r.temperature_c,
            "battery_status": r.battery_status,
            "rain_cm": r.rain_cm
        }
        for r in readings
    ]

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