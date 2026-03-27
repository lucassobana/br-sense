import { useMemo } from 'react';
import { Box, Text } from '@chakra-ui/react';
import {
    CartesianGrid,
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
    battery: number;
}

export function BatteryStatusChart({ data }: BatteryStatusChartProps) {
    const chartData = useMemo<BatteryPoint[]>(() => {
        const mapByTimestamp = new Map<string, number>();

        data.forEach((item) => {
            if (item.battery_status === undefined || item.battery_status === null) return;
            const value = Number(item.battery_status);
            if (Number.isNaN(value)) return;

            // Ignora pontos fora do range 5 a 10
            if (value < 5 || value > 10) return;

            const utcStr = item.timestamp.includes('Z') || item.timestamp.includes('+')
                ? item.timestamp
                : `${item.timestamp}Z`;

            mapByTimestamp.set(utcStr, value);
        });

        return Array.from(mapByTimestamp.entries())
            .map(([time, battery]) => ({ time, battery }))
            .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    }, [data]);

    if (chartData.length === 0) {
        return (
            <Box bg="black" borderRadius="lg" p={4} border="1px solid" borderColor="whiteAlpha.300">
                <Text color="gray.300">Sem dados de bateria para este período.</Text>
            </Box>
        );
    }

    return (
        <Box bg="black" borderRadius="lg" p={4} border="1px solid" borderColor="whiteAlpha.300">
            <Text color="white" mb={3} fontWeight="semibold">Status da Bateria</Text>
            <Box h="300px">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
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
                        
                        {/* EIXO Y COM LIMITES FIXOS */}
                        <YAxis
                            tick={{ fill: '#e2e8f0', fontSize: 11 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.35)' }}
                            tickLine={{ stroke: 'rgba(255,255,255,0.35)' }}
                            domain={[5, 10]}
                            allowDataOverflow={true}
                            label={{ value: 'Bateria', angle: -90, position: 'insideLeft', fill: '#e2e8f0' }}
                        />
                        
                        <Tooltip
                            contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.35)', color: '#fff' }}
                            labelStyle={{ color: '#fff' }}
                            formatter={(value) => [`${Number(value).toFixed(2)}`, 'Bateria']}
                            labelFormatter={(label) => {
                                const d = new Date(label);
                                return isNaN(d.getTime()) ? label : d.toLocaleString('pt-BR');
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="battery"
                            stroke="#FFFFFF"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#FFFFFF', stroke: '#FFFFFF' }} 
                            activeDot={{ r: 5, fill: '#FFFFFF', stroke: '#111' }}
                            isAnimationActive={false}
                            connectNulls={true}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>
        </Box>
    );
}