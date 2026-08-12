from collections import defaultdict
from statistics import mean
from typing import Dict, List, Tuple
from .config import CopilotConfig, DEFAULT_CONFIG
from .models import LayerReading

def calculate_root_activity(readings: List[LayerReading], config: CopilotConfig = DEFAULT_CONFIG) -> Dict[int, Tuple[str, float]]:
    by_depth_day = defaultdict(lambda: defaultdict(list))
    for r in readings: by_depth_day[r.depth_cm][r.timestamp.date()].append(r)
    
    result = {}
    for depth, days in by_depth_day.items():
        daily_scores = []
        for _, values in sorted(days.items()):
            morning = [r.moisture_pct for r in values if 9 <= r.timestamp.hour <= 12]
            evening = [r.moisture_pct for r in values if 19 <= r.timestamp.hour <= 22]
            if morning and evening:
                drop = mean(morning) - mean(evening)
                normalized = max(0.0, min(1.0, drop / max(config.root_daily_drop_threshold_pct * 3, 0.01)))
                daily_scores.append(normalized)
                
        if len(daily_scores) < config.minimum_root_days:
            result[depth] = ("nao_identificada", 0.0)
            continue
            
        score = round(mean(daily_scores[-3:]), 3)
        activity = "alta" if score >= 0.70 else "moderada" if score >= 0.40 else "baixa" if score >= 0.15 else "nao_identificada"
        result[depth] = (activity, score)
    return result

def active_depths(activity: Dict[int, Tuple[str, float]]) -> List[int]:
    return sorted(d for d, (lvl, _) in activity.items() if lvl in {"alta", "moderada"})

def main_active_depth(activity: Dict[int, Tuple[str, float]]) -> int | None:
    candidates = [(d, s) for d, (lvl, s) in activity.items() if lvl in {"alta", "moderada"}]
    return max(candidates, key=lambda item: item[1])[0] if candidates else None