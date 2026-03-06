# app/decoders/smartone_c.py
from datetime import datetime

def decode_soil_payload(hex_payload: str, timestamp: datetime) -> list[dict]:
    """
    Função principal e unificada.
    Decodifica o payload hexadecimal do SmartOne C e roteia para o decoder
    correto (Legado ou V4.2) mantendo sempre o mesmo formato de retorno.
    """
    try:
        # 1. Limpeza e conversão do hex
        clean_hex = hex_payload.strip().replace("0x", "").replace(" ", "")
        raw = bytes.fromhex(clean_hex)

        # 2. Validação básica de tamanho (ambos exigem 9 bytes)
        if len(raw) != 9:
            print(f"SmartOne Decoder: Tamanho incorreto ({len(raw)} bytes).")
            return []
        
        if raw[0] == 0x00 and raw[7] == 0x0A:
            print("SmartOne Decoder: Pacote de localização ignorado.")
            return []

        # 3. Identificação da versão do Payload
        # O legado sempre começa com 0x02 no byte 0 e tem 'H'(72) ou 'T'(84) no byte 7
        is_legacy = raw[0] == 0x02 and raw[7] in (0x48, 0x54)

        # 4. Roteamento
        if is_legacy:
            return _decode_legacy(raw, timestamp)
        else:
            return _decode_new_v2(raw, timestamp)

    except Exception as e:
        print(f"Erro na decodificação unificada SmartOne: {e}")
        return []


def _decode_legacy(raw: bytes, timestamp: datetime) -> list[dict]:
    """
    Decoder da versão antiga (Tipo 2).
    """
    type_char = chr(raw[7])
    data_bytes = [raw[i] for i in range(1, 7)]
    depths_cm = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0]
    readings = []

    if type_char == 'H':
        # Byte 8: Contador do pluviômetro
        rain_val_cm = float(raw[8]) * 0.1
        
        for i, val in enumerate(data_bytes):
            if i < len(depths_cm):
                current_rain = rain_val_cm if i == 0 else 0.0
                readings.append({
                    "depth_cm": depths_cm[i],
                    "moisture_pct": float(val),
                    "temperature_c": None,
                    "battery_status": None,
                    "solar_status": None,
                    "rain_cm": current_rain,
                })
                
    elif type_char == 'T':
        power_val = raw[8]
        battery_val, solar_val = _calculate_power_status(power_val, timestamp)

        for i, val in enumerate(data_bytes):
            if i < len(depths_cm):
                readings.append({
                    "depth_cm": depths_cm[i],
                    "moisture_pct": None,
                    "temperature_c": float(val),
                    "battery_status": battery_val,
                    "solar_status": solar_val,
                    "rain_cm": None
                })
    return readings


def _decode_new_v2(p: bytes, timestamp: datetime) -> list[dict]:
    """
    Decoder da versão nova (V4.2).
    Adaptado para retornar exatamente a mesma estrutura (lista de dicts) do legado.
    """
    # Deslocamento de bits para extrair os valores das sondas
    v1 = (p[1] << 2) | (p[2] >> 6)
    v2 = ((p[2] & 0x3F) << 4) | (p[3] >> 4)
    v3 = ((p[3] & 0x0F) << 6) | (p[4] >> 2)
    v4 = ((p[4] & 0x03) << 8) | p[5]
    v5 = (p[6] << 2) | (p[7] >> 6)
    v6 = ((p[7] & 0x3F) << 4) | (p[8] >> 4)

    is_temperatura = ((p[0] >> 2) & 0x01) == 1
    pluv_ou_bat = (((p[0] >> 3) & 0x1F) << 4) | (p[8] & 0x0F)

    depths_cm = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0]
    # Valores já formatados (divididos por 10.0) conforme a especificação v4.2
    sonda_valores = [
        round(v1 / 10.0, 1), round(v2 / 10.0, 1), round(v3 / 10.0, 1),
        round(v4 / 10.0, 1), round(v5 / 10.0, 1), round(v6 / 10.0, 1)
    ]

    readings = []

    if not is_temperatura:
        # UMIDADE (O valor extra é o Pluviômetro)
        rain_val_cm = float(pluv_ou_bat) * 0.1 # Seguindo a formatação original da V4.2
        
        for i, val in enumerate(sonda_valores):
            # A chuva é registrada apenas na primeira leitura (como no sistema legado)
            current_rain = rain_val_cm if i == 0 else 0.0
            
            readings.append({
                "depth_cm": depths_cm[i],
                "moisture_pct": float(val),
                "temperature_c": None,
                "battery_status": None,
                "solar_status": None,
                "rain_cm": current_rain,
            })
            
    else:
        # TEMPERATURA (O valor extra é a Bateria/Painel Solar)
        power_val = pluv_ou_bat / 10.0
        battery_val, solar_val = _calculate_power_status(power_val, timestamp)

        for i, val in enumerate(sonda_valores):
            readings.append({
                "depth_cm": depths_cm[i],
                "moisture_pct": None,
                "temperature_c": float(val),
                "battery_status": battery_val,
                "solar_status": solar_val,
                "rain_cm": None
            })

    return readings


def _calculate_power_status(power_val: float, timestamp: datetime) -> tuple[float | None, float | None]:
    """
    Função auxiliar isolada para aplicar as regras de negócio 
    de bateria e painel solar para ambas as versões.
    Retorna uma tupla: (battery_val, solar_val)
    """
    is_solar = False
    
    if power_val > 8:
        is_solar = True
    elif (timestamp.hour >= 22 or timestamp.hour < 5) and power_val <= 1:
        is_solar = True
    elif timestamp.hour % 2 != 0:
        is_solar = True

    battery_val = None
    solar_val = None

    if is_solar:
        solar_val = power_val
    else:
        battery_val = power_val
        
    return battery_val, solar_val