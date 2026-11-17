import asyncio
from app.db.session import SessionLocal
from app.models.manual_probe import ManualProbe
db = SessionLocal()
probes = db.query(ManualProbe).all()
for p in probes:
    print(p.id, p.name)
    print("  Irrigations:", len(p.irrigation_records))
    for r in p.irrigation_records:
        print(f"    - {r.date} / {r.irrigation_value_mm}mm")
