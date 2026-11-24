import React, { useState, useEffect, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, CircleMarker, Polyline, GeoJSON } from 'react-leaflet';
import { Box, VStack, Fade, IconButton, useToast, Tooltip, Select, Text, HStack, Flex } from '@chakra-ui/react';
import { MdAdd, MdRemove, MdMyLocation, MdWaterDrop } from 'react-icons/md';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Measurement, RadarFrame, MapLayer, Farm } from '../../types';
import { COLORS } from '../../colors/colors';
import { PiAlignTopSimpleFill } from "react-icons/pi";
import { ProbeCard } from '../ProbeCard/ProbeCard';
import { RainViewerRadarLayer } from "../RainViewer/RainViewer";
import { RainViewerTimeline } from '../RainViewer/RainViewerTimeline';
import { ManualProbeCard } from '../ProbeCard/ManualProbeCard';
import { KmlLayersControl } from './KmlLayersControl';
import { KmlUploadModal } from './KmlUploadModal';
import { NdviLayersControl } from './NdviLayersControl';
import { getNdviAreas, saveMapLayersVisibility } from '../../services/api';
import {
    NdviMapOverlay,
    createHttpNdviApi,
    demoApi,
    DEMO_AREAS,
    mapLayersToNdviAreas,
    type NdviAnalysis,
    type NdviApi,
    type NdviArea,
    type NdviScene,
} from '../../modules/ndvi';
import { boundsOf } from '../../modules/ndvi/shared/geometry';
// import { GiRadarSweep } from "react-icons/gi";


// Profundidades disponíveis
const AVAILABLE_DEPTHS = [10, 20, 30, 40, 50, 60];
const RAINVIEWER_CACHE_TTL_MS = 10 * 60 * 1000;

let rainViewerCache: { fetchedAt: number; frames: RadarFrame[] } | null = null;
let rainViewerPendingRequest: Promise<RadarFrame[]> | null = null;

const fetchRainViewerFrames = async (): Promise<RadarFrame[]> => {
    const now = Date.now();
    if (rainViewerCache && (now - rainViewerCache.fetchedAt) < RAINVIEWER_CACHE_TTL_MS) {
        return rainViewerCache.frames;
    }

    if (rainViewerPendingRequest) {
        return rainViewerPendingRequest;
    }

    rainViewerPendingRequest = fetch("https://api.rainviewer.com/public/weather-maps.json")
        .then((res) => res.json())
        .then((data) => {
            const pastFrames = data.radar?.past ?? [];
            const filteredFrames = pastFrames.filter((_: RadarFrame, index: number) => index % 4 === 0);

            rainViewerCache = {
                fetchedAt: Date.now(),
                frames: filteredFrames,
            };
            return filteredFrames;
        })
        .finally(() => {
            rainViewerPendingRequest = null;
        });

    return rainViewerPendingRequest;
};

// Tipos de período de chuva
export type RainPeriod = '1h' | '24h' | '7d' | '15d' | '30d';

// --- Configuração de Ícones Dinâmicos ---
const createCustomIcon = (color: string, rainValue: number | null, showRain: boolean, isManualProbe: boolean = false) => {
    const IconComponent = isManualProbe ? MdWaterDrop : PiAlignTopSimpleFill;

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
                    {rainValue != null && Number.isFinite(Number(rainValue)) ? `${Number(rainValue).toFixed(1)} mm` : '--'}
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
    name: string;
    lat: number;
    lng: number;
    statusCode: string;
    readings: Measurement[];
    config_min?: number;
    config_max?: number;
    config_moisture_v1?: number;
    config_moisture_v2?: number;
    config_moisture_v3?: number;
    rain_1h?: number;
    rain_24h?: number;
    rain_7d?: number;
    rain_15d?: number;
    rain_30d?: number;
    isManualProbe?: boolean;
    irrigation_value_mm?: number;
    data_plantio?: string | null;
    cultura?: string | null;
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
    onViewGraph: (deviceId: number | string) => void;
    initialCenter?: { lat: number; lng: number } | null;
    selectedDepthRefs?: Record<number, number | null>;
    onSelectDepthRef?: (probeId: number, depth: number | null) => void;
    mapDepthFilter?: number;
    onMapDepthFilterChange?: (depth: number) => void;
    onMapClick?: (lat: number, lng: number) => void;
    isAddingManualProbe?: boolean;
    onBatchUpdateClick?: () => void;
    onDeleteManualProbe?: (id: number) => void;
    onEditManualProbe?: (id: number) => void;
    // KML layers
    mapLayers?: MapLayer[];
    farms?: Farm[];
    isAdmin?: boolean;
    onFarmCreated?: (farm: Farm) => void;
    onUploadMapLayer?: (file: File, name?: string, farmId?: number) => Promise<void>;
    onDeleteMapLayer?: (id: number) => void;
    /** Chamado após salvar com sucesso o estado de exibição das camadas no backend */
    onMapLayersVisibilitySaved?: (layers: MapLayer[]) => void;
    onManualProbeUpdated?: () => void;
}

const stopLeafletEvents = (el: HTMLElement | null) => {
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
    const stop = (ev: Event) => ev.stopPropagation();
    el.addEventListener("pointerdown", stop);
    el.addEventListener("mousedown", stop);
    el.addEventListener("touchstart", stop, { passive: true });
};

const MapRecenter = ({ center, zoom }: { center: [number, number] | null, zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom, { duration: 1.5 });
        }
    }, [center, zoom, map]);
    return null;
};


