import { useState, useEffect } from 'react';
import { fetchWeatherData } from '../services/weatherService';
import type { DailyForecast } from '../types';

// Variável global (fora do hook) para compartilhar requisições em andamento
// Isso previne que 10 cards chamem a API no mesmo milissegundo.
const pendingRequests = new Map<string, Promise<DailyForecast[]>>();

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hora de cache (limite da Open-Meteo)

export const useWeatherForecast = (lat?: number, lng?: number) => {
    const [forecast, setForecast] = useState<DailyForecast[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (lat === undefined || lng === undefined) return;

        // 1. Agrupamento geográfico: Arredonda para 2 casas decimais (~1.1km de resolução)
        // Faz com que sondas da mesma fazenda compartilhem a exata mesma requisição.
        const roundedLat = Number(lat.toFixed(2));
        const roundedLng = Number(lng.toFixed(2));
        const cacheKey = `weather_${roundedLat}_${roundedLng}`;

        const loadForecast = async () => {
            setLoading(true);
            setError(null);

            try {
                // 2. Verifica se já temos os dados no SessionStorage e se ainda são válidos
                const cachedDataStr = sessionStorage.getItem(cacheKey);
                if (cachedDataStr) {
                    const cachedData = JSON.parse(cachedDataStr);
                    const now = Date.now();
                    
                    if (now - cachedData.timestamp < CACHE_DURATION_MS) {
                        setForecast(cachedData.data);
                        setLoading(false);
                        return; // Sai cedo, não chama a API
                    }
                }

                // 3. Deduplicação: Verifica se já existe uma requisição idêntica em andamento
                if (pendingRequests.has(cacheKey)) {
                    // Aguarda a requisição do outro componente terminar
                    const data = await pendingRequests.get(cacheKey);
                    if (data) setForecast(data);
                    setLoading(false);
                    return;
                }

                // Se chegou aqui, precisa realmente chamar a API. 
                // Cria a promessa e guarda no mapa de requisições pendentes.
                const fetchPromise = fetchWeatherData(roundedLat, roundedLng).then(data => {
                    // Salva o resultado no SessionStorage com a hora atual
                    sessionStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        data: data
                    }));
                    return data;
                });

                pendingRequests.set(cacheKey, fetchPromise);

                // Aguarda o resultado e atualiza o estado
                const data = await fetchPromise;
                setForecast(data);

            } catch (err) {
                console.error("Erro na previsão:", err);
                setError("Erro ao carregar previsão.");
            } finally {
                // Limpa a promessa pendente para futuras requisições tentarem o cache normal
                pendingRequests.delete(cacheKey);
                setLoading(false);
            }
        };

        loadForecast();
    }, [lat, lng]);

    return { forecast, loading, error };
};