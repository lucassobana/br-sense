# app/models/map_layer.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.farm import Farm


class MapLayer(Base):
    __tablename__ = "map_layers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    farm_id: Mapped[int] = mapped_column(Integer, ForeignKey("farm.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    geojson: Mapped[str] = mapped_column(Text, nullable=False)  # GeoJSON as string
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relacionamento com a fazenda
    farm = relationship("Farm", back_populates="map_layers")
