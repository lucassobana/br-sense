from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
from .config import CopilotConfig, DEFAULT_CONFIG
from .models import LayerReading

def detect_recent_water_event(readings: List[LayerReading], now: datetime, config: CopilotConfig = DEFAULT_CONFIG) -> Tuple[bool, List[int], str]:
    by_depth = defaultdict(list)
    for r in readings:
        if r.timestamp >= now - timedelta(hours=config.event_settling_hours):
            by_depth[r.depth_cm].append(r)
            
    responsive_depths = []
    for depth, values in by_depth.items():
        ordered = sorted(values, key=lambda x: x.timestamp)
        if len(ordered) >= 2:
            rise = ordered[-1].moisture_pct - ordered[0].moisture_pct
            threshold = config.water_event_surface_rise_pct if depth <= 20 else config.water_event_any_layer_rise_pct
            if rise >= threshold: responsive_depths.append(depth)
            
    if not responsive_depths: return False, [], "nenhum_evento_detectado"
    deepest = max(responsive_depths)
    pattern = "agua_em_camadas_profundas" if deepest >= 50 else "molhamento_parcial_do_perfil" if deepest >= 30 else "molhamento_superficial"
    return True, sorted(responsive_depths), pattern

def detect_possible_percolation(current_bands: Dict[int, str], responsive_depths: List[int]) -> bool:
    upper_wet = any(current_bands.get(d) == "azul" for d in (10, 20, 30))
    deep_response = any(d >= 50 for d in responsive_depths)
    return upper_wet and deep_response

def detect_vertical_drying_progression(bands: Dict[int, str], trends: Dict[int, str], active_depths: List[int]) -> bool:
    severe, falling = {"amarelo_baixo", "amarelo_medio", "vermelho"}, {"queda_leve", "queda_moderada", "queda_forte"}
    affected = [d for d in active_depths if bands.get(d) in severe and trends.get(d) in falling]
    return len(affected) >= 2