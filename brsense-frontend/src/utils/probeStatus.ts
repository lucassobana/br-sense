import type { Probe } from "../types";

export const STORAGE_KEY_MAP_DEPTH = "brsense_map_depth_filter";
export const STORAGE_KEY_SELECTED_DEPTH_REFS = "brsense_selected_depth_refs";
export const DEPTH_CHANGE_EVENT = "brsense:depth_changed";

export interface ProbeStatusResult {
  statusCode: string;
  activeDepth: number;
  isCustomDepth: boolean;
}

export const getStoredMapDepthFilter = (): number => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_MAP_DEPTH);
    if (val) {
      const num = Number(val);
      if (!isNaN(num) && num > 0) return num;
    }
  } catch (err) {
    console.error("Erro ao obter mapDepthFilter:", err);
  }
  return 20;
};

export const setStoredMapDepthFilter = (depth: number) => {
  try {
    localStorage.setItem(STORAGE_KEY_MAP_DEPTH, String(depth));
    window.dispatchEvent(new CustomEvent(DEPTH_CHANGE_EVENT));
  } catch (err) {
    console.error("Erro ao salvar mapDepthFilter:", err);
  }
};

export const getStoredSelectedDepthRefs = (): Record<number, number | null> => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_SELECTED_DEPTH_REFS);
    if (val) {
      return JSON.parse(val);
    }
  } catch (err) {
    console.error("Erro ao obter selectedDepthRefs:", err);
  }
  return {};
};

export const setStoredSelectedDepthRefs = (refs: Record<number, number | null>) => {
  try {
    localStorage.setItem(STORAGE_KEY_SELECTED_DEPTH_REFS, JSON.stringify(refs));
    window.dispatchEvent(new CustomEvent(DEPTH_CHANGE_EVENT));
  } catch (err) {
    console.error("Erro ao salvar selectedDepthRefs:", err);
  }
};

/**
 * Calcula o status de umidade da sonda respeitando rigorosamente a hierarquia:
 * 1º Profundidade personalizada/travada da própria sonda (se definida, tem prioridade absoluta)
 * 2º Profundidade de referência global do mapa (fallback padrão)
 */
export function computeProbeStatus(
  probe: Probe,
  selectedDepthRefs: Record<number, number | null>,
  mapDepthFilter: number
): ProbeStatusResult {
  const probeDepthRef = selectedDepthRefs[probe.id];
  const isCustomDepth = probeDepthRef !== undefined && probeDepthRef !== null;
  const activeDepth = isCustomDepth ? Number(probeDepthRef) : Number(mapDepthFilter ?? 20);

  // Limites de umidade configurados com fallback de segurança padrão (30, 45, 60)
  const pLimits = probe as Probe & { config_min?: number; config_max?: number };
  const v1 = pLimits.config_moisture_v1 ?? (pLimits.config_min ? pLimits.config_min - 10 : 30);
  const v2 = pLimits.config_moisture_v2 ?? (pLimits.config_min ?? 45);
  const v3 = pLimits.config_moisture_v3 ?? (pLimits.config_max ?? 60);

  const readings = probe.readings || [];

  // Filtra as leituras correspondentes à profundidade ativa (compara Number para evitar problemas de float/string)
  const filteredReadings = readings.filter(
    (r) => Number(r.depth_cm) === Number(activeDepth)
  );

  const validReading = [...filteredReadings]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .find((r) => r.moisture_pct !== null && r.moisture_pct !== undefined);

  let statusCode = "status_offline";

  if (validReading) {
    const val = Number(validReading.moisture_pct);
    if (val < v1) {
      statusCode = "status_critical";
    } else if (val < v2) {
      statusCode = "status_alert";
    } else if (val <= v3) {
      statusCode = "status_ok";
    } else {
      statusCode = "status_saturated";
    }
  }

  return {
    statusCode,
    activeDepth,
    isCustomDepth,
  };
}
