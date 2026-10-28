import { adjustedDepletionFraction, calculateSoilLimits, coordinateKey } from './calculations.ts';
import { dateDifference, shiftDate, validDate } from './dates.ts';
import { plantingDate } from './phenology.ts';
import { balanceKcOnDate, isPerennial, rootDepthReference, rootsOnDate } from './roots.ts';
import {
  DEFAULT_INITIAL_RANGE_TOLERANCE_MM,
  DEFAULT_IRRIGATION_EFFICIENCY,
  DEFAULT_PERENNIAL_HISTORY_DAYS,
  DEFAULT_PREPLANT_HISTORY_DAYS,
} from './model-defaults.ts';
import type { SoilProfile, SoilSettings } from './types.ts';
import type {
  CropRegistration,
  InitialWaterState,
  ManualWaterEvent,
  WeatherSeries,
} from './weather-types.ts';

export interface MillimeterRange {
  min: number;
  max: number;
}
export type WaterCondition = 'monitor' | 'irrigate' | 'check';
export interface WaterSnapshot {
  rootDepthM: number;
  cadMm: number;
  allowableDepletionMm: number;
  depletionMm: MillimeterRange;
  availableMm: MillimeterRange;
  /** Referência para reposição até CC; não inclui limite operacional do pivô/reservatório. */
  grossRefillToCcMm: MillimeterRange;
  condition: WaterCondition;
  initialRangeNarrow: boolean;
}
export interface AutomaticBalanceDay extends WaterSnapshot {
  date: string;
  etoMm: number;
  kc: number;
  etcPotentialMm: number;
  /** Aproximação diária Kc simples × Ks; não equivale a Kcb/Ke calibrados. */
  actualEtMm: MillimeterRange;
  drainageMm: MillimeterRange;
  rainMm: number;
  rainSource: 'manual' | 'modeledHistory' | 'forecast' | 'excluded';
  irrigationGrossMm: number;
  irrigationNetMm: number;
  /** Auditoria dos cenários com início úmido/seco, perfil inteiro, não apenas raízes. */
  massBalance: Array<{
    startStorageMm: number;
    inputMm: number;
    endStorageMm: number;
    etMm: number;
    drainageMm: number;
    residualMm: number;
  }>;
}
export interface AutomaticBalanceResult {
  status: 'ready' | 'incomplete';
  issues: string[];
  notes: string[];
  startDate: string | null;
  closedThrough: string | null;
  current: WaterSnapshot | null;
  history: AutomaticBalanceDay[];
  forecast: AutomaticBalanceDay[];
  initialization: 'bounded' | 'observed';
  irrigationEfficiency: number;
}
export interface AutomaticBalanceInput {
  weather: WeatherSeries | null;
  registration: CropRegistration;
  profile: SoilProfile | null;
  settings: SoilSettings;
  events: ManualWaterEvent[];
  pAt5: number;
  initial?: InitialWaterState | null;
  irrigationEfficiency?: number;
  rainInfiltrationFraction?: number;
  considerForecastRain?: boolean;
  preplantHistoryDays?: number;
  perennialHistoryDays?: number;
  initialRangeToleranceMm?: number;
}

/** Data do início do modelo. Inicialização observada substitui o aquecimento estimado. */
export function balanceStartDate(
  reg: CropRegistration,
  today: string,
  initial: InitialWaterState | null = null,
  preplantDays = DEFAULT_PREPLANT_HISTORY_DAYS,
  perennialDays = DEFAULT_PERENNIAL_HISTORY_DAYS,
): string {
  if (initial) return initial.date;
  return isPerennial(reg)
    ? shiftDate(today, -perennialDays)
    : shiftDate(plantingDate(reg), -preplantDays);
}
/** Inclui temperaturas desde o plantio quando necessárias às curvas térmicas. */
export function weatherStartDate(
  reg: CropRegistration,
  today: string,
  initial: InitialWaterState | null = null,
  preplantDays = DEFAULT_PREPLANT_HISTORY_DAYS,
  perennialDays = DEFAULT_PERENNIAL_HISTORY_DAYS,
): string {
  const start = balanceStartDate(reg, today, initial, preplantDays, perennialDays);
  return isPerennial(reg) ? start : [start, plantingDate(reg)].sort()[0]!;
}

interface Cell {
  bottomCm: number;
  capacityMm: number;
}
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const range = (a: number, b: number): MillimeterRange => ({
  min: Math.min(a, b),
  max: Math.max(a, b),
});
const precipitation = (day: WeatherSeries['days'][number]) =>
  day.precipitationMm === undefined ? day.forecastRainMm : day.precipitationMm;

