from dataclasses import dataclass, field
from typing import Dict

@dataclass(frozen=True)
class CopilotConfig:
    fresh_reading_minutes: int = 40
    delayed_reading_minutes: int = 90
    stale_reading_hours: int = 4
    minimum_points_for_trend: int = 6
    minimum_history_hours: int = 12
    preferred_history_hours: int = 24
    minimum_root_days: int = 2
    noise_tolerance_pct: float = 0.30
    trend_stable_24h: float = 0.50
    trend_light_drop_24h: float = 1.50
    trend_moderate_drop_24h: float = 3.00
    root_daily_drop_threshold_pct: float = 0.20
    water_event_surface_rise_pct: float = 1.00
    water_event_any_layer_rise_pct: float = 1.50
    event_settling_hours: int = 6
    event_deep_settling_hours: int = 12
    minimum_et_for_projection_mm: float = 1.0
    max_projection_factor: float = 1.75
    projection_lookback_hours: int = 24
    rain_negligible_mm: float = 1.0
    rain_small_mm: float = 5.0
    rain_useful_mm: float = 10.0
    rain_relevant_probability_pct: float = 60.0
    rain_high_probability_pct: float = 80.0
    rain_relevant_horizon_hours: int = 24
    root_activity_weights: Dict[str, float] = field(default_factory=lambda: {
        "alta": 1.0, "moderada": 0.7, "baixa": 0.3, "nao_identificada": 0.1,
    })

DEFAULT_CONFIG = CopilotConfig()