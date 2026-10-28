import catalog from './crops-fao56.json';
import { dateDifference } from './dates.ts';
import { kcOnDate, plantingDate, selectedPhenologyProfile } from './phenology.ts';
import { DEFAULT_INITIAL_ROOT_DEPTH_M, DEFAULT_PREPLANT_KC } from './model-defaults.ts';
import type { KcResult } from './phenology.ts';
import type { SoilSettings } from './types.ts';
import type { CropRegistration, WeatherDay } from './weather-types.ts';

export const isPerennial = (reg: CropRegistration) => ['cafe', 'pastagem'].includes(reg.cropId);

/** Limites legados explícitos; o catálogo revisado não fornece Zr nestes perfis. */
const perennialRoots = {
  cafe: { depthM: 0.9, rangeM: [0.9, 1.5] },
  pastagem: { depthM: 0.5, rangeM: [0.5, 1.5] },
} as const;

export interface RootDepthResult {
  depthM: number | null;
  maximumDepthM: number | null;
  mode: 'estimated' | 'fixed';
  reference: string;
  issue: string | null;
}

/** Referência de planejamento: extremo inferior da faixa efetiva máxima publicada. */
export function rootDepthReference(reg: CropRegistration, settings: SoilSettings): RootDepthResult {
  const mode = settings.effectiveRootDepthM === null ? 'estimated' : 'fixed';
  const empty = (issue: string): RootDepthResult => ({
    depthM: null,
    maximumDepthM: null,
    mode,
    reference: '',
    issue,
  });
  const crop = catalog.crops.find((c) => c.id === reg.cropId);
  const profile = crop?.referenceProfiles.find((p) => p.id === reg.profileId);
  if (!profile) return empty('Cultura/perfil inválidos para estimar raízes.');
  const fixed = settings.effectiveRootDepthM;
  const cap = settings.rootDepthLimitM ?? null;
  for (const depth of [fixed, cap]) {
    if (depth !== null && (!Number.isFinite(depth) || depth < 0.05 || depth > 2))
      return empty('Profundidade e limite das raízes devem estar entre 0,05 e 2 m.');
  }
  if (fixed !== null && cap !== null && fixed > cap)
    return empty('A profundidade informada excede o limite físico configurado.');
  const fallback = perennialRoots[reg.cropId as keyof typeof perennialRoots];
  const published = profile.maximumEffectiveRootDepthRangeM?.[0] ?? fallback?.depthM;
  const maximum = fixed ?? (published === undefined ? null : Math.min(published, cap ?? 2));
  if (maximum === null) return empty('Informe uma profundidade efetiva para este perfil.');
  return {
    depthM: fixed,
    maximumDepthM: mode === 'fixed' ? maximum : Math.floor((maximum + 1e-9) * 100) / 100,
    mode,
    reference:
      fixed !== null
        ? 'Profundidade informada no PIN.'
        : profile.maximumEffectiveRootDepthRangeM
          ? `FAO-56 Rev.1 (2025): faixa ${profile.maximumEffectiveRootDepthRangeM.join('–')} m; limite inferior para planejamento.`
          : `FAO-56 (1998), tabela 22: ${fallback?.rangeM.join('–')} m. Confirmar raízes, especialmente em café jovem e após manejo da pastagem.`,
    issue: null,
  };
}

/** Crescimento linear em soma térmica até o início da fase intermediária: hipótese do produto. */
export function rootsOnDate(
  reg: CropRegistration,
  date: string,
  weather: WeatherDay[],
  settings: SoilSettings,
): RootDepthResult {
  const result = rootDepthReference(reg, settings);
  const maximum = result.maximumDepthM;
  if (result.issue || maximum === null) return result;
  if (date < plantingDate(reg))
    return { ...result, depthM: Math.min(DEFAULT_INITIAL_ROOT_DEPTH_M, maximum) };
  if (isPerennial(reg)) return { ...result, depthM: maximum };
  if (result.mode === 'fixed') return { ...result, depthM: maximum };
  const phase = kcOnDate({ ...reg, manualKc: null }, date, weather);
  const curve = selectedPhenologyProfile(reg);
  if (phase.gdd === null || !curve)
    return {
      ...result,
      depthM: null,
      issue: phase.issue ?? 'Curva de crescimento das raízes ausente.',
    };
  const initial = Math.min(DEFAULT_INITIAL_ROOT_DEPTH_M, maximum);
  const progress = Math.min(
    1,
    phase.gdd /
      (curve.stageDurationsDegreeDays.initial + curve.stageDurationsDegreeDays.development),
  );
  return {
    ...result,
    depthM: Math.floor((initial + (maximum - initial) * progress + 1e-9) * 100) / 100,
  };
}

/** Para perenes, cobertura/manejo substituem uma fase universal calculada pelo DAP. */
export function balanceKcOnDate(
  reg: CropRegistration,
  date: string,
  weather: WeatherDay[],
): KcResult {
  const plant = plantingDate(reg);
  if (date < plant)
    return {
      kc: DEFAULT_PREPLANT_KC,
      phase: 'Antes do plantio · hipótese de cobertura',
      dap: dateDifference(plant, date),
      gdd: null,
      issue: null,
    };
  if (isPerennial(reg) && (reg.manualKc === null || reg.manualKc === undefined)) {
    const profile = catalog.crops
      .find((c) => c.id === reg.cropId)
      ?.referenceProfiles.find((p) => p.id === reg.profileId);
    return {
      kc: profile?.kcSingle.midSeason ?? null,
      phase: 'Referência de cobertura · confirmar manejo',
      dap: dateDifference(plant, date),
      gdd: null,
      issue: profile ? null : 'Perfil inválido.',
    };
  }
  return kcOnDate(reg, date, weather);
}
