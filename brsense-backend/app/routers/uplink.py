# api/app/routers/uplink.py
import logging
import xmltodict
import json
from fastapi import APIRouter, Depends, Request, HTTPException, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
# AJUSTE: Apontando para o serviço correto de ingestão
from app.services.ingest import ingest_envelope 
from app.settings import settings

# router = APIRouter(prefix="/v1/uplink", tags=["uplink"])
router = APIRouter()

# Lista de IPs da Globalstar (Whitelist)
GLOBALSTAR_IPS = {
    "3.228.87.237",
    "34.231.245.76",
    "3.135.136.171",
    "3.133.245.206",
    "127.0.0.1", # Adicionado localhost para facilitar seus testes locais
}

log = logging.getLogger("soilprobe.uplink")

def _get_client_ip(request: Request) -> str:
    """Obtém o IP real do cliente, considerando proxies como Cloudflare."""
    if cf_ip := request.headers.get("cf-connecting-ip"):
        return cf_ip.strip()
    if forwarded := request.headers.get("x-forwarded-for"):
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def _require_token(request: Request):
    """
    Verifica autenticação:
    - IPs da Globalstar passam direto.
    - Outros IPs exigem X-Uplink-Token.
    """
    client_ip = _get_client_ip(request)

    # Permite IPs da Globalstar sem autenticação
    if client_ip in GLOBALSTAR_IPS:
        return

    # Se não houver token configurado no settings, permite tudo (Modo Dev inseguro)
    required = settings.UPLINK_SHARED_TOKEN
    if not required:
        return

    supplied = request.headers.get("x-uplink-token", "").strip()
    if supplied != required:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid or missing uplink token (source IP: {client_ip})"
        )

def _is_xml_request(raw: bytes, content_type: str) -> bool:
    """Verifica se a requisição é XML."""
    ctype = (content_type or "").lower()
    return "xml" in ctype or raw.strip().startswith(b"<")

def _parse_payload(raw: bytes, content_type: str):
    """Faz o parse do corpo da requisição para dict."""
    if not raw:
        raise HTTPException(status_code=400, detail="Empty body")
    ctype = (content_type or "").lower()
    try:
        if "xml" in ctype or raw.strip().startswith(b"<"):
            return xmltodict.parse(raw)
        return json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Bad payload: {exc}")

def _make_response(data: dict, is_xml: bool) -> Response:
    """Retorna a resposta no mesmo formato da requisição (XML ou JSON)."""
    if is_xml:
        xml_content = xmltodict.unparse({"response": data}, pretty=True)
        return Response(content=xml_content, media_type="application/xml")
    return Response(
        content=json.dumps(data),
        media_type="application/json"
    )

@router.post("/receive")
async def receive_uplink(request: Request, db: Session = Depends(get_db)):
    """Recebe dados de telemetria."""
    _require_token(request)

    raw = await request.body()
    content_type = request.headers.get("content-type", "")
    is_xml = _is_xml_request(raw, content_type)
    
    # Converte para dicionário antes de passar para o serviço
    payload = _parse_payload(raw, content_type)

    # Chama o serviço de ingestão
    result = ingest_envelope(payload, db)
    
    return _make_response(result, is_xml)

@router.post("/confirmation")
async def provisioning_confirmation(request: Request):
    """Endpoint de confirmação de provisionamento (Globalstar form B4.3)."""
    _require_token(request)
    raw = await request.body()
    content_type = request.headers.get("content-type", "")
    is_xml = _is_xml_request(raw, content_type)
    payload = _parse_payload(raw, content_type)

    esn = None
    if isinstance(payload, dict):
        # Tenta extrair o ESN de vários lugares possíveis
        for key in ("esn", "ESN", "device_esn", "deviceId"):
            if key in payload:
                esn = payload[key]
                break
        if not esn:
            # Estrutura aninhada comum da Globalstar
            if isinstance(payload.get("stuMessage"), dict):
                esn = payload["stuMessage"].get("esn")
            elif isinstance(payload.get("stuMessages"), dict):
                inner = payload["stuMessages"].get("stuMessage")
                if isinstance(inner, dict):
                    esn = inner.get("esn")

    log.info(f"Provisioning confirmation received for ESN: {esn}")

    result = {
        "status": "ok",
        "type": "provisioning_confirmation",
        "esn": esn,
        "ack": True,
    }
    return _make_response(result, is_xml)