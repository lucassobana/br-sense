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
export type TimeRange = '24h' | '7d' | '15d' | '30d' | '60d' | '90d' | '120d' | 'Personalizado';

export interface RawApiData {
    timestamp: string;
    depth_cm: number | null;
    moisture_pct: number | null;
    temperature_c: number | null;
    rain_cm?: number | null;
    battery_status?: number | null;
    solar_status?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    reading_type?: string | null;
}

interface ChartDataPoint {
    time: string;
    precipitacao?: number;
    displayRainLabel?: number;
    rainLabelY?: number;
    [key: string]: number | string | undefined;
    index: number;
}

interface RainLabelProps {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    value?: number | string | null | boolean;
    index?: number;
}

interface ChartProps {
    data?: RawApiData[];
    title?: string;
    cultura?: string;
    dap?: number;
    unit?: string;
    yDomain?: (number | string)[];
    showZones?: boolean;
    metric?: 'moisture' | 'temperature';
    isAdmin?: boolean;
    esn?: string;
    initialV1?: number;
    initialV2?: number;
    initialV3?: number;
    intensity?: number;
    onConfigUpdate?: () => void;
    selectedPeriod?: TimeRange;
    onPeriodChange?: (period: TimeRange, startDate?: string, endDate?: string) => void;
    selectedDepthRef?: number | null;
    onSelectDepthRef?: (depth: number | null) => void;
}

const CHART_ANIMATION_POINT_LIMIT = 500;
const CHART_MAX_POINTS = 1200;
const CHART_MAX_POINTS_MOBILE_MOISTURE = 180;
const MM_DOMAIN = [0, 50];
const mmTicks = [5, 15, 25, 35, 45];

const downsampleData = <T extends ChartDataPoint>(items: T[], maxPoints: number): T[] => {
    if (items.length <= maxPoints) return items;
    const step = Math.ceil(items.length / maxPoints);
    const result: T[] = [];

    for (let i = 0; i < items.length; i += step) {
        const chunk = items.slice(i, i + step);
        const mainPoint = { ...chunk[chunk.length - 1] };
        const mp = mainPoint as ChartDataPoint;

        const depths = ['depth10', 'depth20', 'depth30', 'depth40', 'depth50', 'depth60'];
        depths.forEach(depth => {
            if (mp[depth] === undefined || mp[depth] === null) {
                for (let j = chunk.length - 2; j >= 0; j--) {
                    const pastPoint = chunk[j] as ChartDataPoint;
                    if (pastPoint[depth] !== undefined && pastPoint[depth] !== null) {
                        mp[depth] = pastPoint[depth];
                        break;
                    }
                }
            }
        });

        const chunkRains = chunk.map(item => Number(item.precipitacao) || 0);
        const maxRain = Math.max(...chunkRains);

        if (maxRain > 0) {
            mp.precipitacao = maxRain;
        } else {
            delete mp.precipitacao;
        }

        result.push(mainPoint);
    }
    return result;
};

