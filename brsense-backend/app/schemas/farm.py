from pydantic import BaseModel
from typing import List, Optional

class FarmBase(BaseModel):
    name: str
    location: Optional[str] = None

class FarmCreate(FarmBase):
    user_id: Optional[int] = None

class FarmRead(FarmBase):
    id: int
    user_id: int
    
    class Config:
        from_attributes = True
        
class FarmUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    user_id: Optional[int] = None