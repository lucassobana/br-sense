from typing import Optional
from .config import CopilotConfig, DEFAULT_CONFIG

def project_moisture_from_et(current_moisture_pct: float, observed_drop_pct: Optional[float], observed_et_mm: Optional[float], forecast_et_mm: Optional[float], recent_water_event: bool, config: CopilotConfig = DEFAULT_CONFIG) -> Optional[float]:
    if recent_water_event or observed_drop_pct is None or observed_drop_pct <= config.noise_tolerance_pct:
        return current_moisture_pct if not recent_water_event else None
    if not observed_et_mm or observed_et_mm < config.minimum_et_for_projection_mm or forecast_et_mm is None:
        return None
        
    factor = min(max(forecast_et_mm / observed_et_mm, 0.0), config.max_projection_factor)
    projected_drop = observed_drop_pct * factor
    return round(max(0.0, current_moisture_pct - projected_drop), 2)