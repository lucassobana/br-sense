import type { Coordinates, SoilLayer, SoilLimits, SoilProfile, SoilSettings } from './types.ts';

export const STANDARD_DEPTHS = [
  { id: '0-5cm', topCm: 0, bottomCm: 5 },
  { id: '5-15cm', topCm: 5, bottomCm: 15 },
  { id: '15-30cm', topCm: 15, bottomCm: 30 },
  { id: '30-60cm', topCm: 30, bottomCm: 60 },
  { id: '60-100cm', topCm: 60, bottomCm: 100 },
  { id: '100-200cm', topCm: 100, bottomCm: 200 },
] as const;

export function validCoordinates(c: Coordinates): boolean {
  return (
    Number.isFinite(c.latitude) &&
    Math.abs(c.latitude) <= 90 &&
    Number.isFinite(c.longitude) &&
    Math.abs(c.longitude) <= 180
  );
}

/** Sem arredondamento que pudesse associar ajustes de um PIN a outro lugar. */
export function coordinateKey(c: Coordinates): string {
  return `${c.latitude},${c.longitude}`;
}

export function createSoilSettings(c: Coordinates): SoilSettings {
  return {
    coordinateKey: coordinateKey(c),
    // Convenção inicial explicitamente mostrada no card; não é uma CC medida.
    fieldCapacityReference: '10kPa',
    effectiveRootDepthM: null,
    overrides: {},
  };
}

export function adjustedDepletionFraction(pAt5: number, etcMm: number): number {
  return Math.min(0.8, Math.max(0.1, pAt5 + 0.04 * (5 - etcMm)));
}

function hydraulicValue(layer: SoilLayer, settings: SoilSettings) {
  const manual = settings.overrides[layer.id];
  return {
    cc:
      manual?.cc ??
      (settings.fieldCapacityReference === '10kPa' ? layer.theta10.mean : layer.theta33.mean),
    pmp: manual?.pmp ?? layer.theta1500.mean,
    coarse: manual?.coarseFragments ?? layer.coarseFragments,
    origin: manual ? ('manual' as const) : ('map' as const),
  };
}

/** CAD = soma de (CC − PMP) × espessura ativa × volume de terra fina. */
export function calculateSoilLimits(
  profile: SoilProfile | null,
  settings: SoilSettings,
  pAt5: number | null,
  etcMm: number | null,
): SoilLimits {
  const result: SoilLimits = { status: 'incomplete', issues: [], layers: [], summary: null };
  const zr = settings.effectiveRootDepthM;
  if (!profile) result.issues.push('Aguardando o perfil de solo da coordenada.');
  if (profile && coordinateKey(profile.coordinates) !== settings.coordinateKey) {
    result.issues.push(
      'A coordenada mudou. Configure o solo deste local antes de reutilizar os ajustes.',
    );
  }
  if (zr === null || !Number.isFinite(zr) || zr <= 0 || zr > 2) {
    result.issues.push('Informe a profundidade efetiva atual das raízes, entre 0 e 2 m.');
  }
  if (pAt5 === null || !Number.isFinite(pAt5) || pAt5 < 0.1 || pAt5 > 0.8) {
    result.issues.push('Informe um fator de depleção p válido para a cultura.');
  }
  if (etcMm === null || !Number.isFinite(etcMm) || etcMm < 0) {
    result.issues.push('Aguardando ETo e Kc válidos para calcular o limite do dia.');
  }
  if (result.issues.length || !profile || zr === null || pAt5 === null || etcMm === null)
    return result;
  const p = adjustedDepletionFraction(pAt5, etcMm);
  const rootCm = zr * 100;
  const activeLayers = profile.layers
    .filter((layer) => layer.topCm < rootCm && layer.bottomCm > 0)
    .sort((a, b) => a.topCm - b.topCm);
  let coveredCm = 0;
  let fineEarthMm = 0;
  let ccWaterMm = 0;
  let pmpWaterMm = 0;
  let cadMm = 0;
  for (const layer of activeLayers) {
    const { cc, pmp, coarse, origin } = hydraulicValue(layer, settings);
    if (Math.abs(layer.topCm - coveredCm) > 0.0001) {
      result.issues.push(`Há uma lacuna ou sobreposição no perfil a ${coveredCm} cm.`);
      break;
    }
    const thicknessCm = Math.min(layer.bottomCm, rootCm) - layer.topCm;
    coveredCm += thicknessCm;
    if (cc === null || pmp === null || coarse === null) {
      result.issues.push(`Dados de retenção ou fragmentos ausentes na camada ${layer.id}.`);
      continue;
    }
    if (
      ![cc, pmp, coarse].every(Number.isFinite) ||
      pmp < 0 ||
      cc <= pmp ||
      cc > 1 ||
      coarse < 0 ||
      coarse >= 1
    ) {
      result.issues.push(`CC, PMP ou fragmentos inválidos na camada ${layer.id}.`);
      continue;
    }
    const fineMm = thicknessCm * 10 * (1 - coarse);
    const layerCad = (cc - pmp) * fineMm;
    fineEarthMm += fineMm;
    ccWaterMm += cc * fineMm;
    pmpWaterMm += pmp * fineMm;
    cadMm += layerCad;
    result.layers.push({
      id: layer.id,
      topCm: layer.topCm,
      bottomCm: layer.bottomCm,
      activeThicknessCm: thicknessCm,
      cc,
      pmp,
      coarseFragments: coarse,
      safetyTheta: cc - p * (cc - pmp),
      cadMm: layerCad,
      origin,
    });
  }
  if (coveredCm < rootCm - 0.0001)
    result.issues.push('O perfil consultado não cobre toda a profundidade das raízes.');
  if (result.issues.length || fineEarthMm <= 0 || cadMm <= 0) return result;
  const cc = ccWaterMm / fineEarthMm;
  const pmp = pmpWaterMm / fineEarthMm;
  result.status = 'ready';
  result.summary = {
    rootDepthM: zr,
    cadMm,
    allowableDepletionMm: p * cadMm,
    pAdjusted: p,
    cc,
    pmp,
    safetyTheta: cc - p * (cc - pmp),
    hasManualOverrides: result.layers.some((layer) => layer.origin === 'manual'),
  };
  return result;
}

/** Apenas o estado calculado pelo balanço (ou medido) pode preencher este indicador. */
export function waterAvailability(limits: SoilLimits, depletionMm: number | null) {
  const s = limits.summary;
  if (
    !s ||
    depletionMm === null ||
    !Number.isFinite(depletionMm) ||
    depletionMm < 0 ||
    depletionMm > s.cadMm
  )
    return null;
  return {
    availableMm: s.cadMm - depletionMm,
    fractionRemaining: 1 - depletionMm / s.cadMm,
    thresholdReached: depletionMm >= s.allowableDepletionMm,
    untilThresholdMm: Math.max(0, s.allowableDepletionMm - depletionMm),
  };
}
