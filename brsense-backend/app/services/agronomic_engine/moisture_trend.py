def calculate_trend(et_class: str, rain_class: str) -> str:
    if rain_class == "relevante":
        if et_class == "alta": return "instável"
        return "subir"
    else:
        if et_class == "alta" or et_class == "moderada": return "cair"
        return "estável"