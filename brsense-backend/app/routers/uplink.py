# api/app/routers/uplink.py
import logging
import xmltodict
import json
from datetime import datetime
from fastapi import APIRouter, Depends, Request, HTTPException, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.ingest import ingest_envelope 
from app.settings import settings

router = APIRouter()

# Lista de IPs da Globalstar (Whitelist)
GLOBALSTAR_IPS = {
    "3.228.87.237",
    "34.231.245.76",
    "3.135.136.171",
    "3.133.245.206",
    "127.0.0.1", 
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

    if client_ip in GLOBALSTAR_IPS:
        return

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

@router.post("/receive")
async def receive_uplink(request: Request, db: Session = Depends(get_db)):
    """
    Recebe dados de telemetria e provisionamento.
    Gera respostas compatíveis com o ICD da Globalstar (GS-01-0777).
    """
    _require_token(request)

    raw = await request.body()
    content_type = request.headers.get("content-type", "")
    is_xml = _is_xml_request(raw, content_type)
    
    # Converte payload
    payload = _parse_payload(raw, content_type)

    # Chama o serviço de ingestão (Processa StuMessages)
    # ProvisionMessages passarão sem erro (0 processados), o que é esperado
    result_ingest = ingest_envelope(payload, db)
    
    # Se a requisição for XML, a resposta DEVE ser XML no formato específico
    if is_xml and isinstance(payload, dict):
        response_tag = "response"
        attributes = {"@result": "pass"}
        
        # Data/Hora atual para a resposta (Formato GMT exigido)
        timestamp_str = datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S GMT")
        attributes["@timeStamp"] = timestamp_str

        # 1. Trata StuMessages (Telemetria)
        if "stuMessages" in payload:
            response_tag = "stuResponse"
            msgs = payload["stuMessages"]
            # Captura o messageID da requisição para ecoar na resposta
            if msgs and isinstance(msgs, dict) and "@messageID" in msgs:
                attributes["@messageID"] = msgs["@messageID"]

        # 2. Trata ProvisionMessages (Provisionamento)
        elif "prvmsgs" in payload:
            response_tag = "prvResponse"
            msgs = payload["prvmsgs"]
            # Captura o prvMessageID da requisição
            if msgs and isinstance(msgs, dict) and "@prvMessageID" in msgs:
                attributes["@prvMessageID"] = msgs["@prvMessageID"]

        # Monta o XML final
        xml_content = xmltodict.unparse({response_tag: attributes}, pretty=True)
        return Response(content=xml_content, media_type="application/xml")

    # Fallback para JSON (apenas para testes locais manuais)
    return Response(content=json.dumps(result_ingest), media_type="application/json")

@router.post("/confirmation")
async def provisioning_confirmation(request: Request):
    """
    Endpoint de confirmação de provisionamento.
    NOTA: A rota /receive já lida com isso automaticamente.
    Mantenha esta rota apenas se tiver configurado uma URL separada para provisionamento.
    """
    _require_token(request)
    
    # 1. Processa o Request
    raw = await request.body()
    content_type = request.headers.get("content-type", "")
    is_xml = _is_xml_request(raw, content_type)
    payload = _parse_payload(raw, content_type)

    # 2. Prepara os dados da resposta padrão Globalstar
    # Formato de data obrigatório: dd/MM/yyyy HH:mm:ss GMT
    timestamp_str = datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S GMT")
    
    # A resposta padrão para Provisionamento deve ser <prvResponse>
    response_tag = "prvResponse"
    attributes = {
        "@result": "pass",
        "@timeStamp": timestamp_str
    }

    # 3. Tenta extrair e ecoar o ID da mensagem (Obrigatório)
    if isinstance(payload, dict):
        # Se for mensagem de provisionamento (<prvmsgs>)
        if "prvmsgs" in payload:
            msgs = payload["prvmsgs"]
            if msgs and isinstance(msgs, dict) and "@prvMessageID" in msgs:
                attributes["@prvMessageID"] = msgs["@prvMessageID"]
        
        # Fallback: Se por acaso chegar uma mensagem de telemetria aqui
        elif "stuMessages" in payload:
            response_tag = "stuResponse"
            msgs = payload["stuMessages"]
            if msgs and isinstance(msgs, dict) and "@messageID" in msgs:
                attributes["@messageID"] = msgs["@messageID"]

    # 4. Retorna a resposta XML correta
    if is_xml:
        xml_content = xmltodict.unparse({response_tag: attributes}, pretty=True)
        return Response(content=xml_content, media_type="application/xml")

    # Fallback JSON (apenas para debug manual)
    return Response(content=json.dumps(attributes), media_type="application/json")