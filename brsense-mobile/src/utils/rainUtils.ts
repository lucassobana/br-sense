import { RawReading } from '../../app/index';

export type RainPeriod = '1h' | '24h' | '7d' | '15d' | '30d';

export const calculateRainStats = (readings: RawReading[]) => {
    const stats = { '1h': 0, '24h': 0, '7d': 0, '15d': 0, '30d': 0 };
    if (!readings || readings.length === 0) return stats;

    const now = new Date();
    const time1h = new Date(now.getTime() - 60 * 60 * 1000);
    const time24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const time7d = new Date(); time7d.setDate(now.getDate() - 7);
    const time15d = new Date(); time15d.setDate(now.getDate() - 15);
    const time30d = new Date(); time30d.setDate(now.getDate() - 30);

    readings.forEach(r => {
        if (r.rain_cm !== null && r.rain_cm !== undefined && r.timestamp) {
            const rDate = new Date(r.timestamp);
            const val = Number(r.rain_cm); // Convertendo cm para mm

            if (rDate >= time1h) stats['1h'] += val;
            if (rDate >= time24h) stats['24h'] += val;
            if (rDate >= time7d) stats['7d'] += val;
            if (rDate >= time15d) stats['15d'] += val;
            if (rDate >= time30d) stats['30d'] += val;
        }
    });

    return stats;
};