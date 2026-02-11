import React, { useState, useEffect, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, CircleMarker, Polyline } from 'react-leaflet';
import { Box, Text, Button, VStack, HStack, Progress, CloseButton, Fade, IconButton, useToast, Tooltip } from '@chakra-ui/react';
import { MdAdd, MdRemove, MdMyLocation } from 'react-icons/md';
import { FaMapMarker } from 'react-icons/fa';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Measurement } from '../../types';
import { COLORS } from '../../colors/colors';
import { PiAlignTopSimpleFill } from "react-icons/pi"; // sonda
// import { FaGlassWaterDroplet } from "react-icons/fa6"; // pluviometro

// --- Configuração de Ícones (Mantida) ---
const createCustomIcon = (status: string) => {
    let color = '#CBD5E0';
    let IconComponent = FaMapMarker;

    switch (status) {
        case 'status_critical':
            color = '#F56565';
            IconComponent = PiAlignTopSimpleFill;
            break;
        case 'status_alert':
            color = '#ECC94B';
            IconComponent = PiAlignTopSimpleFill;
            break;
        case 'status_ok':
            color = '#48BB78';
            // IconComponent = FaCheckCircle;
            IconComponent = PiAlignTopSimpleFill;
            break;
        case 'status_saturated':
            color = '#0BC5EA';
            // IconComponent = FaTint;
            IconComponent = PiAlignTopSimpleFill;
            break;
        default:
            color = '#A0AEC0';
            IconComponent = PiAlignTopSimpleFill;
    }

    const iconMarkup = renderToStaticMarkup(
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

// Interface interna para pontos processados com deslocamento visual
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

const MapControls = ({ onLocationFound }: { onLocationFound: (pos: [number, number]) => void }) => {
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
            </VStack>
        </Box>
    );
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

    // --- NOVA LÓGICA: Dispersão de Pontos (Spiderify Manual) ---
    // 
    const processedPoints = useMemo(() => {
        // Agrupa pontos pela mesma localização (com precisão de 5 casas decimais)
        const grouped: Record<string, MapPoint[]> = {};

        points.forEach(p => {
            // Arredonda para considerar pontos "muito próximos" como o mesmo local
            const key = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(p);
        });

        const result: DisplayMapPoint[] = [];

        Object.values(grouped).forEach(group => {
            if (group.length === 1) {
                // Se o ponto está sozinho, usa coordenadas originais
                result.push({
                    ...group[0],
                    displayLat: group[0].lat,
                    displayLng: group[0].lng,
                    isDisplaced: false
                });
            } else {
                // Se houver sobreposição, distribui em círculo
                const count = group.length;
                const angleStep = (2 * Math.PI) / count;
                // Raio de deslocamento: 0.0003 graus (~33 metros)
                // Suficiente para separar visualmente no zoom alto, mas agrupar no zoom baixo
                const radius = 0.0003;

                group.forEach((p, index) => {
                    const angle = index * angleStep;
                    // Calcula novo deslocamento
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
    // -----------------------------------------------------------

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

    const getStatusLabel = (code: string) => {
        switch (code) {
            case 'status_critical': return 'Crítico';
            case 'status_ok': return 'Ideal';
            case 'status_saturated': return 'Saturado';
            default: return 'Offline';
        }
    };

    const getStatusColor = (code: string) => {
        switch (code) {
            case 'status_critical': return 'red.400';
            case 'status_ok': return 'green.400';
            case 'status_saturated': return 'cyan.400';
            default: return 'gray.400';
        }
    };

    const getProgressColor = (value: number, min: number = 45, max: number = 55) => {
        if (value < min) return 'red';
        if (value > max) return 'cyan';
        return 'green';
    };

    const getLatestReadingsByDepth = (readings: Measurement[]) => {
        const uniqueDepths = new Map<number, Measurement>();
        const sorted = [...readings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        sorted.forEach(reading => {
            if (reading.moisture_pct !== null && !uniqueDepths.has(reading.depth_cm)) {
                uniqueDepths.set(reading.depth_cm, reading);
            }
        });
        return Array.from(uniqueDepths.values()).sort((a, b) => a.depth_cm - b.depth_cm);
    };

    const profileData = selectedPoint ? getLatestReadingsByDepth(selectedPoint.readings) : [];

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
                <MapRecenter center={activeCenter} zoom={activeZoom} />

                <TileLayer
                    attribution='&copy; Google Maps'
                    url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                    maxZoom={20}
                />

                <MapControls onLocationFound={(pos) => {
                    setUserLocation(pos);
                }} />

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

                {/* Renderização dos pontos processados (com dispersão) */}
                {processedPoints.map((point) => (
                    <React.Fragment key={point.id}>
                        {/* Se o ponto foi deslocado, desenha uma linha pontilhada até a origem real */}
                        {point.isDisplaced && (
                            <Polyline
                                positions={[
                                    [point.lat, point.lng], // Centro real
                                    [point.displayLat, point.displayLng] // Posição visual
                                ]}
                                pathOptions={{
                                    color: 'rgba(255,255,255,0.4)',
                                    weight: 1,
                                    dashArray: '3, 5'
                                }}
                            />
                        )}

                        <Marker
                            position={[point.displayLat, point.displayLng]} // Usa posição calculada
                            icon={createCustomIcon(point.statusCode)}
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e);
                                    setSelectedPoint(point);
                                }
                            }}
                        />
                    </React.Fragment>
                ))}
            </MapContainer>

            <Fade in={!!selectedPoint} unmountOnExit>
                {selectedPoint && (
                    <Box
                        position="absolute"
                        bottom={4}
                        left={4}
                        zIndex={1000}
                        bg="rgba(26, 32, 44, 0.95)"
                        backdropFilter="blur(5px)"
                        borderRadius="xl"
                        boxShadow="2xl"
                        width="260px"
                        p={3}
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                    >
                        <HStack justify="space-between" align="start" mb={1}>
                            <VStack align="start" spacing={0}>
                                <Text fontWeight="bold" fontSize="md" color="white">
                                    Sonda - {selectedPoint.esn}
                                </Text>
                                <Text
                                    fontSize="xs"
                                    fontWeight="bold"
                                    color={getStatusColor(selectedPoint.statusCode)}
                                    textTransform="uppercase"
                                    letterSpacing="wide"
                                >
                                    Status: {getStatusLabel(selectedPoint.statusCode)}
                                </Text>
                            </VStack>
                            <CloseButton
                                size="sm"
                                color="gray.400"
                                onClick={() => setSelectedPoint(null)}
                                _hover={{ color: "white" }}
                            />
                        </HStack>

                        <VStack align="stretch" spacing={2} mt={2} mb={3}>
                            {profileData.map((r) => {
                                if (r.moisture_pct === null) return null;

                                return (
                                    <HStack key={r.depth_cm} spacing={2}>
                                        <Text fontSize="2xs" color="gray.400" w="30px" fontWeight="medium">
                                            {r.depth_cm}cm
                                        </Text>
                                        <Box flex="1">
                                            <Progress
                                                value={r.moisture_pct}
                                                size="xs"
                                                borderRadius="full"
                                                colorScheme={getProgressColor(
                                                    r.moisture_pct,
                                                    selectedPoint.config_min,
                                                    selectedPoint.config_max
                                                )}
                                                bg="whiteAlpha.200"
                                            />
                                        </Box>
                                    </HStack>
                                );
                            })}
                        </VStack>

                        <Button
                            colorScheme="blue"
                            size="xs"
                            h="28px"
                            w="full"
                            fontSize="xs"
                            fontWeight="bold"
                            onClick={() => onViewGraph(selectedPoint.id)}
                            _hover={{ bg: "blue.400" }}
                        >
                            VER GRÁFICO
                        </Button>
                    </Box>
                )}
            </Fade>
        </Box>
    );
};