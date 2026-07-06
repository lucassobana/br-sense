def calculate_stress_risk(trend: str, et_class: str, rain_class: str) -> str:
    if trend == "cair" and et_class == "alta" and rain_class == "nenhuma":
        return "alto"
    elif trend == "subir" or rain_class == "relevante":
        return "baixo"
    else:
        return "moderado"