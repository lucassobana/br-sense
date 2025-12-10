# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.settings import settings

# Importando as rotas
from app.routers import uplink, auth, devices, readings # <--- Adicionado readings

app = FastAPI(title=settings.APP_NAME)

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
# app.include_router(uplink.router, tags=["Uplink"])     # Webhook Globalstar
app.include_router(auth.router, prefix="/api", tags=["Auth"]) # Autenticação
app.include_router(devices.router, prefix="/api", tags=["Devices"]) # Gestão de Devices
app.include_router(readings.router, prefix="/api", tags=["Leituras"]) # <--- Nova rota do gráfico

# Rota de teste simples
@app.get("/")
def root():
    return {"message": "Sistema Online", "docs": "/docs"}