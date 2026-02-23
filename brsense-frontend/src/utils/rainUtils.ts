// src/utils/rainUtils.ts
import type { Measurement } from '../types';
import type { RainPeriod } from '../components/SatelliteMap/SatelliteMap';

export function calculateRainStats(readings: Measurement[]) {
    const stats: Record<RainPeriod, number> = {
        '1h': 0,
        '24h': 0,
        '7d': 0,
        '15d': 0,
        '30d': 0,
    };

    if (!readings?.length) return stats;

    const now = new Date();

    const limits = {
        '1h': new Date(now.getTime() - 1 * 60 * 60 * 1000),
        '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
        '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        '15d': new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };

    readings.forEach(r => {
        if (r.rain_cm == null || !r.timestamp) return;

        const t = new Date(r.timestamp);
        const val = Number(r.rain_cm);

        if (t >= limits['1h']) stats['1h'] += val;
        if (t >= limits['24h']) stats['24h'] += val;
        if (t >= limits['7d']) stats['7d'] += val;
        if (t >= limits['15d']) stats['15d'] += val;
        if (t >= limits['30d']) stats['30d'] += val;
    });

    return stats;
}
