# app/models/reading.py
from datetime import datetime
from sqlalchemy import Float, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Reading(Base):
    __tablename__ = "reading"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    device_id: Mapped[int] = mapped_column(ForeignKey("device.id"), nullable=False)
    
    reading_type: Mapped[str] = mapped_column(String(1), nullable=True, index=True)
    
    depth_cm: Mapped[float] = mapped_column(Float, nullable=True)
    moisture_pct: Mapped[float] = mapped_column(Float, nullable=True)
    temperature_c: Mapped[float] = mapped_column(Float, nullable=True)
    
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    device = relationship("Device", back_populates="readings")