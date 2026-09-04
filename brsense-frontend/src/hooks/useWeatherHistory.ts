import { useState, useCallback } from 'react';
import { fetchWeatherHistory } from '../services/weatherService';
import type { DailyForecast } from '../types';

export const useWeatherHistory = () => {
    const [history, setHistory] = useState<DailyForecast[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadHistory = useCallback(async (lat: number, lng: number, startDate: string, endDate: string) => {
        setLoading(true);
        setError(null);

        try {
            const data = await fetchWeatherHistory(lat, lng, startDate, endDate);
            setHistory(data);
        } catch (err) {
            console.error("Erro no histórico:", err);
            setError("Erro ao carregar histórico climático.");
        } finally {
            setLoading(false);
        }
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        setError(null);
    }, []);

    return { history, loading, error, loadHistory, clearHistory };
};
