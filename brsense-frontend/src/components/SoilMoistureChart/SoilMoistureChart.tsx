import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Box,
    Flex,
    Text,
    Checkbox,
    HStack,
    VStack,
    Button,
    Icon,
    useDisclosure,
    Tooltip as ChakraTooltip,
    useToast
} from '@chakra-ui/react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    ReferenceArea,
    Brush
} from 'recharts';
import { MdZoomOutMap, MdSettings } from 'react-icons/md';
import { COLORS, DEPTH_COLORS } from '../../colors/colors';
import { MoistureRangeModal } from '../MoistureRangeModal/MoistureRangeModal';
import { updateDeviceConfig } from '../../services/api';

export interface RawApiData {
    timestamp: string;
    depth_cm: number;
    moisture_pct: number | null;
    temperature_c: number | null;
}

interface ChartDataPoint {
    time: string;
    [key: string]: number | string | undefined;
}

interface ChartProps {
    data?: RawApiData[];
    title?: string;
    unit?: string;
    yDomain?: (number | string)[];
    showZones?: boolean;
    metric?: 'moisture' | 'temperature';
    isAdmin?: boolean;
    esn?: string;
    initialMin?: number;
    initialMax?: number;
    onConfigUpdate?: () => void;
}

export function SoilMoistureChart({
    data = [],
    title = "Umidade do Solo",
    yDomain = [0, 100],
    showZones = true,
    metric = 'moisture',
    isAdmin = false,
    esn,
    initialMin = 45,
    initialMax = 55,
    onConfigUpdate
}: ChartProps) {

    const toast = useToast();

    // Função chamada quando o usuário clica em "Aplicar" no Modal
    const handleSaveConfig = async (newRanges: { min: number; max: number }) => {
        setRangeSettings(newRanges);
        if (esn && isAdmin) {
            try {
                await updateDeviceConfig(esn, newRanges.min, newRanges.max);
                toast({
                    title: "Configuração salva!",
                    status: "success",
                    duration: 2000,
                    isClosable: true,
                });
                if (onConfigUpdate) onConfigUpdate();
            } catch (error) {
                console.error(error);
                toast({
                    title: "Erro ao salvar",
                    description: "Não foi possível persistir a configuração.",
                    status: "error",
                });
            }
        }
    };

    const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
        depth10: true, depth20: true, depth30: true, depth40: true, depth50: true, depth60: true,
    });

    const storageKey = `BRSENSE_${metric.toUpperCase()}_RANGES`;
    const defaultRanges = metric === 'moisture'
        ? { min: 45, max: 55 }
        : { min: 20, max: 30 };

    const [rangeSettings, setRangeSettings] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : defaultRanges;
        } catch (error) {
            console.error("Erro ao carregar configurações:", error);
            return defaultRanges;
        }
    });

    const { isOpen, onOpen, onClose } = useDisclosure();

    useEffect(() => {
        setRangeSettings({ min: initialMin, max: initialMax });
    }, [initialMin, initialMax]);

    // --- PROCESSAMENTO DOS DADOS (JANELA FIXA DE 30 DIAS) ---
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const dailyMap = new Map<number, {
            counts: Record<string, number>;
            sums: Record<string, number>
        }>();

        // 1. Agrupar por Dia (Média Diária)
        data.forEach(item => {
            if (!item.timestamp) return;

            const rawValue = metric === 'moisture' ? item.moisture_pct : item.temperature_c;
            if (rawValue === null || rawValue === undefined) return;

            const val = Number(rawValue);
            if (isNaN(val)) return;

            const date = new Date(item.timestamp);
            if (isNaN(date.getTime())) return;

            // Zera horas para agrupar pelo dia (00:00:00)
            date.setHours(0, 0, 0, 0);
            const dayTs = date.getTime();

            if (!dailyMap.has(dayTs)) {
                dailyMap.set(dayTs, { counts: {}, sums: {} });
            }
            const group = dailyMap.get(dayTs)!;
            const depthKey = `depth${item.depth_cm}`;

            if (DEPTH_COLORS[depthKey as keyof typeof DEPTH_COLORS]) {
                group.sums[depthKey] = (group.sums[depthKey] || 0) + val;
                group.counts[depthKey] = (group.counts[depthKey] || 0) + 1;
            }
        });

        // 2. Encontrar a data de INÍCIO (primeiro dado disponível)
        const sortedTs = Array.from(dailyMap.keys()).sort((a, b) => a - b);
        if (sortedTs.length === 0) return [];

        const firstDateTs = sortedTs[0];
        const startDate = new Date(firstDateTs);

        // 3. Gerar array fixo de 30 DIAS a partir do início
        const processed: ChartDataPoint[] = [];

        for (let i = 0; i < 30; i++) {
            // Data atual = StartDate + i dias
            const current = new Date(startDate);
            current.setDate(startDate.getDate() + i);
            const currentTs = current.getTime();

            if (dailyMap.has(currentTs)) {
                // Se existe dado neste dia, calcula e adiciona
                const group = dailyMap.get(currentTs)!;
                const newItem: ChartDataPoint = {
                    time: current.toISOString()
                };
                Object.keys(group.sums).forEach(key => {
                    newItem[key] = group.sums[key] / group.counts[key];
                });
                processed.push(newItem);
            } else {
                // Se NÃO existe dado (dia futuro), adiciona apenas o tempo para manter o eixo X
                // O gráfico vai mostrar o espaço vazio ("falta linha")
                processed.push({
                    time: current.toISOString()
                });
            }
        }

        return processed;
    }, [data, metric]);

    const [range, setRange] = useState({
        startIndex: 0,
        endIndex: 29 // Padrão: 30 dias (0 a 29)
    });

    const [prevDataLength, setPrevDataLength] = useState<number>(data.length);
    const [prevMetric, setPrevMetric] = useState<string>(metric);

    // Reinicia o range se os dados mudarem drasticamente, mas mantendo a janela de 30 dias
    if (data.length !== prevDataLength || metric !== prevMetric) {
        setPrevDataLength(data.length);
        setPrevMetric(metric);
        // Sempre reseta para ver os 30 dias gerados
        if (chartData.length > 0) {
            setRange({ startIndex: 0, endIndex: chartData.length - 1 });
        } else {
            setRange({ startIndex: 0, endIndex: 0 });
        }
    }

    const chartContainerRef = useRef<HTMLDivElement>(null);

    const activeYDomain = useMemo(() => {
        if (!chartData || chartData.length === 0) return yDomain;
        const visibleData = chartData.slice(range.startIndex, range.endIndex + 1);
        if (visibleData.length === 0) return yDomain;

        let min = Infinity;
        let max = -Infinity;
        let hasActiveData = false;

        visibleData.forEach(item => {
            Object.keys(visibleLines).forEach(key => {
                if (visibleLines[key] && typeof item[key] === 'number') {
                    const val = item[key] as number;
                    if (val < min) min = val;
                    if (val > max) max = val;
                    hasActiveData = true;
                }
            });
        });

        if (!hasActiveData) return yDomain;
        const padding = (max - min) * 0.1 || 5;
        const autoMin = Math.max(0, Math.floor(min - padding));
        const autoMax = Math.ceil(max + padding);

        const defaultMin = typeof yDomain[0] === 'number' ? yDomain[0] : 0;
        const defaultMax = typeof yDomain[1] === 'number' ? yDomain[1] : 100;

        if ((autoMax - autoMin) < (defaultMax - defaultMin)) {
            return [autoMin, autoMax];
        }
        return yDomain;
    }, [chartData, range, visibleLines, yDomain]);

    const renderZone = (y1: number, y2: number, fill: string) => {
        const [currentMin, currentMax] = activeYDomain as [number, number];
        const effectiveY1 = Math.max(y1, currentMin);
        const effectiveY2 = Math.min(y2, currentMax);
        if (effectiveY1 < effectiveY2) {
            return <ReferenceArea key={`${y1}-${y2}`} y1={effectiveY1} y2={effectiveY2} fill={fill} strokeOpacity={0} />;
        }
        return null;
    };

    useEffect(() => {
        const container = chartContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (!chartData || chartData.length < 2) return;
            e.preventDefault();
            e.stopPropagation();
            const zoomFactor = 0.1;

            setRange(prev => {
                const size = prev.endIndex - prev.startIndex;
                const amount = Math.max(1, Math.floor(size * zoomFactor));
                if (e.deltaY < 0) {
                    return {
                        startIndex: Math.min(prev.startIndex + amount, prev.endIndex - 1),
                        endIndex: Math.max(prev.endIndex - amount, prev.startIndex + 1)
                    };
                } else {
                    return {
                        startIndex: Math.max(0, prev.startIndex - amount),
                        endIndex: Math.min(chartData.length - 1, prev.endIndex + amount)
                    };
                }
            });
        };
        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [chartData]);

    const toggleLine = (key: string) => setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));

    const formatDateHeader = (isoStr?: string) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return d.toLocaleDateString('pt-BR');
    };

    const startDate = chartData[range.startIndex]?.time;
    const endDate = chartData[range.endIndex]?.time;

    return (
        <Box
            bg={COLORS.surface}
            borderColor="rgba(59, 71, 84, 0.5)"
            borderWidth="1px"
            borderRadius="xl"
            p={4}
            color="white"
            userSelect="none"
        >
            <MoistureRangeModal
                isOpen={isOpen}
                onClose={onClose}
                initialRanges={rangeSettings}
                onSave={handleSaveConfig}
            />

            <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
                <VStack align="start" spacing={1}>
                    <Text fontSize="lg" fontWeight="medium">{title}</Text>
                    <Text color="gray.400" fontSize="sm">
                        {chartData.length > 0
                            ? `${formatDateHeader(startDate)} - ${formatDateHeader(endDate)}`
                            : 'Aguardando dados...'}
                    </Text>
                </VStack>

                <HStack spacing={2}>
                    {isAdmin && (
                        <ChakraTooltip label={`Configurar Zonas (${metric === 'moisture' ? 'Umidade' : 'Temperatura'})`} hasArrow>
                            <Button
                                size="xs"
                                onClick={onOpen}
                                colorScheme="blue"
                                variant="outline"
                            >
                                <Icon as={MdSettings} boxSize={4} />
                            </Button>
                        </ChakraTooltip>
                    )}

                    <Button
                        size="xs"
                        leftIcon={<Icon as={MdZoomOutMap} />}
                        onClick={() => chartData.length > 0 && setRange({ startIndex: 0, endIndex: chartData.length - 1 })}
                        colorScheme="blue"
                        variant="outline"
                        isDisabled={!chartData.length}
                    >
                        Ver Tudo
                    </Button>
                </HStack>
            </Flex>

            <Box h="300px" w="100%" ref={chartContainerRef} cursor="crosshair">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3b4754" opacity={0.3} vertical={false} />
                        <XAxis
                            dataKey="time"
                            tickFormatter={(val) => {
                                try {
                                    const d = new Date(val);
                                    const day = String(d.getDate()).padStart(2, '0');
                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                    return `${day}/${month}`;
                                } catch { return ''; }
                            }}
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
                            allowDataOverflow
                        />

                        {showZones && metric === 'moisture' && (
                            <>
                                {renderZone(rangeSettings.max, 100, "rgba(138, 196, 235, 0.7)")}
                                {renderZone(rangeSettings.min, rangeSettings.max, "rgba(149, 245, 152, 0.7)")}
                                {renderZone(0, rangeSettings.min, "rgba(241, 138, 138, 0.7)")}
                            </>
                        )}

                        {Object.entries(DEPTH_COLORS).map(([key, color]) => (
                            visibleLines[key] && (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={color}
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
                                    isAnimationActive={false}
                                    connectNulls={false}
                                />
                            )
                        ))}

                        <Brush
                            dataKey="time"
                            height={30}
                            stroke="#3182ce"
                            startIndex={range.startIndex}
                            endIndex={range.endIndex}
                            tickFormatter={(value) => {
                                try {
                                    const d = new Date(value);
                                    if (isNaN(d.getTime())) return '';
                                    const day = String(d.getDate()).padStart(2, '0');
                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                    return `${day}/${month}`;
                                } catch {
                                    return '';
                                }
                            }}
                            onChange={(r) => {
                                const range = r as { startIndex?: number, endIndex?: number };
                                if (typeof range?.startIndex === 'number' && typeof range?.endIndex === 'number') {
                                    setRange({ startIndex: range.startIndex, endIndex: range.endIndex });
                                }
                            }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>

            <Flex gap={4} wrap="wrap" pt={4}>
                {Object.entries(DEPTH_COLORS)
                    .filter(([key]) => {
                        const depth = parseInt(key.replace('depth', ''));
                        return depth >= 10 && depth <= 60;
                    })
                    .sort(([a], [b]) => parseInt(a.replace('depth', '')) - parseInt(b.replace('depth', '')))
                    .map(([key, color]) => (
                        <Checkbox
                            key={key}
                            isChecked={visibleLines[key]}
                            onChange={() => toggleLine(key)}
                            colorScheme="blue"
                            iconColor="white"
                            sx={{ '.chakra-checkbox__label': { fontSize: 'sm', color: visibleLines[key] ? 'gray.300' : 'gray.600' } }}
                        >
                            <HStack spacing={2}>
                                <Box w="10px" h="10px" borderRadius="full" bg={color} opacity={visibleLines[key] ? 1 : 0.4} />
                                <Text>{key.replace('depth', '')} cm</Text>
                            </HStack>
                        </Checkbox>
                    ))}
            </Flex>
        </Box>
    );
}