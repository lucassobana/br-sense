# app/models/ndvi_area.py
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.device import Device
    from app.models.farm import Farm


class NdviArea(Base):
    """Contorno de pivô ou talhão vinculado a uma sonda (Device) para monitoramento NDVI."""
    __tablename__ = "ndvi_areas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    device_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("device.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    farm_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("farm.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    area_type: Mapped[str] = mapped_column(String(32), nullable=False, default="pivo")
    crop: Mapped[str] = mapped_column(String(120), nullable=False, default="Monitoramento Satelital")
    hectares: Mapped[float] = mapped_column(Float, nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="desenho")
    geometry_json: Mapped[str] = mapped_column(Text, nullable=False)
    circle_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    device: Mapped["Device"] = relationship("Device")
    farm: Mapped[Optional["Farm"]] = relationship("Farm")

