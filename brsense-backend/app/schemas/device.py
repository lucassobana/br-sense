# app/schemas/device.py
from pydantic import BaseModel
from datetime import datetime

class DeviceRead(BaseModel):
    id: int
    esn: str
    name: str | None = None
    location: str | None = None
    last_seen: datetime | None = None # Se você tiver esse campo calculado

    class Config:
        from_attributes = True