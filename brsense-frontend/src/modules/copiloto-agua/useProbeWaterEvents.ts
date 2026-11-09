import { useEffect, useState, useMemo } from 'react';
import type { MapPoint } from '../../components/SatelliteMap/SatelliteMap';
import type { EventoIrrigacao, FaixasUmidade, LeituraUmidade } from './types';
import { getDeviceHistory } from '../../services/api';
import { instanteMs, analisarEvento } from './analise';

interface ReadingItem {
  timestamp: string;
  depth_cm?: number | null;
  moisture_pct?: number | null;
  rain_cm?: number | null;
}

export function useProbeWaterEvents(point: MapPoint | null) {
  const [historyReadings, setHistoryReadings] = useState<ReadingItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Faixas de umidade do solo configuradas na sonda
  const faixas = useMemo<FaixasUmidade>(() => {
    if (!point) {
      return {
        minimoPct: 30,
        limiteAmareloVerdePct: 38,
        limiteVerdeAzulPct: 50,
        maximoPct: 62,
      };
    }
    const v1 = point.config_moisture_v1 ?? 38;
    const v2 = point.config_moisture_v2 ?? 50;
    const v3 = point.config_moisture_v3 ?? 62;

    return {
      minimoPct: Math.max(0, v1 - 10),
      limiteAmareloVerdePct: v1,
      limiteVerdeAzulPct: v2,
      maximoPct: Math.min(100, v3 + 10),
    };
  }, [point]);

  // 2. Buscar histórico completo de leituras da sonda
  useEffect(() => {
    let isMounted = true;
    if (!point?.esn) {
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const end = new Date();
        const start = new Date(end.getTime() - 45 * 24 * 60 * 60 * 1000);

        const data = await getDeviceHistory(point.esn, {
          start_date: start.toISOString(),
          end_date: end.toISOString(),
        });

        if (isMounted) {
          const list: ReadingItem[] = (data || []).map((r) => ({
            timestamp: typeof r.timestamp === 'string' ? r.timestamp : new Date(r.timestamp).toISOString(),
            depth_cm: r.depth_cm,
            moisture_pct: r.moisture_pct,
            rain_cm: r.rain_cm,
          }));
          setHistoryReadings(list);
        }
      } catch (err) {
        console.warn('Erro ao carregar histórico da sonda para resposta da água:', err);
        if (isMounted) {
          setHistoryReadings((point.readings || []) as ReadingItem[]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [point?.esn, point?.readings]);

  // 3. Algoritmo de detecção das últimas irrigações que de fato alteraram os valores nas medições
  const eventos = useMemo<EventoIrrigacao[]>(() => {
    if (!historyReadings || historyReadings.length === 0) {
      return [];
    }

    // 1. Extrair leituras válidas de umidade e mapa de chuva por timestamp (em mm)
    const leiturasValidas: LeituraUmidade[] = [];
    const rainByTimestamp = new Map<number, number>();

    for (const r of historyReadings) {
      if (!r.timestamp) continue;
      const ms = instanteMs(r.timestamp);
      if (!Number.isFinite(ms)) continue;

      // Coletar medições de chuva/irrigação (rain_cm no banco de dados representa a lâmina direta em mm)
      if (r.rain_cm !== null && r.rain_cm !== undefined) {
        const rainVal = Number(r.rain_cm);
        if (Number.isFinite(rainVal) && rainVal > 0) {
          const currentRain = rainByTimestamp.get(ms) || 0;
          if (rainVal > currentRain) {
            rainByTimestamp.set(ms, rainVal);
          }
        }
      }

      // Coletar leituras válidas de umidade
      if (
        r.depth_cm !== null &&
        r.depth_cm !== undefined &&
        r.moisture_pct !== null &&
        r.moisture_pct !== undefined
      ) {
        const val = Number(r.moisture_pct);
        const depth = Number(r.depth_cm);
        if (Number.isFinite(val) && val >= 0 && val <= 100 && depth > 0) {
          leiturasValidas.push({
            instante: new Date(ms).toISOString(),
            profundidadeCm: depth,
            umidadePct: Number(val.toFixed(2)),
          });
        }
      }
    }

    if (leiturasValidas.length === 0) return [];

    // Agrupar por timestamp ordenado para varredura de perfil de umidade
    const timestampsMap = new Map<number, Map<number, number>>();
    for (const l of leiturasValidas) {
      const ms = instanteMs(l.instante);
      let depthMap = timestampsMap.get(ms);
      if (!depthMap) {
        depthMap = new Map<number, number>();
        timestampsMap.set(ms, depthMap);
      }
      depthMap.set(l.profundidadeCm, l.umidadePct ?? 0);
    }

    const sortedTimestamps = [...timestampsMap.keys()].sort((a, b) => a - b);
    if (sortedTimestamps.length < 3) return [];

    // 3.1 Se for sonda manual com irrigation_records cadastrados
    const pointWithIrrigations = point as unknown as {
      irrigation_records?: Array<{ id: number; date: string; irrigation_value_mm: number }>;
    };
    const manualIrrigations = pointWithIrrigations?.irrigation_records || [];
    if (manualIrrigations.length > 0) {
      const eventosManuais: EventoIrrigacao[] = [];
      for (const irr of manualIrrigations) {
        const irrMs = instanteMs(irr.date);
        if (!Number.isFinite(irrMs)) continue;

        // Janela de leituras: 24h antes até 48h depois
        const tStart = irrMs - 24 * 3600000;
        const tEnd = irrMs + 48 * 3600000;
        const windowLeituras = leiturasValidas.filter((l) => {
          const t = instanteMs(l.instante);
          return t >= tStart && t <= tEnd;
        });

        if (windowLeituras.length > 0) {
          eventosManuais.push({
            id: `irr-manual-${irr.id}`,
            inicio: new Date(irrMs).toISOString(),
            laminaMm: Number(Number(irr.irrigation_value_mm || 0).toFixed(1)),
            analisarAte: new Date(tEnd).toISOString(),
            leituras: windowLeituras,
            origemMedicao: 'manual',
          });
        }
      }
      if (eventosManuais.length > 0) {
        return eventosManuais.sort((a, b) => instanteMs(b.inicio) - instanteMs(a.inicio));
      }
    }

    // 3.2 Detecção para sondas telemétricas:
    // 3.2.1 Identificar clusters de chuva / irrigação medidos (rain_cm em mm)
    // Agrupar medições de chuva com intervalo de até 4 horas (mesmo critério de clusterização do gráfico SoilMoistureChart)
    const sortedRainTs = [...rainByTimestamp.keys()].sort((a, b) => a - b);
    const rainClusters: Array<{
      startMs: number;
      endMs: number;
      peakRainMs: number;
      totalRainMm: number;
    }> = [];

    let currentClusterTs: number[] = [];
    for (const t of sortedRainTs) {
      if (currentClusterTs.length === 0) {
        currentClusterTs.push(t);
      } else {
        const lastT = currentClusterTs[currentClusterTs.length - 1];
        if (t - lastT <= 4 * 3600000) {
          currentClusterTs.push(t);
        } else {
          let sum = 0;
          let maxVal = -1;
          let peakMs = currentClusterTs[0];
          for (const ts of currentClusterTs) {
            const val = rainByTimestamp.get(ts) || 0;
            sum += val;
            if (val > maxVal) {
              maxVal = val;
              peakMs = ts;
            }
          }
          if (sum >= 0.2) {
            rainClusters.push({
              startMs: currentClusterTs[0],
              endMs: lastT,
              peakRainMs: peakMs,
              totalRainMm: Number(sum.toFixed(1)),
            });
          }
          currentClusterTs = [t];
        }
      }
    }

    if (currentClusterTs.length > 0) {
      let sum = 0;
      let maxVal = -1;
      let peakMs = currentClusterTs[0];
      for (const ts of currentClusterTs) {
        const val = rainByTimestamp.get(ts) || 0;
        sum += val;
        if (val > maxVal) {
          maxVal = val;
          peakMs = ts;
        }
      }
      if (sum >= 0.2) {
        rainClusters.push({
          startMs: currentClusterTs[0],
          endMs: currentClusterTs[currentClusterTs.length - 1],
          peakRainMs: peakMs,
          totalRainMm: Number(sum.toFixed(1)),
        });
      }
    }

    interface EventCandidate {
      startMs: number;
      peakMs: number;
      laminaMm: number;
      origemMedicao: 'pluviometro' | 'manual' | 'infiltracao';
    }

    const eventCandidates: EventCandidate[] = [];

    for (const rc of rainClusters) {
      let peakMs = rc.peakRainMs;
      let maxRise = 0;

      // Buscar baseline de umidade antes da chuva (até 4h antes)
      let baseDepths: Map<number, number> | null = null;
      for (let j = sortedTimestamps.length - 1; j >= 0; j--) {
        const ts = sortedTimestamps[j];
        if (ts <= rc.startMs && rc.startMs - ts <= 4 * 3600000) {
          baseDepths = timestampsMap.get(ts)!;
          break;
        }
      }

      if (baseDepths) {
        for (const ts of sortedTimestamps) {
          if (ts >= rc.startMs && ts <= rc.startMs + 16 * 3600000) {
            const depths = timestampsMap.get(ts)!;
            for (const [d, val] of depths) {
              const bVal = baseDepths.get(d);
              if (bVal !== undefined && val - bVal > maxRise) {
                maxRise = val - bVal;
                peakMs = ts;
              }
            }
          }
        }
      }

      // Somente considera como irrigação relevante se houve alteração visível e significativa na umidade (subida >= 1.5 p.p.)
      if (maxRise >= 1.5) {
        eventCandidates.push({
          startMs: rc.peakRainMs, // Timestamp exato da barra do gráfico
          peakMs,
          laminaMm: rc.totalRainMm, // Valor real em mm medido pelo pluviômetro
          origemMedicao: 'pluviometro',
        });
      }
    }

    // 3.2.2 Detecção de subidas de umidade não cobertas pelos clusters de chuva (ex: irrigação sem pluviômetro)
    for (let i = 2; i < sortedTimestamps.length; i++) {
      const currentMs = sortedTimestamps[i];
      const currentDepths = timestampsMap.get(currentMs)!;

      let baseMs: number | null = null;
      let baseDepths: Map<number, number> | null = null;

      for (let j = i - 1; j >= Math.max(0, i - 12); j--) {
        const prevMs = sortedTimestamps[j];
        const diffHours = (currentMs - prevMs) / 3600000;
        if (diffHours >= 0.5 && diffHours <= 6.0) {
          baseMs = prevMs;
          baseDepths = timestampsMap.get(prevMs)!;
          break;
        }
      }

      if (!baseMs || !baseDepths) continue;

      let maxDelta = 0;
      for (const [depth, currentVal] of currentDepths) {
        if (depth > 30) continue;
        const baseVal = baseDepths.get(depth);
        if (baseVal !== undefined) {
          const delta = currentVal - baseVal;
          if (delta >= 1.5 && delta > maxDelta) {
            maxDelta = delta;
          }
        }
      }

      if (maxDelta >= 1.5) {
        let peakMs = currentMs;
        let peakVal = maxDelta;

        for (let k = i + 1; k < Math.min(sortedTimestamps.length, i + 36); k++) {
          const nextMs = sortedTimestamps[k];
          if ((nextMs - currentMs) / 3600000 > 16.0) break;
          const nextDepths = timestampsMap.get(nextMs)!;
          for (const [d, val] of nextDepths) {
            if (d > 30) continue;
            const bVal = baseDepths.get(d) ?? 0;
            if (val - bVal > peakVal) {
              peakVal = val - bVal;
              peakMs = nextMs;
            }
          }
        }

        // Se já está coberto por um cluster de chuva próximo (dentro de 6h), prevalece o evento do pluviômetro
        const alreadyCovered = eventCandidates.some(
          (c) => Math.abs(c.startMs - baseMs!) <= 6 * 3600000
        );

        if (!alreadyCovered) {
          let nearbyRainSum = 0;
          let peakRainMs = currentMs;
          let maxRainVal = 0;
          for (const [rTs, rVal] of rainByTimestamp) {
            if (rTs >= baseMs - 4 * 3600000 && rTs <= peakMs + 4 * 3600000) {
              nearbyRainSum += rVal;
              if (rVal > maxRainVal) {
                maxRainVal = rVal;
                peakRainMs = rTs;
              }
            }
          }

          if (nearbyRainSum > 0) {
            eventCandidates.push({
              startMs: peakRainMs,
              peakMs,
              laminaMm: Number(nearbyRainSum.toFixed(1)),
              origemMedicao: 'pluviometro',
            });
          } else {
            // Irrigação/infiltração no solo sem medição por pluviômetro
            eventCandidates.push({
              startMs: currentMs,
              peakMs,
              laminaMm: 0,
              origemMedicao: 'infiltracao',
            });
          }
        }
      }
    }

    // 3.2.3 Mesclar candidatos próximos (intervalo <= 6 horas)
    eventCandidates.sort((a, b) => a.startMs - b.startMs);

    const mergedCandidates: EventCandidate[] = [];
    for (const cand of eventCandidates) {
      const prev = mergedCandidates[mergedCandidates.length - 1];
      if (prev && Math.abs(cand.startMs - prev.startMs) <= 6 * 3600000) {
        if (cand.origemMedicao === 'pluviometro') {
          prev.origemMedicao = 'pluviometro';
          prev.laminaMm = Math.max(prev.laminaMm, cand.laminaMm);
          prev.startMs = cand.startMs;
        }
        prev.peakMs = Math.max(prev.peakMs, cand.peakMs);
      } else {
        mergedCandidates.push({ ...cand });
      }
    }

    // 3.2.4 Construir os EventoIrrigacao finais
    const eventosFinais: EventoIrrigacao[] = [];

    for (let idx = 0; idx < mergedCandidates.length; idx++) {
      const ev = mergedCandidates[idx];
      const windowStart = ev.startMs - 4 * 3600000;
      const nextEv = mergedCandidates[idx + 1];
      const windowEnd = nextEv ? Math.min(ev.peakMs + 36 * 3600000, nextEv.startMs) : ev.peakMs + 36 * 3600000;

      const windowLeituras = leiturasValidas.filter((l) => {
        const ms = instanteMs(l.instante);
        return ms >= windowStart && ms <= windowEnd;
      });

      if (windowLeituras.length >= 4) {
        const novoEvento: EventoIrrigacao = {
          id: `irr-${idx + 1}-${ev.startMs}`,
          inicio: new Date(ev.startMs).toISOString(),
          laminaMm: Number(ev.laminaMm.toFixed(1)),
          analisarAte: new Date(windowEnd).toISOString(),
          leituras: windowLeituras,
          origemMedicao: ev.origemMedicao,
        };

        // Confirmar que o evento gerou alteração significativa visível no gráfico (subida de pelo menos 1.5 p.p.)
        const analise = analisarEvento(novoEvento, 0.5);
        const teveAlteracaoSignificativa = analise.camadas.some((c) => c.variacaoPp >= 1.5);

        if (teveAlteracaoSignificativa) {
          eventosFinais.push(novoEvento);
        }
      }
    }

    // Ordenar estritamente do mais recente para o mais antigo e limitar aos 10 últimos
    return eventosFinais.sort((a, b) => instanteMs(b.inicio) - instanteMs(a.inicio)).slice(0, 10);
  }, [historyReadings, point]);

  return {
    eventos,
    faixas,
    loading,
  };
}
