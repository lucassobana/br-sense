from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List # <--- Importante: Importar List

class DeviceReadingSchema(BaseModel):
    moisture_pct: Optional[float] = None
    depth_cm: Optional[float] = None
    temperature_c: Optional[float] = None 
    timestamp: Optional[datetime] = None
    battery_status: Optional[int] = None
    solar_status: Optional[int] = None
    rain_cm: Optional[float] = None
    
    class Config:
        from_attributes = True

class DeviceRead(BaseModel):
    id: int
    esn: str
    name: str | None = None
    location: str | None = None
    created_at: datetime
    updated_at: datetime
    
    farm_id: Optional[int] = None 
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    cultura: Optional[str] = None
    data_plantio: Optional[date] = None
    potencia_cv: Optional[float] = None
    
    config_moisture_v1: Optional[float] = 30.0
    config_moisture_v2: Optional[float] = 45.0
    config_moisture_v3: Optional[float] = 60.0
    config_gradient_intensity: Optional[int] = 50
    
    rain_1h: float = 0.0
    rain_24h: float = 0.0
    rain_7d: float = 0.0
    rain_15d: float = 0.0
    rain_30d: float = 0.0

    readings: List[DeviceReadingSchema] = Field(default_factory=list)

    class Config:
        from_attributes = True
        
class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    farm_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    cultura: Optional[str] = None
    data_plantio: Optional[date] = None
    potencia_cv: Optional[float] = None
    config_moisture_v1: Optional[float] = None
    config_moisture_v2: Optional[float] = None
    config_moisture_v3: Optional[float] = None
    config_gradient_intensity: Optional[int] = None
    
class DeviceCreate(BaseModel):
    esn: str
    farm_id: Optional[int] = None
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    cultura: Optional[str] = None
    data_plantio: Optional[date] = None
    potencia_cv: Optional[float] = None
    config_moisture_v1: Optional[float] = 30.0
    config_moisture_v2: Optional[float] = 45.0
    config_moisture_v3: Optional[float] = 60.0
    config_gradient_intensity: Optional[int] = 50