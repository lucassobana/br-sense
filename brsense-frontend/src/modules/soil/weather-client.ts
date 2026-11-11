import type { Coordinates } from './types.ts';
import type { WeatherSeries } from './weather-types.ts';
import { coordinateKey, validCoordinates } from './calculations.ts';
import { useCallback, useEffect, useState } from 'react';

export type WeatherLoader = (
  coordinates: Coordinates,
  startDate: string,
  timezone: string,
  signal: AbortSignal,
) => Promise<WeatherSeries>;
const RAW_API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

export function createWeatherLoader(endpoint = `${API_BASE}/api/weather`): WeatherLoader {
  return async (coordinates, startDate, timezone, signal) => {
    const query = new URLSearchParams({
      latitude: String(coordinates.latitude),
      longitude: String(coordinates.longitude),
      startDate,
      timezone,
    });
    const response = await fetch(`${endpoint}?${query}`, { signal });
    const body = (await response.json()) as WeatherSeries & { error?: { message?: string } };
    if (!response.ok) throw new Error(body.error?.message ?? 'Falha ao consultar o clima.');
    if (
      !body.coordinates ||
      !Array.isArray(body.days) ||
      body.source !== 'Open-Meteo' ||
      body.timezone !== timezone ||
      coordinateKey(body.coordinates) !== coordinateKey(coordinates)
    ) {
      throw new Error('Resposta climática incompatível com o PIN.');
    }
    return body;
  };
}
const defaultLoader = createWeatherLoader();
export function usePinWeather(
  c: Coordinates,
  startDate: string,
  timezone = 'America/Sao_Paulo',
  loader: WeatherLoader = defaultLoader,
) {
  const [data, setData] = useState<WeatherSeries | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const { latitude, longitude } = c;
  const isValid = validCoordinates({ latitude, longitude });
  useEffect(() => {
    // Atualiza o dia local e a ETo enquanto o card permanece aberto.
    const update = () => setRevision((v) => v + 1);
    const timer = window.setInterval(update, 30 * 60_000);
    window.addEventListener('focus', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, []);
  useEffect(() => {
    if (!isValid) return;
    const cancel = new AbortController();
    Promise.resolve().then(() => {
      if (!cancel.signal.aborted) {
        setLoading(true);
        setError(null);
      }
    });
    loader({ latitude, longitude }, startDate, timezone, cancel.signal)
      .then((value) => {
        if (!cancel.signal.aborted) setData(value);
      })
      .catch((reason: unknown) => {
        if (!cancel.signal.aborted)
          setError(reason instanceof Error ? reason.message : 'Falha climática.');
      })
      .finally(() => {
        if (!cancel.signal.aborted) setLoading(false);
      });
    return () => cancel.abort();
  }, [isValid, latitude, longitude, startDate, timezone, loader, revision]);
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  return {
    data:
      isValid &&
      data &&
      coordinateKey(data.coordinates) === coordinateKey({ latitude, longitude }) &&
      data.timezone === timezone
        ? data
        : null,
    error: !isValid ? 'Coordenada inválida.' : error,
    loading: isValid ? loading : false,
    refresh,
  };
}
