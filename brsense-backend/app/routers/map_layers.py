# app/routers/map_layers.py
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.models.map_layer import MapLayer
from app.models.farm import Farm
from app.services.kml_parser import parse_kml_or_kmz

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _layer_to_response(layer: MapLayer) -> dict:
    """Convert a MapLayer ORM object to a response dict with parsed GeoJSON."""
    return {
        "id": layer.id,
        "farm_id": layer.farm_id,
        "name": layer.name,
        "original_filename": layer.original_filename,
        "geojson": json.loads(layer.geojson),
        "created_at": layer.created_at,
    }


@router.post("/farm/{farm_id}", status_code=status.HTTP_201_CREATED)
async def upload_map_layer(
    farm_id: int,
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Upload a .kml or .kmz file for a farm. Converts to GeoJSON and persists.
    """
    # Verify farm exists
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Fazenda não encontrada")

    # Validate file type
    filename = file.filename or ""
    if not (filename.lower().endswith(".kml") or filename.lower().endswith(".kmz")):
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Envie um arquivo .kml ou .kmz",
        )

    # Read and size-check file
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Arquivo muito grande. Tamanho máximo: 10 MB",
        )

    # Parse KML/KMZ → GeoJSON string
    try:
        geojson_str = parse_kml_or_kmz(filename, file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Determine layer name
    layer_name = (name or "").strip()
    if not layer_name:
        # Remove extension from filename as default name
        layer_name = filename.rsplit(".", 1)[0] if "." in filename else filename
        layer_name = layer_name[:150]  # Truncate to column limit

    # Persist
    db_layer = MapLayer(
        farm_id=farm_id,
        name=layer_name,
        original_filename=filename[:255],
        geojson=geojson_str,
    )
    db.add(db_layer)
    db.commit()
    db.refresh(db_layer)

    return _layer_to_response(db_layer)


@router.get("/farm/{farm_id}")
def get_map_layers_by_farm(farm_id: int, db: Session = Depends(get_db)):
    """
    List all KML/KMZ layers belonging to a farm.
    """
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Fazenda não encontrada")

    layers = db.query(MapLayer).filter(MapLayer.farm_id == farm_id).order_by(MapLayer.created_at.desc()).all()
    return [_layer_to_response(layer) for layer in layers]


@router.delete("/{layer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_map_layer(layer_id: int, db: Session = Depends(get_db)):
    """
    Delete a map layer by ID.
    """
    layer = db.query(MapLayer).filter(MapLayer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Camada não encontrada")

    db.delete(layer)
    db.commit()
    return
