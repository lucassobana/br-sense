import type { Coordinates, SoilProfile } from './types.ts';

export type SoilLoader = (
  coordinates: Coordinates,
  depthCm: number,
  signal: AbortSignal,
) => Promise<SoilProfile>;

const RAW_API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

export function createSoilLoader(endpoint = `${API_BASE}/api/soil`): SoilLoader {
  return async (coordinates, depthCm, signal) => {
    const query = new URLSearchParams({
      latitude: String(coordinates.latitude),
      longitude: String(coordinates.longitude),
      depthCm: String(depthCm),
    });
    const response = await fetch(`${endpoint}?${query}`, { signal });
    const body: unknown = await response.json();
    if (!response.ok) {
      const error = body as { error?: { message?: string } };
      throw new Error(error.error?.message ?? 'Não foi possível consultar o solo.');
    }
    const profile = body as SoilProfile;
    if (
      !profile.coordinates ||
      !Array.isArray(profile.layers) ||
      !profile.source ||
      profile.source.provider !== 'SoilGrids'
    ) {
      throw new Error('Resposta de solo incompatível com o contrato esperado.');
    }
    return profile;
  };
}

export const loadSoil = createSoilLoader();
