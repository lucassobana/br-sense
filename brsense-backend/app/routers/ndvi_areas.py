# app/routers/ndvi_areas.py
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_user_token, get_user_and_roles
from app.db.session import engine, get_db
from app.models.device import Device
from app.models.farm import Farm
from app.models.ndvi_area import NdviArea
from app.schemas.ndvi_area import (
    NdviAreaBatchCreate,
    NdviAreaResponse,
    NdviAreaUpdate,
)

router = APIRouter()

_table_checked = False


def _ensure_ndvi_table() -> None:
    global _table_checked
    if _table_checked:
        return
    try:
        NdviArea.__table__.create(bind=engine, checkfirst=True)
        _table_checked = True
    except Exception as exc:
        print(f"Aviso ao verificar tabela ndvi_areas: {exc}")


def _to_response(item: NdviArea) -> dict:
    device = item.device
    farm = item.farm or (device.farm if device else None)
    farm_name = farm.name if farm else "Fazenda BR Sense"
    city = (
        (farm.location if farm and farm.location else None)
        or (device.location if device and device.location else None)
        or "Brasil"
    )
    crop = item.crop
    if (not crop or crop == "Monitoramento Satelital") and device and device.cultura:
        crop = device.cultura

    try:
        geometry = json.loads(item.geometry_json)
    except (ValueError, TypeError):
        geometry = {}

    circle = None
    if item.circle_json:
        try:
            circle = json.loads(item.circle_json)
        except (ValueError, TypeError):
            circle = None

    area_type = item.area_type if item.area_type in ("pivo", "talhao") else "pivo"
    source = item.source if item.source in ("desenho", "kml", "sistema", "demo") else "desenho"

    return {
        "id": f"ndvi-{item.id}",
        "db_id": item.id,
        "device_id": item.device_id,
        "device_esn": device.esn if device else None,
        "device_name": (device.name or f"Sonda {device.esn}") if device else None,
        "farm_id": item.farm_id or (device.farm_id if device else None),
        "farmName": farm_name,
        "city": city,
        "name": item.name,
        "type": area_type,
        "crop": crop or "Monitoramento Satelital",
        "hectares": float(item.hectares),
        "geometry": geometry,
        "source": source,
        "circle": circle,
        "created_at": item.created_at,
    }


@router.get("", response_model=List[NdviAreaResponse])
def list_ndvi_areas(
    device_id: Optional[int] = Query(None),
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db),
):
    """
    Lista as áreas NDVI salvas no banco e vinculadas às sondas.
    - Admin vê todas as áreas.
    - Usuário comum vê apenas as áreas vinculadas às sondas de suas fazendas.
    """
    _ensure_ndvi_table()
    user, is_admin = get_user_and_roles(db, token_payload)

    query = (
        db.query(NdviArea)
        .options(
            joinedload(NdviArea.device).joinedload(Device.farm),
            joinedload(NdviArea.farm),
        )
        .join(Device, NdviArea.device_id == Device.id)
    )

    if not is_admin:
        query = query.join(Farm, Device.farm_id == Farm.id).filter(Farm.user_id == user.id)

    if device_id is not None:
        query = query.filter(NdviArea.device_id == device_id)

    rows = query.order_by(NdviArea.created_at.desc()).all()
    return [_to_response(row) for row in rows]


