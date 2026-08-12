from typing import Optional, Tuple
from .models import MoistureBandLimits

def classify_moisture_band(moisture_pct: Optional[float], limits: MoistureBandLimits) -> Tuple[str, Optional[float]]:
    if moisture_pct is None: return "desconhecida", None
    
    if moisture_pct <= limits.red_max:
        return "vermelho", max(0.0, min(1.0, moisture_pct / max(limits.red_max, 0.01)))
    if moisture_pct <= limits.yellow_max:
        pos = (moisture_pct - limits.red_max) / (limits.yellow_max - limits.red_max)
        if pos <= 0.33: return "amarelo_baixo", pos
        if pos <= 0.67: return "amarelo_medio", pos
        return "amarelo_alto", pos
    if moisture_pct <= limits.green_max:
        pos = (moisture_pct - limits.yellow_max) / (limits.green_max - limits.yellow_max)
        if pos <= 0.30: return "verde_baixo", pos
        if pos <= 0.70: return "verde_medio", pos
        return "verde_alto", pos
        
    return "azul", min(1.0, (moisture_pct - limits.green_max) / max(limits.blue_max - limits.green_max, 0.01))

def simple_status_from_band(band: str) -> str:
    if band == "vermelho": return "Crítico"
    if band.startswith("amarelo") or band == "verde_baixo": return "Atenção"
    if band == "desconhecida": return "Dados insuficientes"
    return "Normal"