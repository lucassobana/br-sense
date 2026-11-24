# app/routers/ndvi.py
import json
import math
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.device import Device
from app.models.farm import Farm
from app.models.reading import Reading
from app.models.ndvi_area import NdviArea
from app.services.copernicus_service import CopernicusService, bounds_of_geometry

router = APIRouter()
service = CopernicusService.get_instance()

# Geometrias padrão para áreas de demonstração caso sejam consultadas
FALLBACK_DEMO_AREAS: Dict[str, Dict[str, Any]] = {
    "pivo-01": {
        "id": "pivo-01",
        "name": "Pivô 01 · Sede",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [-45.822 + 0.0063 * math.cos(i * math.pi * 2 / 36), -12.248 + 0.0061 * math.sin(i * math.pi * 2 / 36)]
                for i in range(37)
            ]]
        }
    }
}

def _resolve_area_geometry(area_id: str, db: Session) -> Dict[str, Any]:
    raw_id = area_id.replace("ndvi-", "")
    if raw_id.isdigit():
        item = db.query(NdviArea).filter(NdviArea.id == int(raw_id)).first()
        if item and item.geometry_json:
            try:
                return json.loads(item.geometry_json)
            except Exception:
                pass

    # Tenta buscar por nome caso o ID seja texto
    item_by_name = db.query(NdviArea).filter(NdviArea.name == area_id).first()
    if item_by_name and item_by_name.geometry_json:
        try:
            return json.loads(item_by_name.geometry_json)
        except Exception:
            pass

    # Fallback demonstrativo padrão (Luís Eduardo Magalhães - BA)
    circle_pts = [
        [-45.822 + 0.0063 * math.cos(i * math.pi * 2 / 36), -12.248 + 0.0061 * math.sin(i * math.pi * 2 / 36)]
        for i in range(37)
    ]
    return {"type": "Polygon", "coordinates": [circle_pts]}


@router.get("/areas/{area_id}/scenes")
def list_ndvi_scenes(
    area_id: str,
    days: int = Query(90, ge=1, le=180),
    db: Session = Depends(get_db),
):
    """Retorna as passagens reais do satélite Sentinel-2 (Copernicus) sobre a área."""
    geometry = _resolve_area_geometry(area_id, db)
    try:
        scenes = service.list_scenes(geometry, days=days)
        return scenes
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Não foi possível consultar o catálogo do Copernicus: {exc}",
        )


@router.post("/areas/{area_id}/scenes/{scene_id:path}/analysis")
def analyze_ndvi_scene(
    area_id: str,
    scene_id: str,
    db: Session = Depends(get_db),
):
    """Processa a imagem real do Sentinel-2 para a cena e área selecionadas."""
    geometry = _resolve_area_geometry(area_id, db)
    try:
        analysis = service.analyze_scene(area_id, geometry, scene_id)
        return analysis
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha ao processar raster NDVI no Copernicus: {exc}",
        )


@router.get("/areas/{area_id}/scenes/{scene_id:path}/{asset_name}")
def get_ndvi_scene_asset(
    area_id: str,
    scene_id: str,
    asset_name: str,
):
    """Entrega a imagem gerada (raster.png ou raster.tif)."""
    res = service.get_asset(area_id, scene_id, asset_name)
    if not res:
        raise HTTPException(status_code=404, detail="Arquivo raster não encontrado ou expirado no cache.")
    data, media_type = res
    headers = {
        "Cache-Control": "public, max-age=86400",
    }
    return Response(content=data, media_type=media_type, headers=headers)
