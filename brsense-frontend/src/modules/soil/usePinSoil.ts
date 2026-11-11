import { useCallback, useEffect, useState } from 'react';
import { coordinateKey, validCoordinates } from './calculations.ts';
import { loadSoil } from './client.ts';
import type { SoilLoader } from './client.ts';
import type { Coordinates, SoilProfile } from './types.ts';

/** Busca ao abrir/mover o PIN e ao ampliar raízes. Não grava ajustes manuais. */
export function usePinSoil(
  coordinates: Coordinates,
  rootDepthM: number | null,
  loader: SoilLoader = loadSoil,
  initialProfile: SoilProfile | null = null,
) {
  const [profile, setProfile] = useState<SoilProfile | null>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const depthCm = rootDepthM && rootDepthM > 0 && rootDepthM <= 2 ? rootDepthM * 100 : 60;
  const key = coordinateKey(coordinates);
  const { latitude, longitude } = coordinates;
  const isValid = validCoordinates({ latitude, longitude });
  useEffect(() => {
    if (!isValid) return;
    const abort = new AbortController();
    Promise.resolve().then(() => {
      if (!abort.signal.aborted) {
        setLoading(true);
        setError(null);
      }
    });
    loader({ latitude, longitude }, depthCm, abort.signal)
      .then((data) => {
        if (!abort.signal.aborted) setProfile(data);
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted)
          setError(reason instanceof Error ? reason.message : 'Falha ao buscar solo.');
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [isValid, latitude, longitude, depthCm, loader, revision]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  // Um retorno antigo nunca é apresentado como o solo da nova coordenada.
  const current = isValid && profile && coordinateKey(profile.coordinates) === key ? profile : null;
  return {
    profile: current,
    loading: isValid ? loading : false,
    error: !isValid ? 'Coordenada inválida para consulta de solo.' : error,
    refresh,
  };
}
