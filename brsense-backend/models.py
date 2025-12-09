from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    # TEM QUE TER ESSAS COLUNAS:
    login = Column(String(120), unique=True, nullable=False) 
    password = Column(String(255), nullable=False)
    role = Column(String(50), default="FAZENDEIRO")
    
    probes = relationship('Probe', back_populates='owner')

class Probe(Base):
    __tablename__ = 'probes'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    name = Column(String(100))
    location = Column(String(100))
    # Identificador único (ESN)
    identifier = Column(String(50), unique=True, nullable=False, index=True)
    last_communication = Column(DateTime)
    status = Column(String(100))
    
    owner = relationship('User', back_populates='probes')
    sensors = relationship('Sensor', back_populates='probe')
    measurements = relationship('Measurement', back_populates='probe_ref')

class Sensor(Base):
    __tablename__ = 'sensors'
    id = Column(Integer, primary_key=True, index=True)
    probe_id = Column(Integer, ForeignKey('probes.id'), nullable=False)
    type = Column(String(50)) 
    
    probe = relationship('Probe', back_populates='sensors')

class Measurement(Base):
    __tablename__ = 'measurements'
    id = Column(Integer, primary_key=True, index=True)
    probe_id = Column(Integer, ForeignKey('probes.id'), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    sensor_index = Column(Integer) # Índice do sensor (1 a 6)
    value = Column(Float, nullable=False)
    
    probe_ref = relationship('Probe', back_populates='measurements')

# --- ESTA É A CLASSE QUE ESTAVA FALTANDO ---
class RequestLog(Base):
    __tablename__ = 'request_logs'
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    client_ip = Column(String(50))
    raw_body = Column(Text)       # Texto longo para guardar o XML inteiro
    status = Column(String(50))   # SUCCESS, ERROR, PROCESSING, ETC
    log_message = Column(Text)    # Detalhes do erro ou sucesso