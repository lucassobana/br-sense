from datetime import datetime, timedelta
from statistics import median
from typing import List, Optional, Sequence, Tuple
from .config import CopilotConfig, DEFAULT_CONFIG
from .models import LayerReading

def _nearest_value(readings: Sequence[LayerReading], target: datetime, tolerance_minutes: int = 90) -> Optional[float]:
    candidates = [r for r in readings if abs((r.timestamp - target).total_seconds()) <= tolerance_minutes * 60]
    if not candidates: return None
    nearest = min(candidates, key=lambda r: abs((r.timestamp - target).total_seconds()))
    return float(nearest.moisture_pct)

def calculate_delta(readings: Sequence[LayerReading], hours: int) -> Optional[float]:
    if not readings: return None
    ordered = sorted(readings, key=lambda x: x.timestamp)
    past = _nearest_value(ordered, ordered[-1].timestamp - timedelta(hours=hours))
    return round(ordered[-1].moisture_pct - past, 3) if past is not None else None

def robust_daily_slope(readings: Sequence[LayerReading]) -> Optional[float]:
    if len(readings) < 4: return None
    ordered = sorted(readings, key=lambda x: x.timestamp)
    pairs = []
    for i in range(len(ordered) - 1):
        for j in range(i + 1, len(ordered)):
            hours = (ordered[j].timestamp - ordered[i].timestamp).total_seconds() / 3600
            if hours >= 2:
                pairs.append((ordered[j].moisture_pct - ordered[i].moisture_pct) * 24 / hours)
    return round(median(pairs), 3) if pairs else None

def analyze_layer_trend(readings: List[LayerReading], config: CopilotConfig = DEFAULT_CONFIG) -> Tuple[str, Optional[float], Optional[float], Optional[float], Optional[float]]:
    d6, d12, d24 = calculate_delta(readings, 6), calculate_delta(readings, 12), calculate_delta(readings, 24)
    slope = robust_daily_slope(readings)
    value = d24 if d24 is not None else slope
    
    if value is None: trend = "indefinida"
    elif abs(value) <= config.trend_stable_24h: trend = "estavel"
    elif value > config.trend_stable_24h: trend = "subindo"
    elif abs(value) <= config.trend_light_drop_24h: trend = "queda_leve"
    elif abs(value) <= config.trend_moderate_drop_24h: trend = "queda_moderada"
    else: trend = "queda_forte"
    
    return trend, d6, d12, d24, slope