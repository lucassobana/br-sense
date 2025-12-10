# verificar_banco.py
from app.db.session import SessionLocal
from app.models.device import Device
from app.models.reading import Reading

db = SessionLocal()

print("--- VERIFICAÇÃO DE DADOS ---")

# 1. Verificar Dispositivos
devices = db.query(Device).all()
print(f"\nDispositivos encontrados: {len(devices)}")
for d in devices:
    print(f"ID: {d.id} | ESN: {d.esn} | Nome: {d.name} | Localização: {d.location}")

# 2. Verificar Leituras
readings = db.query(Reading).order_by(Reading.id.desc()).limit(10).all()
print(f"\nÚltimas {len(readings)} leituras salvas:")
for r in readings:
    print(f"ID: {r.id} | Device ID: {r.device_id} | Prof: {r.depth_cm}cm | Umidade: {r.moisture_pct}% | Temp: {r.temperature_c}°C | Data: {r.timestamp}")

db.close()