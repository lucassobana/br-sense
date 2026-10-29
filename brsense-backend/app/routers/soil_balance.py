import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional
from fastapi import APIRouter, Query, Response, status
from fastapi.responses import JSONResponse

from app.services.soil_service import soil_grids_provider, SoilServiceError
from app.services.weather_service import open_meteo_soil_provider

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/weather", summary="Obtém série histórica e previsão Open-Meteo para balanço hídrico")
async def get_weather(
    latitude: float = Query(..., description="Latitude WGS84 (-90 a 90)"),
    longitude: float = Query(..., description="Longitude WGS84 (-180 a 180)"),
    startDate: Optional[str] = Query(None, description="Data inicial YYYY-MM-DD (padrão: hoje)"),
    timezone: str = Query("America/Sao_Paulo", description="Fuso horário IANA"),
):
    try:
        # Se startDate não for informado, usa a data atual no fuso especificado
        if not startDate:
            tz = ZoneInfo(timezone)
            startDate = datetime.now(tz).strftime("%Y-%m-%d")

        data = await open_meteo_soil_provider.get_weather(
            lat=latitude,
            lon=longitude,
            start_date=startDate,
            timezone=timezone,
        )
        return JSONResponse(content=data, status_code=status.HTTP_200_OK)
    except ValueError as ve:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": {"code": "INVALID_PARAMETERS", "message": str(ve)}},
        )
    except Exception as e:
        logger.error(f"Erro ao buscar clima para ({latitude}, {longitude}): {e}")
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"error": {"code": "WEATHER_UNAVAILABLE", "message": "Não foi possível consultar a Open-Meteo."}},
        )

@router.get("/soil", summary="Obtém perfil físico do solo SoilGrids (ISRIC WCS)")
async def get_soil(
    latitude: float = Query(..., description="Latitude WGS84 (-90 a 90)"),
    longitude: float = Query(..., description="Longitude WGS84 (-180 a 180)"),
    depthCm: int = Query(60, description="Profundidade em cm (máx 200 cm)"),
    uncertainty: bool = Query(False, description="Incluir quantis de incerteza Q0.05 e Q0.95"),
):
    try:
        data = await soil_grids_provider.get_profile(
            lat=latitude,
            lon=longitude,
            depth_cm=depthCm,
            uncertainty=uncertainty,
        )
        return JSONResponse(content=data, status_code=status.HTTP_200_OK)
    except SoilServiceError as sse:
        return JSONResponse(
            status_code=sse.status_code,
            content={"error": {"code": sse.code, "message": sse.message}},
        )
    except Exception as e:
        logger.error(f"Erro ao buscar perfil de solo para ({latitude}, {longitude}): {e}")
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"error": {"code": "SOIL_SOURCE_UNAVAILABLE", "message": "Não foi possível consultar o perfil de solo."}},
        )
