import { Box, Heading, useColorModeValue } from '@chakra-ui/react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { Measurement } from '../../types';

interface TelemetryChartProps {
    data: Measurement[];
}

export function TelemetryChart({ data }: TelemetryChartProps) {
    const bg = useColorModeValue('white', 'gray.700');

    // Prepara os dados: pega os últimos 20 pontos e formata a hora
    const chartData = data
        .slice(-20)
        .map(d => ({
            time: format(parseISO(d.timestamp), 'HH:mm:ss'),
            moisture_pct: d.moisture_pct,
            sensor: `Sensor ${d.depth_cm}`
        }));

    return (
        <Box p={4} bg={bg} borderRadius="lg" boxShadow="sm" height="300px" mt={4}>
            <Heading size="sm" mb={4}>Leituras Recentes</Heading>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="moisture_pct"
                        stroke="#3182ce"
                        activeDot={{ r: 8 }}
                        name="Valor"
                    />
                </LineChart>
            </ResponsiveContainer>
        </Box>
    );
}