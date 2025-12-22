// brsense-frontend/src/components/SoilMoistureChart/SoilMoistureChart.tsx
import { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Flex,
    Text,
    Checkbox,
    HStack,
    VStack,
    Button,
    Icon
} from '@chakra-ui/react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceArea,
} from 'recharts';
import { MdZoomOutMap } from 'react-icons/md';

import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { COLORS, DEPTH_COLORS } from '../../colors/colors';

// Interface para os dados do gráfico
export interface SoilData {
    time: string;
    [key: string]: number | string | undefined;
}

// Dados Mockados
const generateMockData = () => {
    const data: SoilData[] = [];
    const now = new Date();
    for (let i = 100; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        data.push({
            time: d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            depth10: 40 + Math.random() * 20,
            depth20: 35 + Math.random() * 15,
            depth30: 30 + Math.random() * 10,
            depth40: 25 + Math.random() * 10,
            depth50: 15 + Math.random() * 10,
            depth60: 20 + Math.random() * 5,
        });
    }
    return data;
};

const MOCK_DATA = generateMockData();

// Interface do Tooltip
interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: NameType;
        value: ValueType;
        color: string;
        dataKey: string | number;
    }>;
    label?: string | number;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <Box
                bg={COLORS.surface}
                borderColor="rgba(59, 71, 84, 0.5)"
                borderWidth="1px"
                p={3}
                borderRadius="md"
                boxShadow="xl"
                zIndex={10}
            >
                <Text color="gray.300" fontSize="sm" mb={2}>{label}</Text>
                {payload.map((entry) => (
                    <HStack key={entry.dataKey} spacing={2} fontSize="xs">
                        <Box w="8px" h="8px" borderRadius="full" bg={entry.color} />
                        <Text color={COLORS.textSecondary} textTransform="capitalize">
                            {String(entry.name).replace('depth', '')}cm:
                        </Text>
                        <Text color={COLORS.textSecondary} fontWeight="bold">
                            {Number(entry.value).toFixed(1)}%
                        </Text>
                    </HStack>
                ))}
            </Box>
        );
    }
    return null;
};

// --- Helpers ---

const parseDate = (dateStr: string) => {
    try {
        let date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
        const parts = dateStr.split(' ');
        if (parts.length === 2) {
            const [d, m, y] = parts[0].split('/').map(Number);
            const [h, min] = parts[1].split(':').map(Number);
            date = new Date(y, m - 1, d, h, min);
            if (!isNaN(date.getTime())) return date;
        }
        return null;
    } catch {
        return null;
    }
};

// Lógica de cálculo extraída para ser usada na inicialização do estado
const calculateInitialRange = (data: SoilData[]) => {
    if (!data || data.length === 0) {
        return { startIndex: 0, endIndex: 0 };
    }

    const lastItem = data[data.length - 1];
    const lastDate = parseDate(lastItem.time);

    if (lastDate) {
        const threeDaysAgo = new Date(lastDate);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const startIndex = data.findIndex(d => {
            const date = parseDate(d.time);
            return date && date >= threeDaysAgo;
        });

        if (startIndex !== -1) {
            return { startIndex, endIndex: data.length - 1 };
        }
    }

    return { startIndex: 0, endIndex: data.length - 1 };
};

interface ChartProps {
    data?: SoilData[];
}

