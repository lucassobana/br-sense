import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append("/Users/lucassawadaobana/Projects/br-sense/brsense-backend")
from app.database import SQLALCHEMY_DATABASE_URL
from app.models.reading import Reading

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

readings = db.query(Reading).order_by(Reading.id.desc()).limit(20).all()
for r in readings:
    print(f"ID: {r.id}, TYPE: {r.reading_type}, BATT: {r.battery_status}, LAT: {r.latitude}, LON: {r.longitude}")

