import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
    useToast,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Input, Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverArrow,
    PopoverBody, FormControl,
    FormLabel
} from '@chakra-ui/react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    ReferenceArea,
    Tooltip,
    LabelList
} from 'recharts';
import {
    MdZoomOutMap,
    MdSettings,
    MdCalendarToday,
    MdFilterList,
    MdArrowDropDown,
    MdDateRange,
    MdClose,
    MdLayers
} from 'react-icons/md';
import { COLORS, DEPTH_COLORS } from '../../colors/colors';
import { MoistureRangeModal } from '../MoistureRangeModal/MoistureRangeModal';
import { updateDeviceConfig } from '../../services/api';
import { parseJwt } from '../../services/auth';

// Tipos
export type TimeRange = '24h' | '7d' | '15d' | '30d' | 'Personalizado';

export interface RawApiData {
    timestamp: string;
    depth_cm: number;
    moisture_pct: number | null;
    temperature_c: number | null;
    rain_cm?: number | null;
    battery_status?: number | null;
}

interface ChartDataPoint {
    time: string;
    precipitacao?: number;
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
    initialV1?: number;
    initialV2?: number;
    initialV3?: number;
    onConfigUpdate?: () => void;
    selectedPeriod?: TimeRange;
    onPeriodChange?: (period: TimeRange, startDate?: string, endDate?: string) => void;
    selectedDepthRef?: number | null;
    onSelectDepthRef?: (depth: number | null) => void;
}

interface RainLabelProps {
    x?: number;
    y?: number;
    width?: number;
    value?: number;
    index?: number;
}

const CHART_ANIMATION_POINT_LIMIT = 500;
const CHART_MAX_POINTS = 1200;

const downsampleData = <T,>(items: T[], maxPoints: number): T[] => {
    if (items.length <= maxPoints) return items;
    const step = Math.ceil(items.length / maxPoints);
    return items.filter((_, index) => index % step === 0 || index === items.length - 1);
};


