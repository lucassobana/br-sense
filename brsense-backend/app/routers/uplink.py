# api/app/routers/uplink.py
import logging
import xmltodict
import json
import uuid
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
    "186.193.129.217",
    "200.214.44.100"
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
    """
    _require_token(request)

    raw = await request.body()
    content_type = request.headers.get("content-type", "")
    is_xml = _is_xml_request(raw, content_type)
    
    # Converte payload
    payload = _parse_payload(raw, content_type)

    # Chama o serviço de ingestão (Processa StuMessages)
    result_ingest = ingest_envelope(payload, db)
    
    # Se a requisição for XML, a resposta DEVE ser XML no formato específico
    if is_xml and isinstance(payload, dict):
        # Gera timestamp e ID único para a resposta
        timestamp_str = datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S GMT")
        response_id = uuid.uuid4().hex

        # 1. Trata StuMessages (Telemetria) -> Formato <stuResponseMsg>
        if "stuMessages" in payload:
            msgs = payload["stuMessages"]
            # Pega o messageID que ELES enviaram para devolver como correlationID
            incoming_id = msgs.get("@messageID", "") if isinstance(msgs, dict) else ""
            
            response_data = {
                "stuResponseMsg": {
                    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                    "@xsi:noNamespaceSchemaLocation": "http://cody.glpconnect.com/XSD/StuResponse_Rev1_0.xsd",
                    "@deliveryTimeStamp": timestamp_str,
                    "@messageID": response_id,      # Nosso ID
                    "@correlationID": incoming_id,  # O ID deles (MANDATORY)
                    "state": "pass",                # Elemento filho (MANDATORY)
                    "stateMessage": "Store OK"      # Elemento filho (Optional)
                }
            }

        # 2. Trata ProvisionMessages (Provisionamento) -> Formato <prvResponseMsg>
        elif "prvmsgs" in payload:
            msgs = payload["prvmsgs"]
            # Pega o prvMessageID que ELES enviaram
            incoming_id = msgs.get("@prvMessageID", "") if isinstance(msgs, dict) else ""

            response_data = {
                "prvResponseMsg": {
                    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                    "@xsi:noNamespaceSchemaLocation": "http://cody.glpconnect.com/XSD/ProvisionResponse_Rev1_0.xsd",
                    "@deliveryTimeStamp": timestamp_str,
                    # messageID é PROIBIDO na resposta de provisionamento (Ver ICD Pag 19)
                    "@correlationID": incoming_id,
                    "state": "PASS",
                    "stateMessage": "Store OK"
                }
            }
        
        # 3. Fallback genérico (caso venha algo inesperado, evita erro 500)
        else:
            response_data = {
                "response": {
                    "@result": "pass",
                    "@timeStamp": timestamp_str
                }
            }

        # Monta o XML final
        xml_content = xmltodict.unparse(response_data, pretty=True)
        return Response(content=xml_content, media_type="application/xml")

    # Fallback para JSON (apenas para testes locais manuais)
    return Response(content=json.dumps(result_ingest), media_type="application/json")

@router.post("/confirmation")
async def provisioning_confirmation(request: Request):
    """
    Endpoint de confirmação de provisionamento ajustado para o padrão ICD da Globalstar.
    """
    _require_token(request)
    raw = await request.body()
    content_type = request.headers.get("content-type", "")
    payload = _parse_payload(raw, content_type)

    # 1. Identificar o ID da mensagem recebida para usar como correlationID
    incoming_id = ""
    if isinstance(payload, dict) and "prvmsgs" in payload:
        msgs = payload["prvmsgs"]
        if isinstance(msgs, dict):
            incoming_id = msgs.get("@prvMessageID", "")

    # 2. Gerar Timestamp no formato exigido
    timestamp_str = datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S GMT")

    # 3. Montar a resposta estritamente conforme o ICD (prvResponseMsg)
    response_data = {
        "prvResponseMsg": {
            "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
            "@xsi:noNamespaceSchemaLocation": "http://cody.glpconnect.com/XSD/ProvisionResponse_Rev1_0.xsd",
            "@deliveryTimeStamp": timestamp_str,
            "@correlationID": incoming_id,  # Obrigatório: devolve o ID que eles enviaram
            "state": "PASS",
            "stateMessage": "Store OK"
        }
    }

    # 4. Gerar e retornar o XML
    xml_content = xmltodict.unparse(response_data, pretty=True)
    return Response(content=xml_content, media_type="application/xml")