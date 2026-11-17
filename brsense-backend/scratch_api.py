from app.db.session import SessionLocal
from app.routers.manual_probes import get_manual_probes_by_farm
from app.schemas.manual_probe import ManualProbeResponse

db = SessionLocal()
try:
    probes = get_manual_probes_by_farm(1, db)
    for p in probes:
        print("Probe:", p.id)
        print("Irrigations (ORM):", p.irrigation_records)
        validated = ManualProbeResponse.model_validate(p)
        print("Irrigations (Pydantic):", validated.irrigation_records)
except Exception as e:
    print("Error:", e)
