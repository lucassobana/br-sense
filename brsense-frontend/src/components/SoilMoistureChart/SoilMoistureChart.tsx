import { useState, useEffect, useRef } from 'react';
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

// Interface
export interface SoilData {
    time: string;
    [key: string]: number | string | undefined;
}

// Tooltip personalizado
interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: NameType;
        value: ValueType;
        color: string;
        dataKey: string | number;
    }>;
    label?: string;
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
                <Text color="gray.300" fontSize="xs" mb={2} fontWeight="bold">
                    {label}
                </Text>
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

interface ChartProps {
    data?: SoilData[];
    title?: string;
    unit?: string;
    yDomain?: (number | string)[];
    showZones?: boolean;
}

export function SoilMoistureChart({
    data = [],
    title = "Umidade do Solo",
    yDomain = [0, 100],
    showZones = true
}: ChartProps) {
    const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
        depth10: true, depth20: true, depth30: true, depth40: true, depth50: true, depth60: true,
    });

    const [range, setRange] = useState({ startIndex: 0, endIndex: 0 });
    const [prevData, setPrevData] = useState<SoilData[]>(data);

    // Referência para o container onde o zoom vai funcionar
    const chartContainerRef = useRef<HTMLDivElement>(null);

    // 1. Atualiza range quando dados mudam
    if (data !== prevData) {
        setPrevData(data);
        if (data && data.length > 0) {
            setRange({ startIndex: 0, endIndex: data.length - 1 });
        } else {
            setRange({ startIndex: 0, endIndex: 0 });
        }
    }

    // 2. EFEITO PARA CAPTURAR O SCROLL (Corrigido com passive: false)
    useEffect(() => {
        const container = chartContainerRef.current;
        if (!container) return;

        const handleWheelNative = (e: WheelEvent) => {
            // Se não tiver dados, deixa a página rolar
            if (!data || data.length < 2) return;

            // BLOQUEIA O SCROLL DA PÁGINA
            e.preventDefault();
            e.stopPropagation();

            const zoomFactor = 0.1;

            // Usamos setState com callback para ter o valor mais atual de 'range'
            setRange(prevRange => {
                const rangeSize = prevRange.endIndex - prevRange.startIndex;
                const zoomAmount = Math.max(1, Math.floor(rangeSize * zoomFactor));

                if (e.deltaY < 0) {
                    // Zoom IN
                    const newStart = Math.min(prevRange.startIndex + zoomAmount, prevRange.endIndex - 1);
                    const newEnd = Math.max(prevRange.endIndex - zoomAmount, prevRange.startIndex + 1);
                    return { startIndex: newStart, endIndex: newEnd };
                } else {
                    // Zoom OUT
                    const newStart = Math.max(0, prevRange.startIndex - zoomAmount);
                    const newEnd = Math.min(data.length - 1, prevRange.endIndex + zoomAmount);
                    return { startIndex: newStart, endIndex: newEnd };
                }
            });
        };

        // Adiciona o listener MANUALMENTE para garantir { passive: false }
        container.addEventListener('wheel', handleWheelNative, { passive: false });

        // Limpeza ao desmontar
        return () => {
            container.removeEventListener('wheel', handleWheelNative);
        };
    }, [data]); // Recria o listener apenas se 'data' mudar drasticamente (referência)

    const toggleLine = (key: string) => {
        setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const zoomOut = () => {
        if (data && data.length > 0) {
            setRange({ startIndex: 0, endIndex: data.length - 1 });
        }
    };

    const startDate = data && data[range.startIndex] ? String(data[range.startIndex].time).split(' ')[0] : '';
    const endDate = data && data[range.endIndex] ? String(data[range.endIndex].time).split(' ')[0] : '';

    return (
        <Box
            bg={COLORS.surface}
            borderColor="rgba(59, 71, 84, 0.5)"
            borderWidth="1px"
            borderRadius="xl"
            p={4}
            m={0}
            color="white"
            userSelect="none"
        >
            <Flex justify="space-between" align="start" mb={4}>
                <VStack align="start" spacing={1}>
                    <Text fontSize="lg" fontWeight="medium">{title}</Text>
                    <Text color="gray.400" fontSize="sm">
                        {data.length > 0 ? `${startDate} - ${endDate}` : 'Aguardando dados...'}
                    </Text>
                </VStack>

                <Button
                    size="xs"
                    leftIcon={<Icon as={MdZoomOutMap} />}
                    onClick={zoomOut}
                    colorScheme="blue"
                    variant="outline"
                    isDisabled={!data || data.length === 0}
                >
                    Ver Tudo
                </Button>
            </Flex>

            {/* Container com a REFERÊNCIA (ref={chartContainerRef}) */}
            <Box
                h="300px"
                position="relative"
                w="100%"
                ref={chartContainerRef}
                cursor="crosshair"
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
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
                            domain={yDomain as [number, number]}
                            tick={{ fill: '#6b7280', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                        />

                        <Tooltip
                            content={<CustomTooltip />}
                            trigger="hover"
                            wrapperStyle={{ outline: 'none' }}
                        />

                        {showZones && (
                            <>
                                <ReferenceArea y1={80} y2={100} fill="rgba(52,152,219,0.1)" strokeOpacity={0} />
                                <ReferenceArea y1={50} y2={80} fill="rgba(76,175,80,0.1)" strokeOpacity={0} />
                                <ReferenceArea y1={25} y2={50} fill="rgba(255,204,0,0.1)" strokeOpacity={0} />
                                <ReferenceArea y1={0} y2={25} fill="rgba(255,87,87,0.1)" strokeOpacity={0} />
                            </>
                        )}

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
                            return (
                                <Checkbox
                                    key={key}
                                    isChecked={visibleLines[key]}
                                    onChange={() => toggleLine(key)}
                                    colorScheme="blue"
                                    iconColor="white"
                                    sx={{
                                        '.chakra-checkbox__label': {
                                            fontSize: 'sm',
                                            color: visibleLines[key] ? 'gray.300' : 'gray.600'
                                        }
                                    }}
                                >
                                    <HStack spacing={2}>
                                        <Box w="10px" h="10px" borderRadius="full" bg={color} opacity={visibleLines[key] ? 1 : 0.4} />
                                        <Text>{depth} cm</Text>
                                    </HStack>
                                </Checkbox>
                            );
                        })}
                </Flex>
            </Flex>
        </Box>
    );
}