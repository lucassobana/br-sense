import xml.etree.ElementTree as ET
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.device import Device
from app.models.reading import Reading
# Se você tiver um decodificador específico, importe aqui, ex:
# from app.decoders.smartone_c import decode_type0

def process_globalstar_data(db: Session, data_dict: dict) -> bool:
    """
    Processa dados extraídos (dicionário) e atualiza o Device correspondente.
    Adaptado de 'lucassobana/br-sense'.
    """
    try:
        # 1. Extrair o ESN (No novo modelo chama-se 'esn', no antigo era 'identifier')
        # Tenta pegar 'esn' ou 'id' ou 'stuId' (comum em XML da Globalstar)
        esn = data_dict.get('esn') or data_dict.get('id') or data_dict.get('stuId')

        if not esn:
            print("Erro: ESN/Identificador não encontrado nos dados.")
            return False

        # 2. Buscar o dispositivo no banco de dados
        # No SQLAlchemy novo, usamos query no modelo Device
        device = db.query(Device).filter(Device.esn == esn).first()

        if not device:
            print(f"Sonda com ESN {esn} não encontrada. Ignorando.")
            return False

        # 3. Atualizar dados do Dispositivo (Localização e Status)
        # Verifica se vieram coordenadas diretas no pacote
        latitude = data_dict.get('latitude') or data_dict.get('lat')
        longitude = data_dict.get('longitude') or data_dict.get('lon')

        if latitude and longitude:
            # O modelo Device tem um campo 'location' (String)
            device.location = f"{latitude}, {longitude}"

        # Atualiza status/bateria se disponível
        battery_status = data_dict.get('batteryState')
        if battery_status:
            # Você pode salvar isso num campo de status ou log
            # Como o modelo Device não tem campo 'status' explícito no snippet, 
            # podemos assumir que pode ir numa descrição ou ignorar por enquanto
            pass 

        # Atualiza data de modificação
        device.updated_at = datetime.utcnow()

        # 4. Processar Leituras (Measurements -> Readings)
        # Se houver lógica de decodificação de sensores (ex: umidade), insira aqui.
        # Exemplo simples adaptado:
        # if 'rawPayload' in data_dict:
        #     readings = decodificar_payload(data_dict['rawPayload'])
        #     for r in readings:
        #         new_reading = Reading(device_id=device.id, **r)
        #         db.add(new_reading)

        # 5. Commit
        db.commit()
        db.refresh(device)
        print(f"Device {esn} atualizado com sucesso.")
        return True

    except Exception as e:
        db.rollback()
        print(f"Erro ao processar dados da Globalstar: {e}")
        return False

def parse_globalstar_xml(xml_content: str) -> dict:
    """Helper para converter XML bruto da Globalstar em dicionário."""
    try:
        root = ET.fromstring(xml_content)
        return {child.tag: child.text for child in root.iter()}
    except Exception as e:
        print(f"Erro no parse XML: {e}")
        return {}