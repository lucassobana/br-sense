from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

@dataclass
class LayerReading:
    timestamp: datetime
    depth_cm: int
    moisture_pct: float

@dataclass
class MoistureBandLimits:
    red_max: float
    yellow_max: float
    green_max: float
    blue_max: float = 100.0

@dataclass
class WeatherDay:
    date: str
    et0_mm: float = 0.0
    precipitation_mm: float = 0.0
    precipitation_probability_pct: float = 0.0

@dataclass
class LayerAnalysis:
    depth_cm: int
    current_moisture_pct: Optional[float]
    band: str
    band_position: Optional[float]
    trend: str
    delta_6h: Optional[float]
    delta_12h: Optional[float]
    delta_24h: Optional[float]
    projected_moisture_24h: Optional[float]
    projected_band_24h: str
    root_activity: str
    root_activity_score: float
    is_active: bool
    data_points: int
    anomalies: List[str] = field(default_factory=list)