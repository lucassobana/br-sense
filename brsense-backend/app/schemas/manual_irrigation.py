from pydantic import BaseModel, Field
from datetime import datetime

class ManualIrrigationBase(BaseModel):
    irrigation_value_mm: float = Field(..., description="Valor de irrigação em milímetros")
    date: datetime = Field(..., description="Data e hora da irrigação")

class ManualIrrigationCreate(ManualIrrigationBase):
    pass

class ManualIrrigationResponse(ManualIrrigationBase):
    id: int
    manual_probe_id: int
    created_at: datetime

    class Config:
        from_attributes = True
