import type { ReactNode } from 'react';

/** As porcentagens são as mesmas usadas no gráfico de umidade da plataforma. */
export interface LeituraUmidade {
  /** ISO 8601 com fuso: por exemplo 2026-10-24T11:20:00-03:00. */
  instante: string;
  profundidadeCm: number;
  umidadePct: number | null;
}

export interface EventoIrrigacao {
  id: string;
  inicio: string;
  laminaMm: number;
  /** Limite exclusivo. Use o início do evento seguinte para separar respostas. */
  analisarAte?: string;
  leituras: readonly LeituraUmidade[];
  /** Ativa identificação explícita de dados sintéticos na interface. */
  demonstrativo?: boolean;
  /** Diferencia se a lâmina foi medida por pluviômetro, registrada manualmente ou detectada por infiltração no solo. */
  origemMedicao?: 'pluviometro' | 'manual' | 'infiltracao';
}

export interface FaixasUmidade {
  minimoPct: number;
  limiteAmareloVerdePct: number;
  limiteVerdeAzulPct: number;
  maximoPct: number;
}

export interface PontoUmidade {
  instanteMs: number;
  umidadePct: number;
}

export interface RespostaCamada {
  profundidadeCm: number;
  antesPct: number;
  picoPct: number;
  atualPct: number;
  variacaoPp: number;
  respostaEmMs: number;
  tempoRespostaMin: number;
  picoEmMs: number;
  pontos: readonly PontoUmidade[];
}

export interface AnaliseEvento {
  camadas: readonly RespostaCamada[];
  /** Profundidades com dados posteriores, mas sem referência anterior válida. */
  semReferenciaAnterior: readonly number[];
  leiturasInvalidas: number;
}

export interface AguaNoSoloProps {
  eventos: readonly EventoIrrigacao[];
  /** Reutilize os limites configurados no gráfico atual da sonda. */
  faixas: FaixasUmidade;
  eventoSelecionadoId?: string;
  onSelecionarEvento?: (id: string) => void;
  /** Padrão 0: qualquer aumento estritamente positivo é considerado. */
  aumentoMinimoPp?: number;
  carregando?: boolean;
  erro?: string;
  fusoHorario?: string;
}

export interface UmidadeAtual {
  profundidadeCm: number;
  umidadePct: number | null;
  cor?: string;
}

export interface CardSondaProps extends AguaNoSoloProps {
  nomeSonda: string;
  atualizadoEm?: string;
  status?: string;
  umidades: readonly UmidadeAtual[];
  /** Conteúdo existente da plataforma, sem reimplementar a recomendação. */
  resumoCopiloto?: ReactNode;
  pluviometria?: ReactNode;
  previsao?: ReactNode;
  iniciarNoCopiloto?: boolean;
  onFechar?: () => void;
  onVerGraficoCompleto?: () => void;
}
