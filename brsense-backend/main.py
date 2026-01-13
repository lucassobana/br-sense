# main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.settings import settings
from app.db.session import SessionLocal
from app.models.request_log import RequestLog

# Importando as rotas
from app.routers import uplink, auth, devices, readings, farms # <--- Adicionado readings

app = FastAPI(
    title=settings.APP_NAME,
    swagger_ui_init_oauth={
        "clientId": "brsense-frontend",  # Preenche automático
        "appName": "BRSense API",
        "usePkceWithAuthorizationCodeGrant": True,
    },
)

@app.middleware("http")
async def log_uplink_requests(request: Request, call_next):
    """
    Middleware que intercepta requisições POST para /uplink/receive.
    Lê o corpo, salva no banco de dados e restaura o corpo para a rota original.
    """
    # Verifica se é a rota de receive e método POST
    if request.method == "POST" and "uplink/receive" in request.url.path:
        
        # 1. Ler o corpo (Isso consome o stream da requisição)
        body_bytes = await request.body()
        
        # 2. Restaurar o corpo para que a rota original possa lê-lo novamente
        # Se não fizermos isso, a aplicação travará esperando o body que já foi lido
        async def receive():
            return {"type": "http.request", "body": body_bytes}
        request._receive = receive
        
        # 3. Salvar no banco de dados (usando uma sessão dedicada e isolada)
        try:
            db = SessionLocal()
            
            # Tenta identificar o IP (considerando headers de proxy)
            client_ip = (
                request.headers.get("cf-connecting-ip") or 
                request.headers.get("x-forwarded-for") or 
                (request.client.host if request.client else "unknown")
            )
            
            # Tenta decodificar para string (para salvar legível), senão salva vazio
            decoded_body = body_bytes.decode("utf-8", errors="replace")

            log_entry = RequestLog(
                client_ip=str(client_ip),
                raw_body=decoded_body,
                status="INTERCEPTED", # Status inicial indicando que o middleware pegou
                log_message=f"Content-Type: {request.headers.get('content-type')}"
            )
            db.add(log_entry)
            db.commit()
            db.close()
        except Exception as e:
            print(f"Erro ao salvar log no middleware: {e}")
            # Não levantamos erro aqui para não parar o fluxo principal da API
            
    # Continua o processamento normal para a rota de destino
    response = await call_next(request)
    return response

# Configuração de CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrando as Rotas
app.include_router(uplink.router, prefix="/v1/uplink", tags=["Uplink"])     # Webhook Globalstar
app.include_router(auth.router, prefix="/api", tags=["Auth"]) # Autenticação
app.include_router(devices.router, prefix="/api", tags=["Devices"]) # Gestão de Devices
app.include_router(readings.router, prefix="/api", tags=["Readings"]) # <--- Nova rota do gráfico
app.include_router(farms.router, prefix="/api", tags=["Farms"]) # <--- Nova rota do gráfico

# Rota de teste simples
@app.get("/")
def root():
    return {"message": "Sistema Online", "docs": "/docs"}