from datetime import datetime, timezone
from typing import Dict, List, Optional
from .config import CopilotConfig, DEFAULT_CONFIG
from .evapotranspiration import project_moisture_from_et
from .models import LayerAnalysis, LayerReading, MoistureBandLimits, WeatherDay
from .moisture_status import classify_moisture_band, simple_status_from_band
from .moisture_trend import analyze_layer_trend
from .rainfall_forecast import rain_can_delay_irrigation, summarize_rain
from .root_zone import active_depths, calculate_root_activity, main_active_depth
from .soil_analysis import detect_possible_percolation, detect_recent_water_event, detect_vertical_drying_progression
from .stress_risk import calculate_stress_risk

def _confidence(readings: List[LayerReading], weather_available: bool, root_identified: bool, now: datetime, config: CopilotConfig) -> str:
    if not readings: return "baixa"
    latest = max(r.timestamp for r in readings)
    age_hours = (now - latest).total_seconds() / 3600
    score = 0
    score += 35 if age_hours <= config.fresh_reading_minutes / 60 else 15 if age_hours <= 2 else 0
    score += 30 if len(readings) >= 24 else 18 if len(readings) >= 12 else 5
    score += 20 if root_identified else 5
    score += 15 if weather_available else 0
    return "alta" if score >= 80 else "media" if score >= 55 else "baixa"

