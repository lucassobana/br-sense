import logging
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session
from app.models.device import Device
from app.models.reading import Reading
from app.schemas.analysis import AgronomicDecisionCard

# Importando do serviço de clima fornecido
from app.services.weather_service import fetch_weather_data

# Importando os modelos e a função central do motor do Copiloto
from app.services.agronomic_engine.engine import generate_agronomic_decision
from app.services.agronomic_engine.models import LayerReading, MoistureBandLimits, WeatherDay

logger = logging.getLogger(__name__)

def parse_weather_days(payload: Optional[dict]) -> List[WeatherDay]:
    """Converte o payload bruto da API Open-Meteo para a estrutura do Copiloto."""
    if not payload or "daily" not in payload:
        return []
    
    daily = payload["daily"]
    dates = daily.get("time", [])
    et0 = daily.get("et0_fao_evapotranspiration", [])
    rain = daily.get("precipitation_sum", [])
    probability = daily.get("precipitation_probability_max", [])
    
    result = []
    for i, date_str in enumerate(dates):
        result.append(WeatherDay(
            date=date_str,
            et0_mm=float(et0[i] or 0.0) if i < len(et0) else 0.0,
            precipitation_mm=float(rain[i] or 0.0) if i < len(rain) else 0.0,
            precipitation_probability_pct=float(probability[i] or 0.0) if i < len(probability) else 0.0,
        ))
    return result

def analyze_device_data(db: Session, esn: str) -> Optional[AgronomicDecisionCard]:
    """
    Busca os dados do banco, executa o motor agronômico e retorna o Card de Decisão formatado.
    """
    # 1. Buscar a Sonda
    device = db.query(Device).filter(Device.esn == esn).first()
    if not device:
        return None

    now = datetime.utcnow()
    start = now - timedelta(days=3) # O motor exige histórico de até 72h

    # 2. Buscar as Leituras e mapear para a estrutura do Motor
    rows = db.query(Reading).filter(
        Reading.device_id == device.id,
        Reading.timestamp >= start,
        Reading.depth_cm.isnot(None),
        Reading.moisture_pct.isnot(None),
    ).order_by(Reading.timestamp.asc()).all()

    readings = [
        LayerReading(
            timestamp=row.timestamp,
            depth_cm=int(row.depth_cm),
            moisture_pct=float(row.moisture_pct),
        )
        for row in rows
        if 0.0 <= float(row.moisture_pct) <= 100.0
    ]

    # 3. Configurar os Limites de Umidade (V1, V2, V3)
    # Como o Device possui limites globais, aplicamos os mesmos para todas as profundidades padrão
    global_limits = MoistureBandLimits(
        red_max=device.config_moisture_v1 or 30.0,
        yellow_max=device.config_moisture_v2 or 45.0,
        green_max=device.config_moisture_v3 or 60.0,
        blue_max=100.0
    )
    limits_by_depth = {depth: global_limits for depth in [10, 20, 30, 40, 50, 60, 70, 80, 90]}

    # 4. Buscar e processar o Clima
    weather_days = []
    if device.latitude is not None and device.longitude is not None:
        raw_weather = fetch_weather_data(device.latitude, device.longitude)
        weather_days = parse_weather_days(raw_weather)

    # Pegamos a ET0 observada do dia anterior se disponível (índice 0 é hoje, vamos usar a média ou a atual)
    observed_et_mm = weather_days[0].et0_mm if weather_days else 0.0

    # 5. Executar o Motor do Copiloto
    decision_dict = generate_agronomic_decision(
        readings=readings,
        limits_by_depth=limits_by_depth,
        weather_days=weather_days,
        observed_et_mm=float(observed_et_mm),
        now=now,
    )

    # 6. Extrair Risco de Estresse das justificativas geradas pelo motor
    risco = "Indeterminado"
    for reason in decision_dict.get("reasons", []):
        if "Risco hídrico consolidado" in reason:
            risco = reason.split(":")[1].strip().replace(".", "").title()

    # 7. Mapear o Dicionário do Motor para o Schema Pydantic AgronomicDecisionCard
    cultura_info = device.cultura if device.cultura else "Cultura não informada"
    nome_sonda = device.name if device.name else f"Sonda {device.esn}"
    
    zona_ativa = ", ".join([f"{d} cm" for d in decision_dict.get("root_active_layers", [])])
    if not zona_ativa:
        zona_ativa = "Não identificada"

    return AgronomicDecisionCard(
        talhao_info=f"{nome_sonda} - {cultura_info}",
        status=decision_dict["status"],
        zona_ativa_raiz=zona_ativa,
        tendencia_umidade=decision_dict["current_trend"].replace("_", " ").title(),
        ultima_irrigacao_chuva="Evento hídrico recente detectado" if decision_dict["recent_water_event"] else "Sem entrada de água recente",
        previsao_chuva=decision_dict["rain_outlook"].replace("_", " ").title(),
        risco_estresse=risco,
        sugestao=decision_dict["decision"].replace("_", " "),
        observacao=f"{decision_dict['headline']}. {decision_dict['recommendation']} {decision_dict['technical_observation']}"
    )