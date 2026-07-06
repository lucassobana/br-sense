def classify_et(et_value: float) -> str:
    if et_value < 3.0: return "baixa"
    elif et_value > 5.5: return "alta"
    return "moderada"