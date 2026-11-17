# app/schemas/ndvi_area.py
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class NdviCircleSchema(BaseModel):
    center: List[float]
    edge: List[float]
    radiusM: float


class NdviAreaCreateItem(BaseModel):
    device_id: int
    name: str = Field(..., min_length=1, max_length=150)
    type: Literal["pivo", "talhao"] = "pivo"
    crop: str = Field(default="Monitoramento Satelital", max_length=120)
    hectares: float
    geometry: Dict[str, Any]
    source: Literal["desenho", "kml", "sistema"] = "desenho"
    circle: Optional[NdviCircleSchema] = None


class NdviAreaBatchCreate(BaseModel):
    areas: List[NdviAreaCreateItem] = Field(..., min_length=1)


class NdviAreaUpdate(BaseModel):
    device_id: Optional[int] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    type: Optional[Literal["pivo", "talhao"]] = None
    crop: Optional[str] = Field(default=None, max_length=120)
    hectares: Optional[float] = None
    geometry: Optional[Dict[str, Any]] = None
    circle: Optional[NdviCircleSchema] = None


class NdviAreaResponse(BaseModel):
    id: str
    db_id: int
    device_id: int
    device_esn: Optional[str] = None
    device_name: Optional[str] = None
    farm_id: Optional[int] = None
    farmName: str
    city: str
    name: str
    type: Literal["pivo", "talhao"]
    crop: str
    hectares: float
    geometry: Dict[str, Any]
    source: Literal["desenho", "kml", "sistema", "demo"]
    circle: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

