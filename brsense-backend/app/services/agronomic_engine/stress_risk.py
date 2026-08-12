from typing import List
from .models import LayerAnalysis

def calculate_stress_risk(layers: List[LayerAnalysis]) -> str:
    active = [x for x in layers if x.is_active]
    if not active: return "indeterminado"
    if any(x.band == "vermelho" for x in active): return "critico"
    if any(x.band in {"amarelo_baixo", "amarelo_medio"} and x.trend in {"queda_moderada", "queda_forte"} for x in active): return "alto"
    if any(x.band.startswith("amarelo") or x.band == "verde_baixo" for x in active): return "moderado"
    return "baixo"