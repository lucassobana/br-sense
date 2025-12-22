# brsense-backend/app/schemas/device.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DeviceRead(BaseModel):
    id: int
    esn: str
    name: str | None = None
    location: str | None = None
    created_at: datetime
    updated_at: datetime
    
    # NOVO CAMPO:
    farm_id: Optional[int] = None 

    class Config:
        from_attributes = True
        
# Dica: Você pode criar um DeviceUpdate para permitir vincular a sonda a uma fazenda
class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    farm_id: Optional[int] = None
    
class DeviceCreate(BaseModel):
    esn: str
    farm_id: int
    name: str