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


# =====================================================================
# Provedor Open-Meteo para Balanço Hídrico do Solo (Archive + Forecast)
# =====================================================================
import httpx
import asyncio
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import List, Tuple

VARIABLES = "et0_fao_evapotranspiration,precipitation_sum,temperature_2m_max,temperature_2m_min"
RECENT_HISTORY_DAYS = 7

class OpenMeteoSoilProvider:
    def __init__(self, cache_ttl_seconds: int = 30 * 60):
        self._cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
        self._ttl = cache_ttl_seconds

    async def get_weather(self, lat: float, lon: float, start_date: str, timezone: str = "America/Sao_Paulo") -> Dict[str, Any]:
        if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
            raise ValueError("Coordenadas inválidas.")
        
        try:
            tz = ZoneInfo(timezone)
        except Exception:
            raise ValueError("Fuso horário inválido.")

        today = datetime.now(tz).strftime("%Y-%m-%d")
        today_dt = datetime.strptime(today, "%Y-%m-%d").date()
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
        except Exception:
            raise ValueError("Data inicial inválida (formato esperado YYYY-MM-DD).")

        past_days = (today_dt - start_dt).days
        if past_days < 0 or past_days > 730:
            raise ValueError("A consulta deve iniciar entre hoje e 730 dias atrás.")

        key = f"{lat:.4f},{lon:.4f}|{start_date}|{timezone}|{today}"
        now = time.time()
        if key in self._cache:
            expires, data = self._cache[key]
            if expires > now:
                return data

        result = await self._load(lat, lon, start_date, today, past_days, timezone)
        self._cache[key] = (now + self._ttl, result)
        return result

    async def _fetch_url(self, client: httpx.AsyncClient, url: str) -> Dict[str, Any]:
        resp = await client.get(url, timeout=25.0)
        if resp.status_code != 200:
            raise RuntimeError(f"O serviço climático retornou HTTP {resp.status_code}.")
        return resp.json()

    def _normalize(self, raw: Dict[str, Any], lat: float, lon: float, today: str, timezone: str) -> Dict[str, Any]:
        daily = raw.get("daily", {})
        times = daily.get("time", [])
        et0 = daily.get("et0_fao_evapotranspiration", [])
        precip = daily.get("precipitation_sum", [])
        tmax = daily.get("temperature_2m_max", [])
        tmin = daily.get("temperature_2m_min", [])

        days_map: Dict[str, Dict[str, Any]] = {}
        for i, date_str in enumerate(times):
            e_val = et0[i] if i < len(et0) else None
            p_val = precip[i] if i < len(precip) else None
            tmax_val = tmax[i] if i < len(tmax) else None
            tmin_val = tmin[i] if i < len(tmin) else None

            days_map[date_str] = {
                "date": date_str,
                "etoMm": float(e_val) if e_val is not None and e_val >= 0 else None,
                "precipitationMm": float(p_val) if p_val is not None and p_val >= 0 else None,
                "forecastRainMm": float(p_val) if p_val is not None and p_val >= 0 else None,
                "tMaxC": float(tmax_val) if tmax_val is not None else None,
                "tMinC": float(tmin_val) if tmin_val is not None else None,
                "kind": "modeledHistory" if date_str < today else "forecast",
            }

        return {
            "latitude": raw.get("latitude", lat),
            "longitude": raw.get("longitude", lon),
            "days_map": days_map,
        }

    async def _load(self, lat: float, lon: float, start_date: str, today: str, past_days: int, timezone: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            base_url = "https://api.open-meteo.com/v1/forecast"
            forecast_past = min(past_days, RECENT_HISTORY_DAYS)
            forecast_params = (
                f"latitude={lat}&longitude={lon}&daily={VARIABLES}&timezone={timezone}"
                f"&past_days={forecast_past}&forecast_days=7"
            )
            forecast_url = f"{base_url}?{forecast_params}"

            if past_days <= RECENT_HISTORY_DAYS:
                raw_forecast = await self._fetch_url(client, forecast_url)
                norm = self._normalize(raw_forecast, lat, lon, today, timezone)
                days_list = sorted(norm["days_map"].values(), key=lambda d: d["date"])
                return {
                    "coordinates": {"latitude": lat, "longitude": lon},
                    "gridCoordinates": {"latitude": norm["latitude"], "longitude": norm["longitude"]},
                    "timezone": timezone,
                    "today": today,
                    "fetchedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "days": days_list,
                    "source": "Open-Meteo",
                }

            today_dt = datetime.strptime(today, "%Y-%m-%d").date()
            archive_end_dt = today_dt - timedelta(days=RECENT_HISTORY_DAYS + 1)
            archive_base = "https://archive-api.open-meteo.com/v1/archive"
            archive_params = (
                f"latitude={lat}&longitude={lon}&daily={VARIABLES}&timezone={timezone}"
                f"&start_date={start_date}&end_date={archive_end_dt.strftime('%Y-%m-%d')}"
            )
            archive_url = f"{archive_base}?{archive_params}"

            raw_forecast, raw_archive = await asyncio.gather(
                self._fetch_url(client, forecast_url),
                self._fetch_url(client, archive_url),
            )

            norm_forecast = self._normalize(raw_forecast, lat, lon, today, timezone)
            norm_archive = self._normalize(raw_archive, lat, lon, today, timezone)

            all_days = dict(norm_archive["days_map"])
            all_days.update(norm_forecast["days_map"])
            days_list = sorted(all_days.values(), key=lambda d: d["date"])

            return {
                "coordinates": {"latitude": lat, "longitude": lon},
                "gridCoordinates": {"latitude": norm_forecast["latitude"], "longitude": norm_forecast["longitude"]},
                "timezone": timezone,
                "today": today,
                "fetchedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "days": days_list,
                "source": "Open-Meteo",
            }

open_meteo_soil_provider = OpenMeteoSoilProvider()