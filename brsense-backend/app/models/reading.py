# app/models/reading.py
from datetime import datetime
from sqlalchemy import Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Reading(Base):
    __tablename__ = "reading"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # REMOVIDO: message_id (não estamos salvando a mensagem bruta no banco por enquanto)
    
    # Link apenas com o Dispositivo
    device_id: Mapped[int] = mapped_column(ForeignKey("device.id"), nullable=False)
    
    # Dados da Sonda
    depth_cm: Mapped[float] = mapped_column(Float, nullable=True)
    moisture_pct: Mapped[float] = mapped_column(Float, nullable=True)
    temperature_c: Mapped[float] = mapped_column(Float, nullable=True)
    
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relacionamento Reverso
    device = relationship("Device", back_populates="readings")