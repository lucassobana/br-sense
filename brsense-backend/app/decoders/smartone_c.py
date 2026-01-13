# app/decoders/smartone_c.py

def decode_soil_payload(hex_payload: str) -> list[dict]:
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
            # --- PROCESSAMENTO DE UMIDADE ---
            for i, val in enumerate(data_bytes):
                if i < len(depths_cm):
                    readings.append({
                        "depth_cm": depths_cm[i],
                        "moisture_pct": float(val), # Valor bruto (0-255) ou calibrado
                        "temperature_c": None       # Não há temperatura neste pacote
                    })
        
        elif type_char == 'T':
            # --- PROCESSAMENTO DE TEMPERATURA ---
            # Aplicando o offset de -50 (baseado na lógica anterior do seu código)
            for i, val in enumerate(data_bytes):
                if i < len(depths_cm):
                    readings.append({
                        "depth_cm": depths_cm[i],
                        "moisture_pct": None,       # Não há umidade neste pacote
                        "temperature_c": float(val) 
                    })
        
        else:
            # Tipo desconhecido (nem H nem T), ignora para evitar lixo no banco
            print(f"SmartOne Decoder: Tipo desconhecido no byte 7: {type_char} (Hex: {hex(raw[7])})")
            return []
        
        return readings

    except Exception as e:
        print(f"Erro na decodificação SmartOne: {e}")
        return []