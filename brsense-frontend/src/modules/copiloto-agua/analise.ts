import type { AnaliseEvento, EventoIrrigacao, FaixasUmidade, PontoUmidade, RespostaCamada } from './types';

export function instanteMs(iso: string | number): number {
  if (typeof iso === 'number') return Number.isFinite(iso) ? iso : Number.NaN;
  if (!iso) return Number.NaN;
  let str = String(iso).trim();
  if (!str.includes('T') && str.includes(' ')) {
    str = str.replace(' ', 'T');
  }
  // Se não contiver fuso explícito (Z ou +HH:MM / -HH:MM), tratamos como UTC adicionando 'Z'
  if (!str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
    str += 'Z';
  }
  const parsed = Date.parse(str);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/** Não limita profundidades e não transforma queda em consumo medido da planta. */
export function analisarEvento(evento: EventoIrrigacao, aumentoMinimoPp = 0): AnaliseEvento {
  const inicio = instanteMs(evento.inicio);
  const fim = evento.analisarAte ? instanteMs(evento.analisarAte) : Number.POSITIVE_INFINITY;
  const vazio: AnaliseEvento = { camadas: [], semReferenciaAnterior: [], leiturasInvalidas: 0 };
  if (!Number.isFinite(inicio) || Number.isNaN(fim) || fim <= inicio) return vazio;
  const minimo = Number.isFinite(aumentoMinimoPp) ? Math.max(0, aumentoMinimoPp) : 0;
  const porProfundidade = new Map<number, Map<number, PontoUmidade>>();
  let leiturasInvalidas = 0;

  for (const leitura of evento.leituras) {
    const tempo = instanteMs(leitura.instante);
    const umidade = leitura.umidadePct;
    if (!Number.isFinite(tempo) || !Number.isFinite(leitura.profundidadeCm) || leitura.profundidadeCm <= 0 ||
      typeof umidade !== 'number' || !Number.isFinite(umidade) || umidade < 0 || umidade > 100) {
      leiturasInvalidas += 1;
      continue;
    }
    if (tempo >= fim) continue;
    const pontos = porProfundidade.get(leitura.profundidadeCm) ?? new Map<number, PontoUmidade>();
    // Uma leitura por instante e profundidade; a última ocorrência recebida prevalece.
    pontos.set(tempo, { instanteMs: tempo, umidadePct: umidade });
    porProfundidade.set(leitura.profundidadeCm, pontos);
  }

  const camadas: RespostaCamada[] = [];
  const semReferenciaAnterior: number[] = [];
  for (const [profundidadeCm, mapa] of porProfundidade) {
    const pontos = [...mapa.values()].sort((a, b) => a.instanteMs - b.instanteMs);
    const anteriores = pontos.filter((ponto) => ponto.instanteMs < inicio);
    if (!anteriores.length) {
      const posteriores = pontos.filter((ponto) => ponto.instanteMs >= inicio);
      if (posteriores.length) semReferenciaAnterior.push(profundidadeCm);
      continue;
    }

    // Candidatos ao pico de umidade gerado pelo evento (dentro da janela do evento com margem de 1h antes)
    const candidatosPico = pontos.filter((p) => p.instanteMs >= inicio - 3600000 && p.instanteMs <= fim);
    if (!candidatosPico.length) continue;

    // Encontrar o ponto de pico de umidade
    const pico = candidatosPico.reduce((maior, p) => (p.umidadePct > maior.umidadePct ? p : maior), candidatosPico[0]);
    const idxPico = pontos.findIndex((p) => p.instanteMs === pico.instanteMs);
    if (idxPico < 0) continue;

    // Varrer do pico para trás para achar a umidade mais baixa antes da subida
    let minVal = pico.umidadePct;
    let idxMin = idxPico;
    for (let i = idxPico; i >= 0; i--) {
      const p = pontos[i];
      // Limite para não recuar mais do que 24h antes do pico ou 8h antes do início do evento
      if (pico.instanteMs - p.instanteMs > 24 * 3600000 || inicio - p.instanteMs > 8 * 3600000) break;
      if (p.umidadePct < minVal) {
        minVal = p.umidadePct;
        idxMin = i;
      } else if (p.umidadePct > minVal + 0.6) {
        // Se a umidade começar a subir olhando para trás, ultrapassamos o vale pré-subida
        break;
      }
    }

    // Se houver leituras estáveis no mesmo patamar mínimo, pegar a última leitura no valor mínimo antes de subir
    let idxVale = idxMin;
    for (let i = idxMin; i < idxPico; i++) {
      if (pontos[i].umidadePct <= minVal + 0.15) {
        idxVale = i;
      } else {
        break;
      }
    }

    const pontoMaisBaixo = pontos[idxVale];
    const variacaoPp = pico.umidadePct - pontoMaisBaixo.umidadePct;
    if (variacaoPp <= minimo) continue;

    // Tempo de penetração / infiltração: intervalo entre a menor umidade medida antes da subida e o pico
    const tempoRespostaMin = Math.max(0, (pico.instanteMs - pontoMaisBaixo.instanteMs) / 60000);
    const atual = pontos[pontos.length - 1];

    // Pontos para a curva no gráfico de resposta
    const pontosExibicao = pontos.filter(
      (p) => p.instanteMs >= Math.min(inicio, pontoMaisBaixo.instanteMs) - 3600000 && p.instanteMs <= fim
    );

    camadas.push({
      profundidadeCm,
      antesPct: pontoMaisBaixo.umidadePct,
      picoPct: pico.umidadePct,
      atualPct: atual.umidadePct,
      variacaoPp,
      respostaEmMs: pontoMaisBaixo.instanteMs,
      tempoRespostaMin,
      picoEmMs: pico.instanteMs,
      pontos: pontosExibicao.length ? pontosExibicao : [pontoMaisBaixo, pico],
    });
  }
  return {
    camadas: camadas.sort((a, b) => a.profundidadeCm - b.profundidadeCm),
    semReferenciaAnterior: semReferenciaAnterior.sort((a, b) => a - b),
    leiturasInvalidas,
  };
}

export function faixasValidas(faixas: FaixasUmidade): boolean {
  const niveis = [faixas.minimoPct, faixas.limiteAmareloVerdePct, faixas.limiteVerdeAzulPct, faixas.maximoPct];
  return niveis.every((valor, indice) => Number.isFinite(valor) && valor >= 0 && valor <= 100 &&
    (indice === 0 || valor > (niveis[indice - 1] ?? valor)));
}

/** Separa janelas de eventos consecutivos, evitando atribuir o segundo aumento ao primeiro. */
export function limitarPeloProximoEvento(eventos: readonly EventoIrrigacao[]): EventoIrrigacao[] {
  const ordenados = [...eventos].sort((a, b) => instanteMs(a.inicio) - instanteMs(b.inicio));
  return ordenados.map((evento, indice) => {
    const proximo = ordenados[indice + 1];
    if (!proximo) return evento;
    const limiteAtual = evento.analisarAte ? instanteMs(evento.analisarAte) : Number.POSITIVE_INFINITY;
    return instanteMs(proximo.inicio) < limiteAtual ? { ...evento, analisarAte: proximo.inicio } : evento;
  });
}
