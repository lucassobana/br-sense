from pydantic import BaseModel

class AgronomicDecisionCard(BaseModel):
    talhao_info: str
    status: str
    zona_ativa_raiz: str
    tendencia_umidade: str
    ultima_irrigacao_chuva: str
    previsao_chuva: str
    risco_estresse: str
    sugestao: str
    observacao: str