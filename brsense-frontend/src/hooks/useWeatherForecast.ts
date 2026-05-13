import { useState, useEffect } from 'react';
import { fetchWeatherData } from '../services/weatherService';
import type { DailyForecast } from '../types';

export const useWeatherForecast = (lat?: number, lng?: number) => {
    const [forecast, setForecast] = useState<DailyForecast[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (lat === undefined || lng === undefined) return;

        const loadForecast = async () => {
            setLoading(true);
            try {
                const data = await fetchWeatherData(lat, lng);
                setForecast(data);
            } catch{
                setError("Erro ao carregar previsão.");
            } finally {
                setLoading(false);
            }
        };

        loadForecast();
    }, [lat, lng]);

    return { forecast, loading, error };
};