def generate_agronomic_decision(readings: List[LayerReading], limits_by_depth: Dict[int, MoistureBandLimits], weather_days: List[WeatherDay], observed_et_mm: Optional[float], now: Optional[datetime] = None, config: CopilotConfig = DEFAULT_CONFIG) -> Dict:
    now = now or datetime.utcnow()
    warnings, reasons = [], []
    
    if not readings:
        return {
            "decision": "DADOS_INSUFICIENTES", "confidence": "baixa", "status": "Dados insuficientes",
            "headline": "Não há dados suficientes para análise", "recommendation": "Aguardar novas leituras.",
            "technical_observation": "Nenhuma leitura válida.", "root_active_layers": [], "main_layer_cm": None,
            "current_trend": "indefinida", "rain_outlook": "indisponivel", "recent_water_event": False,
            "layers": [], "reasons": [], "warnings": ["Sem leituras válidas"], "generated_at": now.isoformat()
        }

    latest_timestamp = max(r.timestamp for r in readings)
    if (now - latest_timestamp).total_seconds() > config.stale_reading_hours * 3600:
        warnings.append("A última leitura está desatualizada.")

    root_activity = calculate_root_activity(readings, config)
    roots = active_depths(root_activity)
    main_depth = main_active_depth(root_activity)
    recent_event, responsive_depths, event_pattern = detect_recent_water_event(readings, now, config)
    weather_available = bool(weather_days)
    rain = summarize_rain(weather_days, config)
    forecast_et = weather_days[0].et0_mm if weather_days else None

    grouped = {}
    for r in readings: grouped.setdefault(r.depth_cm, []).append(r)

    layers, bands, trends = [], {}, {}
    for depth in sorted(grouped):
        values = sorted(grouped[depth], key=lambda x: x.timestamp)
        current = values[-1].moisture_pct
        limits = limits_by_depth.get(depth)
        
        band, position = classify_moisture_band(current, limits) if limits else ("desconhecida", None)
        trend, d6, d12, d24, slope = analyze_layer_trend(values, config)
        activity, activity_score = root_activity.get(depth, ("nao_identificada", 0.0))
        observed_drop = abs(d24) if d24 is not None and d24 < -config.noise_tolerance_pct else None
        
        projected = project_moisture_from_et(current, observed_drop, observed_et_mm, forecast_et, recent_event, config)
        projected_band = classify_moisture_band(projected, limits)[0] if projected and limits else "indefinida"
        
        layer = LayerAnalysis(
            depth_cm=depth, current_moisture_pct=round(current, 2), band=band,
            band_position=round(position, 3) if position is not None else None,
            trend=trend, delta_6h=d6, delta_12h=d12, delta_24h=d24, projected_moisture_24h=projected,
            projected_band_24h=projected_band, root_activity=activity, root_activity_score=activity_score,
            is_active=depth in roots, data_points=len(values), anomalies=[]
        )
        layers.append(layer); bands[depth] = band; trends[depth] = trend

    confidence = _confidence(readings, weather_available, bool(roots), now, config)
    
    # Flags de Regras
    critical_active = any(x.is_active and x.band == "vermelho" for x in layers)
    
    # Regra U07 - Reserva em Profundidade
    surface_active_attention = any(x.is_active and x.depth_cm <= 20 and x.band.startswith("amarelo") for x in layers)
    deep_active_ok = any(x.is_active and x.depth_cm >= 30 and x.band.startswith("verde") and x.trend == "estavel" for x in layers)
    u07_deep_reserve = surface_active_attention and deep_active_ok
    
    yellow_falling = [x for x in layers if x.is_active and x.band.startswith("amarelo") and x.trend in {"queda_leve", "queda_moderada", "queda_forte"}]
    projected_to_yellow = [x for x in layers if x.is_active and x.band == "verde_baixo" and x.projected_band_24h.startswith("amarelo")]
    active_green_ok = [x for x in layers if x.is_active and (x.band in {"verde_medio", "verde_alto", "azul"})]
    all_active_ok = bool(roots) and len(active_green_ok) == len(roots)
    percolation = detect_possible_percolation(bands, responsive_depths)
    vertical_drying = detect_vertical_drying_progression(bands, trends, roots)

    # Árvore de Decisão
    if warnings and "desatualizada" in " ".join(warnings).lower():
        decision, headline, recommendation = "DADOS_INSUFICIENTES", "Dados desatualizados", "Aguardar o restabelecimento das leituras."
    elif recent_event:
        decision, headline, recommendation = "AGUARDAR_ESTABILIZAÇÃO", "Entrada recente de água", "Não realizar nova irrigação antes de observar a estabilização."
    elif percolation:
        decision, headline, recommendation = "NÃO_IRRIGAR", "Água em camadas profundas", "Não há indicação de nova irrigação neste momento."
    elif critical_active:
        decision, headline, recommendation = "IRRIGAR", "Indicação de irrigação", "Umidade atingiu a faixa crítica em camada ativa."
    elif u07_deep_reserve:
        decision, headline, recommendation = "MONITORAR", "Reserva hídrica em profundidade", "A superfície apresenta perda, mas o sistema radicular profundo encontra-se estável."
    elif len(yellow_falling) >= 1:
        has_yellow_low = any(x.band == "amarelo_baixo" for x in yellow_falling)
        if rain_can_delay_irrigation(rain, is_yellow_low=has_yellow_low, critical_active_layer=critical_active):
            decision, headline, recommendation = "AGUARDAR_CHUVA", "Aguardar a chuva prevista", "Existe previsão de chuva forte o suficiente para segurar a irrigação."
        else:
            decision, headline, recommendation = "IRRIGAR", "Indicação de irrigação", "Camada ativa na faixa amarela continua perdendo umidade."
    elif projected_to_yellow:
        decision = "IRRIGAR" if confidence in {"alta", "media"} else "MONITORAR"
        headline = "Tendência de entrada na faixa de atenção"
        recommendation = "A ET prevista indica redução da umidade nas próximas 24 horas." if decision == "IRRIGAR" else "Reavaliar quando houver mais dados."
    elif vertical_drying:
        decision, headline, recommendation = "IRRIGAR", "Secamento avançando", "A condição de atenção está avançando em profundidade."
    elif all_active_ok:
        decision, headline, recommendation = "NÃO_IRRIGAR", "Umidade adequada", "Manter o monitoramento; não há indicação de irrigação."
    else:
        decision, headline, recommendation = "MONITORAR", "Continuar monitorando", "As camadas apresentam comportamento intermediário."

    risk = calculate_stress_risk(layers)
    main_layer = next((x for x in layers if x.depth_cm == main_depth), None)
    
    # Se não achar a profundidade principal da raiz, usa a camada de 10cm como referência para a tela
    if not main_layer:
        main_layer = next((x for x in layers if x.depth_cm == 10), None)

    # Se ainda estiver indeterminado, usa o risco geral ignorando a exigência de ser "camada ativa"
    if risk == "indeterminado" and layers:
        if any(x.band == "vermelho" for x in layers): risk = "critico"
        elif any(x.band in {"amarelo_baixo", "amarelo_medio"} and x.trend in {"queda_moderada", "queda_forte"} for x in layers): risk = "alto"
        elif any(x.band.startswith("amarelo") or x.band == "verde_baixo" for x in layers): risk = "moderado"
        else: risk = "baixo"
    
    for x in layers:
        if x.is_active: reasons.append(f"{x.depth_cm} cm: {x.band}, tendência {x.trend}.")
    if forecast_et is not None: reasons.append(f"ET0 prevista: {forecast_et:.1f} mm.")
    reasons.append(f"Risco hídrico consolidado: {risk}.")

    return {
        "decision": decision, "confidence": confidence, 
        "status": simple_status_from_band(main_layer.band) if main_layer else "Atenção",
        "headline": headline, "recommendation": recommendation, 
        "technical_observation": " ".join(reasons[:4]) if reasons else "",
        "root_active_layers": roots, "main_layer_cm": main_depth, 
        "current_trend": main_layer.trend if main_layer else "indefinida",
        "rain_outlook": rain.get("classification", "indisponivel"), 
        "recent_water_event": recent_event, "reasons": reasons, 
        "warnings": warnings, "generated_at": now.isoformat(),
        # Para compatibilidade, os layers são convertidos em dict
        "layers": [{"depth_cm": l.depth_cm, "band": l.band, "trend": l.trend} for l in layers] 
    }