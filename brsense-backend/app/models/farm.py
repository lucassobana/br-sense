# app/models/farm.py
from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, TYPE_CHECKING, Optional

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.device import Device
    from app.models.manual_probe import ManualProbe

class Farm(Base):
    __tablename__ = "farm"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    
    # Chave estrangeira para o Usuário (Dono da fazenda)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Relacionamentos
    owner: Mapped["User"] = relationship("User", back_populates="farms")
    devices: Mapped[List["Device"]] = relationship("Device", back_populates="farm")
    manual_probes: Mapped[List["ManualProbe"]] = relationship("ManualProbe", back_populates="farm")