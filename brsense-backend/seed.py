from app.db.session import SessionLocal
from app.models.device import Device
from app.models.reading import Reading

db = SessionLocal()

# Tenta buscar ou criar uma sonda de teste
esn_teste = "TEST-01"
device = db.query(Device).filter(Device.esn == esn_teste).first()

if not device:
    print(f"Criando sonda {esn_teste}...")
    device = Device(esn=esn_teste, name="Sonda de Teste", location="0, 0")
    db.add(device)
    db.commit()
    print("Sonda criada com sucesso!")
else:
    print(f"Sonda {esn_teste} já existe no banco.")

db.close()