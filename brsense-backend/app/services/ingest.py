# app/services/ingest.py
import logging
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Any, Dict, List

from app.models.device import Device
from app.models.reading import Reading
from app.decoders.smartone_c import decode_soil_payload

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def _ensure_device(db: Session, esn: str) -> Device:
    device = db.query(Device).filter(Device.esn == esn).first()
    if not device:
        logger.info(f"Novo dispositivo detectado: {esn}")
        device = Device(esn=esn, name=f"Sonda {esn}")
        db.add(device)
        db.flush()
    return device

def _extract_messages_from_dict(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extrai mensagens de um dicionário (já parseado de XML ou JSON).
    """
    messages = []
    
    # --- CORREÇÃO PARA GLOBALSTAR (Empty Heartbeat) ---
    
    # 1. Verifica se existe a chave "stuMessages"
    if "stuMessages" in payload:
        root = payload["stuMessages"]
        
        # IMPORTANTE: Trata Empty Heartbeat da Globalstar
        # <stuMessages ... /> vem como None ou dict apenas com atributos
        if root is None:
            return [] 
            
        items = root.get("stuMessage", [])
    else:
        # Fallback
        items = payload.get("stuMessage", payload)

    # --------------------------------------------------
    
    # Se for um único item (dict), transforma em lista para iterar
    if isinstance(items, dict):
        items = [items]
    elif not isinstance(items, list):
        items = []

    for item in items:
        # Helper para buscar chave ignorando case
        def get_val(obj, keys):
            for k in keys:
                if k in obj: return obj[k]
                # xmltodict usa @ para atributos (ex: <payload encoding="hex">)
                if f"@{k}" in obj: return obj[f"@{k}"] 
            return None

        esn = get_val(item, ["esn", "ESN", "id", "deviceId"])
        unix_time = get_val(item, ["unixTime", "unix_time", "time"])
        raw_payload = get_val(item, ["payload", "data", "hexPayload"])

        # XML payload text handling: <payload ...>HEX</payload> -> {'#text': 'HEX'}
        if isinstance(raw_payload, dict) and "#text" in raw_payload:
            raw_payload = raw_payload["#text"]

        if esn:
            messages.append({
                "esn": esn,
                "unixTime": unix_time,
                "payload": raw_payload
            })
            
    return messages

def ingest_envelope(payload: Dict[str, Any], db: Session) -> dict:
    """
    Processa o payload (dict) recebido do Router.
    """
    # Extrai as mensagens (agora seguro contra None)
    msgs = _extract_messages_from_dict(payload)
    
    saved_count = 0
    readings_count = 0
    
    # Se a lista estiver vazia (heartbeat), o loop não roda e retorna OK.
    for msg in msgs:
        esn = msg.get("esn")
        raw_payload = msg.get("payload")
        
        if not esn:
            continue
            
        try:
            # 1. Device
            device = _ensure_device(db, esn)
            device.updated_at = datetime.utcnow()
            
            # 2. Decodificação
            if raw_payload and isinstance(raw_payload, str):
                decoded = decode_soil_payload(raw_payload)
                if decoded:
                    # Tenta converter timestamp da mensagem
                    ts = datetime.utcnow()
                    if msg.get("unixTime"):
                        try:
                            ts = datetime.utcfromtimestamp(int(msg["unixTime"]))
                        except:
                            pass
                    
                    for r in decoded:
                        reading = Reading(
                            device_id=device.id,
                            depth_cm=r["depth_cm"],
                            moisture_pct=r["moisture_pct"],
                            temperature_c=r["temperature_c"],
                            timestamp=ts
                        )
                        db.add(reading)
                        readings_count += 1
            
            saved_count += 1
            
        except Exception as e:
            logger.error(f"Erro processando mensagem {esn}: {e}")
            continue
            
    try:
        db.commit()
        # Retorna estrutura que será convertida em XML/JSON na resposta
        return {
            "status": "ok", 
            "messages_processed": saved_count,
            "readings_saved": readings_count
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Erro DB Commit: {e}")
        return {"status": "error", "detail": str(e)}