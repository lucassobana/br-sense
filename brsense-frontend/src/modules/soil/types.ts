export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Pin extends Coordinates {
  id: string;
  name: string;
}

/** Umidade volumétrica: 0.30 significa 30% v/v. Não usar percentual gravimétrico. */
export interface Estimate {
  mean: number | null;
  q05: number | null;
  q95: number | null;
}

export interface SoilLayer {
  id: string;
  topCm: number;
  bottomCm: number;
  theta10: Estimate;
  theta33: Estimate;
  theta1500: Estimate;
  sandPercent: number | null;
  siltPercent: number | null;
  clayPercent: number | null;
  /** Fração volumétrica de fragmentos grosseiros, de 0 a 1. */
  coarseFragments: number | null;
}

export interface SoilProfile {
  coordinates: Coordinates;
  requestedDepthCm: number;
  fetchedAt: string;
  source: {
    provider: 'SoilGrids';
    method: 'WCS';
    resolutionM: 250;
    url: string;
    license: 'CC BY 4.0';
    estimated: true;
    prediction: 'mean';
  };
  layers: SoilLayer[];
  warnings: string[];
}

export type FieldCapacityReference = '10kPa' | '33kPa';

export interface LayerOverride {
  cc: number;
  pmp: number;
  /** Quando omitido, conserva o valor estimado do mapa. */
  coarseFragments?: number;
  updatedAt: string;
  note: string;
}

/** Persistir no cadastro do PIN. Uma consulta nunca modifica esta configuração. */
export interface SoilSettings {
  coordinateKey: string;
  fieldCapacityReference: FieldCapacityReference;
  /** null = crescimento estimado por cultura e fase; número = profundidade observada fixa. */
  effectiveRootDepthM: number | null;
  /** Limite opcional para impedimento, compactação ou solo raso (m). */
  rootDepthLimitM?: number | null;
  overrides: Record<string, LayerOverride>;
  irrigationEfficiency?: number;
}

export interface LayerLimits {
  id: string;
  topCm: number;
  bottomCm: number;
  activeThicknessCm: number;
  cc: number;
  pmp: number;
  safetyTheta: number;
  cadMm: number;
  coarseFragments: number;
  origin: 'map' | 'manual';
}

export interface SoilLimits {
  status: 'ready' | 'incomplete';
  issues: string[];
  layers: LayerLimits[];
  summary: null | {
    rootDepthM: number;
    cadMm: number;
    allowableDepletionMm: number;
    pAdjusted: number;
    cc: number;
    pmp: number;
    safetyTheta: number;
    hasManualOverrides: boolean;
  };
}

/** ETo do dia proveniente do serviço climático da plataforma, em mm/dia. */
export interface DailyClimate {
  date: string;
  etoMm: number;
  kc: number;
  source: string;
}

export interface CropProfile {
  cropId: string;
  profileId: string;
  name: string;
  label: string;
  pAtEtc5: number;
}

export interface SoilApiError {
  error: { code: string; message: string };
}
