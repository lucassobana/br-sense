# app/schemas/map_layer.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Any


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
    is_active: bool = True
    hidden_feature_indices: List[int] = []

    class Config:
        from_attributes = True


class MapLayerVisibilityItem(BaseModel):
    """Estado de exibição de uma camada (toggle da camada + features ocultas)."""
    id: int
    is_active: bool
    hidden_feature_indices: List[int] = Field(default_factory=list)


class MapLayerVisibilityUpdate(BaseModel):
    """Payload do salvamento em lote do estado de exibição das camadas."""
    layers: List[MapLayerVisibilityItem] = Field(..., min_length=1)
