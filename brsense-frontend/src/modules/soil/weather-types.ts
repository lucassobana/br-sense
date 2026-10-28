import type { Coordinates } from './types.ts';

export interface WeatherDay {
  date: string;
  etoMm: number | null;
  /** Chuva modelada histórica ou prevista, conforme kind. */
  precipitationMm?: number | null;
  /** Alias conservado para integrações da versão 1.1. */
  forecastRainMm: number | null;
  tMaxC: number | null;
  tMinC: number | null;
  kind: 'modeledHistory' | 'forecast';
}
export interface WeatherSeries {
  coordinates: Coordinates;
  gridCoordinates: Coordinates;
  timezone: string;
  today: string;
  fetchedAt: string;
  days: WeatherDay[];
  source: 'Open-Meteo';
}
export interface CropRegistration {
  cropId: string;
  profileId: string;
  /** DAP contado com plantio = dia zero, referenciado em dapDate. */
  dap: number;
  dapDate: string;
  phenologyProfileId?: string;
  /** Para fase observada/calibração, perenes ou ciclos sem curva térmica. */
  manualKc?: number | null;
}
export interface ManualWaterEvent {
  id: string;
  date: string;
  type: 'rain' | 'irrigation';
  /** Chuva registrada ou lâmina bruta de irrigação em mm. */
  mm: number;
}
export interface InitialWaterState {
  /** Condição ao INÍCIO deste dia, antes dos lançamentos. */
  date: string;
  depletionMm: number;
  /** Confirmação explícita de que o histórico de lançamentos está completo até esta data. */
  recordsCompleteThrough: string;
}