/**
 * Dois cenários de condição inicial (CC e PMP), sem atribuir uma falsa leitura ao PIN.
 * Células de integração de 1 cm reutilizam as propriedades das camadas nativas;
 * isso não aumenta a resolução do mapa. Armazenamento nas camadas profundas é
 * conservado até que as raízes as alcancem. Sem ascensão capilar/escoamento calibrados.
 */
export function estimateWaterBalance(input: AutomaticBalanceInput): AutomaticBalanceResult {
  const efficiency = input.irrigationEfficiency ?? DEFAULT_IRRIGATION_EFFICIENCY;
  const r: AutomaticBalanceResult = {
    status: 'incomplete',
    issues: [],
    notes: [],
    startDate: null,
    closedThrough: null,
    current: null,
    history: [],
    forecast: [],
    initialization: input.initial ? 'observed' : 'bounded',
    irrigationEfficiency: efficiency,
  };
  const { weather, profile, settings, registration, events, pAt5, initial } = input;
  const rainFraction = input.rainInfiltrationFraction ?? 1;
  const tolerance = input.initialRangeToleranceMm ?? DEFAULT_INITIAL_RANGE_TOLERANCE_MM;
  const preplantDays = input.preplantHistoryDays ?? DEFAULT_PREPLANT_HISTORY_DAYS;
  const perennialDays = input.perennialHistoryDays ?? DEFAULT_PERENNIAL_HISTORY_DAYS;
  if (!weather || !profile)
    r.issues.push('Aguardando histórico climático e perfil de solo do PIN.');
  if (
    !Number.isFinite(efficiency) ||
    efficiency <= 0 ||
    efficiency > 1 ||
    !Number.isFinite(rainFraction) ||
    rainFraction < 0 ||
    rainFraction > 1
  )
    r.issues.push('Eficiência ou fração de infiltração inválida.');
  if (
    !Number.isFinite(tolerance) ||
    tolerance < 0 ||
    ![preplantDays, perennialDays].every((d) => Number.isInteger(d) && d >= 0 && d <= 730)
  )
    r.issues.push('Configuração do período inicial ou tolerância inválida.');
  if (!Number.isFinite(pAt5) || pAt5 < 0.1 || pAt5 > 0.8) r.issues.push('Fator p inválido.');
  if (r.issues.length || !weather || !profile) return r;
  if (!validDate(weather.today) || coordinateKey(weather.coordinates) !== settings.coordinateKey)
    r.issues.push('Clima/data incompatíveis com a configuração do PIN.');
  let start: string;
  try {
    start = balanceStartDate(
      registration,
      weather.today,
      initial ?? null,
      preplantDays,
      perennialDays,
    );
    if (
      plantingDate(registration) > weather.today ||
      !validDate(start) ||
      start > weather.today ||
      dateDifference(start, weather.today) > 730
    )
      r.issues.push('Data de plantio/inicial inválida ou histórico superior a 730 dias.');
  } catch {
    r.issues.push('Cultura/DAP ou condição inicial inválidos.');
    return r;
  }
  r.startDate = start;
  const rootReference = rootDepthReference(registration, settings);
  if (rootReference.issue) r.issues.push(rootReference.issue);
  const max = rootReference.maximumDepthM;
  const fullLimits = calculateSoilLimits(
    profile,
    { ...settings, effectiveRootDepthM: max },
    pAt5,
    5,
  );
  if (!fullLimits.summary) r.issues.push(...fullLimits.issues);
  const ids = new Set<string>();
  const dailyEvents = new Map<string, ManualWaterEvent[]>();
  for (const event of events) {
    if (
      !event.id ||
      ids.has(event.id) ||
      !validDate(event.date) ||
      event.date > weather.today ||
      !Number.isFinite(event.mm) ||
      event.mm < 0 ||
      !['rain', 'irrigation'].includes(event.type)
    )
      r.issues.push('Lançamento manual inválido, duplicado ou futuro.');
    ids.add(event.id);
    dailyEvents.set(event.date, [...(dailyEvents.get(event.date) ?? []), event]);
  }
  const dates = new Set<string>();
  for (const day of weather.days) {
    if (
      !validDate(day.date) ||
      dates.has(day.date) ||
      (day.date < weather.today ? day.kind !== 'modeledHistory' : day.kind !== 'forecast')
    )
      r.issues.push('Datas ou classificação do histórico climático inválidas.');
    dates.add(day.date);
  }
  if (r.issues.length || max === null || !fullLimits.summary) return r;
  const cells: Cell[] = fullLimits.layers.flatMap((layer) => {
    const list: Cell[] = [];
    const end = Math.min(layer.bottomCm, max * 100);
    for (let top = layer.topCm; top < end - 1e-9; top += 1) {
      const thickness = Math.min(1, end - top);
      list.push({
        bottomCm: top + thickness,
        capacityMm: (layer.cc - layer.pmp) * thickness * 10 * (1 - layer.coarseFragments),
      });
    }
    return list;
  });
  const states = [cells.map((c) => c.capacityMm), cells.map(() => 0)];
  const activeCount = (depthM: number) =>
    cells.filter((c) => c.bottomCm <= depthM * 100 + 1e-7).length;
  const rootStart = rootsOnDate(registration, start, weather.days, settings);
  if (rootStart.depthM === null) {
    r.issues.push(rootStart.issue ?? 'Raízes iniciais indisponíveis.');
    return r;
  }
  if (initial) {
    const count = activeCount(rootStart.depthM);
    const cadStart = sum(cells.slice(0, count).map((c) => c.capacityMm));
    if (
      !Number.isFinite(initial.depletionMm) ||
      initial.depletionMm < 0 ||
      initial.depletionMm > cadStart ||
      !validDate(initial.recordsCompleteThrough) ||
      initial.recordsCompleteThrough > weather.today
    )
      r.issues.push('Condição inicial incompatível com as raízes/CAD da data ou datas inválidas.');
    if (
      initial.date < weather.today &&
      initial.recordsCompleteThrough < shiftDate(weather.today, -1)
    )
      r.issues.push(
        'Confira os lançamentos de irrigação até ontem para usar a condição inicial observada.',
      );
    if (r.issues.length) return r;
    // Dr observado fixa a zona ativa; distribuição vertical uniforme é hipótese.
    // As camadas ainda não exploradas conservam a faixa inicial CC/PMP.
    for (const state of states)
      for (let i = 0; i < count; i++)
        state[i] = cells[i]!.capacityMm * (1 - initial.depletionMm / cadStart);
  }
  r.notes.push(
    'Irrigações não registradas são consideradas ausentes; o clima não recupera aplicações que faltam no histórico.',
  );
  r.notes.push(
    'Chuva manual substitui a chuva da API no mesmo dia, inclusive um registro explícito de 0 mm.',
  );
  r.notes.push(rootReference.reference);
  if (!initial)
    r.notes.push(
      'Faixa entre dois cenários iniciais (CC/PMP), sem probabilidade estatística; não abrange todos os erros de clima/solo.',
    );
  if (start < plantingDate(registration))
    r.notes.push(
      'Antes do plantio: Kc 0,30 e zona de evaporação de 0,10 m são hipóteses editáveis do produto; revisar cobertura/cultura anterior.',
    );
  const needsPerennialCalibration =
    isPerennial(registration) &&
    (settings.effectiveRootDepthM === null || registration.manualKc == null);
  if (needsPerennialCalibration)
    r.notes.push(
      'Café/pastagem: confirme profundidade efetiva e Kc de cobertura/manejo antes de transformar a referência em programação.',
    );
  const byDate = new Map(weather.days.map((day) => [day.date, day]));
  const snapshot = (rootDepthM: number, potential: number): WaterSnapshot => {
    const count = activeCount(rootDepthM);
    const cadMm = sum(cells.slice(0, count).map((c) => c.capacityMm));
    const availableMm = range(sum(states[0]!.slice(0, count)), sum(states[1]!.slice(0, count)));
    const depletionMm = {
      min: Math.max(0, cadMm - availableMm.max),
      max: Math.max(0, cadMm - availableMm.min),
    };
    const allowed = adjustedDepletionFraction(pAt5, potential) * cadMm;
    return {
      rootDepthM,
      cadMm,
      allowableDepletionMm: allowed,
      availableMm,
      depletionMm,
      grossRefillToCcMm: { min: depletionMm.min / efficiency, max: depletionMm.max / efficiency },
      condition: needsPerennialCalibration
        ? 'check'
        : depletionMm.min >= allowed
          ? 'irrigate'
          : depletionMm.max >= allowed
            ? 'check'
            : 'monitor',
      initialRangeNarrow: depletionMm.max - depletionMm.min <= tolerance,
    };
  };
  const calculate = (date: string, projected: boolean): AutomaticBalanceDay | null => {
    const day = byDate.get(date);
    const phase = balanceKcOnDate(registration, date, weather.days);
    const roots = rootsOnDate(registration, date, weather.days, settings);
    if (
      !day ||
      day.etoMm === null ||
      !Number.isFinite(day.etoMm) ||
      day.etoMm < 0 ||
      phase.kc === null ||
      roots.depthM === null
    ) {
      r.issues.push(phase.issue ?? roots.issue ?? `ETo ausente/inválida em ${date}.`);
      return null;
    }
    const recorded = dailyEvents.get(date) ?? [];
    const manualRain = recorded.filter((e) => e.type === 'rain');
    const gross = sum(recorded.filter((e) => e.type === 'irrigation').map((e) => e.mm));
    const net = gross * efficiency;
    const rainSource = manualRain.length
      ? 'manual'
      : !projected
        ? 'modeledHistory'
        : input.considerForecastRain
          ? 'forecast'
          : 'excluded';
    const rain =
      rainSource === 'manual'
        ? sum(manualRain.map((e) => e.mm))
        : rainSource === 'excluded'
          ? 0
          : precipitation(day);
    if (rain === null || !Number.isFinite(rain) || rain < 0) {
      r.issues.push(`Chuva ausente/inválida em ${date}; registre a chuva ou complete a API.`);
      return null;
    }
    const waterInput = rain * rainFraction + net;
    const potential = day.etoMm * phase.kc;
    const count = activeCount(roots.depthM);
    const cad = sum(cells.slice(0, count).map((c) => c.capacityMm));
    const allowed = adjustedDepletionFraction(pAt5, potential) * cad;
    const audits = states.map((state) => {
      const startStorageMm = sum(state);
      const infiltrate = (amount: number) => {
        for (let i = 0; i < cells.length && amount > 0; i++) {
          const applied = Math.min(Math.max(0, cells[i]!.capacityMm - state[i]!), amount);
          state[i]! += applied;
          amount -= applied;
        }
        return Math.max(0, amount);
      };
      let excess = infiltrate(waterInput);
      const available = sum(state.slice(0, count));
      const depletion = cad - available;
      const ks = depletion <= allowed ? 1 : Math.max(0, Math.min(1, available / (cad - allowed)));
      const etMm = Math.min(available, potential * ks);
      // Retirada proporcional à água disponível; sem supor água nova ao ampliar raízes.
      if (available > 0) for (let i = 0; i < count; i++) state[i]! *= 1 - etMm / available;
      // Balanço diário: excedente pode atender o consumo do dia antes da percolação.
      // Não resolve a distribuição horária da chuva/irrigação.
      excess = infiltrate(excess);
      const endStorageMm = sum(state);
      return {
        startStorageMm,
        inputMm: waterInput,
        endStorageMm,
        etMm,
        drainageMm: excess,
        residualMm: startStorageMm + waterInput - endStorageMm - etMm - excess,
      };
    });
    return {
      ...snapshot(roots.depthM, potential),
      date,
      etoMm: day.etoMm,
      kc: phase.kc,
      etcPotentialMm: potential,
      actualEtMm: range(audits[0]!.etMm, audits[1]!.etMm),
      drainageMm: range(audits[0]!.drainageMm, audits[1]!.drainageMm),
      rainMm: rain,
      rainSource,
      irrigationGrossMm: gross,
      irrigationNetMm: net,
      massBalance: audits,
    };
  };
  for (let date = start; date < weather.today; date = shiftDate(date, 1)) {
    const day = calculate(date, false);
    if (!day) return r;
    r.history.push(day);
  }
  const today = byDate.get(weather.today);
  const phaseToday = balanceKcOnDate(registration, weather.today, weather.days);
  const rootsToday = rootsOnDate(registration, weather.today, weather.days, settings);
  if (
    !today ||
    today.etoMm === null ||
    !Number.isFinite(today.etoMm) ||
    today.etoMm < 0 ||
    phaseToday.kc === null ||
    rootsToday.depthM === null
  ) {
    r.issues.push(phaseToday.issue ?? rootsToday.issue ?? 'ETo de hoje ausente/inválida.');
    return r;
  }
  r.current = snapshot(rootsToday.depthM, today.etoMm * phaseToday.kc);
  r.status = 'ready';
  r.closedThrough = start === weather.today ? null : shiftDate(weather.today, -1);
  const future = weather.days
    .filter((d) => d.date >= weather.today)
    .sort((a, b) => a.date.localeCompare(b.date));
  let expected = weather.today;
  for (const day of future) {
    if (day.date !== expected) {
      r.issues.push(`Lacuna na projeção em ${expected}.`);
      break;
    }
    const calculated = calculate(day.date, true);
    if (!calculated) break;
    r.forecast.push(calculated);
    expected = shiftDate(expected, 1);
  }
  return r;
}
