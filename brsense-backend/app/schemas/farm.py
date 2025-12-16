from pydantic import BaseModel
from typing import List, Optional

class FarmBase(BaseModel):
    name: str
    location: Optional[str] = None

class FarmCreate(FarmBase):
    pass # user_id será pego do token do usuário logado

class FarmRead(FarmBase):
    id: int
    user_id: int
    
    class Config:
        from_attributes = True