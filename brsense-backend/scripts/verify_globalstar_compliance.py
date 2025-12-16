import requests
import xmltodict
import logging
from datetime import datetime

# Configurações
BASE_URL = "http://localhost:8000/v1/uplink/receive"
# Token configurado no seu .env (se houver validação de token ativa)
TOKEN = "SEU_TOKEN_AQUI" 

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_xml_uplink(name, xml_payload, expected_root_tag, expected_id_attr):
    """
    Envia um payload XML e valida a resposta segundo o padrão Globalstar.
    """
    headers = {
        "Content-Type": "application/xml",
        "X-Uplink-Token": TOKEN
    }
    
    logger.info(f"--- Testando: {name} ---")
    
    try:
        response = requests.post(BASE_URL, data=xml_payload, headers=headers)
    except requests.exceptions.ConnectionError:
        logger.error("FALHA: Não foi possível conectar ao servidor. O backend está rodando?")
        return False

    # 1. Valida Status Code
    if response.status_code != 200:
        logger.error(f"FALHA: Status code {response.status_code} (Esperado 200)")
        logger.error(f"Resposta: {response.text}")
        return False

    # 2. Valida se o retorno é XML
    try:
        resp_data = xmltodict.parse(response.text)
    except Exception as e:
        logger.error(f"FALHA: Resposta não é um XML válido. Erro: {e}")
        logger.error(f"Conteúdo recebido: {response.text}")
        return False

    # 3. Valida a Tag Raiz (<stuResponse> ou <prvResponse>)
    if expected_root_tag not in resp_data:
        logger.error(f"FALHA: Tag raiz incorreta. Esperado: <{expected_root_tag}>. Encontrado: {list(resp_data.keys())}")
        return False
    
    root = resp_data[expected_root_tag]
    
    # 4. Valida atributos obrigatórios
    # - result="pass" (Case sensitive? Geralmente minúsculo)
    if root.get("@result") != "pass":
        logger.error(f"FALHA: Atributo 'result' deve ser 'pass'. Recebido: {root.get('@result')}")
        return False

    # - timeStamp (Deve existir)
    if not root.get("@timeStamp"):
        logger.error("FALHA: Atributo 'timeStamp' ausente na resposta.")
        return False

    # - messageID / prvMessageID (Deve ser igual ao enviado)
    # Extrai o ID do payload enviado para comparar
    sent_data = xmltodict.parse(xml_payload)
    sent_root = list(sent_data.keys())[0]
    sent_id = sent_data[sent_root].get(f"@{expected_id_attr}")
    
    # Se o XML enviado tinha ID, a resposta TEM que ecoar o mesmo ID
    if sent_id:
        received_id = root.get(f"@{expected_id_attr}")
        if received_id != sent_id:
            logger.error(f"FALHA: ID incorreto na resposta. Enviado: {sent_id}, Recebido: {received_id}")
            return False
    
    logger.info("SUCESSO: Resposta válida conformidade Globalstar.\n")
    return True

# --- PAYLOADS DE TESTE (Copiados dos arquivos da Globalstar) ---

# 1. Mensagem Padrão (StuMessage_Rev8.xml)
XML_STANDARD = """<?xml version="1.0" encoding="UTF-8"?>
<stuMessages xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://cody.glpconnect.com/XSD/StuMessage_Rev1_0.xsd" timeStamp="15/12/2016 21:00:00 GMT" messageID="5119a9408eb81e058b99e52e4a62b64f">
  <stuMessage>
    <esn>0-99990</esn>
    <unixTime>1034268516</unixTime>
    <gps>N</gps>
    <payload length="9" source="pc" encoding="hex">0xC0560D72DA4AB2445A</payload>
  </stuMessage>
</stuMessages>"""

# 2. Heartbeat Vazio (EmptyStuMessage_Rev8.xml) - CRÍTICO, costuma falhar
XML_EMPTY = """<?xml version="1.0" encoding="UTF-8"?>
<stuMessages xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://cody.glpconnect.com/XSD/StuMessage_Rev1_0.xsd" timeStamp="15/12/2016 21:00:00 GMT" messageID="56bdca4808861d048fddba385e1cd5d8">
</stuMessages>"""

# 3. Mensagem de Provisionamento (ProvisionMessage_Rev8.xml)
XML_PROVISION = """<?xml version="1.0" encoding = "UTF-8"?>
<prvmsgs xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://cody.glpconnect.com/XSD/ProvisionMessage_Rev1_0.xsd" timeStamp="15/12/2016 21:00:00 GMT" prvMessageID="56bdca4808861c048fddba385e1cd5c8">
<prvmsg>
<esn>9-99998</esn>
<provID>1234</provID>
</prvmsg>
</prvmsgs>"""

# --- EXECUÇÃO ---
if __name__ == "__main__":
    print("Iniciando bateria de testes de certificação Globalstar...\n")
    
    tests = [
        ("Standard Telemetry", XML_STANDARD, "stuResponse", "messageID"),
        ("Empty Heartbeat", XML_EMPTY, "stuResponse", "messageID"),
        ("Provisioning", XML_PROVISION, "prvResponse", "prvMessageID"),
    ]
    
    failures = 0
    for name, xml, tag, attr in tests:
        if not test_xml_uplink(name, xml, tag, attr):
            failures += 1
            
    if failures == 0:
        print("\n✅ TODOS OS TESTES PASSARAM! Seu backend está pronto para validação.")
    else:
        print(f"\n❌ {failures} testes falharam. Verifique os logs acima.")