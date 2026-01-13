// brsense-frontend/src/components/SoilMoistureChart/SoilMoistureChart.tsx
import { useState, useEffect } from 'react';
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
    Brush
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

// Tooltip personalizado
interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: NameType;
        value: ValueType;
        color: string;
        dataKey: string | number;
    }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
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
                {payload.map((entry) => (
                    <HStack key={entry.dataKey} spacing={2} fontSize="xs">
                        <Box w="8px" h="8px" borderRadius="full" bg={entry.color} />
                        <Text color={COLORS.textSecondary}>
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

const calculateInitialRange = (data: SoilData[]) => {
    if (!data || data.length === 0) return { startIndex: 0, endIndex: 0 };

    const lastItem = data[data.length - 1];
    const lastDate = parseDate(lastItem.time);

    if (lastDate) {
        const threeDaysAgo = new Date(lastDate);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const startIndex = data.findIndex(d => {
            const date = parseDate(d.time);
            return date && date >= threeDaysAgo;
        });

        if (startIndex !== -1) return { startIndex, endIndex: data.length - 1 };
    }

    return { startIndex: 0, endIndex: data.length - 1 };
};

interface ChartProps {
    data?: SoilData[];
    title?: string;              // '?' torna opcional, remova se for obrigatório
    unit?: string;
    yDomain?: (number | string)[]; // Para aceitar [0, 100] ou ["auto", "auto"]
    showZones?: boolean;
}

export function SoilMoistureChart({ data = MOCK_DATA }: ChartProps) {
    const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
        depth10: true, depth20: true, depth30: true, depth40: true, depth50: true, depth60: true,
    });

    const [range, setRange] = useState(() => calculateInitialRange(data));
    const [clickedIndex, setClickedIndex] = useState<number | null>(null);

    useEffect(() => {
        setRange(calculateInitialRange(data));
    }, [data]);

    const toggleLine = (key: string) => {
        setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const zoomOut = () => {
        setRange({ startIndex: 0, endIndex: data.length - 1 });
    };

    const handleWheelZoom = (e: React.WheelEvent) => {
        e.preventDefault();
        if (!data || data.length < 2) return;

        const zoomFactor = 0.1;
        const rangeSize = range.endIndex - range.startIndex;
        const zoomAmount = Math.max(1, Math.floor(rangeSize * zoomFactor));

        if (e.deltaY < 0) {
            // Zoom in
            setRange(prev => ({
                startIndex: Math.min(prev.startIndex + zoomAmount, prev.endIndex - 1),
                endIndex: Math.max(prev.endIndex - zoomAmount, prev.startIndex + 1),
            }));
        } else {
            // Zoom out
            setRange(prev => ({
                startIndex: Math.max(0, prev.startIndex - zoomAmount),
                endIndex: Math.min(data.length - 1, prev.endIndex + zoomAmount),
            }));
        }
    };

    const startDate = data && data[range.startIndex] ? data[range.startIndex].time.split(' ')[0] : '';
    const endDate = data && data[range.endIndex] ? data[range.endIndex].time.split(' ')[0] : '';

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
                        {data.length > 0 ? `${startDate} - ${endDate}` : 'Sem dados'}
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

            <Box h="250px" position="relative" w="100%" onWheel={handleWheelZoom}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                        onClick={(e) => {
                            if (e && typeof e.activeTooltipIndex === 'number') {
                                setClickedIndex(e.activeTooltipIndex);
                            }
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#3b4754" opacity={0.3} vertical={false} />
                        <XAxis
                            dataKey="time"
                            tickFormatter={(value: string) => value.split(' ')[0]}
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

                        <Tooltip
                            content={<CustomTooltip />}
                            active={clickedIndex !== null}
                            position={{ y: 0 }}
                            wrapperStyle={{ pointerEvents: 'none' }}
                        />

                        <ReferenceArea y1={80} y2={100} fill="rgba(52,152,219,0.2)" strokeOpacity={0} />
                        <ReferenceArea y1={50} y2={80} fill="rgba(76,175,80,0.2)" strokeOpacity={0} />
                        <ReferenceArea y1={25} y2={50} fill="rgba(255,204,0,0.15)" strokeOpacity={0} />
                        <ReferenceArea y1={0} y2={25} fill="rgba(255,87,87,0.15)" strokeOpacity={0} />

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

                        <Brush
                            dataKey="time"
                            height={30}
                            stroke="#3182ce"
                            startIndex={range.startIndex}
                            endIndex={range.endIndex}
                            onChange={(newRange) => {
                                // Sincroniza o Brush com o nosso estado para manter o Scroll Zoom funcionando
                                if (newRange.startIndex !== undefined && newRange.endIndex !== undefined) {
                                    setRange({ startIndex: newRange.startIndex, endIndex: newRange.endIndex });
                                }
                            }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>

            <Flex direction="column" gap={4} pt={4}>
                <Flex gap={4} wrap="wrap">
                    {Object.entries(DEPTH_COLORS)
                        .filter(([key]) => {
                            const depth = parseInt(key.replace('depth', ''));
                            return depth >= 10 && depth <= 60;
                        })
                        .sort(([a], [b]) => parseInt(a.replace('depth', '')) - parseInt(b.replace('depth', '')))
                        .map(([key, color]) => {
                            const depth = key.replace('depth', '');
                            const label = `${depth} cm`;

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
            </Flex>
        </Box>
    );
}
