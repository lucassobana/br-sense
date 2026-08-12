import requests
import logging
import time
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

def fetch_weather_data(lat: float, lon: float, retries: int = 2) -> Optional[Dict[str, Any]]:
    """
    Busca dados meteorológicos com mecanismo de retry (repetição) e timeout rigoroso 
    para não bloquear o servidor backend.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "et0_fao_evapotranspiration,precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min",
        "timezone": "auto"
    }
    
    # Loop de repetição para lidar com instabilidades momentâneas de rede
    for attempt in range(retries + 1):
        try:
            # Timeout dividido: 3 seg para conectar, 5 seg para transferir os dados
            # Impede que a thread fique congelada para sempre
            response = requests.get(url, params=params, timeout=(3.0, 5.0))
            response.raise_for_status()
            
            data = response.json()
            
            # Validação extra: garante que a API devolveu realmente os arrays diários
            if "daily" not in data or not data["daily"].get("time"):
                logger.warning(f"API devolveu dados incompletos para coord [{lat}, {lon}].")
                return None
                
            return data
            
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout na API de clima (tentativa {attempt + 1}/{retries + 1}) para coord [{lat}, {lon}]")
        except requests.exceptions.RequestException as e:
            logger.error(f"Falha na requisição Open-Meteo para coord [{lat}, {lon}]: {e}")
            break # Falhas como 400 ou 500 quebram o loop para não inundar a API
            
        # Pausa de 1 segundo antes de tentar de novo
        if attempt < retries:
            time.sleep(1.0) 
            
    return None

def generate_weekly_report(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Busca e agrega os dados semanais para uma coordenada específica."""
    raw_weather = fetch_weather_data(lat, lon)
    
    if not raw_weather or "daily" not in raw_weather:
        return None

    daily = raw_weather["daily"]
    times = daily.get("time", [])

    et0_list = daily.get("et0_fao_evapotranspiration", [])
    precip_list = daily.get("precipitation_sum", [])
    tmax_list = daily.get("temperature_2m_max", [])
    tmin_list = daily.get("temperature_2m_min", [])

    # Filtra valores None (nulos) que a API possa enviar
    valid_et0 = [x for x in et0_list if x is not None]
    valid_precip = [x for x in precip_list if x is not None]
    valid_tmax = [x for x in tmax_list if x is not None]
    valid_tmin = [x for x in tmin_list if x is not None]

    return {
        "period": {"start": times[0] if times else None, "end": times[-1] if times else None},
        "timezone_detected": raw_weather.get("timezone"),
        "weekly_summary": {
            "avg_et0_mm": round(sum(valid_et0) / len(valid_et0), 2) if valid_et0 else 0.0,
            "total_precipitation_mm": round(sum(valid_precip), 2) if valid_precip else 0.0,
            "avg_tmax_c": round(sum(valid_tmax) / len(valid_tmax), 2) if valid_tmax else 0.0,
            "avg_tmin_c": round(sum(valid_tmin) / len(valid_tmin), 2) if valid_tmin else 0.0
        }
    }