const MapClickHandler = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
    useMapEvents({
        click: (e) => onMapClick(e.latlng.lat, e.latlng.lng),
    });
    return null;
};

const MapControls = ({
    onLocationFound,
    showRain,
    onToggleRain,
    showRadar,
    // onToggleRadar,
    kmlLayers,
    visibleLayerIds,
    onToggleLayer,
    onDeleteLayer,
    onOpenUpload,
    hiddenFeatures,
    onToggleFeature,
    hasPendingChanges,
    isSavingLayers,
    onSaveLayers,
    showNdvi,
    onToggleNdvi,
    ndviDisabled,
    ndviAreas,
    visibleNdviAreaIds,
    onToggleNdviArea,
    onToggleNdviFarm,
    selectedNdviFarmName,
    onSelectNdviFarmName,
    selectedNdviAreaId,
    onSelectNdviAreaId,
    ndviScenes,
    ndviAnalyses,
    selectedNdviSceneId,
    onSelectNdviSceneId,
    farms,
}: {
    onLocationFound: (pos: [number, number]) => void;
    showRain: boolean;
    onToggleRain: () => void;
    showRadar: boolean;
    onToggleRadar: () => void;
    kmlLayers: MapLayer[];
    visibleLayerIds: Set<number>;
    onToggleLayer: (id: number) => void;
    onDeleteLayer: (id: number) => void;
    onOpenUpload: () => void;
    hiddenFeatures: Map<number, Set<number>>;
    onToggleFeature: (layerId: number, fIdx: number) => void;
    hasPendingChanges: boolean;
    isSavingLayers: boolean;
    onSaveLayers: () => void;
    showNdvi: boolean;
    onToggleNdvi: () => void;
    ndviDisabled?: boolean;
    ndviAreas: NdviArea[];
    visibleNdviAreaIds: Set<string>;
    onToggleNdviArea: (id: string) => void;
    onToggleNdviFarm: (farmName: string) => void;
    selectedNdviFarmName: string;
    onSelectNdviFarmName: (farmName: string) => void;
    selectedNdviAreaId: string;
    onSelectNdviAreaId: (id: string) => void;
    ndviScenes: NdviScene[];
    ndviAnalyses: Record<string, NdviAnalysis>;
    selectedNdviSceneId: string;
    onSelectNdviSceneId: (id: string) => void;
    farms?: Farm[];
}) => {
    const map = useMap();
    const toast = useToast();
    const [loadingLoc, setLoadingLoc] = useState(false);
    const [activeMapPanel, setActiveMapPanel] = useState<'kml' | 'ndvi' | null>(null);

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
            ref={stopLeafletEvents}
            onMouseEnter={() => map?.dragging?.disable()}
            onMouseLeave={() => map?.dragging?.enable()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            position="absolute"
            top="10px"
            right="10px"
            zIndex={1000}
            display="flex"
            flexDirection="column"
            gap={3}
            alignItems="center"
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
                        onClick={onToggleRain}
                        bg={showRain ? "blue.500" : "white"}
                        color={showRain ? "white" : "blue.500"}
                        size="sm"
                        isRound
                        boxShadow="md"
                        _hover={{ bg: showRain ? "blue.600" : "gray.100" }}
                    />
                </Tooltip>

                {/* <Tooltip label={showRadar ? "Desligar Radar" : "Ativar Radar"} placement="left">
                    <IconButton
                        aria-label="Toggle Radar"
                        icon={<GiRadarSweep size={20} />}
                        onClick={onToggleRadar}
                        bg={showRadar ? "blue.500" : "white"}
                        color={showRadar ? "white" : "blue.500"}
                        size="sm"
                        isRound
                        boxShadow="md"
                        _hover={{ bg: showRadar ? "blue.600" : "gray.100" }}
                    />
                </Tooltip> */}
            </VStack>
            {/* KML Layers Control */}
            <KmlLayersControl
                layers={kmlLayers}
                visibleLayerIds={visibleLayerIds}
                onToggleLayer={onToggleLayer}
                onDeleteLayer={onDeleteLayer}
                onOpenUpload={onOpenUpload}
                hiddenFeatures={hiddenFeatures}
                onToggleFeature={onToggleFeature}
                hasPendingChanges={hasPendingChanges}
                isSaving={isSavingLayers}
                onSave={onSaveLayers}
                isOpen={activeMapPanel === 'kml'}
                onToggleOpen={() => setActiveMapPanel((curr) => curr === 'kml' ? null : 'kml')}
                onClose={() => setActiveMapPanel(null)}
            />
            {/* NDVI Layers Control (no mesmo formato das Camadas KML) */}
            <NdviLayersControl
                showNdvi={showNdvi}
                onToggleNdvi={onToggleNdvi}
                areas={ndviAreas}
                visibleAreaIds={visibleNdviAreaIds}
                onToggleArea={onToggleNdviArea}
                onToggleFarm={onToggleNdviFarm}
                selectedFarmName={selectedNdviFarmName}
                onSelectFarmName={onSelectNdviFarmName}
                selectedAreaId={selectedNdviAreaId}
                onSelectAreaId={onSelectNdviAreaId}
                scenes={ndviScenes}
                analyses={ndviAnalyses}
                selectedSceneId={selectedNdviSceneId}
                onSelectSceneId={onSelectNdviSceneId}
                farms={farms}
                disabled={ndviDisabled}
                isOpen={activeMapPanel === 'ndvi'}
                onToggleOpen={() => setActiveMapPanel((curr) => curr === 'ndvi' ? null : 'ndvi')}
                onClose={() => setActiveMapPanel(null)}
            />
            {showRadar && <RadarLegend />}
        </Box>
    );
};

