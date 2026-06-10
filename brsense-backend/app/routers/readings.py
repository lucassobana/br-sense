# app/routers/readings.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models.reading import Reading
from app.models.device import Device
from app.models.request_log import RequestLog
from app.services.location_history import get_location_history_from_logs
from app.services.weather_service import generate_weekly_report

router = APIRouter()

# Modelo de resposta para o Frontend
class ReadingResponse(BaseModel):
    timestamp: datetime
    depth_cm: Optional[float] = None
    moisture_pct: Optional[float] = None
    temperature_c: Optional[float] = None
    battery_status: Optional[int] = None
    solar_status: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rain_cm: Optional[float] = None
    reading_type: Optional[str] = None
    
    class Config:
        from_attributes = True

@router.get("/device/{esn}/history", response_model=List[ReadingResponse])
def get_device_history(
    esn: str, 
    start_date: Optional[datetime] = None, 
    end_date: Optional[datetime] = None,
    reading_type: Optional[str] = Query(None, description="Filtrar por U (Umidade), T (Temperatura) ou L (Localização)"),
    db: Session = Depends(get_db)
):
    """
    Retorna o histórico otimizado, suportando grandes períodos de tempo e inatividade da sonda.
    """
    device = db.query(Device).filter(Device.esn == esn).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    
    # 1. Monta a Query Base
    query = db.query(
        Reading.timestamp,
        Reading.depth_cm,
        Reading.moisture_pct,
        Reading.temperature_c,
        Reading.battery_status,
        Reading.solar_status,
        Reading.latitude,
        Reading.longitude,
        Reading.rain_cm,
        Reading.reading_type
    ).filter(Reading.device_id == device.id)
    
    # Filtra por tipo de leitura (se solicitado pelo frontend)
    if reading_type:
        query = query.filter(Reading.reading_type == reading_type)
    
    # Tratamento de Timezone e Filtros Originais
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

    # 2. Executa a primeira tentativa
    readings = query.order_by(Reading.timestamp.asc()).all()

    # --- NOVA CONDIÇÃO DE FALLBACK PARA SONDAS INATIVAS ---
    # Se o frontend pediu um período, mas a sonda não enviou nada nesse intervalo:
    if not readings and start_date:
        # Busca a última leitura absoluta desta sonda no banco de dados
        last_reading = db.query(Reading).filter(Reading.device_id == device.id).order_by(Reading.timestamp.desc()).first()
        
        if last_reading:
            # Retrocede 30 dias a partir do último sinal real da sonda
            fallback_start = last_reading.timestamp - timedelta(days=30)
            fallback_end = last_reading.timestamp
            
            # Recria a query apontando para a janela de tempo onde realmente existem dados
            fallback_query = db.query(
                Reading.timestamp,
                Reading.depth_cm,
                Reading.moisture_pct,
                Reading.temperature_c,
                Reading.battery_status,
                Reading.solar_status,
                Reading.latitude,
                Reading.longitude,
                Reading.rain_cm,
                Reading.reading_type
            ).filter(
                Reading.device_id == device.id,
                Reading.timestamp >= fallback_start,
                Reading.timestamp <= fallback_end
            )
            
            if reading_type:
                fallback_query = fallback_query.filter(Reading.reading_type == reading_type)
                
            readings = fallback_query.order_by(Reading.timestamp.asc()).all()
            
            # Atualiza start_date e end_date para que o location_history logo abaixo
            # também busque as localizações dessa janela antiga, e não da atual vazia
            start_date = fallback_start
            end_date = fallback_end
    # -----------------------------------------------------

    # 3. Cria a lista original contendo TODAS as profundidades
    reading_history = [
        {
            "timestamp": r.timestamp,
            "depth_cm": r.depth_cm,
            "moisture_pct": r.moisture_pct,
            "temperature_c": r.temperature_c,
            "battery_status": r.battery_status,
            "solar_status": r.solar_status,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "rain_cm": r.rain_cm,
            "reading_type": r.reading_type
        }
        for r in readings
    ]

    # Injeção de Logs de Localização Condicional
    # Usa ".append()" direto na lista, evitando sobrescrever as profundidades
    if reading_type in [None, "L"]:
        location_history = get_location_history_from_logs(db, device.esn, start_date, end_date)
        
        for item in location_history:
            item["reading_type"] = item.get("reading_type", "L")
            reading_history.append(item)

    # Ordena a lista completa final baseada no timestamp
    reading_history.sort(key=lambda x: x["timestamp"])

    return reading_history

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

@router.get("/{esn}/weather-report")
def get_device_weather_report(esn: str, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.esn == esn).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
        
    if device.latitude is None or device.longitude is None:
        raise HTTPException(status_code=400, detail="Dispositivo sem latitude/longitude")

    # Passa apenas lat e long para o serviço
    report = generate_weekly_report(device.latitude, device.longitude)
    
    if not report:
        raise HTTPException(status_code=502, detail="Erro ao comunicar com a API de clima")
        
    return {
        "esn": device.esn,
        "name": device.name,
        "location": {"latitude": device.latitude, "longitude": device.longitude},
        "report": report
    }