import { useMemo } from 'react';
import { Box, Text } from '@chakra-ui/react';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { RawApiData } from '../SoilMoistureChart/SoilMoistureChart';

interface BatteryStatusChartProps {
    data: RawApiData[];
}

interface BatteryPoint {
    time: string;
    battery?: number;
    solar?: number;
}

export function BatteryStatusChart({ data }: BatteryStatusChartProps) {
    const chartData = useMemo<BatteryPoint[]>(() => {
        const mapByTimestamp = new Map<string, BatteryPoint>();

        data.forEach((item) => {
            const utcStr = item.timestamp.includes('Z') || item.timestamp.includes('+')
                ? item.timestamp
                : `${item.timestamp}Z`;

            const point = mapByTimestamp.get(utcStr) ?? { time: utcStr };
            const batteryValue = Number(item.battery_status);
            const solarValue = Number(item.solar_status);

            if (item.battery_status !== undefined && item.battery_status !== null && !Number.isNaN(batteryValue)) {
                point.battery = batteryValue;
            }

            if (item.solar_status !== undefined && item.solar_status !== null && !Number.isNaN(solarValue)) {
                point.solar = solarValue;
            }

            if (point.battery !== undefined || point.solar !== undefined) {
                mapByTimestamp.set(utcStr, point);
            }
        });

        return Array.from(mapByTimestamp.values())
            .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    }, [data]);

    const yDomain = useMemo<[number, number]>(() => {
        const values = chartData.flatMap((point) => [point.battery, point.solar])
            .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

        if (values.length === 0) return [0, 1];

        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = Math.max((max - min) * 0.12, 0.5);

        if (min === max) {
            return [min - padding, max + padding];
        }

        return [Math.floor((min - padding) * 10) / 10, Math.ceil((max + padding) * 10) / 10];
    }, [chartData]);

    if (chartData.length === 0) {
        return (
            <Box bg="black" borderRadius="lg" p={4} border="1px solid" borderColor="whiteAlpha.300">
                <Text color="gray.300">Sem dados de bateria ou painel solar para este período.</Text>
            </Box>
        );
    }

    return (
        <Box bg="black" borderRadius="lg" p={4} border="1px solid" borderColor="whiteAlpha.300">
            <Text color="white" mb={3} fontWeight="semibold">Status de Energia</Text>
            <Box h="300px">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                        <XAxis
                            dataKey="time"
                            tick={{ fill: '#e2e8f0', fontSize: 11 }}
                            tickFormatter={(val) => {
                                const d = new Date(val);
                                if (isNaN(d.getTime())) return '';
                                return d.toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                            }}
                            minTickGap={35}
                            axisLine={{ stroke: 'rgba(255,255,255,0.35)' }}
                            tickLine={{ stroke: 'rgba(255,255,255,0.35)' }}
                        />

                        <YAxis
                            tick={{ fill: '#e2e8f0', fontSize: 11 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.35)' }}
                            tickLine={{ stroke: 'rgba(255,255,255,0.35)' }}
                            domain={yDomain}
                            width={48}
                        />

                        <Tooltip
                            contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.35)', color: '#fff' }}
                            labelStyle={{ color: '#fff' }}
                            formatter={(value, name) => [`${Number(value).toFixed(2)}`, String(name)]}
                            labelFormatter={(label) => {
                                const d = new Date(label);
                                return isNaN(d.getTime()) ? label : d.toLocaleString('pt-BR');
                            }}
                        />
                        <Legend
                            verticalAlign="top"
                            align="right"
                            iconType="line"
                            wrapperStyle={{ color: '#e2e8f0', fontSize: 12, paddingBottom: 8 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="battery"
                            name="Bateria"
                            stroke="#FFFFFF"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#FFFFFF', stroke: '#FFFFFF' }}
                            activeDot={{ r: 5, fill: '#FFFFFF', stroke: '#111' }}
                            isAnimationActive={false}
                            connectNulls={true}
                        />
                        <Line
                            type="monotone"
                            dataKey="solar"
                            name="Painel solar"
                            stroke="#FACC15"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#FACC15', stroke: '#FACC15' }}
                            activeDot={{ r: 5, fill: '#FACC15', stroke: '#111' }}
                            isAnimationActive={false}
                            connectNulls={true}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>
        </Box>
    );
}
