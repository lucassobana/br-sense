from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DeviceBase(BaseModel):
    esn: str
    name: Optional[str] = None
    location: Optional[str] = None

class DeviceCreate(DeviceBase):
    pass

class DeviceRead(DeviceBase):
    id: int
    updated_at: datetime
    # created_at: datetime  # Descomente se quiser mostrar quando foi criado

    class Config:
        from_attributes = True