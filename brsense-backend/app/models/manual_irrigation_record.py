from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.db.base import Base

class ManualIrrigationRecord(Base):
    __tablename__ = "manual_irrigation_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    manual_probe_id: Mapped[int] = mapped_column(Integer, ForeignKey("manual_probes.id", ondelete="CASCADE"), nullable=False)
    irrigation_value_mm: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relacionamento com a sonda manual
    manual_probe = relationship("ManualProbe", back_populates="irrigation_records")
