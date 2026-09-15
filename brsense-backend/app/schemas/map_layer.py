# app/schemas/map_layer.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any


class MapLayerCreate(BaseModel):
    name: str
    original_filename: Optional[str] = None
    geojson: str  # GeoJSON string


class MapLayerResponse(BaseModel):
    id: int
    farm_id: int
    name: str
    original_filename: Optional[str] = None
    geojson: Any  # Will be parsed as dict by the router
    created_at: datetime

    class Config:
        from_attributes = True
