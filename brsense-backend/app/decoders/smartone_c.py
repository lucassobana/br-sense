# app/decoders/smartone_c.py
from datetime import datetime

def decode_soil_payload(hex_payload: str, timestamp: datetime) -> list[dict]:
    """
    Decodifica o payload hexadecimal do SmartOne C (Tipo 2 - Soil Sensor).
    Retorna uma lista de leituras com profundidade, umidade OU temperatura,
    dependendo do indicador de tipo no byte 7.
    """
    try:
        # Limpeza do hex
        clean_hex = hex_payload.strip().replace("0x", "").replace(" ", "")
        raw = bytes.fromhex(clean_hex)

        # Validação básica de tamanho (SmartOne C Type 2 tem 9 bytes)
        if len(raw) != 9:
            return []

        # Byte 0: Tipo de mensagem (esperado 0x02 para sensores de solo)
        msg_type = raw[0]
        if msg_type != 0x02:
            return []

        # Byte 7: Indicador de Tipo (ASCII)
        # 0x48 ('H') = Humidity (Umidade)
        # 0x54 ('T') = Temperature (Temperatura)
        type_char = chr(raw[7])

        # Bytes 1-6: Dados das sondas (6 níveis)
        data_bytes = [raw[i] for i in range(1, 7)]

        # Definição das profundidades (exemplo padrão: 10 a 60 cm)
        depths_cm = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0]

        readings = []

        if type_char == 'H':
            # --- PROCESSAMENTO DE CHUVA (NOVO) ---
            # Byte 8: Contador do pluviômetro
            rain_raw = raw[8]
            
            # Regra: 1 unidade = 0.25 cm
            rain_val_cm = float(rain_raw) * 0.25
            
            # --- PROCESSAMENTO DE UMIDADE ---
            for i, val in enumerate(data_bytes):
                if i < len(depths_cm):
                    
                    current_rain = rain_val_cm if i == 0 else 0.0
                    
                    readings.append({
                        "depth_cm": depths_cm[i],
                        "moisture_pct": float(val), # Valor bruto (0-255) ou calibrado
                        "temperature_c": None,       # Não há temperatura neste pacote
                        "battery_status": None,
                        "solar_status": None,
                        "rain_cm": current_rain,
                    })
        
        elif type_char == 'T':
            
            # Byte 8: Status de energia (bateria/solar)
            power_val = raw[8]
            is_solar = False
            
            if power_val > 8:
                is_solar = True
            # Regra 2: Cenário Noturno (Solar tende a 0 à noite)
            # Se for noite (22h-05h) e valor muito baixo, assumimos Solar (painel desligado)
            elif (timestamp.hour >= 22 or timestamp.hour < 5) and power_val <= 1:
                is_solar = True
            elif timestamp.hour % 2 != 0:
                is_solar = True
            else:
                is_solar = False # Hora par = Bateria
                
            battery_val = None
            solar_val = None

            if is_solar:
                solar_val = power_val
            else:
                battery_val = power_val
            # --- PROCESSAMENTO DE TEMPERATURA ---
            # Aplicando o offset de -50 (baseado na lógica anterior do seu código)
            for i, val in enumerate(data_bytes):
                if i < len(depths_cm):
                    readings.append({
                        "depth_cm": depths_cm[i],
                        "moisture_pct": None,       # Não há umidade neste pacote
                        "temperature_c": float(val),
                        "battery_status": battery_val,
                        "solar_status": solar_val
                    })
        
        else:
            # Tipo desconhecido (nem H nem T), ignora para evitar lixo no banco
            print(f"SmartOne Decoder: Tipo desconhecido no byte 7: {type_char} (Hex: {hex(raw[7])})")
            return []
        
        return readings

    except Exception as e:
        print(f"Erro na decodificação SmartOne: {e}")
        return []