import { adjustedDepletionFraction } from './calculations.ts';
import { shiftDate, validDate } from './dates.ts';
import { kcOnDate, plantingDate } from './phenology.ts';
import { DEFAULT_IRRIGATION_EFFICIENCY } from './model-defaults.ts';
import type {
  CropRegistration,
  InitialWaterState,
  ManualWaterEvent,
  WeatherSeries,
} from './weather-types.ts';

export interface BalanceDay {
  date: string;
  etoMm: number;
  kc: number;
  etcPotentialMm: number;
  rainManualMm: number;
  irrigationGrossMm: number;
  irrigationNetMm: number;
  forecastRainUsedMm: number;
  depletionMm: number;
  drainageMm: number;
  unmetPotentialMm: number;
  allowableDepletionMm: number;
  thresholdReached: boolean;
}
export interface WaterBalanceResult {
  status: 'ready' | 'incomplete';
  issues: string[];
  closedThrough: string | null;
  depletionMm: number | null;
  history: BalanceDay[];
  forecast: BalanceDay[];
}
export interface BalanceInput {
  weather: WeatherSeries | null;
  registration: CropRegistration;
  initial: InitialWaterState | null;
  cadMm: number | null;
  pAt5: number;
  events: ManualWaterEvent[];
  irrigationEfficiency?: number;
  rainInfiltrationFraction?: number;
  /** Somente cenário futuro, por padrão sem chuva prevista. */
  considerForecastRain?: boolean;
}

/** Balanço diário de demanda potencial com reservatório de solo e CAD fixa. */
export function replayWaterBalance(input: BalanceInput): WaterBalanceResult {
  const r: WaterBalanceResult = {
    status: 'incomplete',
    issues: [],
    closedThrough: null,
    depletionMm: null,
    history: [],
    forecast: [],
  };
  const { weather, initial, cadMm, registration, events, pAt5 } = input;
  const irrigationEfficiency = input.irrigationEfficiency ?? DEFAULT_IRRIGATION_EFFICIENCY;
  const rainFraction = input.rainInfiltrationFraction ?? 1;
  if (!weather) r.issues.push('Aguardando ETo da Open-Meteo.');
  if (!initial) r.issues.push('Informe a condição hídrica inicial com data.');
  if (cadMm === null || !Number.isFinite(cadMm) || cadMm <= 0)
    r.issues.push('Aguardando armazenamento válido do solo.');
  if (
    !Number.isFinite(irrigationEfficiency) ||
    irrigationEfficiency <= 0 ||
    irrigationEfficiency > 1 ||
    !Number.isFinite(rainFraction) ||
    rainFraction < 0 ||
    rainFraction > 1
  )
    r.issues.push('Eficiência de irrigação ou infiltração inválida.');
  if (!Number.isFinite(pAt5) || pAt5 < 0.1 || pAt5 > 0.8) r.issues.push('Fator p inválido.');
  if (r.issues.length || !weather || !initial || cadMm === null) return r;
  const yesterday = shiftDate(weather.today, -1);
  if (
    !validDate(initial.date) ||
    initial.date > weather.today ||
    initial.date < plantingDate(registration) ||
    !validDate(initial.recordsCompleteThrough) ||
    initial.recordsCompleteThrough > weather.today
  )
    r.issues.push('Datas iniciais inválidas ou anteriores ao plantio inferido.');
  if (
    !Number.isFinite(initial.depletionMm) ||
    initial.depletionMm < 0 ||
    initial.depletionMm > cadMm
  )
    r.issues.push('A depleção inicial deve estar entre zero e a CAD do solo.');
  if (initial.date < weather.today && initial.recordsCompleteThrough < yesterday)
    r.issues.push(
      'Confirme os lançamentos de chuva/irrigação até ontem; ausência de lançamento não significa automaticamente zero.',
    );
  const ids = new Set<string>();
  for (const e of events) {
    if (
      !e.id ||
      ids.has(e.id) ||
      !validDate(e.date) ||
      e.date > weather.today ||
      !Number.isFinite(e.mm) ||
      e.mm < 0 ||
      !['rain', 'irrigation'].includes(e.type)
    )
      r.issues.push('Há um lançamento manual inválido, duplicado ou futuro.');
    ids.add(e.id);
  }
  if (r.issues.length) return r;
  const byDate = new Map(weather.days.map((d) => [d.date, d]));
  let depletion = initial.depletionMm;
  const calculate = (date: string, projected: boolean): BalanceDay | null => {
    const day = byDate.get(date);
    const phase = kcOnDate(registration, date, weather.days);
    if (!day || day.etoMm === null || phase.kc === null) {
      r.issues.push(phase.issue ?? `ETo ausente em ${date}.`);
      return null;
    }
    const recorded = events.filter((e) => e.date === date);
    const rain = recorded.filter((e) => e.type === 'rain').reduce((sum, e) => sum + e.mm, 0);
    const gross = recorded.filter((e) => e.type === 'irrigation').reduce((sum, e) => sum + e.mm, 0);
    // Chuva prevista jamais entra no histórico. Em hoje, chuva registrada prevalece.
    const predictedRain =
      projected && input.considerForecastRain && !recorded.some((e) => e.type === 'rain')
        ? (day.forecastRainMm ?? 0)
        : 0;
    const net = gross * irrigationEfficiency;
    const potential = day.etoMm * phase.kc;
    const raw = depletion + potential - net - (rain + predictedRain) * rainFraction;
    const drainage = Math.max(0, -raw);
    const unmet = Math.max(0, raw - cadMm);
    depletion = Math.min(cadMm, Math.max(0, raw));
    const allowed = adjustedDepletionFraction(pAt5, potential) * cadMm;
    return {
      date,
      etoMm: day.etoMm,
      kc: phase.kc,
      etcPotentialMm: potential,
      rainManualMm: rain,
      irrigationGrossMm: gross,
      irrigationNetMm: net,
      forecastRainUsedMm: predictedRain,
      depletionMm: depletion,
      drainageMm: drainage,
      unmetPotentialMm: unmet,
      allowableDepletionMm: allowed,
      thresholdReached: depletion >= allowed,
    };
  };
  for (let date = initial.date; date < weather.today; date = shiftDate(date, 1)) {
    const day = calculate(date, false);
    if (!day) return r;
    r.history.push(day);
  }
  r.status = 'ready';
  r.closedThrough = initial.date === weather.today ? null : yesterday;
  r.depletionMm = depletion;
  for (const day of weather.days.filter((d) => d.date >= weather.today)) {
    const calculated = calculate(day.date, true);
    if (!calculated) break;
    r.forecast.push(calculated);
  }
  return r;
}
