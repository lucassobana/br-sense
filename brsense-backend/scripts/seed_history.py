# brsense-backend/scripts/seed_history.py
import sys
import os
import random
from datetime import datetime, timedelta
import math

# --- CORREÇÃO DE PATH ---
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# ------------------------

from app.db.session import SessionLocal
from app.models.device import Device
from app.models.reading import Reading
# Se você tiver DeviceConfig no seu modelo novo, mantenha. Se não, remova o import e a parte do config.
try:
    from app.models.device_config import DeviceConfig
    HAS_CONFIG = True
except ImportError:
    HAS_CONFIG = False

def seed_history():
    db = SessionLocal()
    
    # 1. Configura a Sonda de Teste
    esn = "TEST-GRAPH-01"
    print(f"--- Configurando Sonda {esn} ---")
    
    # Tenta buscar pelo ESN
    device = db.query(Device).filter(Device.esn == esn).first()
    
    if not device:
        # Se não existe, cria
        device = Device(
            esn=esn, 
            name="Sonda Campo A (Simulada)"
            # Se seu modelo Device não tem 'location', remova esta linha abaixo:
            # location="Setor Norte" 
        )
        # Adiciona location se o seu modelo suportar
        if hasattr(device, 'location'):
            device.location = "Setor Norte"
            
        db.add(device)
        db.commit()
        db.refresh(device)
        print(f"Dispositivo criado: ID {device.id}")
    else:
        print(f"Dispositivo encontrado: ID {device.id}")

    # 2. Configura Device Config (Apenas se a tabela existir)
    if HAS_CONFIG:
        config = db.query(DeviceConfig).filter(DeviceConfig.device_id == device.id).first()
        if not config:
            config = DeviceConfig(
                device_id=device.id,
                mode="fixed",
                lat=-23.5505, # São Paulo
                lon=-46.6333,
                updated_at=datetime.utcnow()
            )
            db.add(config)
        else:
            # Atualiza coordenadas
            config.lat = -23.5505
            config.lon = -46.6333
            db.add(config) # Marca para update

    # 3. Gera 7 dias de dados (1 leitura a cada hora)
    print("--- Gerando histórico de 7 dias... ---")
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    
    current_time = start_date
    base_moisture = 35.0 
    records_created = 0
    
    while current_time <= end_date:
        # Lógica de simulação (Temperatura/Umidade)
        hour = current_time.hour
        temp_variation = 5 * math.sin((hour - 8) * math.pi / 12) 
        temperature = 25 + temp_variation + random.uniform(-0.5, 0.5)
        
        base_moisture -= 0.05 
        if base_moisture < 15:
            base_moisture = 35.0
        final_moisture = base_moisture + random.uniform(-0.2, 0.2)
        
        # Cria leituras para diferentes profundidades
        depths = [10.0, 30.0, 60.0]
        for depth in depths:
            depth_factor = (depth / 100) * 5 
            
            # CRIAÇÃO DA LEITURA (Sem Message)
            reading = Reading(
                device_id=device.id,
                timestamp=current_time,
                depth_cm=depth,
                moisture_pct=round(final_moisture + depth_factor, 2),
                temperature_c=round(temperature - (depth/20), 2)
            )
            db.add(reading)
            records_created += 1
            
        current_time += timedelta(hours=1)
        
        # Commit periódico para não sobrecarregar
        if records_created % 100 == 0:
             db.commit()

    db.commit()
    print(f"--- Sucesso! {records_created} leituras geradas. ---")
    db.close()

if __name__ == "__main__":
    seed_history()