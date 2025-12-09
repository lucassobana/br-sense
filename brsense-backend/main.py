from fastapi import FastAPI, Depends, Request, HTTPException, Body, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
import xml.etree.ElementTree as ET

# Importações locais
import schemas  # Seus schemas Pydantic
from database import engine, Base, get_db
from models import Probe, Measurement, RequestLog, User

# Cria as tabelas no banco de dados
Base.metadata.create_all(bind=engine)

app = FastAPI(title="BRSense SmartOne C Backend - Auto Provisioning")

# --- CONFIGURAÇÃO DE CORS (Importante para o Frontend) ---
origins = [
    "http://localhost:5173",  # Porta padrão do Vite/React
    "http://127.0.0.1:5173",
    "*"                       # Apenas para desenvolvimento (libera tudo)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. Funções Auxiliares (Decodificadores) ---

def decode_smartone_payload(hex_str: str) -> dict:
    results = {}
    try:
        clean_hex = hex_str.strip().lower().replace("0x", "")
        data_bytes = bytes.fromhex(clean_hex)
        
        if len(data_bytes) != 9:
            return {'error': f'Tamanho incorreto: {len(data_bytes)} bytes'}

        # Extração baseada no protocolo SmartOne C
        results['msg_type'] = data_bytes[0]
        results['sensors'] = [int(b) for b in data_bytes[1:7]] # Lista com 6 valores
        results['device_temp'] = int(data_bytes[7])
        results['protocol'] = data_bytes[8]
        
        return results
    except Exception as e:
        return {'error': str(e)}

def parse_globalstar_xml(raw_body: str) -> list:
    messages = []
    try:
        wrapped_xml = f"<root>{raw_body}</root>"
        root = ET.fromstring(wrapped_xml)

        for msg in root.findall(".//stuMessage"):
            item = {}
            esn = msg.find("esn")
            payload = msg.find("payload")
            
            if esn is not None: item['esn'] = esn.text
            if payload is not None: item['hex_payload'] = payload.text
            
            messages.append(item)
    except ET.ParseError:
        pass
    return messages

# --- 2. Rota de Webhook (Globalstar) ---

@app.post("/webhook/globalstar")
async def receive_telemetry(
    request: Request,
    db: Session = Depends(get_db),
    raw_body_bytes: bytes = Body(..., media_type="application/xml", description="XML Globalstar")
):
    body_str = raw_body_bytes.decode("utf-8", errors="ignore")
    client_ip = request.client.host if request.client else "unknown"

    # 1. Log inicial (Status: PROCESSING)
    req_log = RequestLog(
        client_ip=client_ip,
        raw_body=body_str,
        status="PROCESSING",
        log_message="Iniciando processamento..."
    )
    db.add(req_log)
    db.commit()
    db.refresh(req_log)

    processed_count = 0
    created_count = 0
    errors = []

    try:
        # 2. Parse do XML
        messages = parse_globalstar_xml(body_str)
        
        if not messages:
            req_log.status = "IGNORED"
            req_log.log_message = "XML vazio ou inválido."
            db.commit()
            return {"status": "ignored"}

        # 3. Loop nas Mensagens
        for msg in messages:
            esn = msg.get('esn')
            hex_payload = msg.get('hex_payload')

            if not esn: continue

            # --- REGRA DE NEGÓCIO: CREATE OU UPDATE ---
            probe = db.query(Probe).filter(Probe.identifier == esn).first()

            if not probe:
                # >>> CENÁRIO CREATE: Sonda não existe, cria nova <<<
                print(f"[AUTO-PROVISION] Criando nova sonda: {esn}")
                probe = Probe(
                    identifier=esn,
                    name=f"Nova Sonda {esn}",
                    location="0, 0",
                    status="Novo cadastro via Satélite",
                    user_id=None # Sem dono inicialmente
                )
                db.add(probe)
                db.flush() # Garante ID para uso imediato
                created_count += 1
            else:
                # >>> CENÁRIO UPDATE <<<
                print(f"[UPDATE] Atualizando sonda existente: {esn}")

            # 4. Processamento do Payload (Sensores)
            if hex_payload:
                data = decode_smartone_payload(hex_payload)
                
                if 'error' in data:
                    errors.append(f"Erro decode {esn}: {data['error']}")
                    probe.last_communication = datetime.utcnow()
                    probe.status = "Erro de Payload"
                else:
                    probe.last_communication = datetime.utcnow()
                    probe.status = f"Online | Temp Interna: {data['device_temp']} | Protocolo: {data['protocol']}"

                    # Salva as 6 Medições
                    for idx, val in enumerate(data['sensors']):
                        new_meas = Measurement(
                            probe_id=probe.id,
                            sensor_index=idx + 1,
                            value=float(val),
                            timestamp=datetime.utcnow()
                        )
                        db.add(new_meas)
                
                processed_count += 1

        # 5. Finalização do Log
        req_log.status = "SUCCESS" if not errors else "WARNING"
        req_log.log_message = f"Processados: {processed_count}. Criados: {created_count}. Erros: {len(errors)}"
        
        db.commit()

        return {
            "status": "success", 
            "processed": processed_count, 
            "created_probes": created_count,
            "log_id": req_log.id
        }

    except Exception as e:
        db.rollback()
        req_log.status = "FATAL_ERROR"
        req_log.log_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

# --- 3. Rotas de Autenticação (Auth) ---

@app.post("/api/register", status_code=status.HTTP_201_CREATED)
def register_user(data: schemas.RegisterSchema, db: Session = Depends(get_db)):
    # 1. Verifica se o login já existe
    user_exists = db.query(User).filter(User.login == data.login).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Este login já está cadastrado.")

    # 2. Cria usuário (Senha em texto plano por enquanto, ideal usar hash em prod)
    new_user = User(
        name=data.name,
        login=data.login,
        password=data.password, 
        role="FAZENDEIRO" # Role padrão
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {"status": "success", "message": "Usuário criado", "user_id": new_user.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao salvar usuário.")

@app.post("/api/login")
def login_user(data: schemas.LoginSchema, db: Session = Depends(get_db)):
    # 1. Busca usuário
    user = db.query(User).filter(User.login == data.login).first()
    
    # 2. Valida senha
    if not user or user.password != data.password:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # 3. Retorna sucesso
    return {
        "status": "success",
        "user": {
            "id": user.id,
            "name": user.name,
            "login": user.login,
            "role": user.role
        }
    }

# --- 4. Rotas de Leitura (Dados) ---

@app.get("/api/requests")
def get_requests_history(limit: int = 10, db: Session = Depends(get_db)):
    return db.query(RequestLog).order_by(desc(RequestLog.timestamp)).limit(limit).all()

@app.get("/api/probes")
def get_probes(db: Session = Depends(get_db)):
    return db.query(Probe).all()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)