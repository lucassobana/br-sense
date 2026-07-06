import concurrent.futures
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.device import Device
from app.models.reading import Reading

from app.services.agronomic_engine.engine import generate_agronomic_decision
from app.services.weather_service import fetch_weather_data

def analyze_device_data(db: Session, esn: str) -> dict:
    try:
        device = db.query(Device).filter(Device.esn == esn).first()
        if not device: return None

        now = datetime.utcnow()
        three_days_ago = now - timedelta(days=3)

        raw_readings = db.query(Reading).filter(
            Reading.device_id == device.id, 
            Reading.timestamp >= three_days_ago,
            Reading.depth_cm.isnot(None),
            Reading.moisture_pct.isnot(None)
        ).order_by(Reading.timestamp.desc()).limit(1000).all()

        grouped_readings = {}
        latest_avg_moisture = 0.0
        
        # Pega as leituras mais recentes para definir se o status é "Atenção" ou "Crítico"
        if raw_readings:
            latest_ts = raw_readings[0].timestamp
            latest_vals = [r.moisture_pct for r in raw_readings if r.timestamp == latest_ts]
            if latest_vals:
                latest_avg_moisture = sum(latest_vals) / len(latest_vals)

        for r in raw_readings:
            time_key = r.timestamp.replace(minute=0, second=0, microsecond=0)
            if time_key not in grouped_readings:
                class MockReading: pass
                mock = MockReading()
                mock.time = r.timestamp
                mock.moisture_1 = mock.moisture_2 = mock.moisture_3 = mock.moisture_4 = None
                grouped_readings[time_key] = mock
            
            if r.depth_cm == 10: grouped_readings[time_key].moisture_1 = r.moisture_pct
            elif r.depth_cm == 20: grouped_readings[time_key].moisture_2 = r.moisture_pct
            elif r.depth_cm == 30: grouped_readings[time_key].moisture_3 = r.moisture_pct
            elif r.depth_cm == 40: grouped_readings[time_key].moisture_4 = r.moisture_pct

        readings_for_engine = sorted(list(grouped_readings.values()), key=lambda x: x.time, reverse=True)

        thirty_days_ago = now - timedelta(days=30)
        last_rain_reading = db.query(Reading).filter(
            Reading.device_id == device.id,
            Reading.rain_cm > 0,
            Reading.timestamp >= thirty_days_ago
        ).order_by(Reading.timestamp.desc()).first()

        if last_rain_reading and last_rain_reading.rain_cm:
            ultima_chuva_mm = float(last_rain_reading.rain_cm)
            dias_sem_chuva = (now - last_rain_reading.timestamp).days
        else:
            ultima_chuva_mm = 0.0
            dias_sem_chuva = 30

        # INTEGRAÇÃO METEOROLÓGICA FORMATADA (Regras de Negócio de Clima)
        et_atual = 4.2          
        previsao_chuva_str = "Sem previsão de chuva relevante nos próximos dias"
        rain_class = "nenhuma"
        
        lat = getattr(device, 'lat', None) or getattr(device, 'latitude', None)
        lon = getattr(device, 'long', None) or getattr(device, 'longitude', None)
        
        if lat is not None and lon is not None:
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(fetch_weather_data, lat, lon)
                try:
                    weather_info = future.result(timeout=4.0)
                    if weather_info and "daily" in weather_info:
                        daily = weather_info["daily"]
                        times = daily.get("time", [])
                        precips = daily.get("precipitation_sum", [])
                        probs = daily.get("precipitation_probability_max", [])
                        ets = daily.get("et0_fao_evapotranspiration", [])

                        if ets and len(ets) > 0 and ets[0] is not None:
                            et_atual = float(ets[0])

                        # Loop para encontrar a chuva mais próxima
                        for i in range(len(times)):
                            p_mm = precips[i] if precips[i] is not None else 0.0
                            p_prob = probs[i] if probs[i] is not None else 0
                            
                            if p_mm >= 1.0: # Chuvas maiores ou iguais a 1.0 mm (relevante)
                                date_obj = datetime.strptime(times[i], "%Y-%m-%d")
                                dias_semana = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
                                dia_str = dias_semana[date_obj.weekday()]
                                
                                if i == 0: dia_str = "hoje"
                                elif i == 1: dia_str = "amanhã"
                                
                                previsao_chuva_str = f"Chuva prevista para {dia_str} ({p_prob}% – {p_mm:.1f} mm)"
                                rain_class = "relevante"
                                break
                except Exception as weather_err:
                    logging.warning(f"Erro na API de clima para ESN {esn}: {weather_err}")

        # Identificação e Cadastro
        device_name = getattr(device, 'name', None) or f"Sonda {device.esn}"
        cultura = getattr(device, 'cultura', None) or "Não informada"
        
        data_plantio = getattr(device, 'data_plantio', None)
        estadio = f"{(now.date() - data_plantio).days} DAP" if data_plantio else "Não informado"
        
        talhao_info = f"{device_name} — {cultura} / {estadio}"

        config_v1 = getattr(device, 'config_moisture_v1', None) or 30.0
        config_v2 = getattr(device, 'config_moisture_v2', None) or 45.0

        return generate_agronomic_decision(
            talhao_info=talhao_info,
            avg_moisture=latest_avg_moisture,
            config_v1=config_v1,
            config_v2=config_v2,
            readings=readings_for_engine,
            et_atual=et_atual,
            rain_class=rain_class,
            previsao_chuva_str=previsao_chuva_str,
            ultima_chuva_mm=ultima_chuva_mm,
            dias_sem_chuva=dias_sem_chuva
        )

    except Exception as e:
        logging.error(f"Erro no motor agronômico para ESN {esn}: {str(e)}")
        raise e