const MainMapNdviController = ({
    area,
    areas = [],
    farmName,
    api,
    enabled,
    selectedSceneId,
    onSelectSceneId,
    onScenesLoaded,
}: {
    area?: NdviArea;
    areas?: NdviArea[];
    farmName?: string;
    api: NdviApi;
    enabled: boolean;
    selectedSceneId?: string;
    onSelectSceneId?: (sceneId: string) => void;
    onScenesLoaded?: (
        scenes: NdviScene[],
        analyses: Record<string, NdviAnalysis>,
    ) => void;
}) => {
    const map = useMap();
    const effectiveAreas = useMemo(() => {
        if (areas && areas.length > 0) return areas;
        if (area) return [area];
        return [];
    }, [area, areas]);

    useEffect(() => {
        if (!enabled || effectiveAreas.length === 0) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const a of effectiveAreas) {
            const b = boundsOf(a.geometry);
            if (b[0] < minX) minX = b[0];
            if (b[1] < minY) minY = b[1];
            if (b[2] > maxX) maxX = b[2];
            if (b[3] > maxY) maxY = b[3];
        }
        if (minX !== Infinity) {
            map.fitBounds(
                [
                    [minY, minX],
                    [maxY, maxX],
                ],
                { padding: [36, 36], maxZoom: 15 },
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, effectiveAreas, map]);

    return (
        <Box>
            <NdviMapOverlay
                map={map}
                areas={effectiveAreas}
                farmName={farmName}
                api={api}
                enabled={enabled}
                selectedSceneId={selectedSceneId}
                onSelectSceneId={onSelectSceneId}
                onScenesLoaded={onScenesLoaded}
            />
        </Box>
    );
};

const RadarController = ({ showRadar }: { showRadar: boolean }) => {
    const map = useMap();
    useEffect(() => {
        if (showRadar) {
            // Ajuste este valor (ex: 5, 6 ou 7) para enquadrar perfeitamente sua região
            map.setZoom(6, { animate: true, duration: 1 });
        }
    }, [showRadar, map]);
    return null;
};

const RadarLegend = () => (
    <Box
        p={1}
        borderRadius="full"
        boxShadow="xl"
        bg="rgba(255, 255, 255, 0.4)" // Fundo bem sutil em volta do gradiente
        backdropFilter="blur(4px)"
    >
        <Flex align="center" justify="center">
            <Box
                position="relative"
                w={{ base: "24px", md: "32px" }} // Levemente mais gordinho para caber a fonte nova
                h="300px" // Altura otimizada para encaixar abaixo dos botões
                borderRadius="full"
                bgGradient="linear(to-t, #5770a0 0%, #4b4488 50%, #603046 100%)"
                boxShadow="inset 0 0 6px rgba(0,0,0,0.5)"
                display="flex"
                justifyContent="center"
            >
                <Text
                    position="absolute"
                    top="16px"
                    left="50%"
                    transform="translateX(-50%)"
                    fontSize="10px"
                    fontWeight="900" // Fonte mais gordinha
                    fontFamily="'Inter', system-ui, sans-serif" // Fonte mais limpa
                    letterSpacing="2px"
                    color="white"
                    textShadow="1px 1px 2px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.6)" // Sombra para destacar o branco
                    sx={{
                        writingMode: "vertical-rl",
                        textOrientation: "upright" // Deixa as letras em pé ao invés de deitadas
                    }}
                >
                    FORTE
                </Text>
                <Text
                    position="absolute"
                    bottom="16px"
                    left="50%"
                    transform="translateX(-50%)"
                    fontSize="10px"
                    fontWeight="900"
                    fontFamily="'Inter', system-ui, sans-serif"
                    letterSpacing="2px"
                    color="white"
                    textShadow="1px 1px 2px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.6)"
                    sx={{
                        writingMode: "vertical-rl",
                        textOrientation: "upright"
                    }}
                >
                    LEVE
                </Text>
            </Box>
        </Flex>
    </Box>
);

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
    onBatchUpdateClick,
    points,
    center = [-22.4319, -46.9578],
    zoom = 13,
    onViewGraph,
    initialCenter,
    selectedDepthRefs = {},
    onSelectDepthRef,
    mapDepthFilter = 20,
    onMapDepthFilterChange,
    onMapClick,
    isAddingManualProbe = false,
    onDeleteManualProbe,
    onEditManualProbe,
    mapLayers = [],
    farms = [],
    isAdmin = false,
    onFarmCreated,
    onUploadMapLayer,
    onDeleteMapLayer,
    onMapLayersVisibilitySaved,
    onManualProbeUpdated,
}) => {

    const toast = useToast();
    const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [isKmlModalOpen, setIsKmlModalOpen] = useState(false);

    // ── Estado de exibição das camadas KML ──
    // O estado persistido vem do backend (layer.is_active / layer.hidden_feature_indices).
    // Os toggles alteram apenas os "rascunhos" locais abaixo; nada é enviado ao backend
    // até o usuário clicar em "Salvar".
    const [draftLayerActive, setDraftLayerActive] = useState<Map<number, boolean>>(() => new Map());
    const [draftHiddenFeatures, setDraftHiddenFeatures] = useState<Map<number, Set<number>>>(() => new Map());
    const [isSavingLayers, setIsSavingLayers] = useState(false);

    // Estado efetivo (persistido + rascunho) usado pela UI e pelo mapa
    const visibleLayerIds = useMemo(() => {
        const set = new Set<number>();
        mapLayers.forEach(l => {
            const active = draftLayerActive.has(l.id) ? draftLayerActive.get(l.id)! : (l.is_active ?? true);
            if (active) set.add(l.id);
        });
        return set;
    }, [mapLayers, draftLayerActive]);

    const hiddenFeatures = useMemo(() => {
        const map = new Map<number, Set<number>>();
        mapLayers.forEach(l => {
            map.set(l.id, draftHiddenFeatures.get(l.id) ?? new Set(l.hidden_feature_indices ?? []));
        });
        return map;
    }, [mapLayers, draftHiddenFeatures]);

    const hasPendingLayerChanges = draftLayerActive.size > 0 || draftHiddenFeatures.size > 0;

    const handleToggleLayer = (id: number) => {
        const layer = mapLayers.find(l => l.id === id);
        if (!layer) return;
        const persisted = layer.is_active ?? true;
        const nextValue = !visibleLayerIds.has(id);
        setDraftLayerActive(prev => {
            const next = new Map(prev);
            // Se voltou ao valor salvo, não há alteração pendente
            if (nextValue === persisted) next.delete(id); else next.set(id, nextValue);
            return next;
        });
    };

    const handleToggleFeature = (layerId: number, fIdx: number) => {
        const layer = mapLayers.find(l => l.id === layerId);
        if (!layer) return;
        const persisted = new Set(layer.hidden_feature_indices ?? []);
        const set = new Set(hiddenFeatures.get(layerId) ?? []);
        if (set.has(fIdx)) set.delete(fIdx); else set.add(fIdx);
        const equalsPersisted = set.size === persisted.size && [...set].every(i => persisted.has(i));
        setDraftHiddenFeatures(prev => {
            const next = new Map(prev);
            if (equalsPersisted) next.delete(layerId); else next.set(layerId, set);
            return next;
        });
    };

    const handleSaveLayers = async () => {
        if (isSavingLayers || !hasPendingLayerChanges || mapLayers.length === 0) return;
        // Snapshot do estado atual da interface no momento do clique (todas as camadas)
        const payload = mapLayers.map(l => ({
            id: l.id,
            is_active: visibleLayerIds.has(l.id),
            hidden_feature_indices: [...(hiddenFeatures.get(l.id) ?? [])].sort((a, b) => a - b),
        }));
        setIsSavingLayers(true);
        try {
            const updated = await saveMapLayersVisibility(payload);
            onMapLayersVisibilitySaved?.(updated);
            setDraftLayerActive(new Map());
            setDraftHiddenFeatures(new Map());
            toast({ title: "Camadas salvas!", status: "success", duration: 3000, isClosable: true });
        } catch (err: unknown) {
            console.error('Erro ao salvar camadas:', err);
            const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
            toast({
                title: "Erro ao salvar camadas",
                description: typeof detail === 'string' ? detail : "As alterações não foram salvas. Tente novamente.",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setIsSavingLayers(false);
        }
    };

    // Estados para os Controles no Mapa
    // const [selectedDepth, setSelectedDepth] = useState<number>(20);
    const [showRain, setShowRain] = useState<boolean>(true);
    const [showRadar, setShowRadar] = useState<boolean>(false);
    const [rainPeriod, setRainPeriod] = useState<RainPeriod>('24h'); // Padrão: 24h
    const [showNdvi, setShowNdvi] = useState<boolean>(false);
    const [selectedNdviAreaId, setSelectedNdviAreaId] = useState<string>('');
    const [selectedNdviSceneId, setSelectedNdviSceneId] = useState<string>('');
    const [ndviScenes, setNdviScenes] = useState<NdviScene[]>([]);
    const [ndviAnalyses, setNdviAnalyses] = useState<Record<string, NdviAnalysis>>({});
    const [dbNdviAreas, setDbNdviAreas] = useState<NdviArea[]>([]);

    useEffect(() => {
        let active = true;
        getNdviAreas()
            .then((rows) => {
                if (active) setDbNdviAreas(rows);
            })
            .catch(() => {
                // fallback silencioso
            });
        return () => {
            active = false;
        };
    }, []);

    const ndviAreas = useMemo<NdviArea[]>(() => {
        let rawAreas: NdviArea[] = [];
        if (dbNdviAreas.length > 0) {
            rawAreas = dbNdviAreas;
        } else {
            const fromLayers = mapLayersToNdviAreas(mapLayers, {
                onlyVisible: true,
                visibleLayerIds,
                hiddenFeatures,
            });
            rawAreas = fromLayers.length > 0 ? fromLayers : DEMO_AREAS;
        }

        if (points && points.length > 0) {
            const probeMap = new Map(points.map((p) => [p.id, p]));
            return rawAreas.map((a) => {
                if (a.deviceId && probeMap.has(a.deviceId)) {
                    const p = probeMap.get(a.deviceId)!;
                    return {
                        ...a,
                        deviceName: a.deviceName || p.name || (p.esn ? `Sonda ${p.esn}` : undefined),
                        deviceEsn: a.deviceEsn || p.esn,
                    };
                }
                return a;
            });
        }

        return rawAreas;
    }, [dbNdviAreas, mapLayers, visibleLayerIds, hiddenFeatures, points]);

    const selectedNdviArea = useMemo<NdviArea | undefined>(() => {
        if (selectedNdviAreaId) {
            const explicit = ndviAreas.find((a) => a.id === selectedNdviAreaId);
            if (explicit) return explicit;
        }
        if (selectedPoint && !selectedPoint.isManualProbe) {
            const linked = ndviAreas.find((a) => a.deviceId === selectedPoint.id);
            if (linked) return linked;
        }
        return ndviAreas[0];
    }, [ndviAreas, selectedNdviAreaId, selectedPoint]);

    const navigate = useNavigate();

    const farmNameById = useMemo(() => {
        return new Map<number, string>((farms ?? []).map((f) => [f.id, f.name]));
    }, [farms]);

    const getAreaFarmName = (area?: NdviArea): string => {
        if (!area) return "";
        if (area.farmName) return area.farmName;
        if (area.farmId && farmNameById.has(area.farmId)) {
            return farmNameById.get(area.farmId)!;
        }
        return "Fazenda";
    };

    const groupedNdviAreas = useMemo(() => {
        const groups: { farmName: string; areas: NdviArea[] }[] = [];
        const map = new Map<string, NdviArea[]>();
        for (const area of ndviAreas) {
            const farmName = getAreaFarmName(area);
            if (!map.has(farmName)) {
                const list: NdviArea[] = [];
                map.set(farmName, list);
                groups.push({ farmName, areas: list });
            }
            map.get(farmName)!.push(area);
        }
        return groups;
    }, [ndviAreas, farmNameById]);

    const currentNdviFarmName = selectedNdviArea ? getAreaFarmName(selectedNdviArea) : (groupedNdviAreas[0]?.farmName ?? '');
    const currentFarmAreas = useMemo(() => {
        return groupedNdviAreas.find(g => g.farmName === currentNdviFarmName)?.areas ?? [];
    }, [groupedNdviAreas, currentNdviFarmName]);

    // ── Estado de exibição individual das áreas NDVI (mesmo comportamento das Camadas KML) ──
    const [visibleNdviAreaIds, setVisibleNdviAreaIds] = useState<Set<string>>(() => new Set());

    useEffect(() => {
        if (ndviAreas.length > 0) {
            setVisibleNdviAreaIds((prev) => {
                if (prev.size === 0) {
                    return new Set(ndviAreas.map((a) => a.id));
                }
                return prev;
            });
        }
    }, [ndviAreas]);

    const handleToggleNdviArea = (areaId: string) => {
        setVisibleNdviAreaIds((prev) => {
            const next = new Set(prev);
            if (next.has(areaId)) {
                next.delete(areaId);
            } else {
                next.add(areaId);
            }
            return next;
        });
    };

    const handleToggleNdviFarm = (farmName: string) => {
        const farmAreas = groupedNdviAreas.find((g) => g.farmName === farmName)?.areas ?? [];
        const someVisible = farmAreas.some((a) => visibleNdviAreaIds.has(a.id));
        setVisibleNdviAreaIds((prev) => {
            const next = new Set(prev);
            if (someVisible) {
                farmAreas.forEach((a) => next.delete(a.id));
            } else {
                farmAreas.forEach((a) => next.add(a.id));
            }
            return next;
        });
    };

    const handleSelectNdviFarm = (farmName: string) => {
        const farmAreas = groupedNdviAreas.find((g) => g.farmName === farmName)?.areas ?? [];
        if (farmAreas.length > 0) {
            setSelectedNdviAreaId(farmAreas[0].id);
            setSelectedNdviSceneId('');
            const anyVisible = farmAreas.some((a) => visibleNdviAreaIds.has(a.id));
            if (!anyVisible) {
                setVisibleNdviAreaIds((prev) => {
                    const next = new Set(prev);
                    farmAreas.forEach((a) => next.add(a.id));
                    return next;
                });
            }
        }
    };

    const displayedNdviAreas = useMemo(() => {
        if (!showNdvi) return [];
        return currentFarmAreas.filter((a) => visibleNdviAreaIds.has(a.id));
    }, [showNdvi, currentFarmAreas, visibleNdviAreaIds]);

    const ndviApi = useMemo<NdviApi>(() => {
        const isDemo = import.meta.env.VITE_NDVI_MODE === 'demo';
        return isDemo
            ? demoApi
            : createHttpNdviApi(import.meta.env.VITE_NDVI_API_BASE ?? '/api/ndvi');
    }, []);

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
        const reading = [...point.readings]
            .filter(r => Number(r.depth_cm) === Number(depth))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .find(r => r.moisture_pct !== null && r.moisture_pct !== undefined);

        if (!reading) return '#A0AEC0'; // Cinza (Sem leitura)

        // Pega o valor exato sem arredondamentos prévios
        const value = Number(reading.moisture_pct);

        // Carrega os limites exatos (com fallback de segurança para dados antigos)
        const v1 = point.config_moisture_v1 ?? (point.config_min ? point.config_min - 10 : 30);
        const v2 = point.config_moisture_v2 ?? (point.config_min ?? 45);
        const v3 = point.config_moisture_v3 ?? (point.config_max ?? 60);

        // Lógica matemática estrita, idêntica ao gráfico
        if (value < v1) return '#E53E3E';  // Vermelho (Crítico)
        if (value < v2) return '#D69E2E';  // Amarelo (Alerta)
        if (value <= v3) return '#38A169'; // Verde (Ideal)
        return '#3182CE';                  // Azul (Saturado)
    };

    // --- Dispersão de Pontos ---
    const processedPoints = useMemo(() => {
        const grouped: Record<string, MapPoint[]> = {};
        points.forEach(p => {
            const safeLat = p.lat != null && Number.isFinite(Number(p.lat)) ? Number(p.lat) : -15.793889;
            const safeLng = p.lng != null && Number.isFinite(Number(p.lng)) ? Number(p.lng) : -47.882778;
            const normalizedPoint = { ...p, lat: safeLat, lng: safeLng };
            const key = `${safeLat.toFixed(5)},${safeLng.toFixed(5)}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(normalizedPoint);
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
                const filteredFrames = await fetchRainViewerFrames();
                setRadarFrames(filteredFrames);

                // Seleciona o último frame (o mais atual) como padrão
                setFrameIndex(filteredFrames.length > 0 ? filteredFrames.length - 1 : 0);
            } catch (e) {
                console.error("Erro RainViewer", e);
            }
        };

        fetchRadar();
        const t = setInterval(fetchRadar, 10 * 60 * 1000); // Atualiza dados da API a cada 10 min
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (!isPlaying || radarFrames.length === 0) return;

        const timer = setInterval(() => {
            setFrameIndex((i) => (i + 1) % radarFrames.length);
        }, 1500);

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
                .radar-smooth-transition {
                    transition: opacity 0.4s ease-in-out !important;
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
                        color="black"
                        px={3}
                        py={2}
                        borderRadius="md"
                        fontSize="xs"
                        fontWeight="bold"
                        boxShadow="md"
                    />
                )}

                <MapRecenter center={activeCenter} zoom={activeZoom} />

                <TileLayer
                    attribution='&copy; Google Maps'
                    url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                    maxZoom={20}
                />

                <RainViewerRadarLayer
                    visible={showRadar}
                    opacity={rainOpacity}
                    frames={radarFrames}
                    frameIndex={frameIndex}
                />

                {showRadar && radarFrames.length > 0 && (
                    <RainViewerTimeline
                        frames={radarFrames}
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

                <RadarController showRadar={showRadar} />
                {/* {showRadar && <RadarLegend />} */}

                <MapControls
                    onLocationFound={(pos) => setUserLocation(pos)}
                    showRain={showRain}
                    onToggleRain={() => setShowRain((prev) => !prev)}
                    showRadar={showRadar}
                    onToggleRadar={() => setShowRadar((prev) => !prev)}
                    kmlLayers={mapLayers}
                    visibleLayerIds={visibleLayerIds}
                    onToggleLayer={handleToggleLayer}
                    onDeleteLayer={(id) => {
                        if (onDeleteMapLayer) onDeleteMapLayer(id);
                        setDraftLayerActive(prev => { const next = new Map(prev); next.delete(id); return next; });
                        setDraftHiddenFeatures(prev => { const next = new Map(prev); next.delete(id); return next; });
                    }}
                    hiddenFeatures={hiddenFeatures}
                    onToggleFeature={handleToggleFeature}
                    hasPendingChanges={hasPendingLayerChanges}
                    isSavingLayers={isSavingLayers}
                    onSaveLayers={handleSaveLayers}
                    onOpenUpload={() => setIsKmlModalOpen(true)}
                    showNdvi={showNdvi}
                    onToggleNdvi={() => setShowNdvi((prev) => !prev)}
                    ndviDisabled={!selectedNdviArea}
                    ndviAreas={ndviAreas}
                    visibleNdviAreaIds={visibleNdviAreaIds}
                    onToggleNdviArea={handleToggleNdviArea}
                    onToggleNdviFarm={handleToggleNdviFarm}
                    selectedNdviFarmName={currentNdviFarmName}
                    onSelectNdviFarmName={handleSelectNdviFarm}
                    selectedNdviAreaId={selectedNdviArea?.id ?? ''}
                    onSelectNdviAreaId={(id) => {
                        setSelectedNdviAreaId(id);
                        setSelectedNdviSceneId('');
                    }}
                    ndviScenes={ndviScenes}
                    ndviAnalyses={ndviAnalyses}
                    selectedNdviSceneId={selectedNdviSceneId || ndviScenes[0]?.id || ''}
                    onSelectNdviSceneId={setSelectedNdviSceneId}
                    farms={farms}
                />

                <MainMapNdviController
                    areas={displayedNdviAreas}
                    farmName={currentNdviFarmName}
                    api={ndviApi}
                    enabled={showNdvi && displayedNdviAreas.length > 0}
                    selectedSceneId={selectedNdviSceneId}
                    onSelectSceneId={setSelectedNdviSceneId}
                    onScenesLoaded={(scenesList, analysesMap) => {
                        setNdviScenes(scenesList);
                        setNdviAnalyses(analysesMap);
                    }}
                />

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

                {/* ── KML/KMZ Layers ───────────────────────────── */}
                {mapLayers
                    .filter(layer => visibleLayerIds.has(layer.id))
                    .map(layer => {
                        const hiddenSet = hiddenFeatures.get(layer.id) ?? new Set<number>();
                        const filteredGeoJSON: GeoJSON.FeatureCollection = {
                            ...layer.geojson,
                            features: layer.geojson.features.filter((_, idx) => !hiddenSet.has(idx)),
                        };
                        return (
                            <GeoJSON
                                key={`${layer.id}-${[...hiddenSet].sort((a, b) => a - b).join(',')}`}
                                data={filteredGeoJSON}
                                style={() => ({
                                    color: '#3B82F6',
                                    weight: 2.5,
                                    opacity: 0.9,
                                    fillColor: '#3B82F6',
                                    fillOpacity: 0.15,
                                })}
                            />
                        );
                    })
                }

                <MapClickHandler onMapClick={(lat, lng) => {
                    if (isAddingManualProbe && onMapClick) {
                        onMapClick(lat, lng);
                    } else {
                        setSelectedPoint(null);
                    }
                }} />

                {/* Renderização dos pontos */}
                {processedPoints.map((point) => {
                    const probeDepthRef = selectedDepthRefs[point.id];
                    const activeDepth = probeDepthRef !== undefined && probeDepthRef !== null
                        ? probeDepthRef
                        : mapDepthFilter;

                    const getManualProbeColor = (val?: number) => {
                        const value = val || 0;
                        if (value < 20) return "#E53E3E"; // red.500
                        if (value < 50) return "#D69E2E"; // yellow.500
                        if (value < 200) return "#38A169"; // green.500
                        return "#3182CE"; // blue.500
                    };

                    const markerColor = point.isManualProbe ? getManualProbeColor(point.irrigation_value_mm) : getMarkerColorForDepth(point, activeDepth);

                    let rainVal = 0;
                    if (rainPeriod === '1h') rainVal = point.rain_1h ?? 0;
                    else if (rainPeriod === '24h') rainVal = point.rain_24h ?? 0;
                    else if (rainPeriod === '7d') rainVal = point.rain_7d ?? 0;
                    else if (rainPeriod === '15d') rainVal = point.rain_15d ?? 0;
                    else if (rainPeriod === '30d') rainVal = point.rain_30d ?? 0;

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
                                icon={createCustomIcon(markerColor, rainVal, showRain, point.isManualProbe)}
                                eventHandlers={{
                                    click: (e) => {
                                        L.DomEvent.stopPropagation(e);
                                        setSelectedPoint(point);
                                        if (!point.isManualProbe) {
                                            const linked = ndviAreas.find((a) => a.deviceId === point.id);
                                            if (linked) setSelectedNdviAreaId(linked.id);
                                        }
                                    }
                                }}
                            />
                        </React.Fragment>
                    );
                })}
            </MapContainer>

            {/* --- CONTROLES DE PROFUNDIDADE, CHUVA E NDVI (Fora do MapContainer para evitar drag do Leaflet) --- */}
            <Box
                ref={stopLeafletEvents}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                position="absolute"
                top="10px"
                left={{ base: "8px", md: "50px" }}
                right={{ md: "auto" }}
                maxW={{ base: "calc(100vw - 64px)", md: "calc(100vw - 120px)" }}
                zIndex={1000}
                bg="rgba(255, 255, 255, 0.95)"
                backdropFilter="blur(5px)"
                borderRadius="lg"
                boxShadow="lg"
                p={{ base: 1.5, md: 1.5 }}
            >
                <Flex
                    direction={{ base: "column", md: "row" }}
                    align={{ base: "stretch", md: "center" }}
                    flexWrap="wrap"
                    gap={{ base: 1, md: 3 }}
                >
                    <Flex
                        direction="row"
                        align="center"
                        justify="space-between"
                        gap={2}
                        flexWrap="wrap"
                    >
                        {/* Seletor de Profundidade */}
                        <HStack
                            spacing={1}
                            pl={{ base: 0.5, md: 1 }}
                            pr={{ base: 0, md: showRain ? 2 : 0 }}
                            borderRight={{ base: "none", md: showRain ? "1px solid" : "none" }}
                            borderColor="gray.300"
                        >
                            <Text fontSize={{ base: "11px", md: "xs" }} fontWeight="bold" color="gray.600" whiteSpace="nowrap">
                                Profundidade:
                            </Text>
                            <Select
                                size={{ base: "xs", md: "sm" }}
                                width={{ base: "76px", md: "88px" }}
                                value={mapDepthFilter}
                                onChange={(e) => onMapDepthFilterChange && onMapDepthFilterChange(Number(e.target.value))}
                                bg="transparent"
                                color="black"
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
                            <HStack
                                spacing={1}
                                pl={{ base: 2, md: 0 }}
                                pr={{ base: 0.5, md: 1 }}
                                borderLeft={{ base: "1px solid", md: "none" }}
                                borderColor="gray.300"
                            >
                                <Text fontSize={{ base: "11px", md: "xs" }} fontWeight="bold" color="blue.600" whiteSpace="nowrap">
                                    Chuva:
                                </Text>
                                <Select
                                    size={{ base: "xs", md: "sm" }}
                                    width={{ base: "98px", md: "112px" }}
                                    minW="96px"
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
                    </Flex>

                    {/* Seletor de Área e Histórico NDVI (Aparece ao ativar botão NDVI) */}
                    {showNdvi && ndviAreas.length > 0 && (
                        <Flex
                            direction={{ base: "column", sm: "row" }}
                            align={{ base: "stretch", sm: "center" }}
                            gap={{ base: 1, sm: 2 }}
                            pt={{ base: 1, md: 0 }}
                            pl={{ base: 0.5, md: 2 }}
                            borderTop={{ base: "1px solid", md: "none" }}
                            borderLeft={{ base: "none", md: "1px solid" }}
                            borderColor="gray.300"
                        >
                            <HStack spacing={1} flex="1" minW={0}>
                                <Text fontSize={{ base: "11px", md: "xs" }} fontWeight="bold" color="blue.600" whiteSpace="nowrap">
                                    Fazenda:
                                </Text>
                                <Select
                                    size={{ base: "xs", md: "sm" }}
                                    flex="1"
                                    width={{ base: "100%", sm: "160px", md: "200px" }}
                                    minW="120px"
                                    value={currentNdviFarmName}
                                    onChange={(e) => {
                                        handleSelectNdviFarm(e.target.value);
                                    }}
                                    bg="transparent"
                                    border="none"
                                    fontWeight="bold"
                                    color="blue.700"
                                    _focus={{ boxShadow: 'none' }}
                                    cursor="pointer"
                                >
                                    {groupedNdviAreas.map(({ farmName }) => (
                                        <option key={farmName} value={farmName}>
                                            {farmName}
                                        </option>
                                    ))}
                                </Select>
                            </HStack>
                            {ndviScenes.length > 0 && (
                                <HStack
                                    spacing={1}
                                    flex="1"
                                    minW={0}
                                    pl={{ base: 0, sm: 2 }}
                                    pt={{ base: 1, sm: 0 }}
                                    borderTop={{ base: "1px solid", sm: "none" }}
                                    borderLeft={{ base: "none", sm: "1px solid" }}
                                    borderColor="gray.300"
                                >
                                    <Text fontSize={{ base: "11px", md: "xs" }} fontWeight="bold" color="teal.700" whiteSpace="nowrap">
                                        Histórico:
                                    </Text>
                                    <Select
                                        size={{ base: "xs", md: "sm" }}
                                        flex="1"
                                        width={{ base: "100%", sm: "150px", md: "185px" }}
                                        minW="120px"
                                        value={selectedNdviSceneId || ndviScenes[0]?.id || ''}
                                        onChange={(e) => {
                                            if (e.target.value === '__more__') {
                                                navigate('/ndvi');
                                                return;
                                            }
                                            setSelectedNdviSceneId(e.target.value);
                                        }}
                                        bg="transparent"
                                        border="none"
                                        fontWeight="bold"
                                        color="teal.700"
                                        _focus={{ boxShadow: 'none' }}
                                        cursor="pointer"
                                    >
                                        {ndviScenes.slice(0, 5).map((s) => {
                                            const a = ndviAnalyses[s.id];
                                            const dateStr = new Intl.DateTimeFormat('pt-BR', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                timeZone: 'UTC',
                                            }).format(new Date(s.acquiredAt));
                                            const meanStr = a?.mean != null ? ` (${a.mean.toFixed(2).replace('.', ',')})` : '';
                                            return (
                                                <option key={s.id} value={s.id}>
                                                    {dateStr}{meanStr}
                                                </option>
                                            );
                                        })}
                                        {ndviScenes.length > 5 && (
                                            <option value="__more__">
                                                Ver mais no módulo NDVI (+{ndviScenes.length - 5})...
                                            </option>
                                        )}
                                    </Select>
                                    <Tooltip label="Ver histórico completo no módulo NDVI">
                                        <IconButton
                                            aria-label="Ver histórico completo"
                                            icon={<ExternalLink size={12} />}
                                            size="xs"
                                            variant="ghost"
                                            colorScheme="blue"
                                            onClick={() => navigate('/ndvi')}
                                        />
                                    </Tooltip>
                                </HStack>
                            )}
                        </Flex>
                    )}
                </Flex>
            </Box>

            {/* KML/KMZ Upload Modal */}
            <KmlUploadModal
                isOpen={isKmlModalOpen}
                onClose={() => setIsKmlModalOpen(false)}
                farms={farms}
                isAdmin={isAdmin}
                onFarmCreated={onFarmCreated}
                onUpload={async (file, name, farmId) => {
                    if (onUploadMapLayer) {
                        await onUploadMapLayer(file, name, farmId);
                        setIsKmlModalOpen(false);
                    }
                }}
            />

            <Fade in={!!selectedPoint} unmountOnExit>
                {selectedPoint && (
                    <Box
                        position="absolute"
                        bottom={4}
                        // left={4}
                        left={{ base: '4px', md: '1rem' }}
                        right={{ md: 'auto' }}
                        zIndex={1000}
                        bg="rgba(26, 32, 44, 0.95)"
                        borderRadius="xl"
                    >
                        {selectedPoint.isManualProbe ? (
                            <ManualProbeCard
                                point={selectedPoint}
                                onClose={() => setSelectedPoint(null)}
                                onBatchUpdateClick={onBatchUpdateClick}
                                onDeleteManualProbe={(id) => {
                                    if (onDeleteManualProbe) {
                                        onDeleteManualProbe(id);
                                        setSelectedPoint(null);
                                    }
                                }}
                                onEditManualProbe={onEditManualProbe}
                                onManualProbeUpdated={onManualProbeUpdated}
                                onViewDetails={(id) => onViewGraph(`manual_${id}`)}
                            />
                        ) : (
                            <ProbeCard
                                point={selectedPoint}
                                onViewGraph={onViewGraph}
                                onClose={() => setSelectedPoint(null)}
                                selectedDepthRef={selectedDepthRefs[selectedPoint.id] ?? null}
                                onSelectDepthRef={(depth) => onSelectDepthRef && onSelectDepthRef(selectedPoint.id, depth)}
                            />
                        )}
                    </Box>
                )}
            </Fade>
        </Box>
    );
};