@router.post("/batch", response_model=List[NdviAreaResponse], status_code=status.HTTP_201_CREATED)
def create_ndvi_areas_batch(
    body: NdviAreaBatchCreate,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db),
):
    """
    Cadastra um ou mais contornos NDVI (desenhados no mapa ou importados via KML)
    obrigatoriamente vinculados a uma sonda (device_id).
    Apenas usuários com permissão de ADMIN podem executar esta operação.
    """
    _ensure_ndvi_table()
    _, is_admin = get_user_and_roles(db, token_payload)
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Somente administradores podem desenhar ou cadastrar áreas no NDVI.",
        )

    device_ids = {item.device_id for item in body.areas}
    devices = (
        db.query(Device)
        .options(joinedload(Device.farm))
        .filter(Device.id.in_(list(device_ids)))
        .all()
    )
    device_map = {d.id: d for d in devices}

    missing = [d_id for d_id in device_ids if d_id not in device_map]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sonda(s) não encontrada(s): {missing}",
        )

    created_ids: List[int] = []
    try:
        for item in body.areas:
            dev = device_map[item.device_id]
            geom_type = item.geometry.get("type") if isinstance(item.geometry, dict) else None
            if geom_type not in ("Polygon", "MultiPolygon"):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Geometria inválida. Deve ser Polygon ou MultiPolygon.",
                )

            crop_val = (item.crop or "").strip()
            if not crop_val or crop_val == "Monitoramento Satelital":
                crop_val = dev.cultura or "Monitoramento Satelital"

            db_item = NdviArea(
                device_id=dev.id,
                farm_id=dev.farm_id,
                name=item.name.strip()[:150],
                area_type=item.type,
                crop=crop_val[:120],
                hectares=float(item.hectares),
                source=item.source,
                geometry_json=json.dumps(item.geometry),
                circle_json=json.dumps(item.circle.model_dump()) if item.circle else None,
            )
            db.add(db_item)
            db.flush()
            created_ids.append(db_item.id)

        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar área NDVI: {exc}",
        )

    rows = (
        db.query(NdviArea)
        .options(
            joinedload(NdviArea.device).joinedload(Device.farm),
            joinedload(NdviArea.farm),
        )
        .filter(NdviArea.id.in_(created_ids))
        .order_by(NdviArea.id.asc())
        .all()
    )
    return [_to_response(row) for row in rows]


@router.put("/{area_id}", response_model=NdviAreaResponse)
def update_ndvi_area(
    area_id: str,
    body: NdviAreaUpdate,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db),
):
    """
    Atualiza uma área NDVI existente (nome, sonda vinculada, tipo, cultura ou contorno).
    Apenas usuários com permissão de ADMIN podem editar áreas NDVI.
    """
    _ensure_ndvi_table()
    _, is_admin = get_user_and_roles(db, token_payload)
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Somente administradores podem editar áreas do NDVI.",
        )

    clean_id = area_id.replace("ndvi-", "").strip()
    try:
        numeric_id = int(clean_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de área inválido.")

    row = (
        db.query(NdviArea)
        .options(
            joinedload(NdviArea.device).joinedload(Device.farm),
            joinedload(NdviArea.farm),
        )
        .filter(NdviArea.id == numeric_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Área NDVI não encontrada.")

    if body.device_id is not None and body.device_id != row.device_id:
        dev = (
            db.query(Device)
            .options(joinedload(Device.farm))
            .filter(Device.id == body.device_id)
            .first()
        )
        if not dev:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sonda {body.device_id} não encontrada.",
            )
        row.device_id = dev.id
        row.farm_id = dev.farm_id
        row.device = dev

    if body.name is not None:
        row.name = body.name.strip()[:150]
    if body.type is not None:
        row.area_type = body.type
    if body.crop is not None:
        row.crop = body.crop.strip()[:120] or "Monitoramento Satelital"
    if body.hectares is not None:
        row.hectares = float(body.hectares)
    if body.geometry is not None:
        geom_type = body.geometry.get("type") if isinstance(body.geometry, dict) else None
        if geom_type not in ("Polygon", "MultiPolygon"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Geometria inválida. Deve ser Polygon ou MultiPolygon.",
            )
        row.geometry_json = json.dumps(body.geometry)
        row.circle_json = json.dumps(body.circle.model_dump()) if body.circle else None

    db.commit()
    db.refresh(row)
    return _to_response(row)


@router.delete("/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ndvi_area(
    area_id: str,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db),
):
    """
    Remove uma área NDVI do banco de dados.
    Apenas usuários com permissão de ADMIN podem remover áreas NDVI.
    """
    _ensure_ndvi_table()
    _, is_admin = get_user_and_roles(db, token_payload)
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Somente administradores podem remover áreas do NDVI.",
        )

    clean_id = area_id.replace("ndvi-", "").strip()
    try:
        numeric_id = int(clean_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de área inválido.")

    row = db.query(NdviArea).filter(NdviArea.id == numeric_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Área NDVI não encontrada.")

    db.delete(row)
    db.commit()
    return

