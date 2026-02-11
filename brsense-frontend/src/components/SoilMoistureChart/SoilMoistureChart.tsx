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
    useToast,
    Menu,
    MenuButton,
    MenuList,
    MenuItem
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
    Brush,
    Tooltip,
    LabelList
} from 'recharts';
import {
    MdZoomOutMap,
    MdSettings,
    MdCalendarToday,
    MdFilterList,
    MdArrowDropDown
} from 'react-icons/md';
import { COLORS, DEPTH_COLORS } from '../../colors/colors';
import { MoistureRangeModal } from '../MoistureRangeModal/MoistureRangeModal';
import { updateDeviceConfig } from '../../services/api';

// Tipos
export type TimeRange = '24h' | '7d' | '15d' | '30d';

export interface RawApiData {
    timestamp: string;
    depth_cm: number;
    moisture_pct: number | null;
    temperature_c: number | null;
    rain_cm?: number | null;
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
    initialMin?: number;
    initialMax?: number;
    onConfigUpdate?: () => void;
    selectedPeriod?: TimeRange;
    onPeriodChange?: (period: TimeRange) => void;
}

interface RainLabelProps {
    x?: number;
    y?: number;
    width?: number;
    value?: number;
    index?: number;
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
    onConfigUpdate,
    selectedPeriod = '24h',
    onPeriodChange
}: ChartProps) {

    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const chartContainerRef = useRef<HTMLDivElement>(null);

    // --- CONFIGURAÇÃO DE ZONAS ---
    const storageKey = `BRSENSE_${metric.toUpperCase()}_RANGES`;
    const defaultRanges = metric === 'moisture' ? { min: 45, max: 55 } : { min: 20, max: 30 };

    const [rangeSettings, setRangeSettings] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : defaultRanges;
        } catch { return defaultRanges; }
    });

    useEffect(() => {
        if (rangeSettings.min !== initialMin || rangeSettings.max !== initialMax) {
            setRangeSettings({ min: initialMin, max: initialMax });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialMin, initialMax]);

    const handleSaveConfig = async (newRanges: { min: number; max: number }) => {
        setRangeSettings(newRanges);
        if (esn && isAdmin) {
            try {
                await updateDeviceConfig(esn, newRanges.min, newRanges.max);
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

    // Estados para interação manual (Hover/Click)
    const [hoveredData, setHoveredData] = useState<ChartDataPoint | null>(null);
    const [selectedData, setSelectedData] = useState<ChartDataPoint | null>(null);
    const [range, setRange] = useState({ startIndex: 0, endIndex: 0 });

    const isTouchDevice = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(pointer: coarse)').matches;
    }, []);

    // --- PROCESSAMENTO DE DADOS (Mantido a lógica nova de agrupamento) ---
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const groupedMap = new Map<number, {
            counts: Record<string, number>;
            sums: Record<string, number>;
            rainSum: number;
        }>();

        data.forEach(item => {
            if (!item.timestamp) return;
            const date = new Date(item.timestamp);
            if (isNaN(date.getTime())) return;

            let timeKey: number;
            // Se for 24h, usa o tempo exato. Se for maior, agrupa por dia.
            if (selectedPeriod === '24h' || selectedPeriod === '7d') {
                timeKey = date.getTime();
            } else {
                date.setHours(0, 0, 0, 0);
                timeKey = date.getTime();
            }

            if (!groupedMap.has(timeKey)) {
                groupedMap.set(timeKey, { counts: {}, sums: {}, rainSum: 0 });
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
                        group.sums[depthKey] = (group.sums[depthKey] || 0) + val;
                        group.counts[depthKey] = (group.counts[depthKey] || 0) + 1;
                    }
                }
            }
        });

        const sortedTs = Array.from(groupedMap.keys()).sort((a, b) => a - b);

        return sortedTs.map((ts, index) => {
            const group = groupedMap.get(ts)!;
            const newItem: ChartDataPoint & { index: number } = {
                index,
                time: new Date(ts).toISOString(),
                ...(metric === 'moisture' ? { precipitacao: group.rainSum } : {})
            };
            Object.keys(group.sums).forEach(key => {
                newItem[key] = group.sums[key] / group.counts[key];
            });
            return newItem;
        });
    }, [data, metric, selectedPeriod]);

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

    // --- ESCALA Y DINÂMICA ---
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

    // --- HANDLER MANUAL DE TOUCH (Restaurado do seu código) ---
    const handleTouch = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!chartContainerRef.current || chartData.length === 0) return;

        const touch = e.touches[0];
        if (!touch) return;

        const rect = chartContainerRef.current.getBoundingClientRect();
        // Leva em conta a margem esquerda do gráfico (-20px ajustados no visual)
        const x = touch.clientX - rect.left;

        const ratio = x / rect.width;

        // Calcula o índice baseado no range de zoom atual
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
    };

    // --- FECHAR SELEÇÃO AO TOCAR FORA (Restaurado) ---
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

    const toggleLine = (key: string) => setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));

    const renderZone = (y1: number, y2: number, fill: string) => {
        const [currentMin, currentMax] = activeYDomain as [number, number];
        const effectiveY1 = Math.max(y1, currentMin);
        const effectiveY2 = Math.min(y2, currentMax);
        if (effectiveY1 < effectiveY2) {
            return <ReferenceArea key={`${y1}-${y2}`} yAxisId="left" y1={effectiveY1} y2={effectiveY2} fill={fill} fillOpacity={1} strokeOpacity={0} />;
        }
        return null;
    };

    const formatDateHeader = (isoStr?: string) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        const showTime = selectedPeriod === '24h' || selectedPeriod === '7d';
        const timeStr = showTime ? ` ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
        return d.toLocaleDateString('pt-BR') + timeStr;
    };

    // Dados ativos para exibição (Prioridade: Seleção Touch > Hover Mouse)
    const activeData: ChartDataPoint | null = selectedData ?? hoveredData;

    const [activeIndex, setActiveIndex] = useState<number | null>(null);

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

                <HStack spacing={2}>
                    {/* MENU DROPDOWN DE PERÍODO */}
                    {onPeriodChange && (
                        <Menu>
                            <MenuButton
                                as={Button}
                                size="xs"
                                colorScheme="blue"
                                variant="outline"
                                rightIcon={<MdArrowDropDown />}
                                leftIcon={<MdFilterList />}
                            >
                                {selectedPeriod}
                            </MenuButton>
                            <MenuList bg="gray.800" borderColor="gray.600" zIndex={2000}>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => onPeriodChange('24h')}>Últimas 24h</MenuItem>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => onPeriodChange('7d')}>Últimos 7 Dias</MenuItem>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => onPeriodChange('15d')}>Últimos 15 Dias</MenuItem>
                                <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} onClick={() => onPeriodChange('30d')}>Últimos 30 Dias</MenuItem>
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
                        onClick={() => {
                            if (chartData.length > 0) {
                                setRange({ startIndex: 0, endIndex: chartData.length - 1 });
                                setSelectedData(null);
                            }
                        }}
                        colorScheme="blue"
                        variant="outline"
                        isDisabled={!chartData.length}
                    >
                        Ver Tudo
                    </Button>
                </HStack>
            </Flex>

            {/* --- PAINEL DE INFORMAÇÕES (TOOLTIP FIXO) --- */}
            <Box
                transition="all 0.25s ease"
                opacity={activeData ? 1 : 0}
                transform={activeData ? "translateY(0)" : "translateY(-6px)"}
                pointerEvents={activeData ? "auto" : "none"}
                mb={activeData ? 2 : 0}
                minH="32px"
            >
                {activeData && (
                    <Flex bg="rgba(30, 41, 59, 0.8)" px={3} py={1} borderRadius="md" align="center" gap={4} wrap="wrap" w="fit-content">
                        <HStack borderRight="1px solid" borderColor="gray.600" pr={3} spacing={2}>
                            <Icon as={MdCalendarToday} color="gray.400" boxSize={3} />
                            <Text fontSize="xs" fontWeight="bold">
                                {formatDateHeader(activeData.time)}
                            </Text>
                        </HStack>

                        <HStack spacing={3}>
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
                                            {(activeData[key] as number).toFixed(0)}{metric === 'moisture' ? '%' : '°C'}
                                        </Text>
                                    </HStack>
                                ))}
                        </HStack>
                    </Flex>
                )}
            </Box>

            {/* --- CONTAINER DO GRÁFICO (Handlers de Touch aqui!) --- */}
            <Box
                h={{ base: "300", md: "500px" }}
                w="100%"
                ref={chartContainerRef}
                cursor="crosshair"
                // Handlers manuais para MOBILE (Touch)
                onTouchStart={handleTouch}
                onTouchMove={handleTouch}
                // Importante: touch-action none permite arrastar no gráfico sem scrollar a página
                style={{ touchAction: 'none' }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                        // Handler nativo para DESKTOP (Mouse)
                        onMouseLeave={() => !isTouchDevice && setHoveredData(null)}
                    >
                        <defs>
                            {/* Zona ALTA */}
                            <linearGradient id="zone-high" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor="#39a883" />
                                <stop offset="100%" stopColor="#307dd6" />
                            </linearGradient>

                            {/* Zona IDEAL */}
                            <linearGradient id="zone-ideal" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor="#ddc255" />
                                <stop offset="100%" stopColor="#39a883" />
                            </linearGradient>

                            {/* Zona BAIXA */}
                            <linearGradient id="zone-low" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor="#993636" />
                                <stop offset="100%" stopColor="#ddc255" />
                            </linearGradient>

                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="#3b4754" opacity={0.3} vertical={false} />

                        <XAxis
                            dataKey="time"
                            tickFormatter={(val) => {
                                try {
                                    const d = new Date(val);
                                    if (selectedPeriod === '24h' || selectedPeriod === '7d') {
                                        return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
                                    }
                                    const day = String(d.getDate()).padStart(2, '0');
                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                    return `${day}/${month}`;
                                } catch { return ''; }
                            }}
                            tick={{ fill: '#6b7280', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={40}
                        />

                        <YAxis
                            yAxisId="left"
                            domain={activeYDomain as [number, number]}
                            tick={{ fill: '#6b7280', fontSize: 10 }}
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
                                tick={{ fill: '#90cdf4', fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                hide={false}
                                unit="mm"
                                width={30}
                            />
                        )}


                        {/* {showZones && metric === 'moisture' && (
                            <>
                                {renderZone(rangeSettings.max, 100, "rgba(138, 196, 235, 0.7)")}
                                {renderZone(rangeSettings.min, rangeSettings.max, "rgba(149, 245, 152, 0.7)")}
                                {renderZone(0, rangeSettings.min, "rgba(241, 138, 138, 0.7)")}
                            </>
                        )} */}
                        {showZones && metric === 'moisture' && (
                            <>
                                {renderZone(rangeSettings.max, 100, "url(#zone-high)")}
                                {renderZone(rangeSettings.min, rangeSettings.max, "url(#zone-ideal)")}
                                {renderZone(0, rangeSettings.min, "url(#zone-low)")}
                            </>
                        )}


                        {metric === 'moisture' && (
                            <Bar
                                dataKey="precipitacao"
                                yAxisId="right"
                                fill="#0010f1"
                                opacity={0.8}
                                barSize={selectedPeriod === '30d' || selectedPeriod === '15d' ? 15 : 6}
                                isAnimationActive={false}
                                name="Chuva"
                            >
                                <LabelList dataKey="precipitacao" content={<RainLabel />} />
                            </Bar>

                        )}


                        {
                            Object.entries(DEPTH_COLORS).map(([key, color]) => (
                                visibleLines[key] && (
                                    <Line
                                        yAxisId="left"
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        stroke={color}
                                        strokeWidth={2.5}
                                        dot={false}
                                        activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 1 }}
                                        isAnimationActive={false}
                                        connectNulls
                                    />
                                )
                            ))
                        }

                        {/* TOOLTIP INVISÍVEL - TRUQUE PARA CAPTURAR HOVER NO DESKTOP */}
                        <Tooltip
                            cursor={{ stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1 }}
                            content={({ active, payload }) => {
                                if (!isTouchDevice) {
                                    if (active && payload && payload.length) {
                                        setHoveredData(payload[0].payload);
                                        setActiveIndex(payload[0].payload.index);
                                    } else {
                                        setHoveredData(null);
                                        setActiveIndex(null);
                                    }
                                }
                                return null;
                            }}
                        />


                        <Brush
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
                        />
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