# app/decoders/smartone_c.py

def decode_soil_payload(hex_payload: str) -> list[dict]:
    """
    Decodifica o payload hexadecimal do SmartOne C (Tipo 2 - Soil Sensor).
    Retorna uma lista de leituras com profundidade, umidade e temperatura.
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

        # Bytes 1-6: Leituras de Umidade (raw)
        # Cada byte representa uma leitura percentual ou valor bruto
        moisture_bytes = [raw[i] for i in range(1, 7)]

        # Byte 7: Temperatura
        # Cálculo aproximado: (Valor - Offset). Ajuste conforme calibração do seu sensor.
        # Exemplo comum: Valor bruto - 50 = Graus Celsius
        temp_raw = raw[7]
        temperature_c = float(temp_raw - 50) 

        # Definição das profundidades (exemplo padrão: 10, 20, 30, 40, 60, 90 cm)
        # Ajuste esta lista para corresponder às profundidades reais da sua sonda
        depths_cm = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0]

        readings = []
        for i, moisture_val in enumerate(moisture_bytes):
            if i < len(depths_cm):
                readings.append({
                    "depth_cm": depths_cm[i],
                    "moisture_pct": float(moisture_val), # Pode requerer calibração linear
                    "temperature_c": temperature_c
                })
        
        return readings

    except Exception as e:
        print(f"Erro na decodificação SmartOne: {e}")
        return []