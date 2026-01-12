import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Box, Text, Button, VStack, HStack, Progress, CloseButton, Fade } from '@chakra-ui/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Measurement } from '../../types';

// --- Ícones (Mantidos) ---
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: iconMarker,
    iconRetinaUrl: iconRetina,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const createColorIcon = (color: string) => {
    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
};

const Icons = {
    green: createColorIcon('green'),
    gold: createColorIcon('gold'),
    red: createColorIcon('red'),
    blue: createColorIcon('blue'),
    grey: createColorIcon('grey')
};

export interface MapPoint {
    id: number;
    esn: string;
    lat: number;
    lng: number;
    statusCode: string;
    readings: Measurement[];
}

interface SatelliteMapProps {
    points: MapPoint[];
    center?: [number, number];
    zoom?: number;
    onViewGraph: (deviceId: number) => void;
}

// Componente para fechar o painel ao clicar no mapa vazio
const MapClickHandler = ({ onMapClick }: { onMapClick: () => void }) => {
    useMapEvents({
        click: () => onMapClick(),
    });
    return null;
};

export const SatelliteMap: React.FC<SatelliteMapProps> = ({
    points,
    center = [-15.793889, -47.882778],
    zoom = 13,
    onViewGraph
}) => {
    // Estado local para saber qual sonda foi clicada
    const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);

    // Helpers de Estilo
    const getProgressColor = (value: number) => {
        if (value < 25) return 'red';
        if (value < 50) return 'yellow';
        if (value < 75) return 'green';
        return 'cyan';
    };

    const getStatusLabel = (code: string) => {
        switch (code) {
            case 'status_critical': return 'Crítico';
            case 'status_alert': return 'Atenção';
            case 'status_ok': return 'Ideal';
            case 'status_saturated': return 'Saturado';
            default: return 'Offline';
        }
    };

    const getStatusColor = (code: string) => {
        switch (code) {
            case 'status_critical': return 'red.400';
            case 'status_alert': return 'yellow.400';
            case 'status_ok': return 'green.400';
            case 'status_saturated': return 'cyan.400';
            default: return 'gray.400';
        }
    };

    const getIconByStatus = (code: string) => {
        switch (code) {
            case 'status_saturated': return Icons.blue;
            case 'status_ok': return Icons.green;
            case 'status_alert': return Icons.gold;
            case 'status_critical': return Icons.red;
            default: return Icons.red;
        }
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

    // Prepara os dados do painel se houver seleção
    const profileData = selectedPoint ? getLatestReadingsByDepth(selectedPoint.readings) : [];

    return (
        <Box
            position="relative"
            w="100%"
            h="100%"
            minH="500px"
            bg="gray.900"
            overflow="hidden" // Garante que o painel não saia da área
        >
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false} // Removemos o zoom padrão para reposicionar se quiser
            >
                <TileLayer
                    attribution='&copy; Google Maps'
                    url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                    maxZoom={20}
                />

                {/* Fecha o painel ao clicar no mapa vazio */}
                <MapClickHandler onMapClick={() => setSelectedPoint(null)} />

                {points.map((point) => (
                    <Marker
                        key={point.id}
                        position={[point.lat, point.lng]}
                        icon={getIconByStatus(point.statusCode)}
                        eventHandlers={{
                            click: (e) => {
                                L.DomEvent.stopPropagation(e); // Evita fechar ao clicar
                                setSelectedPoint(point); // Abre o painel
                            }
                        }}
                    />
                ))}
            </MapContainer>

            {/* --- PAINEL FLUTUANTE (OVERLAY) --- */}
            <Fade in={!!selectedPoint} unmountOnExit>
                {selectedPoint && (
                    <Box
                        position="absolute"
                        bottom={4}    // Canto Inferior
                        left={4}      // Canto Esquerdo
                        zIndex={1000} // Acima do mapa
                        bg="rgba(26, 32, 44, 0.95)" // Fundo quase opaco (#1A202C)
                        backdropFilter="blur(5px)"
                        borderRadius="xl"
                        boxShadow="2xl"
                        width="260px"
                        p={3} // Padding reduzido (Compacto)
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                    >
                        {/* Header: Título e Fechar */}
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

                        {/* Corpo: Barras de Progresso */}
                        <VStack align="stretch" spacing={2} mt={2} mb={3}>
                            {profileData.length > 0 ? profileData.map((r) => (
                                <HStack key={r.depth_cm} spacing={2}>
                                    <Text fontSize="2xs" color="gray.400" w="30px" fontWeight="medium">
                                        {r.depth_cm}cm
                                    </Text>
                                    <Box flex="1">
                                        <Progress
                                            value={r.moisture_pct}
                                            size="xs" // Barra super fina (Minimalista)
                                            borderRadius="full"
                                            colorScheme={getProgressColor(r.moisture_pct)}
                                            bg="whiteAlpha.200"
                                        />
                                    </Box>
                                </HStack>
                            )) : (
                                <Text fontSize="xs" color="gray.500">Sem dados recentes.</Text>
                            )}
                        </VStack>

                        {/* Footer: Botão */}
                        <Button
                            colorScheme="blue"
                            size="xs" // Botão menor e mais elegante
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