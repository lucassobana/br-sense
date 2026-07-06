import requests
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

def fetch_weather_data(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "et0_fao_evapotranspiration,precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min",
        "timezone": "auto" # <--- O SEGREDO ESTÁ AQUI
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Falha na requisição Open-Meteo para coord [{lat}, {lon}]: {e}")
        return None

def generate_weekly_report(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Busca e agrega os dados semanais para uma coordenada específica."""
    raw_weather = fetch_weather_data(lat, lon)
    
    if not raw_weather or "daily" not in raw_weather:
        return None

    daily = raw_weather["daily"]
    times = daily.get("time", [])
    
    if not times:
        return None

    et0_list = daily.get("et0_fao_evapotranspiration", [])
    precip_list = daily.get("precipitation_sum", [])
    tmax_list = daily.get("temperature_2m_max", [])
    tmin_list = daily.get("temperature_2m_min", [])

    valid_et0 = [x for x in et0_list if x is not None]
    valid_precip = [x for x in precip_list if x is not None]
    valid_tmax = [x for x in tmax_list if x is not None]
    valid_tmin = [x for x in tmin_list if x is not None]

    report = {
        "period": {"start": times[0], "end": times[-1]},
        "timezone_detected": raw_weather.get("timezone"), # A própria API te conta qual fuso ela achou
        "weekly_summary": {
            "avg_et0_mm": round(sum(valid_et0) / len(valid_et0), 2) if valid_et0 else 0.0,
            "total_precipitation_mm": round(sum(valid_precip), 2) if valid_precip else 0.0,
            "avg_tmax_c": round(sum(valid_tmax) / len(valid_tmax), 2) if valid_tmax else 0.0,
            "avg_tmin_c": round(sum(valid_tmin) / len(valid_tmin), 2) if valid_tmin else 0.0
        },
        "daily_values": [
            {
                "date": times[i],
                "et0": et0_list[i] if i < len(et0_list) else None,
                "precipitation": precip_list[i] if i < len(precip_list) else None,
                "t_max": tmax_list[i] if i < len(tmax_list) else None,
                "t_min": tmin_list[i] if i < len(tmin_list) else None,
            }
            for i in range(len(times))
        ]
    }
    return report