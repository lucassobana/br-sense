import { Box, Heading, useColorModeValue, Flex, Text } from '@chakra-ui/react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, parseISO, subHours } from 'date-fns';
import type { Measurement } from '../../types';

// 1. Atualize a interface para aceitar as props que o Dashboard envia
interface TelemetryChartProps {
    data: Measurement[];
    title?: string;
    unit?: string;
    yDomain?: (number | string)[];
}

export function TelemetryChart({
    data = [],
    title = "Leituras Recentes",
    unit = "",
    yDomain = ['auto', 'auto']
}: TelemetryChartProps) {

    const bg = useColorModeValue('white', 'gray.700');

    // 2. Prepara os dados (com segurança contra arrays vazios)
    // Se não tiver timestamp válido, evita erro no parseISO
    const chartData = (data || [])
        .slice(-20) // Pega apenas os últimos 20 pontos
        .map(d => {
            let timeLabel = '-';
            try {
                if (d.timestamp) {
                    const adjustedDate = subHours(parseISO(d.timestamp), 3);
                    timeLabel = format(adjustedDate, 'HH:mm:ss');
                    // timeLabel = format(parseISO(d.timestamp), 'HH:mm:ss');
                }
            } catch {
                console.error("Erro data:", d.timestamp);
            }

            return {
                time: timeLabel,
                value: d.moisture_pct, // Renomeado para 'value' para ficar genérico
                originalValue: d.moisture_pct,
                sensor: `Sensor ${d.depth_cm}`
            };
        });

    return (
        <Box p={4} bg={bg} borderRadius="lg" boxShadow="sm" height="300px" mt={4}>

            {/* 3. Cabeçalho Dinâmico igual ao outro gráfico */}
            <Flex justify="space-between" align="center" mb={4}>
                <Heading size="sm">
                    {title} <Text as="span" fontSize="xs" color="gray.500">({unit})</Text>
                </Heading>
            </Flex>

            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={yDomain as [number, number]} />
                    <Tooltip
                        formatter={(value: number) => [`${value} ${unit}`, title]}
                        labelStyle={{ color: 'black' }}
                    />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3182ce"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                        name={title}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>

            {/* Aviso se não houver dados */}
            {chartData.length === 0 && (
                <Flex justify="center" mt="-100px" pointerEvents="none">
                    <Text color="gray.500">Aguardando dados...</Text>
                </Flex>
            )}
        </Box>
    );
}