# app/models/device.py
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import String, DateTime, ForeignKey, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.models.device_config import DeviceConfig

if TYPE_CHECKING:
    from app.models.farm import Farm

class Device(Base):
    """Representa uma sonda física (vinculada ao ESN da Globalstar)."""
    __tablename__ = "device"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    esn: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=True)
    location: Mapped[str] = mapped_column(String(128), nullable=True)
    
    config_moisture_min = mapped_column(Integer, default=45, nullable=True)
    config_moisture_max = mapped_column(Integer, default=55, nullable=True)
    
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Chave Estrangeira para Fazenda
    farm_id: Mapped[Optional[int]] = mapped_column(ForeignKey("farm.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    readings = relationship("Reading", back_populates="device", cascade="all, delete-orphan")
    config = relationship("DeviceConfig", back_populates="device", uselist=False, cascade="all, delete-orphan")
    
    farm: Mapped["Farm"] = relationship("Farm", back_populates="devices")