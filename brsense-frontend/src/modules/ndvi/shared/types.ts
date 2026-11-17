import type { MultiPolygon, Polygon } from "geojson";

export type AreaType = "pivo" | "talhao";
export type AreaGeometry = Polygon | MultiPolygon;
export type SceneQuality = "utilizavel" | "parcial" | "insuficiente";

export interface NdviProbeOption {
  id: number;
  esn: string;
  name: string;
  farmId?: number;
  farmName?: string;
  city?: string;
  crop?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface NdviArea {
  id: string;
  dbId?: number;
  deviceId?: number;
  deviceEsn?: string;
  deviceName?: string;
  farmId?: number;
  name: string;
  farmName: string;
  city: string;
  type: AreaType;
  crop: string;
  hectares: number;
  geometry: AreaGeometry;
  source: "demo" | "kml" | "sistema" | "desenho";
  circle?: {
    center: [number, number];
    edge: [number, number];
    radiusM: number;
  };
}

export interface NdviScene {
  id: string;
  acquiredAt: string;
  satellite: string;
  tileCloudPct: number | null;
}

export interface NdviBin {
  id: "baixo" | "atencao" | "moderado" | "vigoroso";
  label: string;
  rangeLabel: string;
  min: number;
  max: number;
  color: string;
  count: number;
}

export interface NdviAnalysis {
  areaId: string;
  sceneId: string;
  acquiredAt: string;
  processedAt: string;
  source: "copernicus" | "demo";
  resolutionM: 10;
  validPct: number;
  quality: SceneQuality;
  mean: number | null;
  min: number | null;
  max: number | null;
  validPixels: number;
  totalPixels: number;
  histogram: NdviBin[];
  bounds: [number, number, number, number];
  pngUrl?: string;
  tiffUrl?: string;
  algorithm: string;
}

export interface NdviApi {
  listScenes(area: NdviArea, signal?: AbortSignal): Promise<NdviScene[]>;
  analyzeScene(
    area: NdviArea,
    scene: NdviScene,
    signal?: AbortSignal,
  ): Promise<NdviAnalysis>;
}

