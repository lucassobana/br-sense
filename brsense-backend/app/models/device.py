# app/models/device.py
from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Device(Base):
    """Representa uma sonda física (vinculada ao ESN da Globalstar)."""
    __tablename__ = "device"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    esn: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=True)
    location: Mapped[str] = mapped_column(String(128), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relacionamento com as leituras
    readings = relationship("Reading", back_populates="device", cascade="all, delete-orphan")

    # REMOVIDO: config (para evitar erro de tabela faltando 'device_config')