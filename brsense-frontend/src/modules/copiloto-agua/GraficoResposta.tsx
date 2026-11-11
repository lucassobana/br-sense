import { Box } from '@chakra-ui/react';
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { COLORS } from '../../colors/colors';
import type { EventoIrrigacao, FaixasUmidade, RespostaCamada } from './types';
import { instanteMs } from './analise';
import { corCamada, cores, numero, tempoResposta } from './visual';

interface Props {
  evento: EventoIrrigacao;
  camadas: readonly RespostaCamada[];
  faixas: FaixasUmidade;
  profundidadeSelecionada?: number;
  fusoHorario: string;
}

const texto: CSSProperties = { fill: '#ffffff', color: '#ffffff', stroke: 'none', fontFamily: 'Arial, sans-serif', fontSize: 11 };

/** Gráfico SVG com pontos reais e estilo encapsulado. Não sintetiza curvas. */
export function GraficoResposta({ evento, camadas, faixas, profundidadeSelecionada, fusoHorario }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(360);
  const id = useId().replace(/:/g, '');

  useEffect(() => {
    const elemento = container.current;
    if (!elemento) return;
    const medir = () => {
      const valor = elemento.getBoundingClientRect().width;
      if (valor > 0) setLargura(Math.max(200, valor));
    };
    medir();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => window.removeEventListener('resize', medir);
    }
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  const inicio = instanteMs(evento.inicio);
  const pontos = camadas.flatMap(camada => camada.pontos);
  const minimoTempo = Math.min(inicio, ...pontos.map(ponto => ponto.instanteMs));
  const maximoTempo = Math.max(inicio + 1, ...pontos.map(ponto => ponto.instanteMs));
  const minimoUmidade = Math.min(faixas.minimoPct, ...pontos.map(ponto => ponto.umidadePct));
  const maximoUmidade = Math.max(faixas.maximoPct, ...pontos.map(ponto => ponto.umidadePct));
  const esquerda = 34, direita = largura - 10, topo = 38, fundo = 162, altura = 215;
  const centroGraficoX = (esquerda + direita) / 2;
  const x = (valor: number) => esquerda + (valor - minimoTempo) / (maximoTempo - minimoTempo) * (direita - esquerda);
  const y = (valor: number) => fundo - (valor - minimoUmidade) / (maximoUmidade - minimoUmidade) * (fundo - topo);
  const faixasFundo = [
    { de: minimoUmidade, ate: faixas.limiteAmareloVerdePct, cor: cores.amarelo },
    { de: faixas.limiteAmareloVerdePct, ate: faixas.limiteVerdeAzulPct, cor: cores.verde },
    { de: faixas.limiteVerdeAzulPct, ate: maximoUmidade, cor: cores.azul },
  ];
  const ticksY = [minimoUmidade, faixas.limiteAmareloVerdePct, faixas.limiteVerdeAzulPct, maximoUmidade];
  const ticksX = [minimoTempo, (minimoTempo + maximoTempo) / 2, maximoTempo];
  const formatoTempo = (ms: number) => {
    const d = new Date(ms);
    const span = maximoTempo - minimoTempo;
    const timeZone = fusoHorario || 'America/Sao_Paulo';
    if (span > 86400000) {
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone,
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d);
    }
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  };
  const selecionada = camadas.find(camada => camada.profundidadeCm === profundidadeSelecionada) ?? camadas[0];
  const camadasInativas = camadas.filter(camada => camada.profundidadeCm !== profundidadeSelecionada);
  const valorAzulX = Math.max(esquerda + 34, Math.min(direita - 34, x(inicio)));

  return (
    <Box ref={container} w="full" minW="0" data-testid="grafico-resposta">
      <svg width="100%" height={altura} viewBox={`0 0 ${largura} ${altura}`} role="img" aria-labelledby={`${id}-titulo ${id}-descricao`} style={{ display: 'block', overflow: 'visible' }}>
        <title id={`${id}-titulo`}>Resposta à irrigação por profundidade</title>
        <desc id={`${id}-descricao`}>Irrigação de {numero(evento.laminaMm)} milímetros. Camadas com aumento: {camadas.map(camada => `${camada.profundidadeCm} cm`).join(', ')}. Todas as curvas permanecem visíveis. Os valores destacados pertencem à camada selecionada na legenda.</desc>
        <defs><clipPath id={`${id}-recorte`}><rect x={esquerda} y={topo} width={direita - esquerda} height={fundo - topo} /></clipPath></defs>
        <text x="0" y="13" style={texto}>Umidade (%)</text>
        {faixasFundo.map(faixa => <rect key={faixa.cor} x={esquerda} y={y(faixa.ate)} width={direita - esquerda} height={y(faixa.de) - y(faixa.ate)} fill={faixa.cor} opacity="0.88" />)}
        {ticksY.map(tick => <g key={tick}>
          <line x1={esquerda} x2={direita} y1={y(tick)} y2={y(tick)} stroke="#ffffff" strokeOpacity="0.15" />
          <text x={esquerda - 7} y={y(tick) + 4} textAnchor="end" style={texto}>{Math.round(tick)}</text>
        </g>)}
        {evento.origemMedicao === 'infiltracao' ? (
          <text x={valorAzulX} y="32" textAnchor="middle" style={{ ...texto, fill: cores.amarelo, color: cores.amarelo, fontSize: 11, fontWeight: 600 }}>Sem pluviômetro</text>
        ) : (
          <text x={valorAzulX} y="32" textAnchor="middle" style={{ ...texto, fill: cores.azul, color: cores.azul, fontSize: 12, fontWeight: 600 }}>{numero(evento.laminaMm)} mm</text>
        )}
        <line x1={x(inicio)} x2={x(inicio)} y1="34" y2={fundo} stroke={cores.azul} strokeWidth="1.5" strokeDasharray="3 3" />
        <g clipPath={`url(#${id}-recorte)`}>
          {/* 1. Camadas inativas: escurecidas e com opacidade reduzida no fundo */}
          {camadasInativas.map(camada => {
            const coordenadas = camada.pontos.map(ponto => `${x(ponto.instanteMs)},${y(ponto.umidadePct)}`).join(' ');
            const cor = corCamada(camada.profundidadeCm);
            return (
              <g key={camada.profundidadeCm} data-profundidade={camada.profundidadeCm} opacity={0.18}>
                <polyline points={coordenadas} fill="none" stroke="#050B18" strokeWidth={3} strokeOpacity={0.4} />
                <polyline points={coordenadas} fill="none" stroke={cor} strokeWidth={1.5} strokeLinejoin="round" />
                <circle cx={x(camada.picoEmMs)} cy={y(camada.picoPct)} r={2} fill={cor} />
              </g>
            );
          })}

          {/* 2. Camada ativa: destacada por cima com traço largo, halo e marcadores expressivos */}
          {selecionada && (() => {
            const coordenadas = selecionada.pontos.map(ponto => `${x(ponto.instanteMs)},${y(ponto.umidadePct)}`).join(' ');
            const cor = corCamada(selecionada.profundidadeCm);
            const valeX = x(selecionada.respostaEmMs);
            const valeY = y(selecionada.antesPct);
            const picoX = x(selecionada.picoEmMs);
            const picoY = y(selecionada.picoPct);
            return (
              <g key={selecionada.profundidadeCm} data-profundidade={selecionada.profundidadeCm} opacity={1}>
                <polyline points={coordenadas} fill="none" stroke="#050B18" strokeWidth={6.5} strokeOpacity={0.8} />
                <polyline points={coordenadas} fill="none" stroke={cor} strokeWidth={3.5} strokeLinejoin="round" />
                <circle cx={valeX} cy={valeY} r={5} fill={cor} stroke="#ffffff" strokeWidth={2}>
                  <title>{selecionada.profundidadeCm} cm: menor umidade antes de subir ({numero(selecionada.antesPct)}%)</title>
                </circle>
                <circle cx={picoX} cy={picoY} r={5} fill={cor} stroke="#ffffff" strokeWidth={2}>
                  <title>{selecionada.profundidadeCm} cm: pico de {numero(selecionada.picoPct)}%</title>
                </circle>
              </g>
            );
          })()}
        </g>

        {/* Rótulos de Mínimo e Pico da camada selecionada com prevenção inteligente de colisão */}
        {selecionada && (() => {
          const valeX = x(selecionada.respostaEmMs);
          const valeY = y(selecionada.antesPct);
          const picoX = x(selecionada.picoEmMs);
          const picoY = y(selecionada.picoPct);
          const cor = corCamada(selecionada.profundidadeCm);

          const dx = picoX - valeX;
          const dy = valeY - picoY; // dy >= 0 pois umidade do pico é maior ou igual
          const muitoProximos = dx < 65 || dy < 25;

          // Posição inicial dos badges
          let picoBadgeX = picoX;
          let picoBadgeY = picoY - 20;

          let valeBadgeX = valeX;
          let valeBadgeY = valeY + 20;

          if (muitoProximos) {
            // Quando os pontos estão muito próximos no tempo ou na umidade:
            // Pico sobe com folga vertical e leve avanço à direita
            picoBadgeY = Math.max(topo + 10, picoY - 22);
            picoBadgeX = Math.max(esquerda + 35, Math.min(direita - 35, picoX + (dx < 30 ? 14 : 0)));

            // Mínimo desce com folga vertical e leve recuo à esquerda
            valeBadgeY = Math.min(fundo - 10, valeY + 22);
            valeBadgeX = Math.max(esquerda + 35, Math.min(direita - 35, valeX - (dx < 30 ? 14 : 0)));
          } else {
            // Distância confortável entre os pontos
            picoBadgeY = Math.max(topo + 10, picoY - 18);
            picoBadgeX = picoX > direita - 45 ? picoX - 35 : picoX + 35;

            valeBadgeY = Math.min(fundo - 10, valeY + 18);
            valeBadgeX = valeX < esquerda + 45 ? valeX + 35 : valeX - 35;
          }

          // Garantir permanência dentro dos limites visíveis do gráfico
          picoBadgeX = Math.max(esquerda + 35, Math.min(direita - 35, picoBadgeX));
          picoBadgeY = Math.max(topo + 10, Math.min(fundo - 10, picoBadgeY));

          valeBadgeX = Math.max(esquerda + 35, Math.min(direita - 35, valeBadgeX));
          valeBadgeY = Math.max(topo + 10, Math.min(fundo - 10, valeBadgeY));

          const textoMin = `Mín ${numero(selecionada.antesPct)}%`;
          const textoPico = `Pico ${numero(selecionada.picoPct)}%`;

          return (
            <g data-testid="rotulos-min-pico">
              {/* Linha guia conectora do Mínimo */}
              <line
                x1={valeX}
                y1={valeY}
                x2={valeBadgeX}
                y2={valeBadgeY}
                stroke="#ffffff"
                strokeOpacity={0.45}
                strokeWidth={1}
                strokeDasharray="2 2"
              />

              {/* Linha guia conectora do Pico */}
              <line
                x1={picoX}
                y1={picoY}
                x2={picoBadgeX}
                y2={picoBadgeY}
                stroke="#ffffff"
                strokeOpacity={0.45}
                strokeWidth={1}
                strokeDasharray="2 2"
              />

              {/* Badge visual do Mínimo */}
              <g transform={`translate(${valeBadgeX}, ${valeBadgeY})`}>
                <rect
                  x={-34}
                  y={-9}
                  width={68}
                  height={18}
                  rx={4}
                  fill={COLORS.tabColor}
                  stroke={cor}
                  strokeWidth={1.2}
                  opacity={0.96}
                />
                <text
                  x={0}
                  y={3.5}
                  textAnchor="middle"
                  style={{
                    ...texto,
                    fill: '#f1f5f9',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  {textoMin}
                </text>
              </g>

              {/* Badge visual do Pico */}
              <g transform={`translate(${picoBadgeX}, ${picoBadgeY})`}>
                <rect
                  x={-35}
                  y={-9}
                  width={70}
                  height={18}
                  rx={4}
                  fill={COLORS.tabColor}
                  stroke={cor}
                  strokeWidth={1.6}
                  opacity={0.96}
                />
                <text
                  x={0}
                  y={3.5}
                  textAnchor="middle"
                  style={{
                    ...texto,
                    fill: '#ffffff',
                    fontSize: 10.5,
                    fontWeight: 700,
                  }}
                >
                  {textoPico}
                </text>
              </g>
            </g>
          );
        })()}

        {/* Campo de Penetração fixo e centralizado na base do gráfico */}
        {selecionada && (
          <g>
            <rect
              x={centroGraficoX - 68}
              y={fundo + 6}
              width={136}
              height={20}
              rx={10}
              fill="#172333"
              stroke="#384352"
              strokeWidth={1}
              opacity={0.95}
            />
            <text
              x={centroGraficoX}
              y={fundo + 20}
              textAnchor="middle"
              style={{
                ...texto,
                fill: '#ffffff',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Penetração: {tempoResposta(selecionada.tempoRespostaMin)}
            </text>
          </g>
        )}

        {/* Eixo de tempo na base */}
        {ticksX.map((tick, indice) => {
          const inicioX = esquerda + 14;
          const fimX = Math.max(inicioX + 40, direita - 34);
          const posicoesX = [inicioX, (inicioX + fimX) / 2, fimX];
          const posX = posicoesX[indice] ?? x(tick);
          return (
            <text
              key={tick}
              x={posX}
              y={altura - 4}
              textAnchor="middle"
              style={{ ...texto, fill: cores.secundario, color: cores.secundario, fontSize: 10 }}
            >
              {formatoTempo(tick)}
            </text>
          );
        })}
      </svg>
    </Box>
  );
}
