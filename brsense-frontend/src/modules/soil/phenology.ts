import catalog from './crops-fao56.json';
import { dateDifference, shiftDate, validDate } from './dates.ts';
import type { CropRegistration, WeatherDay } from './weather-types.ts';

interface Stages {
  initial: number;
  development: number;
  midSeason: number;
  lateSeason: number;
}
export function plantingDate(reg: CropRegistration): string {
  if (!Number.isInteger(reg.dap) || reg.dap < 0 || reg.dap > 7300 || !validDate(reg.dapDate))
    throw new Error('DAP ou data de referência inválidos.');
  return shiftDate(reg.dapDate, -reg.dap);
}

/** Complemento numérico da tabela 6.12, FAO-56 Rev.1 pp. 211–212. */
const supplemental: Record<string, Array<{ id: string; stageDurationsDegreeDays: Stages }>> = {
  mamona: [
    {
      id: 'range-min',
      stageDurationsDegreeDays: { initial: 280, development: 530, midSeason: 640, lateSeason: 330 },
    },
    {
      id: 'range-max',
      stageDurationsDegreeDays: { initial: 190, development: 490, midSeason: 880, lateSeason: 550 },
    },
  ],
  beterraba: [
    {
      id: 'range-min',
      stageDurationsDegreeDays: { initial: 30, development: 130, midSeason: 180, lateSeason: 100 },
    },
    {
      id: 'range-max',
      stageDurationsDegreeDays: { initial: 40, development: 150, midSeason: 180, lateSeason: 100 },
    },
  ],
};
export function phenologyProfiles(cropId: string) {
  const crop = catalog.crops.find((c) => c.id === cropId);
  return crop ? [...crop.indicativePhenologyProfiles, ...(supplemental[cropId] ?? [])] : [];
}

export function selectedPhenologyProfile(reg: CropRegistration) {
  const profiles = phenologyProfiles(reg.cropId);
  return reg.phenologyProfileId
    ? profiles.find((p) => p.id === reg.phenologyProfileId)
    : profiles.find((p) =>
        reg.cropId === 'milho' && /silage/i.test(reg.profileId)
          ? p.id.startsWith('silage')
          : reg.cropId === 'trigo' && /winter/i.test(reg.profileId)
            ? p.id.startsWith('winter')
            : reg.cropId === 'tomate' && /fresh|trellis/i.test(reg.profileId)
              ? p.id === 'market'
              : true,
      );
}

export interface KcResult {
  kc: number | null;
  phase: string;
  dap: number;
  gdd: number | null;
  issue: string | null;
}

/** Soma térmica até o início do dia; temperatura média limitada por Tb/Tu. */
export function kcOnDate(reg: CropRegistration, date: string, weather: WeatherDay[]): KcResult {
  const start = plantingDate(reg);
  const dap = dateDifference(start, date);
  const empty = (issue: string): KcResult => ({
    kc: null,
    phase: 'Ajustar fase',
    dap,
    gdd: null,
    issue,
  });
  if (dap < 0) return empty('O dia solicitado antecede o plantio inferido.');
  const crop = catalog.crops.find((c) => c.id === reg.cropId);
  const profile = crop?.referenceProfiles.find((p) => p.id === reg.profileId);
  if (!crop || !profile) return empty('Selecione uma cultura e um perfil compatíveis.');
  if (reg.manualKc !== null && reg.manualKc !== undefined) {
    if (!Number.isFinite(reg.manualKc) || reg.manualKc < 0 || reg.manualKc > 2)
      return empty('Kc ajustado deve estar entre 0 e 2.');
    return { kc: reg.manualKc, phase: 'Kc ajustado', dap, gdd: null, issue: null };
  }
  // DAP não descreve idade/cobertura de café nem o ciclo de rebrota de pastagem.
  if (!crop.thermalReference)
    return empty('Para café ou pastagem, ajustar o Kc conforme cobertura, fase e manejo.');
  if (reg.cropId === 'feijao' && /cowpea|green/i.test(reg.profileId))
    return empty('Este perfil de feijão exige uma curva própria ou Kc ajustado.');
  const selected = selectedPhenologyProfile(reg);
  if (!selected) return empty('Selecione uma curva fenológica ou ajuste o Kc.');
  const byDate = new Map(weather.map((d) => [d.date, d]));
  let gdd = 0;
  for (let current = start; current < date; current = shiftDate(current, 1)) {
    const day = byDate.get(current);
    if (!day || day.tMaxC === null || day.tMinC === null)
      return empty(
        `Temperaturas ausentes em ${current}; não estimar fase com histórico incompleto.`,
      );
    const mean = (day.tMaxC + day.tMinC) / 2;
    gdd += Math.max(
      0,
      Math.min(mean, crop.thermalReference.upperTemperatureC) -
        crop.thermalReference.baseTemperatureC,
    );
  }
  const s = selected.stageDurationsDegreeDays;
  const k = profile.kcSingle;
  let kc: number, phase: string;
  if (gdd < s.initial) {
    kc = k.initial;
    phase = 'Inicial estimada';
  } else if (gdd < s.initial + s.development) {
    kc = k.initial + ((k.midSeason - k.initial) * (gdd - s.initial)) / s.development;
    phase = 'Desenvolvimento estimado';
  } else if (gdd < s.initial + s.development + s.midSeason) {
    kc = k.midSeason;
    phase = 'Intermediária estimada';
  } else if (gdd < s.initial + s.development + s.midSeason + s.lateSeason) {
    kc =
      k.midSeason +
      ((k.lateSeasonEnd - k.midSeason) * (gdd - s.initial - s.development - s.midSeason)) /
        s.lateSeason;
    phase = 'Final estimada';
  } else
    return empty('Curva térmica encerrada. Confira colheita/fase antes de continuar o manejo.');
  return { kc, phase, dap, gdd, issue: null };
}
