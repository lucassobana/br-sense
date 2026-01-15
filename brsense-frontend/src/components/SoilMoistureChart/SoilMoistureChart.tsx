import { useState, useEffect, useRef, useMemo } from 'react';
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

    const chartContainerRef = useRef<HTMLDivElement>(null);

    // 1. Sincronização de dados
    if (data !== prevData) {
        setPrevData(data);
        if (data && data.length > 0) {
            setRange({ startIndex: 0, endIndex: data.length - 1 });
        } else {
            setRange({ startIndex: 0, endIndex: 0 });
        }
    }

    // 2. Lógica de Escala Dinâmica (Zoom Vertical)
    const activeYDomain = useMemo(() => {
        if (!data || data.length === 0) return yDomain;
        
        const visibleData = data.slice(range.startIndex, range.endIndex + 1);
        if (visibleData.length === 0) return yDomain;

        let min = Infinity;
        let max = -Infinity;
        let hasActiveData = false;

        visibleData.forEach(item => {
            Object.keys(visibleLines).forEach(key => {
                if (visibleLines[key] && item[key] !== undefined && item[key] !== null) {
                    const val = Number(item[key]);
                    if (!isNaN(val)) {
                        if (val < min) min = val;
                        if (val > max) max = val;
                        hasActiveData = true;
                    }
                }
            });
        });

        if (!hasActiveData) return yDomain;

        // Adiciona margem de segurança (padding)
        const diff = max - min;
        const padding = diff === 0 ? 5 : diff * 0.3; 

        const autoMin = Math.floor(min - padding);
        const autoMax = Math.ceil(max + padding);
        
        const defaultMin = typeof yDomain[0] === 'number' ? yDomain[0] : 0;
        const defaultMax = typeof yDomain[1] === 'number' ? yDomain[1] : 100;
        const defaultRange = defaultMax - defaultMin;
        const autoRange = autoMax - autoMin;

        // Se o range calculado for "menor" (mais zoom) que o padrão, usamos ele.
        if (autoRange < defaultRange) {
             const finalMin = (defaultMin === 0 && autoMin < 0) ? 0 : autoMin;
             return [finalMin, autoMax];
        }

        return yDomain;
    }, [data, range, visibleLines, yDomain]);

    // 3. Função auxiliar para desenhar as Zonas Corretamente no Zoom
    // Ela garante que a ReferenceArea nunca ultrapasse o domínio visível,
    // evitando bugs visuais ou que o gráfico tente expandir para mostrar a zona inteira.
    const renderZone = (y1: number, y2: number, fill: string) => {
        const [currentMin, currentMax] = activeYDomain as [number, number];

        // Clampa (limita) os valores da zona aos limites visíveis do gráfico
        const effectiveY1 = Math.max(y1, currentMin);
        const effectiveY2 = Math.min(y2, currentMax);

        // Só desenha se a zona estiver visível (tiver altura positiva)
        if (effectiveY1 < effectiveY2) {
            return <ReferenceArea key={`${y1}-${y2}`} y1={effectiveY1} y2={effectiveY2} fill={fill} strokeOpacity={0} />;
        }
        return null;
    };

    // 4. Efeito de Scroll/Zoom
    useEffect(() => {
        const container = chartContainerRef.current;
        if (!container) return;

        const handleWheelNative = (e: WheelEvent) => {
            if (!data || data.length < 2) return;

            e.preventDefault();
            e.stopPropagation();

            const zoomFactor = 0.1;

            setRange(prevRange => {
                const rangeSize = prevRange.endIndex - prevRange.startIndex;
                const zoomAmount = Math.max(1, Math.floor(rangeSize * zoomFactor));

                if (e.deltaY < 0) { // Zoom In
                    const newStart = Math.min(prevRange.startIndex + zoomAmount, prevRange.endIndex - 1);
                    const newEnd = Math.max(prevRange.endIndex - zoomAmount, prevRange.startIndex + 1);
                    return { startIndex: newStart, endIndex: newEnd };
                } else { // Zoom Out
                    const newStart = Math.max(0, prevRange.startIndex - zoomAmount);
                    const newEnd = Math.min(data.length - 1, prevRange.endIndex + zoomAmount);
                    return { startIndex: newStart, endIndex: newEnd };
                }
            });
        };

        container.addEventListener('wheel', handleWheelNative, { passive: false });
        return () => container.removeEventListener('wheel', handleWheelNative);
    }, [data]);

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
                            domain={activeYDomain as [number, number]}
                            tick={{ fill: '#6b7280', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            allowDataOverflow={true} // Importante para o zoom funcionar
                        />

                        <Tooltip
                            content={<CustomTooltip />}
                            trigger="hover"
                            wrapperStyle={{ outline: 'none' }}
                        />

                        {/* Renderização condicional e 'clampada' das zonas */}
                        {showZones && (
                            <>
                                {renderZone(80, 100, "rgba(52,152,219,0.1)")} {/* Azul (Saturado) */}
                                {renderZone(50, 80, "rgba(76,175,80,0.1)")}  {/* Verde (Ideal) */}
                                {renderZone(25, 50, "rgba(255,204,0,0.1)")}  {/* Amarelo (Atenção) */}
                                {renderZone(0, 25, "rgba(255,87,87,0.1)")}   {/* Vermelho (Crítico) */}
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