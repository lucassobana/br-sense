from .root_zone import determine_active_root_zone
from .moisture_status import calculate_status
from .moisture_trend import calculate_trend
from .evapotranspiration import classify_et
from .stress_risk import calculate_stress_risk

def generate_agronomic_decision(
    talhao_info: str,
    avg_moisture: float,
    config_v1: float,
    config_v2: float,
    readings: list,
    et_atual: float,
    rain_class: str,
    previsao_chuva_str: str,
    ultima_chuva_mm: float,
    dias_sem_chuva: int
) -> dict:
    
    status = calculate_status(avg_moisture, config_v1, config_v2)
    zona_ativa = determine_active_root_zone(readings)
    
    et_class = classify_et(et_atual)
    tendencia = calculate_trend(et_class, rain_class)
    risco = calculate_stress_risk(tendencia, et_class, rain_class)

    # Lógica de Sugestão
    if rain_class == "relevante":
        sugestao = "Recomendamos aguardar a chuva prevista e reavaliar o comportamento da umidade no solo."
    elif risco == "alto":
        sugestao = "Recomendamos irrigação imediata para evitar perda de produtividade por déficit hídrico."
    elif risco == "moderado":
        sugestao = "Recomendamos monitoramento contínuo e possível irrigação complementar."
    else:
        sugestao = "Condições hídricas adequadas. Manter rotina padrão de monitoramento."

    # Observação Consolidada
    obs = (f"Maior atividade radicular identificada em {zona_ativa}. "
           f"A tendência de umidade é {tendencia} devido à ET {et_class} e "
           f"{'ausência de chuva relevante' if rain_class == 'nenhuma' else 'previsão de precipitação'}, "
           f"resultando em risco {risco} de estresse hídrico.")

    # Formatação de Última Chuva
    if ultima_chuva_mm > 0:
        dias_str = f"há {dias_sem_chuva} dias" if dias_sem_chuva > 0 else "hoje"
        ultima_str = f"{ultima_chuva_mm:.1f} mm {dias_str}"
    else:
        ultima_str = "Sem registros recentes"

    # Retorno rígido do contrato JSON
    return {
        "talhao_info": talhao_info,
        "status": status,
        "zona_ativa_raiz": zona_ativa,
        "tendencia_umidade": tendencia,
        "ultima_irrigacao_chuva": ultima_str,
        "previsao_chuva": previsao_chuva_str,
        "risco_estresse": risco,
        "sugestao": sugestao,
        "observacao": obs
    }