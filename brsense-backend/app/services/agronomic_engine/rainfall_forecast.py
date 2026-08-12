from typing import Dict, Iterable
from .config import CopilotConfig, DEFAULT_CONFIG
from .models import WeatherDay

def classify_rain_forecast(forecast_mm: float, probability_pct: float, horizon_hours: int, config: CopilotConfig = DEFAULT_CONFIG) -> str:
    if forecast_mm < config.rain_negligible_mm:
        return "desprezivel"
    if forecast_mm < config.rain_small_mm:
        return "pequena"
    if forecast_mm < config.rain_useful_mm:
        return "potencialmente_util"
    
    if horizon_hours <= config.rain_relevant_horizon_hours:
        if probability_pct >= config.rain_high_probability_pct:
            return "muito_provavel"
        if probability_pct >= config.rain_relevant_probability_pct:
            return "relevante"
            
    return "incerta"

def summarize_rain(days: Iterable[WeatherDay], config: CopilotConfig = DEFAULT_CONFIG) -> Dict:
    values = list(days)
    next_24 = values[0] if values else WeatherDay(date="")
    next_72 = values[:3]
    total_72 = round(sum(max(0.0, d.precipitation_mm) for d in next_72), 2)
    max_prob = max([d.precipitation_probability_pct for d in next_72] or [0.0])
    
    classification = classify_rain_forecast(
        next_24.precipitation_mm, next_24.precipitation_probability_pct, 24, config
    )
    
    return {
        "next_24h_mm": next_24.precipitation_mm,
        "next_24h_probability_pct": next_24.precipitation_probability_pct,
        "next_72h_mm": total_72,
        "max_probability_72h_pct": max_prob,
        "classification": classification,
    }

def rain_can_delay_irrigation(rain_summary: Dict, is_yellow_low: bool, critical_active_layer: bool) -> bool:
    if critical_active_layer:
        return False
        
    classification = rain_summary.get("classification")
    
    # Se estiver no amarelo baixo (quase vermelho), só segura a irrigação se a chuva for muito provável (>= 80%)
    if is_yellow_low:
        return classification == "muito_provavel"
    
    # Para outras faixas, uma chuva relevante (>= 60%) já é suficiente para aguardar
    return classification in ["relevante", "muito_provavel"]