# app/routers/map_layers.py
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.models.map_layer import MapLayer
from app.models.farm import Farm
from app.schemas.map_layer import MapLayerVisibilityUpdate
from app.services.kml_parser import parse_kml_or_kmz
from app.core.security import get_current_user_token, get_user_and_roles

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _parse_hidden_indices(raw: Optional[str]) -> List[int]:
    """Parse the persisted JSON list of hidden feature indices (tolerant to bad data)."""
    try:
        data = json.loads(raw or "[]")
        return [int(i) for i in data] if isinstance(data, list) else []
    except (ValueError, TypeError):
        return []


def _layer_to_response(layer: MapLayer) -> dict:
    """Convert a MapLayer ORM object to a response dict with parsed GeoJSON."""
    return {
        "id": layer.id,
        "farm_id": layer.farm_id,
        "name": layer.name,
        "original_filename": layer.original_filename,
        "geojson": json.loads(layer.geojson),
        "created_at": layer.created_at,
        "is_active": layer.is_active if layer.is_active is not None else True,
        "hidden_feature_indices": _parse_hidden_indices(layer.hidden_feature_indices),
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


@router.put("/visibility", status_code=status.HTTP_200_OK)
def update_map_layers_visibility(
    body: MapLayerVisibilityUpdate,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db),
):
    """
    Persist, in a single atomic operation, the display state of several layers
    (layer toggle + hidden feature indices).
    Only layers belonging to farms of the authenticated user can be changed
    (admins can change any layer). If any layer is invalid, nothing is saved.
    Body: { "layers": [ { "id": 1, "is_active": true, "hidden_feature_indices": [0, 2] } ] }
    """
    user, is_admin = get_user_and_roles(db, token_payload)

    # Deduplicate by id (last occurrence wins)
    items = {item.id: item for item in body.layers}

    layers = (
        db.query(MapLayer)
        .join(Farm, Farm.id == MapLayer.farm_id)
        .filter(MapLayer.id.in_(list(items.keys())))
        .all()
    )
    found = {layer.id: layer for layer in layers}

    missing = [layer_id for layer_id in items if layer_id not in found]
    if missing:
        raise HTTPException(status_code=404, detail=f"Camada(s) não encontrada(s): {missing}")

    if not is_admin:
        forbidden = [layer.id for layer in layers if layer.farm.user_id != user.id]
        if forbidden:
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para alterar uma ou mais camadas",
            )

    try:
        for layer_id, item in items.items():
            layer = found[layer_id]
            feature_count = len(json.loads(layer.geojson).get("features", []))
            hidden = sorted({i for i in item.hidden_feature_indices if 0 <= i < feature_count})
            layer.is_active = item.is_active
            layer.hidden_feature_indices = json.dumps(hidden)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao salvar o estado das camadas")

    for layer in layers:
        db.refresh(layer)
    return [_layer_to_response(found[layer_id]) for layer_id in items]


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
