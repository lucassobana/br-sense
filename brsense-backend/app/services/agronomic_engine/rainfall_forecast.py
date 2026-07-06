def classify_rain_forecast(forecast_mm: float) -> tuple:
    if forecast_mm < 1.0:
        return "nenhuma", "Sem previsão relevante"
    elif forecast_mm < 10.0:
        return "fraca", "Possibilidade de chuvas leves"
    return "relevante", f"Previsão de {forecast_mm:.1f} mm"