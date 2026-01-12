from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List # <--- Importante: Importar List

class DeviceReadingSchema(BaseModel):
    moisture_pct: Optional[float] = None
    depth_cm: Optional[float] = None
    temperature_c: Optional[float] = None 
    timestamp: Optional[datetime] = None
    
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

    readings: List[DeviceReadingSchema] = [] 

    class Config:
        from_attributes = True
        
class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    farm_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
class DeviceCreate(BaseModel):
    esn: str
    farm_id: int
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None