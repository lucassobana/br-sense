from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from app.schemas.manual_irrigation import ManualIrrigationResponse

class ManualProbeBase(BaseModel):
    name: str = Field(..., max_length=100, description="Nome identificador da sonda manual")
    latitude: float = Field(..., description="Latitude do pin")
    longitude: float = Field(..., description="Longitude do pin")
    irrigation_value_mm: float = Field(default=0.0, description="Valor de irrigação em milímetros")
    cultura: Optional[str] = Field(None, description="Cultura")
    data_plantio: Optional[datetime] = Field(None, description="Data de plantio")
    potencia_cv: Optional[float] = Field(None, description="Potência do pivô em CV")
    farm_id: int = Field(..., description="ID da fazenda")

class ManualProbeCreate(ManualProbeBase):
    pass

class ManualProbeUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    irrigation_value_mm: Optional[float] = None
    cultura: Optional[str] = None
    data_plantio: Optional[datetime] = None
    potencia_cv: Optional[float] = None

class ManualProbeResponse(ManualProbeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    irrigation_records: List[ManualIrrigationResponse] = []

    class Config:
        from_attributes = True