export function SoilMoistureChart({ data = MOCK_DATA }: ChartProps) {
    const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
        depth10: true, depth20: true, depth30: true, depth40: true, depth50: true, depth60: true,
    });

    // CORREÇÃO 1: Inicialização Preguiçosa (Lazy Initialization)
    // Calcula o range inicial apenas uma vez na montagem, evitando render duplo
    const [range, setRange] = useState(() => calculateInitialRange(data));

    const [refAreaLeft, setRefAreaLeft] = useState('');
    const [refAreaRight, setRefAreaRight] = useState('');

    // Atualiza o range se a prop `data` mudar (ex: troca de sonda)
    useEffect(() => {
        setRange(calculateInitialRange(data));
    }, [data]);

    const displayedData = useMemo(() => {
        if (!data || data.length === 0) return [];
        return data.slice(range.startIndex, range.endIndex + 1);
    }, [data, range]);

    const toggleLine = (key: string) => {
        setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const zoom = () => {
        if (refAreaLeft === refAreaRight || refAreaRight === '') {
            setRefAreaLeft('');
            setRefAreaRight('');
            return;
        }

        let leftIndex = data.findIndex(d => d.time === refAreaLeft);
        let rightIndex = data.findIndex(d => d.time === refAreaRight);

        if (leftIndex < 0) leftIndex = 0;
        if (rightIndex < 0) rightIndex = data.length - 1;

        if (leftIndex > rightIndex) [leftIndex, rightIndex] = [rightIndex, leftIndex];

        setRefAreaLeft('');
        setRefAreaRight('');
        setRange({ startIndex: leftIndex, endIndex: rightIndex });
    };

    const zoomOut = () => {
        setRange({ startIndex: 0, endIndex: data.length - 1 });
    };

    return (
        <Box
            bg={COLORS.surface}
            borderColor="rgba(59, 71, 84, 0.5)"
            borderWidth="1px"
            borderRadius="xl"
            p={4}
            m={4}
            color="white"
            userSelect="none"
        >
            <Flex justify="space-between" align="start" mb={4}>
                <VStack align="start" spacing={1}>
                    <Text fontSize="lg" fontWeight="medium">Perfil de Umidade do Solo</Text>
                    <Text color="gray.400" fontSize="sm">
                        {displayedData.length > 0
                            ? `${displayedData[0].time.split(' ')[0]} - ${displayedData[displayedData.length - 1].time.split(' ')[0]}`
                            : 'Sem dados'}
                    </Text>
                </VStack>

                <Button
                    size="xs"
                    leftIcon={<Icon as={MdZoomOutMap} />}
                    onClick={zoomOut}
                    colorScheme="blue"
                    variant="outline"
                    isDisabled={data && range.startIndex === 0 && range.endIndex === data.length - 1}
                >
                    Ver Tudo
                </Button>
            </Flex>

            <Box h="250px" position="relative" w="100%">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={displayedData}
                        margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                        // CORREÇÃO 2: Conversão explícita para String nos eventos do mouse
                        onMouseDown={(e) => e && e.activeLabel && setRefAreaLeft(String(e.activeLabel))}
                        onMouseMove={(e) => refAreaLeft && e && e.activeLabel && setRefAreaRight(String(e.activeLabel))}
                        onMouseUp={zoom}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#3b4754" opacity={0.3} vertical={false} />
                        <XAxis
                            dataKey="time"
                            hide={false}
                            tick={{ fill: '#6b7280', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={30}
                        />
                        <YAxis
                            domain={[0, 100]}
                            tick={{ fill: '#6b7280', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        <ReferenceArea y1={80} y2={100} fill="rgba(52,152,219,0.2)" strokeOpacity={0} />
                        <ReferenceArea y1={50} y2={80} fill="rgba(76,175,80,0.2)" strokeOpacity={0} />
                        <ReferenceArea y1={25} y2={50} fill="rgba(255,204,0,0.15)" strokeOpacity={0} />
                        <ReferenceArea y1={0} y2={25} fill="rgba(255,87,87,0.15)" strokeOpacity={0} />

                        {refAreaLeft && refAreaRight ? (
                            <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#137fec" fillOpacity={0.3} />
                        ) : null}

                        {Object.entries(DEPTH_COLORS).map(([key, color]) => (
                            visibleLines[key] && (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    name={key}
                                    stroke={color}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 6 }}
                                    isAnimationActive={false}
                                />
                            )
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </Box>

            <Flex direction="column" gap={4} pt={4}>
                <Flex gap={4} wrap="wrap">
                    {Object.entries(DEPTH_COLORS).map(([key, color]) => {
                        if (key === 'depth60') return null;
                        const label = `${key.replace('depth', '')}-${parseInt(key.replace('depth', '')) + 10} cm`;

                        return (
                            <Checkbox
                                key={key}
                                isChecked={visibleLines[key]}
                                onChange={() => toggleLine(key)}
                                colorScheme="blue"
                                iconColor="white"
                                sx={{
                                    '.chakra-checkbox__control': {
                                        borderColor: 'gray.600',
                                        bg: 'gray.700',
                                        _checked: {
                                            bg: 'transparent',
                                            borderColor: 'gray.600',
                                            color: '#137fec'
                                        }
                                    },
                                    '.chakra-checkbox__label': {
                                        fontSize: 'sm',
                                        color: visibleLines[key] ? 'gray.300' : 'gray.600'
                                    }
                                }}
                            >
                                <HStack spacing={2}>
                                    <Box w="12px" h="12px" borderRadius="full" bg={color} opacity={visibleLines[key] ? 1 : 0.4} />
                                    <Text>{label}</Text>
                                </HStack>
                            </Checkbox>
                        );
                    })}
                </Flex>

                <HStack spacing={2} w="100%">
                    <Text fontSize="xs" color="gray.500" fontStyle="italic">
                        * Clique e arraste no gráfico para dar zoom.
                    </Text>
                </HStack>
            </Flex>
        </Box>
    );
}