export function SoilMoistureChart({
    data = [],
    title = "Umidade do Solo",
    yDomain = [0, 100],
    showZones = true,
    metric = 'moisture',
    isAdmin = false,
    esn,
    onConfigUpdate,
    initialV1,
    initialV2,
    initialV3,
    selectedPeriod = '24h',
    onPeriodChange,
    selectedDepthRef,
    onSelectDepthRef
}: ChartProps) {

    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const chartContainerRef = useRef<HTMLDivElement>(null);

    // --- ESTADOS PARA FILTRO DE DATA E ZOOM ---
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
    const [refAreaRight, setRefAreaRight] = useState<string | null>(null);

    // --- CONFIGURAÇÃO DE ZONAS ---
    // const storageKey = `BRSENSE_${metric.toUpperCase()}_RANGES_${esn || 'DEFAULT'}`;
    const userStorageScope = useMemo(() => {
        const token = localStorage.getItem('access_token');
        if (!token) return 'ANON';
        const payload = parseJwt(token);
        return payload?.preferred_username || payload?.sub || 'ANON';
    }, []);
    const storageKey = `BRSENSE_${userStorageScope}_${metric.toUpperCase()}_RANGES_${esn || 'DEFAULT'}`;
    const legacyStorageKey = `BRSENSE_${metric.toUpperCase()}_RANGES_${esn || 'DEFAULT'}`;

    const defaultRanges = metric === 'moisture'
        ? {
            v1: initialV1 ?? 30,
            v2: initialV2 ?? 45,
            v3: initialV3 ?? 60,
            intensity: 50
        }
        : { min: 20, max: 30, intensity: 50 };

    const [rangeSettings, setRangeSettings] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.min !== undefined && parsed.v1 === undefined) {
                    return { v1: parsed.min - 10, v2: parsed.min, v3: parsed.max, intensity: 50 };
                }
                return parsed;
            }
            return defaultRanges;
        } catch { return defaultRanges; }
    });

    useEffect(() => {
        if (metric !== 'moisture') return;
        if (initialV1 === undefined && initialV2 === undefined && initialV3 === undefined) return;

        setRangeSettings((prev: { v1: number; v2: number; v3: number; intensity: number }) => {
            const next = {
                ...prev,
                v1: initialV1 ?? prev.v1 ?? 30,
                v2: initialV2 ?? prev.v2 ?? 45,
                v3: initialV3 ?? prev.v3 ?? 60,
            };
            if (next.v1 === prev.v1 && next.v2 === prev.v2 && next.v3 === prev.v3) {
                return prev;
            }
            localStorage.setItem(storageKey, JSON.stringify(next));
            return next;
        });
    }, [initialV1, initialV2, initialV3, metric, storageKey]);

    const handleSaveConfig = async (newRanges: { v1: number; v2: number; v3: number }) => {
        setRangeSettings(newRanges);
        localStorage.setItem(storageKey, JSON.stringify(newRanges));

        if (esn && isAdmin) {
            try {
                // Mantemos o envio do intensity: 50 fixo para a API caso o back-end ainda exija esse campo
                await updateDeviceConfig(esn, { ...newRanges, intensity: 50 });
                toast({ title: "Configuração salva!", status: "success", duration: 2000, isClosable: true });
                if (onConfigUpdate) onConfigUpdate();
            } catch {
                toast({ title: "Erro ao salvar", description: "Falha na persistência.", status: "error" });
            }
        }
    };

    // --- ESTADOS DE VISUALIZAÇÃO ---
    const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
        depth10: true, depth20: true, depth30: true, depth40: true, depth50: true, depth60: true,
    });

    const [hoveredData, setHoveredData] = useState<ChartDataPoint | null>(null);
    const [selectedData, setSelectedData] = useState<ChartDataPoint | null>(null);
    const [range, setRange] = useState({ startIndex: 0, endIndex: 0 });

    const isTouchDevice = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(pointer: coarse)').matches;
    }, []);

    const isMobileViewport = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(max-width: 48em)').matches;
    }, []);

    // --- PROCESSAMENTO DE DADOS E FILTRAGEM ---
    const { chartData, isHighResolution } = useMemo(() => {
        if (!data || data.length === 0) return { chartData: [], isHighResolution: true };

        let filteredData = data;
        // let isHighRes = true; // Por padrão, mostramos as horas no Eixo X
        let useHourly = false;

        useHourly = true

        // 1. Filtragem por Data Customizada
        if (startDate && endDate) {
            const startObj = new Date(startDate);
            startObj.setHours(0, 0, 0, 0);

            const endObj = new Date(endDate);
            endObj.setHours(23, 59, 59, 999);

            const startTime = startObj.getTime();
            const endTime = endObj.getTime();

            filteredData = data.filter(item => {
                const t = new Date(item.timestamp).getTime();
                return t >= startTime && t <= endTime;
            });

            // Se o utilizador filtrar mais de 8 dias manualmente, o Eixo X muda para exibir apenas Datas
            // const diffDays = (endTime - startTime) / (1000 * 3600 * 24);
            // if (diffDays > 8) isHighRes = false;

            // } else if (selectedPeriod) {
            //     // 2. Filtragem pelo Menu (24h, 7d, 15d, 30d)
            //     // Pegamos na data da última leitura recebida para ser o nosso "Agora"
            //     let now = new Date().getTime();
            //     const allTimestamps = data.map(d => new Date(d.timestamp).getTime()).filter(t => !isNaN(t));
            //     if (allTimestamps.length > 0) {
            //         now = Math.max(...allTimestamps);
            //     }

            //     let past = now;

            //     if (selectedPeriod === '24h') {
            //         past = now - (24 * 3600 * 1000);
            //     } else if (selectedPeriod === '7d') {
            //         past = now - (7 * 24 * 3600 * 1000);
            //     } else if (selectedPeriod === '15d') {
            //         past = now - (15 * 24 * 3600 * 1000);
            //         isHighRes = false; // Em 15 dias mostramos DD/MM no eixo X
            //     } else if (selectedPeriod === '30d') {
            //         past = now - (30 * 24 * 3600 * 1000);
            //         isHighRes = false; // Em 30 dias mostramos DD/MM no eixo X
            //     }

            //     filteredData = data.filter(item => {
            //         const t = new Date(item.timestamp).getTime();
            //         return t >= past;
            //     });
        }

        const groupedMap = new Map<number, {
            values: Record<string, number>;
            rainSum: number;
        }>();

        filteredData.forEach(item => {
            if (!item.timestamp) return;

            const utcStr = item.timestamp.includes('Z') || item.timestamp.includes('+')
                ? item.timestamp
                : `${item.timestamp}Z`;

            const date = new Date(utcStr);
            if (isNaN(date.getTime())) return;

            if (useHourly) {
                date.setUTCMinutes(0, 0, 0);
            } else {
                date.setUTCHours(0, 0, 0, 0);
            }

            // date.setUTCSeconds(0, 0);

            const timeKey = date.getTime();

            if (!groupedMap.has(timeKey)) {
                groupedMap.set(timeKey, { values: {}, rainSum: 0 });
            }
            const group = groupedMap.get(timeKey)!;

            if (item.rain_cm) {
                group.rainSum += Number(item.rain_cm);
            }

            const rawValue = metric === 'moisture' ? item.moisture_pct : item.temperature_c;
            if (rawValue !== null && rawValue !== undefined) {
                const val = Number(rawValue);
                if (!isNaN(val)) {
                    const depthKey = `depth${item.depth_cm}`;
                    if (DEPTH_COLORS[depthKey as keyof typeof DEPTH_COLORS]) {
                        group.values[depthKey] = val;
                    }
                }
            }
        });

        const sortedTs = Array.from(groupedMap.keys()).sort((a, b) => a - b);
        const rawChartData = sortedTs.map((ts, index) => {
            const group = groupedMap.get(ts)!;
            const dateInBr = new Date(ts);
            const newItem: ChartDataPoint & { index: number } = {
                index,
                time: dateInBr.toISOString(),
                ...(metric === 'moisture' ? { precipitacao: group.rainSum } : {})
            };

            Object.keys(group.values).forEach(key => {
                newItem[key] = group.values[key];
            });
            return newItem;
        });

        // return { chartData: rawChartData, isHighResolution: useHourly };
        const sampledChartData = downsampleData(rawChartData, CHART_MAX_POINTS);
        return { chartData: sampledChartData, isHighResolution: useHourly };

    }, [data, metric, startDate, endDate]);

    const chartDataIndexByTime = useMemo(() => {
        return new Map(chartData.map((point, index) => [point.time, index]));
    }, [chartData]);

    const useLightAnimations = chartData.length <= CHART_ANIMATION_POINT_LIMIT;

    // Resetar zoom quando dados mudam
    useEffect(() => {
        const targetEnd = Math.max(0, chartData.length - 1);
        if (chartData.length > 0 && range.endIndex !== targetEnd) {
            setRange({ startIndex: 0, endIndex: targetEnd });
        } else if (chartData.length === 0 && range.endIndex !== 0) {
            setRange({ startIndex: 0, endIndex: 0 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chartData.length]);

    // --- LÓGICA DE ZOOM MANUAL COM MOUSE ---
    // const handleZoom = () => {
    const handleZoom = useCallback(() => {
        if (!refAreaLeft || !refAreaRight || !chartData.length) {
            setRefAreaLeft(null);
            setRefAreaRight(null);
            return;
        }

        // let leftIndex = chartData.findIndex(d => d.time === refAreaLeft);
        // let rightIndex = chartData.findIndex(d => d.time === refAreaRight);

        // if (leftIndex < 0) leftIndex = 0;
        // if (rightIndex < 0) rightIndex = chartData.length - 1;
        let leftIndex = chartDataIndexByTime.get(refAreaLeft) ?? 0;
        let rightIndex = chartDataIndexByTime.get(refAreaRight) ?? (chartData.length - 1);
        if (leftIndex > rightIndex) {
            [leftIndex, rightIndex] = [rightIndex, leftIndex];
        }

        if (rightIndex - leftIndex < 2) {
            setRefAreaLeft(null);
            setRefAreaRight(null);
            return;
        }

        const startPoint = chartData[leftIndex];
        const endPoint = chartData[rightIndex];

        if (startPoint && endPoint) {
            const sDate = new Date(startPoint.time);
            const eDate = new Date(endPoint.time);

            const offset = sDate.getTimezoneOffset();
            const localStart = new Date(sDate.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
            const localEnd = new Date(eDate.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

            setStartDate(localStart);
            setEndDate(localEnd);

            if (onPeriodChange) {
                onPeriodChange('Personalizado', localStart, localEnd);
            }
        }

        setRefAreaLeft(null);
        setRefAreaRight(null);
        setRange({ startIndex: leftIndex, endIndex: rightIndex });
    }, [chartData, chartDataIndexByTime, onPeriodChange, refAreaLeft, refAreaRight]);

    // --- ESCALA Y DINÂMICA (Apenas baseada nos pontos da curva) ---
    const activeYDomain = useMemo(() => {
        if (!chartData || chartData.length === 0) return yDomain;
        const visibleData = chartData.slice(range.startIndex, range.endIndex + 1);
        if (visibleData.length === 0) return yDomain;

        let min = Infinity;
        let max = -Infinity;
        let hasActiveData = false;

        const allKeys = Object.keys(visibleLines);

        visibleData.forEach(item => {
            allKeys.forEach(key => {
                if (typeof item[key] === 'number') {
                    const val = item[key] as number;
                    if (val < min) min = val;
                    if (val > max) max = val;
                    hasActiveData = true;
                }
            });
        });

        if (!hasActiveData) return yDomain;

        // const padding = (max - min) * 0.1 || 5;
        const autoMin = Math.floor(min - 5);
        const autoMax = Math.ceil(max + 5);

        return [autoMin, autoMax];
    }, [chartData, range, visibleLines, yDomain]);

    // --- HANDLER MANUAL DE TOUCH ---
    // const handleTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const handleTouch = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (!chartContainerRef.current || chartData.length === 0) return;

        const touch = e.touches[0];
        if (!touch) return;

        const rect = chartContainerRef.current.getBoundingClientRect();
        const x = touch.clientX - rect.left;

        const ratio = x / rect.width;

        const index = Math.round(
            range.startIndex +
            ratio * (range.endIndex - range.startIndex)
        );

        const clamped = Math.max(
            range.startIndex,
            Math.min(range.endIndex, index)
        );

        const point = chartData[clamped];
        if (point) {
            setSelectedData(point);
        }
    }, [chartData, range.endIndex, range.startIndex]);

    // --- FECHAR SELEÇÃO AO TOCAR FORA ---
    useEffect(() => {
        if (!isTouchDevice || !selectedData) return;

        const handleTouchOutside = (e: TouchEvent) => {
            const container = chartContainerRef.current;
            if (container && !container.contains(e.target as Node)) {
                setSelectedData(null);
            }
        };

        document.addEventListener('touchstart', handleTouchOutside);
        return () => document.removeEventListener('touchstart', handleTouchOutside);
    }, [isTouchDevice, selectedData]);

    // --- ZOOM COM SCROLL DO MOUSE ---
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

    // const toggleLine = (key: string) => setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleLine = useCallback((key: string) => {
        setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const renderZone = (y1: number, y2: number, fill: string, zoneId: string) => {
        const minDomain = activeYDomain[0];
        const maxDomain = activeYDomain[1];

        const safeMin = typeof minDomain === 'number' ? minDomain : 0;
        const safeMax = typeof maxDomain === 'number' ? maxDomain : 100;

        if (y2 < safeMin || y1 > safeMax) return null;

        const effectiveY1 = Math.max(y1, safeMin);
        const effectiveY2 = Math.min(y2, safeMax);

        if (effectiveY1 < effectiveY2) {
            return (
                <ReferenceArea
                    key={zoneId}
                    yAxisId="left"
                    y1={effectiveY1}
                    y2={effectiveY2}
                    fill={fill}
                    fillOpacity={1}
                    strokeOpacity={0}
                />
            );
        }
        return null;
    };

    // const formatDateHeader = (isoStr?: string) => {
    const headerDateFormatter = useMemo(() => new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }), []);

    const axisDateFormatter = useMemo(() => new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
    }), []);

    const axisDayFormatter = useMemo(() => new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit'
    }), []);

    const formatDateHeader = useCallback((isoStr?: string) => {
        if (!isoStr) return '';
        const date = new Date(isoStr);

        //     // O Painel do hover e os textos do cabeçalho exigem saber a HORA sempre, 
        //     // independentemente da resolução do Eixo X.
        //     return new Intl.DateTimeFormat('pt-BR', {
        //         timeZone: 'America/Sao_Paulo',
        //         day: '2-digit',
        //         month: '2-digit',
        //         hour: '2-digit',
        //         minute: '2-digit'
        //     }).format(date);
        // };
        return headerDateFormatter.format(date);
    }, [headerDateFormatter]);

    // Dados ativos para exibição (Prioridade: Seleção Touch > Hover Mouse)
    const activeData: ChartDataPoint | null = selectedData ?? hoveredData;

    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const lastHoverIndexRef = useRef<number | null>(null);
    const pinchRef = useRef<{ distance: number; centerRatio: number } | null>(null);

    const RainLabel = ({ x, y, width, value, index }: RainLabelProps) => {
        if (index !== activeIndex) return null;
        if (
            typeof x !== 'number' ||
            typeof y !== 'number' ||
            typeof width !== 'number' ||
            typeof value !== 'number' ||
            value <= 0
        ) {
            return null;
        }

        return (
            <text
                x={x + width / 2}
                y={y + 15}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={12}
                fontWeight={600}
            >
                {value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}
            </text>
        );
    };

    const handleResetView = () => {
        if (startDate || endDate) {
            setStartDate('');
            setEndDate('');
            if (onPeriodChange) onPeriodChange('24h');
        }
        if (chartData.length > 0) {
            setRange({ startIndex: 0, endIndex: chartData.length - 1 });
            setSelectedData(null);
            setRefAreaLeft(null);
            setRefAreaRight(null);
        }
    };

    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 2 && chartContainerRef.current && chartData.length > 1) {
            const [t1, t2] = [e.touches[0], e.touches[1]];
            const rect = chartContainerRef.current.getBoundingClientRect();
            const distance = Math.abs(t1.clientX - t2.clientX);
            const centerX = (t1.clientX + t2.clientX) / 2;
            pinchRef.current = {
                distance,
                centerRatio: Math.min(1, Math.max(0, (centerX - rect.left) / rect.width))
            };
            return;
        }
        handleTouch(e);
    }, [chartData.length, handleTouch]);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 2 && chartData.length > 1) {
            const pinchStart = pinchRef.current;
            if (!pinchStart) return;
            const [t1, t2] = [e.touches[0], e.touches[1]];
            const distance = Math.abs(t1.clientX - t2.clientX);
            const delta = distance - pinchStart.distance;
            if (Math.abs(delta) < 8) return;

            setRange(prev => {
                const currentSize = Math.max(2, prev.endIndex - prev.startIndex);
                const zoomDirection = delta > 0 ? -1 : 1;
                const zoomDelta = Math.max(2, Math.floor(currentSize * 0.12));
                const targetSize = Math.min(chartData.length - 1, Math.max(2, currentSize + (zoomDirection * zoomDelta)));
                const centerIndex = Math.round(prev.startIndex + (currentSize * pinchStart.centerRatio));
                const half = Math.floor(targetSize / 2);
                let startIndex = Math.max(0, centerIndex - half);
                const endIndex = Math.min(chartData.length - 1, startIndex + targetSize);
                startIndex = Math.max(0, endIndex - targetSize);
                return { startIndex, endIndex };
            });

            pinchRef.current = { ...pinchStart, distance };
            return;
        }
        handleTouch(e);
    }, [chartData.length, handleTouch]);

    return (
        <Box
            bg={COLORS.surface}
            borderColor="rgba(59, 71, 84, 0.5)"
            borderWidth="1px"
            borderRadius={{ base: "md", md: "xl" }}
            p={{ base: 2, md: 4 }}
            color="white"
            userSelect="none"
        >
            <MoistureRangeModal
                isOpen={isOpen}
                onClose={onClose}
                initialRanges={rangeSettings}
                onSave={handleSaveConfig}
            />

            {/* --- HEADER DO GRÁFICO --- */}
            <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
                <VStack align="start" spacing={1}>
                    <Text fontSize="lg" fontWeight="medium">{title}</Text>
                    <Text color="gray.400" fontSize="sm">
                        {chartData.length > 0 && chartData[range.startIndex] && chartData[range.endIndex]
                            ? `${formatDateHeader(chartData[range.startIndex].time)} - ${formatDateHeader(chartData[range.endIndex].time)}`
                            : 'Aguardando dados...'}
                    </Text>
                </VStack>

                <Flex
                    wrap="wrap"
                    gap={2}
                    w={{ base: "100%", md: "auto" }}
                    justify={{ base: "flex-start", md: "flex-end" }}
                >
                    <Popover placement="bottom-end" isLazy>
                        <PopoverTrigger>
                            <Button
                                size="xs"
                                variant="outline"
                                colorScheme="blue"
                                leftIcon={<Icon as={MdDateRange} />}
                            >
                            </Button>
                        </PopoverTrigger>
                        {onSelectDepthRef && metric === 'moisture' && (
                            <Menu>
                                <MenuButton
                                    as={Button}
                                    size="xs"
                                    colorScheme="blue"
                                    variant={selectedDepthRef ? "solid" : "outline"}
                                    rightIcon={<MdArrowDropDown />}
                                    leftIcon={<Icon as={MdLayers} />} // Opcional
                                >
                                    {selectedDepthRef ? `${selectedDepthRef}cm` : 'Profundidade Ref.'}
                                </MenuButton>
                                <MenuList bg="gray.800" borderColor="gray.600" zIndex={2000}>
                                    <MenuItem
                                        bg="gray.800" _hover={{ bg: "gray.700" }}
                                        onClick={() => onSelectDepthRef(null)}
                                    >
                                        Geral / Padrão (Sem trava)
                                    </MenuItem>
                                    {[10, 20, 30, 40, 50, 60].map(depth => (
                                        <MenuItem
                                            key={depth}
                                            bg="gray.800" _hover={{ bg: "gray.700" }}
                                            onClick={() => onSelectDepthRef(depth)}
                                        >
                                            Travar em {depth}cm
                                        </MenuItem>
                                    ))}
                                </MenuList>
                            </Menu>
                        )}
                        <PopoverContent bg="gray.800" borderColor="gray.600" p={3} w="auto" boxShadow="xl" zIndex={2000}>
                            <PopoverArrow bg="gray.800" />
                            <PopoverBody>
                                <VStack spacing={3} align="stretch">
                                    <FormControl>
                                        <FormLabel fontSize="xs" color="gray.400" mb={1}>Data Inicial</FormLabel>
                                        <Input
                                            size="xs"
                                            type="date"
                                            value={startDate}
                                            color="white"
                                            borderColor="gray.600"
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setStartDate(v);
                                                if (v && endDate && onPeriodChange) onPeriodChange('Personalizado', v, endDate);
                                            }}
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="xs" color="gray.400" mb={1}>Data Final</FormLabel>
                                        <Input
                                            size="xs"
                                            type="date"
                                            value={endDate}
                                            color="white"
                                            borderColor="gray.600"
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setEndDate(v);
                                                if (startDate && v && onPeriodChange) onPeriodChange('Personalizado', startDate, v);
                                            }}
                                        />
                                    </FormControl>
                                </VStack>
                            </PopoverBody>
                        </PopoverContent>
                    </Popover>

                    {/* --- BOTÃO DE RESET (MdClose) --- */}
                    {(startDate || endDate) && (
                        <Button
                            size="xs"
                            colorScheme="red"
                            onClick={handleResetView}
                            px={1}
                            title="Limpar Filtro"
                        >
                            <Icon as={MdClose} />
                        </Button>
                    )}

                    {/* --- MENU DE PERÍODOS --- */}
                    {onPeriodChange && (
                        <Menu>
                            <MenuButton
                                as={Button}
                                size="xs"
                                colorScheme={startDate || endDate ? "blue" : "blue"}
                                variant={startDate || endDate ? "solid" : "outline"}
                                rightIcon={<MdArrowDropDown />}
                                leftIcon={<MdFilterList />}
                            >
                                {startDate || endDate ? 'Personalizado' : selectedPeriod}
                            </MenuButton>
                            <MenuList bg="gray.800" borderColor="gray.600" zIndex={2000}>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => { setStartDate(''); setEndDate(''); onPeriodChange('24h'); }}>Últimas 24h</MenuItem>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => { setStartDate(''); setEndDate(''); onPeriodChange('7d'); }}>Últimos 7 Dias</MenuItem>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => { setStartDate(''); setEndDate(''); onPeriodChange('15d'); }}>Últimos 15 Dias</MenuItem>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => { setStartDate(''); setEndDate(''); onPeriodChange('30d'); }}>Últimos 30 Dias</MenuItem>
                            </MenuList>
                        </Menu>
                    )}

                    {isAdmin && (
                        <ChakraTooltip label="Configurar Zonas" hasArrow>
                            <Button size="xs" onClick={onOpen} colorScheme="blue" variant="outline">
                                <Icon as={MdSettings} boxSize={4} />
                            </Button>
                        </ChakraTooltip>
                    )}

                    <Button
                        size="xs"
                        leftIcon={<Icon as={MdZoomOutMap} />}
                        onClick={handleResetView}
                        colorScheme="blue"
                        variant="outline"
                        isDisabled={!chartData.length}
                    >
                        Ver Tudo
                    </Button>
                </Flex>
            </Flex>

            {/* --- PAINEL DE INFORMAÇÕES (TOOLTIP FIXO) --- */}
            <Box
                transition="all 0.25s ease"
                opacity={activeData ? 1 : 0}
                transform={activeData ? "translateY(0)" : "translateY(-6px)"}
                pointerEvents={activeData ? "auto" : "none"}
                mb={activeData ? 2 : 0}
                minH={{ base: "auto", md: "32px" }}
            >
                {activeData && (
                    <Flex
                        bg="rgba(30, 41, 59, 0.8)"
                        px={{ base: 3, md: 3 }}
                        py={{ base: 2, md: 1 }}
                        borderRadius="md"
                        align={{ base: "flex-start", md: "center" }}
                        direction={{ base: "column", md: "row" }}
                        gap={{ base: 2, md: 4 }}
                        w={{ base: "100%", md: "fit-content" }}
                    >
                        <HStack
                            borderRight={{ base: "none", md: "1px solid" }}
                            borderBottom={{ base: "1px solid", md: "none" }}
                            borderColor="gray.600"
                            pr={{ base: 0, md: 3 }}
                            pb={{ base: 2, md: 0 }}
                            w={{ base: "100%", md: "auto" }}
                            spacing={2}
                        >
                            <Icon as={MdCalendarToday} color="gray.400" boxSize={3} />
                            <Text fontSize="xs" fontWeight="bold">
                                {formatDateHeader(activeData.time)}
                            </Text>
                        </HStack>

                        <Flex wrap="wrap" gap={3} align="center">
                            {/* CHUVA */}
                            {metric === 'moisture' && activeData.precipitacao !== undefined && activeData.precipitacao > 0 && (
                                <HStack spacing={1.5}>
                                    <Box w="6px" h="6px" borderRadius="full" bg="#4299E1" />
                                    <Text fontSize="10px" color="blue.200">Chuva:</Text>
                                    <Text fontSize="xs" fontWeight="bold">{activeData.precipitacao.toFixed(1)}mm</Text>
                                </HStack>
                            )}

                            {/* LINHAS */}
                            {Object.entries(DEPTH_COLORS)
                                .filter(([key]) => visibleLines[key] && typeof activeData[key] === 'number')
                                .sort(([a], [b]) => parseInt(a.replace('depth', '')) - parseInt(b.replace('depth', '')))
                                .map(([key, color]) => (
                                    <HStack key={key} spacing={1.5}>
                                        <Box w="6px" h="6px" borderRadius="full" bg={color} />
                                        <Text fontSize="10px" color="gray.400">{key.replace('depth', '')}cm</Text>
                                        <Text fontSize="xs" fontWeight="bold">
                                            {Number(activeData[key]).toFixed(1)}{metric === 'moisture' ? '%' : '°C'}
                                        </Text>
                                    </HStack>
                                ))}
                        </Flex>
                    </Flex>
                )}
            </Box>

            {/* --- CONTAINER DO GRÁFICO (Handlers de Touch e Mouse) --- */}
            <Box
                h={{ base: "260px", md: "500px" }}
                w="100%"
                ref={chartContainerRef}
                cursor="crosshair"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => { pinchRef.current = null; }}
                style={{ touchAction: 'pan-y' }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={isMobileViewport
                            ? { top: 4, right: -30, left: -43, bottom: -15 }
                            : { top: 5, right: 5, left: -41, bottom: 0 }}
                        onMouseLeave={() => !isTouchDevice && setHoveredData(null)}
                        // NOVOS HANDLERS DE MOUSE PARA ZOOM
                        onMouseDown={(e) => {
                            if (!isTouchDevice && e && e.activeLabel) {
                                setRefAreaLeft(String(e.activeLabel));
                            }
                        }}
                        onMouseMove={(e) => {
                            if (!isTouchDevice && refAreaLeft && e && e.activeLabel) {
                                setRefAreaRight(String(e.activeLabel));
                            }
                        }}
                        onMouseUp={handleZoom}
                        barCategoryGap={0}
                        barGap={0}
                    >
                        {/* <defs>
                            {(() => {
                                const spread = (100 - (rangeSettings.intensity || 50)) / 2;
                                const stop1 = Math.max(0, 50 - spread);
                                const stop2 = Math.min(100, 50 + spread);

                                const renderStops = (colorBottom: string, colorTop: string) => (
                                    <>
                                        <stop offset="0%" stopColor={colorBottom} />
                                        <stop offset={`${stop1}%`} stopColor={colorBottom} />
                                        <stop offset={`${stop2}%`} stopColor={colorTop} />
                                        <stop offset="100%" stopColor={colorTop} />
                                    </>
                                );

                                return (
                                    <>
                                        <linearGradient id="zone-1" x1="0" y1="1" x2="0" y2="0">{renderStops("#E53E3E", "#D69E2E")}</linearGradient>
                                        <linearGradient id="zone-2" x1="0" y1="1" x2="0" y2="0">{renderStops("#D69E2E", "#38A169")}</linearGradient>
                                        <linearGradient id="zone-3" x1="0" y1="1" x2="0" y2="0">{renderStops("#38A169", "#3182CE")}</linearGradient>
                                    </>
                                );
                            })()}
                            <linearGradient id="temp-zone" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor="#7da3c9" />
                                <stop offset="100%" stopColor="#003D7A" />
                            </linearGradient>
                        </defs> */}

                        <defs>
                            {(() => {
                                // Garantimos que a intensidade seja de 0 a 100
                                const intensity = rangeSettings.intensity ?? 50;

                                const renderStops = (colorMain: string, colorNext: string) => (
                                    <>
                                        {/* A cor principal se mantém sólida partindo da base até o percentual definido na intensidade */}
                                        <stop offset="0%" stopColor={colorMain} />
                                        <stop offset={`${intensity}%`} stopColor={colorMain} />

                                        {/* No restante do espaço (se houver), ela faz a transição suave para a próxima cor */}
                                        <stop offset="100%" stopColor={intensity === 100 ? colorMain : colorNext} />
                                    </>
                                );

                                return (
                                    <>
                                        {/* zone-1: Y=0 até v1 (Crítico -> Alerta) */}
                                        <linearGradient id="zone-1" x1="0" y1="1" x2="0" y2="0">
                                            {renderStops("#E53E3E", "#D69E2E")}
                                        </linearGradient>

                                        {/* zone-2: v1 até v2 (Alerta -> Ideal) */}
                                        <linearGradient id="zone-2" x1="0" y1="1" x2="0" y2="0">
                                            {renderStops("#D69E2E", "#38A169")}
                                        </linearGradient>

                                        {/* zone-3: v2 até v3 (Ideal -> Saturado) */}
                                        <linearGradient id="zone-3" x1="0" y1="1" x2="0" y2="0">
                                            {renderStops("#38A169", "#3182CE")}
                                        </linearGradient>

                                        {/* Gradiente da Temperatura */}
                                        <linearGradient id="temp-zone" x1="0" y1="1" x2="0" y2="0">
                                            <stop offset="0%" stopColor="#7da3c9" />
                                            <stop offset="100%" stopColor="#003D7A" />
                                        </linearGradient>
                                    </>
                                );
                            })()}
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="#3179c7" opacity={0.3} vertical={false} />

                        <XAxis
                            dataKey="time"
                            type="category" // Adicionado explicitamente
                            interval="preserveStartEnd"
                            tickFormatter={(val) => {
                                try {
                                    // const date = new Date(val); // Aqui o JS lê o "Z" e entende que é UTC

                                    // const formatter = new Intl.DateTimeFormat('pt-BR', {
                                    //     timeZone: 'America/Sao_Paulo', // Aqui ele converte UTC para BR
                                    //     hour: '2-digit',
                                    //     minute: '2-digit',
                                    //     day: '2-digit',
                                    //     month: '2-digit'
                                    // });
                                    const date = new Date(val);

                                    if (isHighResolution) {
                                        // const parts = formatter.formatToParts(date);
                                        const parts = axisDateFormatter.formatToParts(date);
                                        const hour = parts.find(p => p.type === 'hour')?.value;
                                        const minute = parts.find(p => p.type === 'minute')?.value;
                                        const day = parts.find(p => p.type === 'day')?.value;
                                        const month = parts.find(p => p.type === 'month')?.value;

                                        // Se for meia-noite no Brasil, mostra a data
                                        if (hour === '00' && minute === '00') {
                                            return `${day}/${month}`;
                                        }
                                        return `${hour}:${minute}`;
                                    }

                                    // return new Intl.DateTimeFormat('pt-BR', {
                                    //     timeZone: 'America/Sao_Paulo',
                                    //     day: '2-digit',
                                    //     month: '2-digit'
                                    // }).format(date);
                                    return axisDayFormatter.format(date);

                                } catch { return ''; }
                            }}
                            tick={{ fill: '#6b7280', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={isMobileViewport ? 24 : 40}
                        />

                        <YAxis
                            yAxisId="left"
                            domain={activeYDomain as [number, number]}
                            tick={{ fill: '#6b7280', fontSize: isMobileViewport ? 9 : 10 }}
                            axisLine={false}
                            tickLine={false}
                            allowDataOverflow
                        />

                        {/* EIXO Y CHUVA (INVERTIDO) */}
                        {metric === 'moisture' && (
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                reversed={true}
                                domain={[0, 'dataMax + 40']}
                                tick={{ fill: '#6b7280', fontSize: isMobileViewport ? 9 : 10 }}
                                axisLine={false}
                                tickLine={false}
                                hide={false}
                                unit="mm"
                                width={isMobileViewport ? 24 : 30}
                            />
                        )}

                        {showZones && metric === 'moisture' && (
                            <>
                                {renderZone(0, rangeSettings.v1, "url(#zone-1)", "z-critico")}
                                {renderZone(rangeSettings.v1, rangeSettings.v2, "url(#zone-2)", "z-alerta")}
                                {renderZone(rangeSettings.v2, rangeSettings.v3, "url(#zone-3)", "z-ideal")}
                                {renderZone(rangeSettings.v3, 100, "#3182CE", "z-saturado")}
                            </>
                        )}

                        {metric === 'temperature' && (
                            <>
                                {renderZone(0, 100, "url(#temp-zone)", "temp-zone")}
                            </>
                        )}

                        {metric === 'moisture' && (
                            <Bar
                                dataKey="precipitacao"
                                yAxisId="right"
                                fill="#0010f1"
                                opacity={0.8}
                                // Se for alta resolução, barras mais finas
                                barSize={isHighResolution ? 6 : 15}
                                // isAnimationActive={true}
                                // animationDuration={800}
                                isAnimationActive={useLightAnimations}
                                animationDuration={useLightAnimations ? 400 : 0}
                                name="Chuva"
                            >
                                <LabelList dataKey="precipitacao" content={<RainLabel />} />
                            </Bar>
                        )}

                        {Object.entries(DEPTH_COLORS).map(([key, color]) => (
                            visibleLines[key] && (
                                <Line
                                    key={`${key}-${selectedPeriod}`}
                                    yAxisId="left"
                                    type="basis"
                                    dataKey={key}
                                    stroke={color}
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 1 }}
                                    // isAnimationActive={true}
                                    // animationDuration={1000}
                                    isAnimationActive={useLightAnimations}
                                    animationDuration={useLightAnimations ? 500 : 0}
                                    animationEasing="ease-in-out"
                                    connectNulls
                                />
                            )
                        ))}

                        <Tooltip
                            cursor={{ stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1 }}
                            content={({ active, payload }) => {
                                if (!isTouchDevice) {
                                    if (active && payload && payload.length) {
                                        // setHoveredData(payload[0].payload);
                                        // setActiveIndex(payload[0].payload.index);
                                        const payloadPoint = payload[0].payload as ChartDataPoint & { index?: number };
                                        const hoveredIndex = typeof payloadPoint.index === 'number' ? payloadPoint.index : null;
                                        if (hoveredIndex !== null && hoveredIndex !== lastHoverIndexRef.current) {
                                            lastHoverIndexRef.current = hoveredIndex;
                                            setHoveredData(payloadPoint);
                                            setActiveIndex(hoveredIndex);
                                        }
                                    } else {
                                        lastHoverIndexRef.current = null;
                                        setHoveredData(null);
                                        setActiveIndex(null);
                                    }
                                }
                                return null;
                            }}
                        />

                        {refAreaLeft && refAreaRight && (
                            <ReferenceArea yAxisId="left" x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#8884d8" fillOpacity={0.3} />
                        )}

                        {/* <Brush
                            dataKey="time"
                            height={30}
                            stroke="#3182ce"
                            startIndex={range.startIndex}
                            endIndex={range.endIndex}
                            tickFormatter={() => ''}
                            onChange={(r) => {
                                const range = r as { startIndex?: number, endIndex?: number };
                                if (typeof range?.startIndex === 'number' && typeof range?.endIndex === 'number') {
                                    setRange({ startIndex: range.startIndex, endIndex: range.endIndex });
                                }
                            }}
                        /> */}
                    </ComposedChart>
                </ResponsiveContainer>
            </Box>

            {/* --- LEGENDAS --- */}
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
                            sx={{ '.chakra-checkbox__label': { fontSize: 'xs', color: visibleLines[key] ? 'gray.300' : 'gray.600' } }}
                        >
                            <HStack spacing={1}>
                                <Box w="8px" h="8px" borderRadius="full" bg={color} opacity={visibleLines[key] ? 1 : 0.4} />
                                <Text>{key.replace('depth', '')}cm</Text>
                            </HStack>
                        </Checkbox>
                    ))}
            </Flex>
        </Box >
    );
}