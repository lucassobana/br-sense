def calculate_status(avg_moisture: float, v1: float, v2: float) -> str:
    if avg_moisture < v1:
        return "Crítico"
    elif avg_moisture < v2:
        return "Atenção"
    return "Normal"