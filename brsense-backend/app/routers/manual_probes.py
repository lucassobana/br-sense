from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from typing import List

from app.db.session import get_db
from app.models.manual_probe import ManualProbe
from app.models.manual_irrigation_record import ManualIrrigationRecord
from app.models.farm import Farm
from app.schemas.manual_probe import ManualProbeCreate, ManualProbeUpdate, ManualProbeResponse
from app.schemas.manual_irrigation import ManualIrrigationCreate, ManualIrrigationResponse

router = APIRouter()


def _build_probe_response(probe: ManualProbe, irrigations: list) -> dict:
    """Constrói o dict de resposta garantindo que irrigation_records nunca seja omitido."""
    return {
        "id": probe.id,
        "farm_id": probe.farm_id,
        "name": probe.name,
        "latitude": probe.latitude,
        "longitude": probe.longitude,
        "irrigation_value_mm": probe.irrigation_value_mm,
        "created_at": probe.created_at,
        "updated_at": probe.updated_at,
        "irrigation_records": [
            {
                "id": r.id,
                "manual_probe_id": r.manual_probe_id,
                "irrigation_value_mm": r.irrigation_value_mm,
                "date": r.date,
                "created_at": r.created_at,
            }
            for r in irrigations
        ],
    }

@router.post("/", response_model=ManualProbeResponse, status_code=status.HTTP_201_CREATED)
def create_manual_probe(probe: ManualProbeCreate, db: Session = Depends(get_db)):
    # Verify if farm exists
    farm = db.query(Farm).filter(Farm.id == probe.farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Fazenda não encontrada")

    new_probe = ManualProbe(
        farm_id=probe.farm_id,
        name=probe.name,
        latitude=probe.latitude,
        longitude=probe.longitude,
        irrigation_value_mm=probe.irrigation_value_mm
    )
    db.add(new_probe)
    db.commit()
    db.refresh(new_probe)
    return new_probe

@router.get("/farm/{farm_id}", response_model=List[ManualProbeResponse])
def get_manual_probes_by_farm(farm_id: int, db: Session = Depends(get_db)):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Fazenda não encontrada")

    probes = (
        db.query(ManualProbe)
        .options(selectinload(ManualProbe.irrigation_records))
        .filter(ManualProbe.farm_id == farm_id)
        .all()
    )

    result = []
    for probe in probes:
        # Carrega registros ordenados por data descendente
        irrigations = sorted(probe.irrigation_records, key=lambda r: r.date, reverse=True)
        result.append(ManualProbeResponse.model_validate(_build_probe_response(probe, irrigations)))

    return result

@router.get("/{probe_id}", response_model=ManualProbeResponse)
def get_manual_probe(probe_id: int, db: Session = Depends(get_db)):
    probe = db.query(ManualProbe).filter(ManualProbe.id == probe_id).first()
    if not probe:
        raise HTTPException(status_code=404, detail="Sonda manual não encontrada")
    return probe

@router.put("/{probe_id}", response_model=ManualProbeResponse)
def update_manual_probe(probe_id: int, probe_update: ManualProbeUpdate, db: Session = Depends(get_db)):
    probe = db.query(ManualProbe).filter(ManualProbe.id == probe_id).first()
    if not probe:
        raise HTTPException(status_code=404, detail="Sonda manual não encontrada")

    update_data = probe_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(probe, key, value)
        
    db.commit()
    db.refresh(probe)
    return probe

@router.delete("/{probe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_manual_probe(probe_id: int, db: Session = Depends(get_db)):
    probe = db.query(ManualProbe).filter(ManualProbe.id == probe_id).first()
    if not probe:
        raise HTTPException(status_code=404, detail="Sonda manual não encontrada")

    db.delete(probe)
    db.commit()
    return

@router.post("/{probe_id}/irrigations", response_model=ManualIrrigationResponse, status_code=status.HTTP_201_CREATED)
def create_manual_irrigation(probe_id: int, irrigation: ManualIrrigationCreate, db: Session = Depends(get_db)):
    probe = db.query(ManualProbe).filter(ManualProbe.id == probe_id).first()
    if not probe:
        raise HTTPException(status_code=404, detail="Sonda manual não encontrada")

    new_record = ManualIrrigationRecord(
        manual_probe_id=probe_id,
        irrigation_value_mm=irrigation.irrigation_value_mm,
        date=irrigation.date
    )
    db.add(new_record)
    
    # Atualiza o valor atual da sonda para manter retrocompatibilidade / visual
    probe.irrigation_value_mm = irrigation.irrigation_value_mm
    
    db.commit()
    db.refresh(new_record)
    return new_record

@router.get("/{probe_id}/irrigations", response_model=List[ManualIrrigationResponse])
def get_manual_irrigations(probe_id: int, db: Session = Depends(get_db)):
    probe = db.query(ManualProbe).filter(ManualProbe.id == probe_id).first()
    if not probe:
        raise HTTPException(status_code=404, detail="Sonda manual não encontrada")

    records = db.query(ManualIrrigationRecord).filter(ManualIrrigationRecord.manual_probe_id == probe_id).order_by(ManualIrrigationRecord.date.desc()).all()
    return records
