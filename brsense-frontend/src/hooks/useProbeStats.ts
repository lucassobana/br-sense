import { useMemo } from 'react';
import type { MapPoint } from '../components/SatelliteMap/SatelliteMap'; // Ajuste o caminho conforme seu projeto
import type { Measurement } from '../types';

export const useProbeStats = (point: MapPoint | null) => {
    // 1. Dados de Profundidade e Umidade
    const profileData = useMemo(() => {
        if (!point || !point.readings) return [];
        const uniqueDepths = new Map<number, Measurement>();
        const sorted = [...point.readings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        sorted.forEach(reading => {
            if (reading.moisture_pct !== null && !uniqueDepths.has(reading.depth_cm)) {
                uniqueDepths.set(reading.depth_cm, reading);
            }
        });
        return Array.from(uniqueDepths.values()).sort((a, b) => a.depth_cm - b.depth_cm);
    }, [point]);

    // 2. Última Comunicação
    const lastCommunicationDate = useMemo(() => {
        if (!point || !point.readings || point.readings.length === 0) return null;

        const latestReading = [...point.readings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        if (!latestReading || !latestReading.timestamp) return null;

        const date = new Date(latestReading.timestamp);
        date.setHours(date.getHours() - 3);

        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }, [point]);

    // 3. Estatísticas de Chuva (Pluviometria)
    const rainStats = useMemo(() => {
        const stats = { '1h': 0, '24h': 0, '7d': 0, '15d': 0, '30d': 0 };

        if (!point) return stats;

        // Se a API já enviar consolidado
        const p = point as MapPoint & {
            rain_1h?: number; rain_24h?: number; rain_7d?: number; rain_15d?: number; rain_30d?: number;
        };
        
        if (p.rain_1h !== undefined || p.rain_24h !== undefined || p.rain_7d !== undefined) {
            stats['1h'] = p.rain_1h ?? 0;
            stats['24h'] = p.rain_24h ?? 0;
            stats['7d'] = p.rain_7d ?? 0;
            stats['15d'] = p.rain_15d ?? 0;
            stats['30d'] = p.rain_30d ?? 0;
            return stats;
        }

        // Se precisar calcular pelo histórico de leituras
        if (point.readings && point.readings.length > 0) {
            const sorted = [...point.readings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const lastReadingDate = new Date(sorted[0].timestamp).getTime();

            const time1h = lastReadingDate - 60 * 60 * 1000;
            const time24h = lastReadingDate - 24 * 60 * 60 * 1000;
            const time7d = lastReadingDate - 7 * 24 * 60 * 60 * 1000;
            const time15d = lastReadingDate - 15 * 24 * 60 * 60 * 1000;
            const time30d = lastReadingDate - 30 * 24 * 60 * 60 * 1000;

            point.readings.forEach(r => {
                if (r.rain_cm && r.timestamp) {
                    const rDate = new Date(r.timestamp).getTime();
                    const val = Number(r.rain_cm);

                    if (rDate >= time1h) stats['1h'] += val;
                    if (rDate >= time24h) stats['24h'] += val;
                    if (rDate >= time7d) stats['7d'] += val;
                    if (rDate >= time15d) stats['15d'] += val;
                    if (rDate >= time30d) stats['30d'] += val;
                }
            });
        }

        return stats;
    }, [point]);

    return { profileData, lastCommunicationDate, rainStats };
};