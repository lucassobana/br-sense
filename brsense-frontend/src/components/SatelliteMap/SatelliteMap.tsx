import React, { useState, useEffect, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, CircleMarker, Polyline } from 'react-leaflet';
import { Box, VStack, Fade, IconButton, useToast, Tooltip, Select, Text, HStack } from '@chakra-ui/react';
import { MdAdd, MdRemove, MdMyLocation, MdWaterDrop } from 'react-icons/md';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Measurement, RadarFrame } from '../../types';
import { COLORS } from '../../colors/colors';
import { PiAlignTopSimpleFill } from "react-icons/pi";
import { ProbeCard } from '../ProbeCard/ProbeCard';
import { calculateRainStats } from '../../utils/rainUtils';
import { RainViewerRadarLayer } from "../RainViewer/RainViewer";
import { RainViewerTimeline } from '../RainViewer/RainViewerTimeline';


// Profundidades disponíveis
const AVAILABLE_DEPTHS = [10, 20, 30, 40, 50, 60];

// Tipos de período de chuva
export type RainPeriod = '1h' | '24h' | '7d' | '15d' | '30d';

// --- Configuração de Ícones Dinâmicos ---
const createCustomIcon = (color: string, rainValue: number | null, showRain: boolean) => {
    const IconComponent = PiAlignTopSimpleFill;

    // Renderiza o ícone e, opcionalmente, a badge de chuva
    const iconMarkup = renderToStaticMarkup(
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Badge de Chuva (aparece apenas se showRain for true) */}
            {showRain && (
                <div style={{
                    position: 'absolute',
                    top: '-24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#3182CE',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    boxShadow: '0px 2px 5px rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    zIndex: 1000
                }}>
                    {rainValue !== null ? `${rainValue.toFixed(1)} mm` : '--'}
                    {/* Seta/triângulo apontando para baixo */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-4px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '0',
                        height: '0',
                        borderLeft: '4px solid transparent',
                        borderRight: '4px solid transparent',
                        borderTop: '4px solid #3182CE',
                    }} />
                </div>
            )}

            {/* Ícone da Sonda */}
            <div style={{
                color: color,
                fontSize: '32px',
                filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.6))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%'
            }}>
                <IconComponent />
            </div>
        </div>
    );

    return L.divIcon({
        html: iconMarkup,
        className: 'custom-marker-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 30],
        popupAnchor: [0, -32]
    });
};

export interface MapPoint {
    id: number;
    esn: string;
    lat: number;
    lng: number;
    statusCode: string;
    readings: Measurement[];
    config_min?: number;
    config_max?: number;
}

interface DisplayMapPoint extends MapPoint {
    displayLat: number;
    displayLng: number;
    isDisplaced: boolean;
}

interface SatelliteMapProps {
    points: MapPoint[];
    center?: [number, number];
    zoom?: number;
    onViewGraph: (deviceId: number) => void;
    initialCenter?: { lat: number; lng: number } | null;
}

const MapRecenter = ({ center, zoom }: { center: [number, number] | null, zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom, { duration: 1.5 });
        }
    }, [center, zoom, map]);
    return null;
};

const MapClickHandler = ({ onMapClick }: { onMapClick: () => void }) => {
    useMapEvents({
        click: () => onMapClick(),
    });
    return null;
};

