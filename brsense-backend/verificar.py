# verificar.py
from app.db.session import SessionLocal
from app.models.device import Device
# Import necessário para o SQLAlchemy carregar a tabela
from app.models.reading import Reading 

db = SessionLocal()
device = db.query(Device).filter(Device.esn == "TEST-01").first()

print("--- RESULTADO DO TESTE ---")
if device:
    print(f"Nome: {device.name}")
    print(f"ESN: {device.esn}")
    print(f"Localização no Banco: {device.location}")
    
    # Se a localização for diferente de "0, 0", funcionou!
    if device.location != "0, 0":
        print("✅ SUCESSO! A localização foi atualizada via satélite.")
    else:
        print("❌ FALHA! A localização ainda é a original.")
else:
    print("Erro: Dispositivo não encontrado.")

db.close()