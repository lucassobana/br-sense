import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from xml.etree import ElementTree

from sqlalchemy.orm import Session

from app.decoders.smartone_c import decode_soil_payload
from app.models.request_log import RequestLog


def _strip_namespace(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _text_from_child(element: ElementTree.Element, child_name: str) -> Optional[str]:
    for child in element:
        if _strip_namespace(child.tag) == child_name:
            return child.text
    return None


def _extract_xml_messages(raw_body: str) -> List[Dict[str, Any]]:
    try:
        root = ElementTree.fromstring(raw_body)
    except ElementTree.ParseError:
        return []

    messages: List[Dict[str, Any]] = []
    for element in root.iter():
        if _strip_namespace(element.tag) != "stuMessage":
            continue

        messages.append({
            "esn": _text_from_child(element, "esn"),
            "unixTime": _text_from_child(element, "unixTime"),
            "payload": _text_from_child(element, "payload"),
        })

    return messages


def _extract_dict_messages(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    root = payload.get("stuMessages", payload)
    if root is None:
        return []

    items = root.get("stuMessage", []) if isinstance(root, dict) else []
    if isinstance(items, dict):
        items = [items]
    if not isinstance(items, list):
        return []

    messages: List[Dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue

        raw_payload = item.get("payload") or item.get("data") or item.get("hexPayload")
        if isinstance(raw_payload, dict):
            raw_payload = raw_payload.get("#text")

        messages.append({
            "esn": item.get("esn") or item.get("ESN") or item.get("id") or item.get("deviceId"),
            "unixTime": item.get("unixTime") or item.get("unix_time") or item.get("time"),
            "payload": raw_payload,
        })

    return messages


def _extract_messages_from_raw_body(raw_body: str) -> List[Dict[str, Any]]:
    if not raw_body:
        return []

    body = raw_body.strip()
    if body.startswith("<"):
        return _extract_xml_messages(body)

    try:
        parsed = json.loads(body)
    except Exception:
        return []

    return _extract_dict_messages(parsed) if isinstance(parsed, dict) else []


def _message_timestamp(message: Dict[str, Any], fallback: datetime) -> datetime:
    unix_time = message.get("unixTime")
    if unix_time:
        try:
            return datetime.fromtimestamp(int(unix_time), tz=timezone.utc).replace(tzinfo=None)
        except Exception:
            pass
    return fallback


def get_location_history_from_logs(
    db: Session,
    esn: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Reconstroi leituras de localização a partir dos payloads já persistidos em request_log.
    Não grava dados novos: apenas decodifica, em tempo de consulta, os logs históricos do ESN.
    """
    query = db.query(RequestLog).filter(RequestLog.raw_body.contains(esn))

    # A data do log e a do payload normalmente são próximas. A margem evita perder
    # payloads por diferença de timezone/relógio e ainda mantém a consulta limitada.
    if start_date:
        query = query.filter(RequestLog.timestamp >= start_date - timedelta(days=2))
    if end_date:
        query = query.filter(RequestLog.timestamp <= end_date + timedelta(days=2))

    logs = query.order_by(RequestLog.timestamp.asc()).all()
    points_by_time: Dict[datetime, Dict[str, Any]] = {}

    for log in logs:
        for message in _extract_messages_from_raw_body(log.raw_body or ""):
            if message.get("esn") != esn:
                continue

            raw_payload = message.get("payload")
            if not isinstance(raw_payload, str):
                continue

            timestamp = _message_timestamp(message, log.timestamp)
            decoded = decode_soil_payload(raw_payload, timestamp=timestamp)

            for item in decoded:
                latitude = item.get("latitude")
                longitude = item.get("longitude")
                if latitude is None or longitude is None:
                    continue
                if start_date and timestamp < start_date:
                    continue
                if end_date and timestamp > end_date:
                    continue

                points_by_time[timestamp] = {
                    "timestamp": timestamp,
                    "depth_cm": None,
                    "moisture_pct": None,
                    "temperature_c": None,
                    "battery_status": None,
                    "solar_status": None,
                    "latitude": latitude,
                    "longitude": longitude,
                    "rain_cm": None,
                }

    return [points_by_time[key] for key in sorted(points_by_time)]