const MapControls = ({
    onLocationFound,
    showRain,
    onToggleRainWithZoom,
}: {
    onLocationFound: (pos: [number, number]) => void;
    showRain: boolean;
    onToggleRainWithZoom: () => void;
}) => {
    const map = useMap();
    const toast = useToast();
    const [loadingLoc, setLoadingLoc] = useState(false);

    const handleLocate = () => {
        if (!navigator.geolocation) {
            toast({
                title: "Erro",
                description: "Geolocalização não suportada.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setLoadingLoc(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const newPos: [number, number] = [latitude, longitude];
                map.flyTo(newPos, 15, { duration: 1.5 });
                onLocationFound(newPos);
                setLoadingLoc(false);
            },
            (error) => {
                console.error("Erro de localização:", error);
                setLoadingLoc(false);
                let msg = "Não foi possível obter sua localização.";
                if (error.code === error.PERMISSION_DENIED) msg = "Permissão de localização negada.";

                toast({
                    title: "Erro de Localização",
                    description: msg,
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    return (
        <Box
            position="absolute"
            top="10px"
            right="10px"
            zIndex={1000}
            display="flex"
            flexDirection="column"
            gap={2}
        >
            <VStack spacing={2}>
                <Tooltip label="Aumentar Zoom" placement="left">
                    <IconButton
                        aria-label="Zoom In"
                        icon={<MdAdd size={20} />}
                        onClick={() => map.zoomIn()}
                        bg="white" color="gray.600" size="sm" isRound boxShadow="md" _hover={{ bg: "gray.100" }}
                    />
                </Tooltip>
                <Tooltip label="Diminuir Zoom" placement="left">
                    <IconButton
                        aria-label="Zoom Out"
                        icon={<MdRemove size={20} />}
                        onClick={() => map.zoomOut()}
                        bg="white" color="gray.600" size="sm" isRound boxShadow="md" _hover={{ bg: "gray.100" }}
                    />
                </Tooltip>
                <Tooltip label="Minha Localização" placement="left">
                    <IconButton
                        aria-label="Minha Localização"
                        icon={<MdMyLocation size={18} />}
                        onClick={handleLocate}
                        isLoading={loadingLoc}
                        bg="white"
                        color={loadingLoc ? "blue.400" : "gray.600"}
                        size="sm" isRound boxShadow="md" _hover={{ bg: "gray.100" }}
                    />
                </Tooltip>

                {/* Botão de Pluviômetro */}
                <Tooltip label={showRain ? "Ocultar Chuva" : "Mostrar Chuva (mm)"} placement="left">
                    <IconButton
                        aria-label="Toggle Rain"
                        icon={<MdWaterDrop size={18} />}
                        onClick={onToggleRainWithZoom}
                        bg={showRain ? "blue.500" : "white"}
                        color={showRain ? "white" : "blue.500"}
                        size="sm"
                        isRound
                        boxShadow="md"
                        _hover={{ bg: showRain ? "blue.600" : "gray.100" }}
                    />
                </Tooltip>
            </VStack>
        </Box>
    );
};

const ZoomWatcher = ({
    showRain,
    setZoomWarning,
}: {
    showRain: boolean;
    setZoomWarning: (v: boolean) => void;
}) => {
    const map = useMap();

    useEffect(() => {
        const handler = () => {
            setZoomWarning(showRain && map.getZoom() > 9);
        };

        handler();
        map.on("zoomend", handler);
        return () => {
            map.off("zoomend", handler);
        };
    }, [map, showRain, setZoomWarning]);

    return null;
};


export const SatelliteMap: React.FC<SatelliteMapProps> = ({
    points,
    center = [-22.4319, -46.9578],
    zoom = 13,
    onViewGraph,
    initialCenter
}) => {
    const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    // Estados para os Controles no Mapa
    const [selectedDepth, setSelectedDepth] = useState<number>(20);
    const [showRain, setShowRain] = useState<boolean>(false);
    const [rainPeriod, setRainPeriod] = useState<RainPeriod>('24h'); // Padrão: 24h

    const [activeCenter, setActiveCenter] = useState<[number, number]>(() => {
        if (initialCenter) {
            return [initialCenter.lat, initialCenter.lng];
        }
        return center;
    });

    const [activeZoom, setActiveZoom] = useState(() => {
        return initialCenter ? 15 : zoom;
    });

    const [isInitialized, setIsInitialized] = useState(() => {
        if (initialCenter) return true;
        if (!navigator.geolocation) return true;
        return false;
    });

    // Helper para calcular a cor baseada na leitura da profundidade selecionada
    const getMarkerColorForDepth = (point: MapPoint, depth: number) => {
        const reading = point.readings.find(r => r.depth_cm === depth);

        if (!reading || reading.moisture_pct === null) return '#A0AEC0'; // Cinza (Sem dados)

        const value = reading.moisture_pct;
        const min = point.config_min ?? 45;
        const max = point.config_max ?? 55;

        if (value < min) return '#F56565'; // Vermelho (Crítico/Baixo)
        if (value > max) return '#0BC5EA'; // Azul (Saturado/Alto)
        return '#48BB78'; // Verde (OK)
    };

    const rainStatsByPoint = useMemo(() => {
        const map: Record<number, Record<RainPeriod, number>> = {};

        points.forEach(point => {
            map[point.id] = calculateRainStats(point.readings);
        });

        return map;
    }, [points]);

    // --- Dispersão de Pontos ---
    const processedPoints = useMemo(() => {
        const grouped: Record<string, MapPoint[]> = {};
        points.forEach(p => {
            const key = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(p);
        });

        const result: DisplayMapPoint[] = [];
        Object.values(grouped).forEach(group => {
            if (group.length === 1) {
                result.push({
                    ...group[0],
                    displayLat: group[0].lat,
                    displayLng: group[0].lng,
                    isDisplaced: false
                });
            } else {
                const count = group.length;
                const angleStep = (2 * Math.PI) / count;
                const radius = 0.0003;
                group.forEach((p, index) => {
                    const angle = index * angleStep;
                    const latOffset = radius * Math.cos(angle);
                    const lngOffset = radius * Math.sin(angle);
                    result.push({
                        ...p,
                        displayLat: p.lat + latOffset,
                        displayLng: p.lng + lngOffset,
                        isDisplaced: true
                    });
                });
            }
        });
        return result;
    }, [points]);

    useEffect(() => {
        if (isInitialized) return;
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setActiveCenter([latitude, longitude]);
                setActiveZoom(15);
                setUserLocation([latitude, longitude]);
                setIsInitialized(true);
            },
            (error) => {
                console.warn("Auto-locate falhou no inicio", error);
                setIsInitialized(true);
            }
        );
    }, [isInitialized]);

    const rainOpacity = 1;
    const [showZoomWarning, setShowZoomWarning] = useState(false);

    const [radarFrames, setRadarFrames] = useState<RadarFrame[]>([]);
    const [frameIndex, setFrameIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const fetchRadar = async () => {
            try {
                const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
                const data = await res.json();
                setRadarFrames(data.radar?.past ?? []);
                setFrameIndex((data.radar?.past?.length ?? 1) - 1);
            } catch (e) {
                console.error("Erro RainViewer", e);
            }
        };

        fetchRadar();
        const t = setInterval(fetchRadar, 10 * 60 * 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (!isPlaying || radarFrames.length === 0) return;

        const timer = setInterval(() => {
            setFrameIndex((i) => (i + 1) % radarFrames.length);
        }, 500);

        return () => clearInterval(timer);
    }, [isPlaying, radarFrames]);

    return (
        <Box
            position="relative"
            w="100%"
            h="100%"
            minH="500px"
            bg={COLORS.background}
            overflow="hidden"
            paddingTop='15px'
        >
            <style>
                {`
                .custom-marker-icon {
                    background: transparent !important;
                    border: none !important;
                }
                `}
            </style>

            <MapContainer
                center={activeCenter}
                zoom={activeZoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', borderRadius: '12px' }}
                zoomControl={false}
            >
                {showZoomWarning && (
                    <Box
                        position="absolute"
                        top="70px"
                        right="10px"
                        zIndex={1000}
                        bg="yellow.400"
                        color="black"
                        px={3}
                        py={2}
                        borderRadius="md"
                        fontSize="xs"
                        fontWeight="bold"
                        boxShadow="md"
                    >
                        Diminua o zoom para visualizar o radar
                    </Box>
                )}

                <MapRecenter center={activeCenter} zoom={activeZoom} />

                <TileLayer
                    attribution='&copy; Google Maps'
                    url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                    maxZoom={20}
                />

                <RainViewerRadarLayer
                    visible={showRain}
                    opacity={rainOpacity}
                    frames={radarFrames}
                    frameIndex={frameIndex}
                />

                {showRain && radarFrames.length > 0 && (
                    <RainViewerTimeline
                        framesCount={radarFrames.length}
                        frameIndex={frameIndex}
                        setFrameIndex={setFrameIndex}
                        isPlaying={isPlaying}
                        setIsPlaying={setIsPlaying}
                    />
                )}

                <ZoomWatcher
                    showRain={showRain}
                    setZoomWarning={setShowZoomWarning}
                />


                {/* <MapControls
                    onLocationFound={(pos) => setUserLocation(pos)}
                    showRain={showRain}
                    toggleRain={() => setShowRain(!showRain)}
                /> */}

                <MapControls
                    onLocationFound={(pos) => setUserLocation(pos)}
                    showRain={showRain}
                    onToggleRainWithZoom={() => {
                        setShowRain((prev) => !prev);
                    }}
                />


                {/* --- CONTROLES DE PROFUNDIDADE E CHUVA --- */}
                <Box
                    position="absolute"
                    top="10px"
                    left="50px"
                    zIndex={1000}
                    bg="rgba(255, 255, 255, 0.95)"
                    backdropFilter="blur(5px)"
                    borderRadius="md"
                    boxShadow="lg"
                    p={1.5}
                >
                    <HStack spacing={3} divider={<Box w="1px" h="20px" bg="gray.300" />}>

                        {/* Seletor de Profundidade */}
                        <HStack spacing={1} pl={1}>
                            <Text fontSize="xs" fontWeight="bold" color="gray.600">Profundidade:</Text>
                            <Select
                                size='sm'
                                width="88px"
                                value={selectedDepth}
                                onChange={(e) => setSelectedDepth(Number(e.target.value))}
                                bg="transparent"
                                border="none"
                                fontWeight="bold"
                                _focus={{ boxShadow: 'none' }}
                                cursor="pointer"
                            >
                                {AVAILABLE_DEPTHS.map(depth => (
                                    <option key={depth} value={depth}>{depth} cm</option>
                                ))}
                            </Select>
                        </HStack>

                        {/* Seletor de Período de Chuva (Aparece ao ativar botão) */}
                        {showRain && (
                            <HStack spacing={1} pr={1}>
                                <Text fontSize="xs" fontWeight="bold" color="blue.600">Chuva:</Text>
                                <Select
                                    size="sm"
                                    width="95px"
                                    value={rainPeriod}
                                    onChange={(e) => setRainPeriod(e.target.value as RainPeriod)}
                                    bg="transparent"
                                    border="none"
                                    fontWeight="bold"
                                    color="blue.600"
                                    _focus={{ boxShadow: 'none' }}
                                    cursor="pointer"
                                >
                                    <option value="1h">1 Hora</option>
                                    <option value="24h">24 Horas</option>
                                    <option value="7d">7 Dias</option>
                                    <option value="15d">15 Dias</option>
                                    <option value="30d">30 Dias</option>
                                </Select>
                            </HStack>
                        )}
                    </HStack>
                </Box>

                {userLocation && (
                    <CircleMarker
                        center={userLocation}
                        radius={8}
                        pathOptions={{
                            color: 'white',
                            fillColor: '#3182CE',
                            fillOpacity: 1,
                            weight: 2
                        }}
                    />
                )}

                <MapClickHandler onMapClick={() => setSelectedPoint(null)} />

                {/* Renderização dos pontos */}
                {processedPoints.map((point) => {
                    const markerColor = getMarkerColorForDepth(point, selectedDepth);
                    const rainVal = rainStatsByPoint[point.id]?.[rainPeriod] ?? 0;

                    return (
                        <React.Fragment key={point.id}>
                            {point.isDisplaced && (
                                <Polyline
                                    positions={[
                                        [point.lat, point.lng],
                                        [point.displayLat, point.displayLng]
                                    ]}
                                    pathOptions={{
                                        color: 'rgba(255,255,255,0.4)',
                                        weight: 1,
                                        dashArray: '3, 5'
                                    }}
                                />
                            )}

                            <Marker
                                position={[point.displayLat, point.displayLng]}
                                icon={createCustomIcon(markerColor, rainVal, showRain)}
                                eventHandlers={{
                                    click: (e) => {
                                        L.DomEvent.stopPropagation(e);
                                        setSelectedPoint(point);
                                    }
                                }}
                            />
                        </React.Fragment>
                    );
                })}
            </MapContainer>

            <Fade in={!!selectedPoint} unmountOnExit>
                {selectedPoint && (
                    <Box
                        position="absolute"
                        bottom={4}
                        left={4}
                        zIndex={1000}
                        bg="rgba(26, 32, 44, 0.95)"
                        borderRadius="xl"
                    >
                        <ProbeCard
                            point={selectedPoint}
                            onViewGraph={onViewGraph}
                            onClose={() => setSelectedPoint(null)}
                        />
                    </Box>
                )}
            </Fade>
        </Box>
    );
};