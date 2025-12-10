from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class RequestLog(Base):
    __tablename__ = "request_log"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    client_ip: Mapped[str] = mapped_column(String(50), nullable=True)
    raw_body: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PROCESSING")
    log_message: Mapped[str] = mapped_column(Text, nullable=True)