export function SoilMoistureChart({
    data = [],
    title,
    cultura,
    dap,
    yDomain = [0, 100],
    showZones = true,
    metric = 'moisture',
    isAdmin = false,
    esn,
    onConfigUpdate,
    initialV1,
    initialV2,
    initialV3,
    intensity,
    selectedPeriod = '24h',
    onPeriodChange,
    selectedDepthRef,
    onSelectDepthRef
}: ChartProps) {

    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure(); // Usado para ConfigZonas
    const { isOpen: isPopoverOpen, onOpen: onPopoverOpen, onClose: onPopoverClose } = useDisclosure();
    const endDateRef = useRef<HTMLInputElement>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const displayTitle = useMemo(() => {
        if (metric === 'moisture') {
            if (cultura && dap !== undefined) {
                return `Perfil de Umidade - ${cultura} - ${dap} dias`;
            }
            return title?.replace(/\s*\(\s*%\s*\)/g, '') || 'Perfil de Umidade';
        }
        return title?.replace(/\s*\(\s*%\s*\)/g, '') || 'Temperatura do Solo';
    }, [metric, cultura, dap, title]);

    // Estados reais usados pelo gráfico para filtrar
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Estados temporários usados apenas nos inputs do Popover (evita recarregamento)
    const [tempStartDate, setTempStartDate] = useState('');
    const [tempEndDate, setTempEndDate] = useState('');

    const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
    const [refAreaRight, setRefAreaRight] = useState<string | null>(null);

    // Aplica os filtros apenas quando o botão for clicado
    const handleApplyFilters = () => {
        setStartDate(tempStartDate);
        setEndDate(tempEndDate);
        if (tempStartDate && tempEndDate && onPeriodChange) {
            onPeriodChange('Personalizado', tempStartDate, tempEndDate);
        }
        onPopoverClose();
    };

    // Função auxiliar para limpar datas de forma uniforme
    const clearDates = () => {
        setStartDate('');
        setEndDate('');
        setTempStartDate('');
        setTempEndDate('');
    };

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
                intensity: intensity ?? prev.intensity ?? 50
            };
            if (
                next.v1 === prev.v1
                && next.v2 === prev.v2
                && next.v3 === prev.v3
                && next.intensity === prev.intensity
            ) {
                return prev;
            }
            localStorage.setItem(storageKey, JSON.stringify(next));
            return next;
        });
    }, [initialV1, initialV2, initialV3, intensity, metric, storageKey]);

    const handleSaveConfig = async (newRanges: { v1: number; v2: number; v3: number; intensity: number }) => {
        setRangeSettings(newRanges);
        localStorage.setItem(storageKey, JSON.stringify(newRanges));

        if (esn && isAdmin) {
            try {
                await updateDeviceConfig(esn, newRanges);
                toast({ title: "Configuração salva!", status: "success", duration: 2000, isClosable: true });
                if (onConfigUpdate) onConfigUpdate();
            } catch {
                toast({ title: "Erro ao salvar", description: "Falha na persistência.", status: "error" });
            }
        }
    };

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

    const { chartData, isHighResolution } = useMemo(() => {
        if (!data || data.length === 0) return { chartData: [], isHighResolution: true };

        let filteredData = data.filter(item => {
            const isMoisture = metric === 'moisture';
            const expectedType = isMoisture ? 'H' : 'T';
            
            const isValidType = item.reading_type === expectedType || !item.reading_type;
            
            const hasValidValue = isMoisture 
                ? item.moisture_pct !== null && item.moisture_pct !== undefined
                : item.temperature_c !== null && item.temperature_c !== undefined;

            return isValidType && hasValidValue;
        });

        const useHourly = true;

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

            date.setUTCSeconds(0, 0);

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
        
        const lastValidByDepth: Record<string, number | null> = {};

        const rawChartData = sortedTs.map((ts, index) => {
            const group = groupedMap.get(ts)!;
            const dateInBr = new Date(ts);

            const newItem: ChartDataPoint = {
                index,
                time: dateInBr.toISOString(),
            };

            if (metric === 'moisture' && group.rainSum > 0) {
                newItem.precipitacao = group.rainSum;
            }

            Object.keys(group.values).forEach(key => {
                let currentVal = group.values[key];

                if (metric === 'moisture') {
                    const lastValid = lastValidByDepth[key];

                    if (lastValid === undefined || lastValid === null) {
                        if (currentVal !== 0) {
                            lastValidByDepth[key] = currentVal;
                        }
                    } else {
                        const diff = currentVal - lastValid;
                        
                        const isQuedaInvalida = diff < 0 && diff < -15;
                        const isSubidaInvalida = diff > 0 && diff > 20;

                        if (currentVal === 0 || isQuedaInvalida || isSubidaInvalida) {
                            currentVal = lastValid;
                        } else {
                            lastValidByDepth[key] = currentVal;
                        }
                    }
                }
                newItem[key] = currentVal;
            });

            return newItem;
        });

        const maxPoints = isMobileViewport && metric === 'moisture'
            ? CHART_MAX_POINTS_MOBILE_MOISTURE
            : CHART_MAX_POINTS;

        const sampledChartData = downsampleData(rawChartData, maxPoints);

        const dynamicGap = isMobileViewport 
            ? Math.max(3, Math.floor(sampledChartData.length / 20))
            : Math.max(2, Math.floor(sampledChartData.length / 35));

        let currentGroup: { index: number; val: number }[] = [];
        let lastClusterIndex = -1;
        let staggerLevel = 0;

        const processGroup = () => {
            if (currentGroup.length === 0) return;
            
            let sum = 0;
            let maxVal = -1;
            let maxIdx = -1;
            
            currentGroup.forEach(g => {
                sum += g.val;
                if (g.val > maxVal) {
                    maxVal = g.val;
                    maxIdx = g.index;
                }
            });
            
            if (maxIdx !== -1 && sum >= 0.2) {
                sampledChartData[maxIdx].displayRainLabel = sum;
                
                if (lastClusterIndex !== -1 && (maxIdx - lastClusterIndex) < (dynamicGap * 2)) {
                    staggerLevel = staggerLevel === 0 ? 1 : 0;
                } else {
                    staggerLevel = 0;
                }
                
                sampledChartData[maxIdx].rainLabelY = staggerLevel === 0 ? 15 : 28;
                lastClusterIndex = maxIdx;
            }
            currentGroup = [];
        };

        for (let i = 0; i < sampledChartData.length; i++) {
            const rainVal = sampledChartData[i].precipitacao;
            if (rainVal !== undefined && rainVal > 0) {
                if (currentGroup.length > 0 && (i - currentGroup[currentGroup.length - 1].index) > dynamicGap) {
                    processGroup();
                }
                currentGroup.push({ index: i, val: rainVal });
            }
        }
        processGroup(); 

        return { chartData: sampledChartData, isHighResolution: useHourly };

    }, [data, isMobileViewport, metric, startDate, endDate]);

    const chartDataIndexByTime = useMemo(() => {
        return new Map(chartData.map((point, index) => [point.time, index]));
    }, [chartData]);

    const useLightAnimations = chartData.length <= CHART_ANIMATION_POINT_LIMIT;

    useEffect(() => {
        const targetEnd = Math.max(0, chartData.length - 1);
        if (chartData.length > 0 && range.endIndex !== targetEnd) {
            setRange({ startIndex: 0, endIndex: targetEnd });
        } else if (chartData.length === 0 && range.endIndex !== 0) {
            setRange({ startIndex: 0, endIndex: 0 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chartData.length]);

    const handleZoom = useCallback(() => {
        if (!refAreaLeft || !refAreaRight || !chartData.length) {
            setRefAreaLeft(null);
            setRefAreaRight(null);
            return;
        }

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
            setTempStartDate(localStart);
            setTempEndDate(localEnd);

            if (onPeriodChange) {
                onPeriodChange('Personalizado', localStart, localEnd);
            }
        }

        setRefAreaLeft(null);
        setRefAreaRight(null);
        setRange({ startIndex: leftIndex, endIndex: rightIndex });
    }, [chartData, chartDataIndexByTime, onPeriodChange, refAreaLeft, refAreaRight]);

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

        let autoMin: number;
        let autoMax: number;

        if (metric === 'temperature') {
            autoMin = Math.floor(min - 2);
            autoMax = Math.ceil(max + 1);
        } else {
            autoMin = Math.floor(min - 5);
            autoMax = Math.ceil(max + 5);
        }

        return [autoMin, autoMax];
    }, [chartData, range, visibleLines, yDomain, metric]);

    const [minLeft, maxLeft] = activeYDomain as [number, number];

    const leftTicks = useMemo(() => {
        return mmTicks.map(tick => {
            const ratio = (tick - MM_DOMAIN[0]) / (MM_DOMAIN[1] - MM_DOMAIN[0]);
            const calculatedTick = minLeft + ratio * (maxLeft - minLeft);
            return Math.round(calculatedTick);
        });
    }, [minLeft, maxLeft]);

    const xTicks = useMemo(() => {
        if (chartData.length === 0) return undefined;

        const visibleData = chartData.slice(range.startIndex, range.endIndex + 1);
        const size = visibleData.length;

        const targetTicks = isMobileViewport ? 7 : (selectedPeriod === '24h' ? 24 : 15);

        if (size <= targetTicks) return visibleData.map(d => d.time);

        const ticks = [];
        for (let i = 0; i < targetTicks; i++) {
            const index = Math.round((i * (size - 1)) / (targetTicks - 1));
            ticks.push(visibleData[index].time);
        }
        return ticks;
    }, [isMobileViewport, chartData, range.startIndex, range.endIndex, selectedPeriod]);


    const handleChartInteraction = useCallback((state: { activeTooltipIndex?: number | string | null; activeLabel?: string | number } | null | undefined) => {
        if (!state || state.activeTooltipIndex == null) {
            setSelectedData(null);
            setHoveredData(null);
            return;
        }

        if (refAreaLeft !== null) return;

        const baseIndex = Number(state.activeTooltipIndex);
        if (isNaN(baseIndex) || baseIndex < 0 || baseIndex >= chartData.length) return;

        const point = chartData[baseIndex];
        
        if (point) {
            if (isTouchDevice) {
                setSelectedData(point);
            } else {
                setHoveredData(point);
            }
        }
    }, [chartData, refAreaLeft, isTouchDevice]);

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


    const pinchRef = useRef<{ distance: number; centerRatio: number } | null>(null);

    const handleTouchStartBox = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 2 && chartContainerRef.current && chartData.length > 1) {
            const [t1, t2] = [e.touches[0], e.touches[1]];
            const rect = chartContainerRef.current.getBoundingClientRect();
            const distance = Math.abs(t1.clientX - t2.clientX);
            const centerX = (t1.clientX + t2.clientX) / 2;
            pinchRef.current = {
                distance,
                centerRatio: Math.min(1, Math.max(0, (centerX - rect.left) / rect.width))
            };
        }
    }, [chartData.length]);

    const handleTouchMoveBox = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
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
        }
    }, [chartData.length]);

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
        return headerDateFormatter.format(date);
    }, [headerDateFormatter]);

    const activeData: ChartDataPoint | null = selectedData ?? hoveredData;

    const renderRainLabel = (props: RainLabelProps) => {
        const { index } = props;

        if (index === undefined) return null;

        const point = chartData[index];
        
        const x = Number(props.x);
        const width = Number(props.width);
        const value = Number(props.value);

        if (
            !point ||
            isNaN(x) ||
            isNaN(width) ||
            isNaN(value) ||
            value <= 0
        ) {
            return null;
        }

        return (
            <text
                x={x + width / 2}
                y={22}
                textAnchor="middle"
                fill="white"
                fontSize={isMobileViewport ? 7 : 11}
                fontWeight="bold"
            >
                {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
            </text>
        );
    };

    const handleResetView = () => {
        if (startDate || endDate || tempStartDate || tempEndDate) {
            clearDates();
            if (onPeriodChange) onPeriodChange('24h');
        }
        if (chartData.length > 0) {
            setRange({ startIndex: 0, endIndex: chartData.length - 1 });
            setSelectedData(null);
            setRefAreaLeft(null);
            setRefAreaRight(null);
        }
    };

    const gradSuffix = `${rangeSettings.v1}-${rangeSettings.v2}-${rangeSettings.v3}-${rangeSettings.intensity ?? 50}`;

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

            <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
                <VStack align="start" spacing={1}>
                    <Text fontSize="lg" fontWeight="medium">{displayTitle}</Text>
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
                    {onSelectDepthRef && metric === 'moisture' && (
                        <Menu>
                            <MenuButton as={Button} size="xs" colorScheme="blue" variant={selectedDepthRef ? "solid" : "outline"} rightIcon={<MdArrowDropDown />} leftIcon={<Icon as={MdLayers} />}>
                                {selectedDepthRef ? `${selectedDepthRef}cm` : 'Profundidade Ref.'}
                            </MenuButton>
                            <MenuList bg="gray.800" borderColor="gray.600" zIndex={2000}>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => onSelectDepthRef(null)}>Geral / Padrão (Sem trava)</MenuItem>
                                {[10, 20, 30, 40, 50, 60].map(depth => (
                                    <MenuItem key={depth} bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => onSelectDepthRef(depth)}>Travar em {depth}cm</MenuItem>
                                ))}
                            </MenuList>
                        </Menu>
                    )}

                    {(startDate || endDate) && (
                        <Button size="xs" colorScheme="red" onClick={handleResetView} px={1} title="Limpar Filtro"><Icon as={MdClose} /></Button>
                    )}

                    {onPeriodChange && (
                        <Menu>
                            <MenuButton as={Button} size="xs" colorScheme={startDate || endDate ? "blue" : "blue"} variant={startDate || endDate ? "solid" : "outline"} rightIcon={<MdArrowDropDown />} leftIcon={<MdFilterList />}>
                                {startDate || endDate ? 'Personalizado' : selectedPeriod}
                            </MenuButton>
                            <MenuList bg="gray.800" borderColor="gray.600" zIndex={2000}>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => { clearDates(); onPeriodChange('24h'); }}>Últimas 24h</MenuItem>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => { clearDates(); onPeriodChange('7d'); }}>Últimos 7 Dias</MenuItem>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => { clearDates(); onPeriodChange('15d'); }}>Últimos 15 Dias</MenuItem>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => { clearDates(); onPeriodChange('30d'); }}>Últimos 30 Dias</MenuItem>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => { clearDates(); onPeriodChange('60d'); }}>Últimos 60 Dias</MenuItem>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => { clearDates(); onPeriodChange('90d'); }}>Últimos 90 Dias</MenuItem>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => { clearDates(); onPeriodChange('120d'); }}>Últimos 120 Dias</MenuItem>
                            </MenuList>
                        </Menu>
                    )}

                    <Popover placement="bottom-end" isLazy isOpen={isPopoverOpen} onOpen={onPopoverOpen} onClose={onPopoverClose} closeOnBlur={false}>
                        <PopoverTrigger>
                            <Button size="xs" variant="outline" colorScheme="blue" leftIcon={<Icon as={MdDateRange} />} />
                        </PopoverTrigger>
                        <PopoverContent bg="gray.800" borderColor="gray.600" p={3} w="auto" boxShadow="xl" zIndex={2000}>
                            <PopoverArrow bg="gray.800" />
                            <PopoverBody>
                                <VStack spacing={3} align="stretch">
                                    <FormControl>
                                        <FormLabel fontSize="xs" color="gray.400" mb={1}>Data Inicial</FormLabel>
                                        <Input size="xs" type="date" value={tempStartDate} onClick={(e) => {
                                            try {
                                                if ('showPicker' in HTMLInputElement.prototype) {
                                                    e.currentTarget.showPicker();
                                                }
                                            } catch (e) { console.debug(e); }
                                        }} onChange={(e) => {
                                            setTempStartDate(e.target.value);
                                            if (e.target.value && endDateRef.current) {
                                                setTimeout(() => {
                                                    try {
                                                        if ('showPicker' in HTMLInputElement.prototype) {
                                                            endDateRef.current?.showPicker();
                                                        } else {
                                                            endDateRef.current?.focus();
                                                        }
                                                    } catch {
                                                        endDateRef.current?.focus();
                                                    }
                                                }, 50);
                                            }
                                        }} />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="xs" color="gray.400" mb={1}>Data Final</FormLabel>
                                        <Input ref={endDateRef} size="xs" type="date" value={tempEndDate} onClick={(e) => {
                                            try {
                                                if ('showPicker' in HTMLInputElement.prototype) {
                                                    e.currentTarget.showPicker();
                                                }
                                            } catch (e) { console.debug(e); }
                                        }} onChange={(e) => setTempEndDate(e.target.value)} />
                                    </FormControl>
                                    <Button 
                                        size="xs" 
                                        colorScheme="blue" 
                                        onClick={handleApplyFilters} 
                                        isDisabled={!tempStartDate || !tempEndDate}
                                    >
                                        Aplicar filtros
                                    </Button>
                                </VStack>
                            </PopoverBody>
                        </PopoverContent>
                    </Popover>

                    {isAdmin && (
                        <ChakraTooltip label="Configurar Zonas" hasArrow>
                            <Button size="xs" onClick={onOpen} colorScheme="blue" variant="outline"><Icon as={MdSettings} boxSize={4} /></Button>
                        </ChakraTooltip>
                    )}

                    <Button size="xs" leftIcon={<Icon as={MdZoomOutMap} />} onClick={handleResetView} colorScheme="blue" variant="outline" isDisabled={!chartData.length}>
                        Ver Tudo
                    </Button>
                </Flex>
            </Flex>

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
                        <HStack borderRight={{ base: "none", md: "1px solid" }} borderBottom={{ base: "1px solid", md: "none" }} borderColor="gray.600" pr={{ base: 0, md: 3 }} pb={{ base: 2, md: 0 }} w={{ base: "100%", md: "auto" }} spacing={2}>
                            <Icon as={MdCalendarToday} color="gray.400" boxSize={3} />
                            <Text fontSize="xs" fontWeight="bold">{formatDateHeader(activeData.time)}</Text>
                        </HStack>

                        <Flex wrap="wrap" gap={3} align="center">
                            {metric === 'moisture' && activeData.precipitacao !== undefined && activeData.precipitacao > 0 && (
                                <HStack spacing={1.5}>
                                    <Box w="6px" h="6px" borderRadius="full" bg="#4299E1" />
                                    <Text fontSize="10px" color="blue.200">Chuva:</Text>
                                    <Text fontSize="xs" fontWeight="bold">{activeData.precipitacao.toFixed(1)}mm</Text>
                                </HStack>
                            )}

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

            <Box
                h={{ base: "260px", md: "500px" }}
                w="100%"
                ref={chartContainerRef}
                cursor="crosshair"
                onTouchStart={handleTouchStartBox}
                onTouchMove={handleTouchMoveBox}
                onTouchEnd={() => { pinchRef.current = null; }}
                style={{ touchAction: 'pan-y' }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={
                            isMobileViewport
                                ? { top: 25, right: metric === 'temperature' ? 30 : 7, left: -34, bottom: -15 }
                                : { top: 25, right: metric === 'temperature' ? 32 : 5, left: -34, bottom: 0 }
                        }
                        onMouseLeave={() => {
                            if (!isTouchDevice) {
                                setSelectedData(null);
                                setHoveredData(null);
                            }
                        }}
                        onMouseMove={(state) => {
                            if (!isTouchDevice && state && state.activeLabel) {
                                if (refAreaLeft) setRefAreaRight(String(state.activeLabel));
                            }
                            handleChartInteraction(state);
                        }}
                        onMouseDown={(e) => {
                            if (!isTouchDevice && e && e.activeLabel) setRefAreaLeft(String(e.activeLabel));
                        }}
                        onMouseUp={handleZoom}
                        onTouchMove={(state) => handleChartInteraction(state)}
                        onTouchStart={(state) => handleChartInteraction(state)}
                        barCategoryGap={0}
                        barGap={0}
                    >
                        <defs>
                            {(() => {
                                const intensity = rangeSettings.intensity ?? 50;
                                const renderStops = (colorMain: string, colorNext: string) => (
                                    <>
                                        <stop offset="0%" stopColor={colorMain} />
                                        <stop offset={`${intensity}%`} stopColor={colorMain} />
                                        <stop offset="100%" stopColor={intensity === 100 ? colorMain : colorNext} />
                                    </>
                                );
                                return (
                                    <>
                                        <linearGradient id={`zone-1-${gradSuffix}`} x1="0" y1="1" x2="0" y2="0">{renderStops("#E53E3E", "#D69E2E")}</linearGradient>
                                        <linearGradient id={`zone-2-${gradSuffix}`} x1="0" y1="1" x2="0" y2="0">{renderStops("#D69E2E", "#38A169")}</linearGradient>
                                        <linearGradient id={`zone-3-${gradSuffix}`} x1="0" y1="1" x2="0" y2="0">{renderStops("#38A169", "#3182CE")}</linearGradient>
                                        <linearGradient id="temp-zone" x1="0" y1="1" x2="0" y2="0">
                                            <stop offset="0%" stopColor="#7da3c9" />
                                            <stop offset="100%" stopColor="#003D7A" />
                                        </linearGradient>
                                    </>
                                );
                            })()}
                        </defs>

                        <CartesianGrid yAxisId="left" horizontal={true} vertical={false} stroke="#3179c7" strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                            dataKey="time"
                            type="category"
                            interval={0}
                            ticks={xTicks}
                            tickFormatter={(val) => {
                                try {
                                    const date = new Date(val);
                                    if (isHighResolution) {
                                        const parts = axisDateFormatter.formatToParts(date);
                                        const day = parts.find(p => p.type === 'day')?.value;
                                        const month = parts.find(p => p.type === 'month')?.value;

                                        return `${day}/${month}`;
                                    }
                                    return axisDayFormatter.format(date);
                                } catch { return ''; }
                            }}
                            tick={{ fill: '#6b7280', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                        />

                        <YAxis yAxisId="left" domain={activeYDomain as [number, number]} ticks={leftTicks} tick={{ fill: '#6b7280', fontSize: isMobileViewport ? 9 : 10 }} axisLine={false} tickLine={false} allowDataOverflow label={({ viewBox }) => (<text x={viewBox.x + viewBox.width} y={viewBox.y / 2} textAnchor="middle" fill="#6b7280" fontSize={isMobileViewport ? 9 : 12}>%</text>)} />

                        {metric === 'moisture' && (
                            <YAxis yAxisId="right" orientation="right" reversed={true} domain={MM_DOMAIN} ticks={mmTicks} tick={{ fill: '#6b7280', fontSize: isMobileViewport ? 9 : 10 }} axisLine={false} tickLine={false} hide={false} width={isMobileViewport ? 24 : 30} label={({ viewBox }) => (<text x={viewBox.x + viewBox.width - 20} y={viewBox.y / 2} textAnchor="middle" fill="#6b7280" fontSize={isMobileViewport ? 9 : 12}>mm</text>)} />
                        )}

                        {showZones && metric === 'moisture' && (
                            <>
                                {renderZone(0, rangeSettings.v1, `url(#zone-1-${gradSuffix})`, "z-critico")}
                                {renderZone(rangeSettings.v1, rangeSettings.v2, `url(#zone-2-${gradSuffix})`, "z-alerta")}
                                {renderZone(rangeSettings.v2, rangeSettings.v3, `url(#zone-3-${gradSuffix})`, "z-ideal")}
                                {renderZone(rangeSettings.v3, 100, "#3182CE", "z-saturado")}
                            </>
                        )}

                        {metric === 'temperature' && renderZone(0, 100, "url(#temp-zone)", "temp-zone")}

                        {metric === 'moisture' && (
                            <Bar
                                dataKey="precipitacao"
                                yAxisId="right"
                                fill="#0010f1"
                                opacity={0.8}
                                barSize={isMobileViewport ? (isHighResolution ? 18 : 26) : (isHighResolution ? 6 : 15)}
                                isAnimationActive={useLightAnimations}
                                animationDuration={useLightAnimations ? 400 : 0}
                                name="Chuva"
                            >
                                <LabelList dataKey="displayRainLabel" content={renderRainLabel} />
                            </Bar>
                        )}

                        {Object.entries(DEPTH_COLORS).map(([key, color]) => (
                            visibleLines[key] && (
                                <Line key={`${key}-${selectedPeriod}`} yAxisId="left" type="basis" dataKey={key} stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 1 }} isAnimationActive={useLightAnimations} animationDuration={useLightAnimations ? 500 : 0} animationEasing="ease-in-out" connectNulls />
                            )
                        ))}

                        <Tooltip
                            shared={true}
                            cursor={{ stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1 }}
                            content={() => null}
                        />

                        {refAreaLeft && refAreaRight && <ReferenceArea yAxisId="left" x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#8884d8" fillOpacity={0.3} />}
                    </ComposedChart>
                </ResponsiveContainer>
            </Box>

            <Flex w="100%" justify={{ base: "space-between", md: "flex-start" }} wrap="nowrap" gap={{ base: 1, md: 4 }} pt={4}>
                {Object.entries(DEPTH_COLORS)
                    .filter(([key]) => {
                        const depth = parseInt(key.replace('depth', ''));
                        return depth >= 10 && depth <= 60;
                    })
                    .sort(([a], [b]) => parseInt(a.replace('depth', '')) - parseInt(b.replace('depth', '')))
                    .map(([key, color]) => (
                        <Checkbox key={key} isChecked={visibleLines[key]} onChange={() => toggleLine(key)} colorScheme="blue" iconColor="white" size={{ base: "sm", md: "md" }} sx={{ '.chakra-checkbox__label': { marginStart: { base: 1, md: 2 } } }}>
                            <HStack spacing={0.5}>
                                <Box w={{ base: "6px", md: "8px" }} h={{ base: "6px", md: "8px" }} borderRadius="full" bg={color} opacity={visibleLines[key] ? 1 : 0.4} />
                                <Text fontSize={{ base: "9px", sm: "10px", md: "xs" }} color={visibleLines[key] ? 'gray.300' : 'gray.600'} whiteSpace="nowrap">
                                    {key.replace('depth', '')}cm
                                </Text>
                            </HStack>
                        </Checkbox>
                    ))}
            </Flex>
        </Box >
    );
}