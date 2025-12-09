from flask import Blueprint, request, jsonify
from . import db
from .models import Probe, Measurement, Sensor
from datetime import datetime
import xml.etree.ElementTree as ET

main_bp = Blueprint('main', __name__)

# --- Início da Lógica Reutilizada e Adaptada do GitHub ---

def process_globalstar_data(data_dict):
    """
    Função auxiliar para processar os dados extraídos (seja de XML ou JSON)
    e atualizar o banco de dados PostgreSQL.
    """
    try:
        # 1. Extrair o identificador crucial (ESN - Electronic Serial Number)
        # O nome do campo depende da estrutura exata enviada pela Globalstar
        esn = data_dict.get('esn') or data_dict.get('id')

        if not esn:
            print("Erro: ESN/Identificador não encontrado nos dados.")
            return False

        # 2. Tentar encontrar a sonda no banco de dados SQL pelo identificador
        probe = Probe.query.filter_by(identifier=esn).first()

        if not probe:
            print(f"Sonda com identificador {esn} não encontrada no sistema. Ignorando.")
            # Dependendo da regra de negócio, poderíamos criar uma nova sonda aqui,
            # mas geralmente só atualizamos sondas previamente cadastradas por um usuário.
            return False

        # 3. Atualizar dados da Sonda (Localização, Status, Última Comunicação)
        # Adaptar os nomes dos campos baseados no payload real da Globalstar
        latitude = data_dict.get('latitude')
        longitude = data_dict.get('longitude')

        if latitude and longitude:
            # Atualiza a localização no formato string conforme o DER
            probe.location = f"{latitude}, {longitude}"

        # Exemplo: Atualizar status baseado na bateria se disponível
        battery_status = data_dict.get('batteryState')
        if battery_status:
             probe.status = f"Ativo - Bateria: {battery_status}"

        probe.last_communication = datetime.utcnow()

        # 4. (Opcional) Se o payload contiver dados de sensores, salvar em Measurements
        # Isso depende de como a sonda envia os dados via Globalstar.
        # Exemplo hipotético se vier um campo 'temperature_val':
        temp_val = data_dict.get('temperature_val')
        if temp_val:
             # Tenta achar o sensor de temperatura dessa sonda
             temp_sensor = Sensor.query.filter_by(probe_id=probe.id, type='temperature').first()
             if temp_sensor:
                 new_measurement = Measurement(
                     sensor_id=temp_sensor.id,
                     probe_id=probe.id,
                     value=float(temp_val),
                     timestamp=datetime.utcnow()
                 )
                 db.session.add(new_measurement)

        # 5. Efetivar as mudanças no banco de dados
        db.session.commit()
        print(f"Sonda {esn} atualizada com sucesso.")
        return True

    except Exception as e:
        db.session.rollback()
        print(f"Erro ao processar dados da Globalstar: {e}")
        return False


@main_bp.route('/webhook/globalstar', methods=['POST'])
def globalstar_webhook():
    """
    Endpoint para receber dados da Globalstar.
    Baseado no código original, ele precisa lidar com XML ou JSON.
    """
    data = None
    content_type = request.headers.get('Content-Type', '')

    try:
        # Lógica de parse adaptada do repositório original
        if 'application/xml' in content_type or 'text/xml' in content_type:
            # Parse Básico de XML (Necessita ajuste fino dependendo do XML real da Globalstar)
            root = ET.fromstring(request.data)
            # Exemplo simplificado: transformar o XML em um dicionário plano
            data = {child.tag: child.text for child in root.iter()}
        elif 'application/json' in content_type:
            data = request.get_json()
        else:
            # Tentativa de fallback se o content-type não for explícito
            data = request.get_json(silent=True) or request.form.to_dict()

        if not data:
            return jsonify({'error': 'Formato de dados não suportado ou vazio'}), 400

        # Chama a função auxiliar que interage com o PostgreSQL
        success = process_globalstar_data(data)

        if success:
            return jsonify({'status': 'success', 'message': 'Dados processados'}), 200
        else:
            # Retornamos 200 para a Globalstar não ficar tentando reenviar se for um erro de negócio (ex: sonda não encontrada)
            return jsonify({'status': 'ignored', 'message': 'Dados ignorados ou erro no processamento'}), 200

    except Exception as e:
        print(f"Erro crítico no webhook: {e}")
        # Retornar 500 pode fazer a Globalstar tentar novamente depois
        return jsonify({'error': str(e)}), 500

# --- Fim da Lógica Reutilizada ---

# Exemplo de rota R do CRUD (Leitura) para testar o novo banco
@main_bp.route('/api/probes', methods=['GET'])
def get_probes():
    probes = Probe.query.all()
    output = []
    for probe in probes:
        probe_data = {
            'id': probe.id,
            'identifier': probe.identifier,
            'name': probe.name,
            'location': probe.location,
            'status': probe.status,
            'last_communication': probe.last_communication
        }
        output.append(probe_data)
    return jsonify({'probes': output})