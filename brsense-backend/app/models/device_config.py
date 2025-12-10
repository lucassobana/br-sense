# api/app/models/device_config.py
from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional, TYPE_CHECKING

from sqlalchemy import String, Float, Integer, DateTime, ForeignKey  # pyright: ignore[reportMissingImports]
from sqlalchemy.orm import Mapped, mapped_column, relationship  # pyright: ignore[reportMissingImports]

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.device import Device


class DeviceConfig(Base):
    """Per-device configuration for irrigation alerts and thresholds."""

    __tablename__ = "device_config"  # Explicit table name to match migration

    device_id: Mapped[int] = mapped_column(
        ForeignKey("device.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    mode: Mapped[Literal["texture_aware", "fallback"]] = mapped_column(
        String(16), default="fallback", nullable=False
    )
    fc_vwc_pct: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )  # Field capacity %
    pwp_vwc_pct: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )  # Permanent wilting point %
    expected_interval_min: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )  # Override global default
    farm_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lon: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationship
    device: Mapped["Device"] = relationship("Device", back_populates="config")
