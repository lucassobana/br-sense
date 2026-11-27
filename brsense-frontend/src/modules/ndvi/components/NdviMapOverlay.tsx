import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import L from "leaflet";
import {
  AlertTriangle,
  Satellite,
} from "lucide-react";
import {
  attachNdviToLeafletMap,
  type MapNdviLayerHandle,
} from "../lib/mapNdviLayer";
import type {
  NdviAnalysis,
  NdviApi,
  NdviArea,
  NdviScene,
} from "../shared/types";



export function NdviMapToggle({
  active,
  disabled,
  onToggle,
}: {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      size="xs"
      aria-pressed={active}
      isDisabled={disabled}
      title={
        active
          ? "Ocultar camada NDVI do mapa"
          : "Mostrar último NDVI disponível no mapa"
      }
      aria-label="Camada NDVI"
      onClick={onToggle}
      display="flex"
      flexDirection="column"
      w="36px"
      h="36px"
      py={1}
      px={1}
      gap={0.5}
      borderRadius="md"
      border="1px solid"
      borderColor={active ? "#74c5ff" : "#51677d"}
      bg={active ? "#2f83cb" : "#101a2d"}
      color="#fff"
      boxShadow={active ? "0 0 0 3px rgba(84, 170, 255, 0.2)" : "none"}
      _hover={{ bg: active ? "#2672b3" : "#192842" }}
      cursor={disabled ? "not-allowed" : "pointer"}
    >
      <Satellite size={16} />
      <Text as="small" fontSize="9px" fontWeight="bold">
        NDVI
      </Text>
    </Button>
  );
}

const stopLeafletEvents = (el: HTMLDivElement | null) => {
  if (!el) return;
  L.DomEvent.disableClickPropagation(el);
  L.DomEvent.disableScrollPropagation(el);
  const stop = (ev: Event) => ev.stopPropagation();
  el.addEventListener("pointerdown", stop);
  el.addEventListener("mousedown", stop);
  el.addEventListener("touchstart", stop, { passive: true });
};

export function NdviMapOverlay({
  map,
  area,
  areas,
  api,
  enabled,
  selectedSceneId,
  onSelectSceneId,
  onScenesLoaded,
  farmName,
}: {
  map: L.Map | null;
  area?: NdviArea;
  areas?: NdviArea[];
  api: NdviApi;
  enabled: boolean;
  selectedSceneId?: string;
  onSelectSceneId?: (sceneId: string) => void;
  onScenesLoaded?: (
    scenes: NdviScene[],
    analyses: Record<string, NdviAnalysis>,
  ) => void;
  farmName?: string;
}) {
  const targetAreas = useMemo<NdviArea[]>(() => {
    if (areas && areas.length > 0) return areas;
    if (area) return [area];
    return [];
  }, [area, areas]);

  const primaryArea = targetAreas[0];
  const layersRef = useRef<MapNdviLayerHandle[]>([]);
  const [scenes, setScenes] = useState<NdviScene[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, NdviAnalysis>>({});
  const [currentSceneAnalyses, setCurrentSceneAnalyses] = useState<Record<string, NdviAnalysis>>({});
  const [internalSceneId, setInternalSceneId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeSceneId = selectedSceneId || internalSceneId;

  // 1. Carrega o catálogo de cenas para a área principal da fazenda
  useEffect(() => {
    if (!enabled || !primaryArea) {
      layersRef.current.forEach((l) => l.remove());
      layersRef.current = [];
      return;
    }
    const ac = new AbortController();
    (async () => {
      await Promise.resolve();
      if (ac.signal.aborted) return;
      setLoading(true);
      setError("");
      setScenes([]);
      setAnalyses({});
      setCurrentSceneAnalyses({});
      try {
        const list = await api.listScenes(primaryArea, ac.signal);
        if (ac.signal.aborted) return;
        if (!list.length) {
          throw new Error(
            "Nenhuma passagem de satélite foi encontrada para esta área.",
          );
        }
        // No mapa: filtra somente passagens com pelo menos 90% de visualização (nuvens <= 10%)
        const cleanList = list.filter((s) => (s.tileCloudPct ?? 0) <= 10);
        const mapList = cleanList.length > 0 ? cleanList : list.filter((s) => (s.tileCloudPct ?? 0) <= 20);
        if (!mapList.length) {
          throw new Error(
            "Nenhuma passagem recente com pelo menos 90% de visualização livre de nuvens.",
          );
        }
        setScenes(mapList);
        const initialId = mapList[0].id;
        setInternalSceneId(initialId);
        onSelectSceneId?.(initialId);

        const firstAnalysis = await api.analyzeScene(
          primaryArea,
          mapList[0],
          ac.signal,
        );
        if (ac.signal.aborted) return;
        const nextMap: Record<string, NdviAnalysis> = {
          [initialId]: firstAnalysis,
        };
        setAnalyses(nextMap);
        setLoading(false);
        onScenesLoaded?.(mapList, nextMap);

        // Carrega análises históricas em segundo plano para o seletor de histórico
        for (const s of mapList) {
          if (ac.signal.aborted) return;
          if (s.id === initialId) continue;
          try {
            const a = await api.analyzeScene(primaryArea, s, ac.signal);
            if (!ac.signal.aborted) {
              nextMap[s.id] = a;
              setAnalyses((prev) => {
                const updated = { ...prev, [s.id]: a };
                onScenesLoaded?.(mapList, updated);
                return updated;
              });
            }
          } catch {
            // ignora falha individual de cena em segundo plano
          }
        }
      } catch (e: unknown) {
        if (ac.signal.aborted) return;
        layersRef.current.forEach((l) => l.remove());
        layersRef.current = [];
        setLoading(false);
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível carregar o histórico de NDVI desta fazenda.",
        );
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, primaryArea?.id, enabled]);

  const activeScene =
    scenes.find((s) => s.id === activeSceneId) ?? scenes[0] ?? null;

  // 2. Analisa TODAS as áreas vinculadas à fazenda para a cena ativa
  useEffect(() => {
    if (!enabled || targetAreas.length === 0 || !activeScene) return;
    const ac = new AbortController();

    // Se já temos a análise da área principal no cache do histórico, reutiliza
    if (analyses[activeScene.id] && analyses[activeScene.id].areaId === primaryArea?.id) {
      setCurrentSceneAnalyses((prev) => ({
        ...prev,
        [primaryArea.id]: analyses[activeScene.id],
      }));
    }

    Promise.all(
      targetAreas.map(async (a) => {
        try {
          const res = await api.analyzeScene(a, activeScene, ac.signal);
          if (!ac.signal.aborted) {
            setCurrentSceneAnalyses((prev) => ({ ...prev, [a.id]: res }));
          }
        } catch {
          // ignora falha de área individual
        }
      })
    );

    return () => ac.abort();
  }, [analyses, api, targetAreas, enabled, activeScene, primaryArea?.id]);

  // 3. Aplica no mapa as camadas NDVI de TODAS as áreas da fazenda simultaneamente
  useEffect(() => {
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];
    if (!enabled || !map || targetAreas.length === 0) return;

    for (const a of targetAreas) {
      const aAnalysis = currentSceneAnalyses[a.id];
      if (aAnalysis && aAnalysis.areaId === a.id && (aAnalysis.validPct >= 90 || aAnalysis.quality === "utilizavel")) {
        const handle = attachNdviToLeafletMap(map, a, aAnalysis, {
          opacity: 0.90,
          showContour: true,
        });
        layersRef.current.push(handle);
      }
    }
    return () => {
      layersRef.current.forEach((l) => l.remove());
      layersRef.current = [];
      map?.dragging?.enable();
    };
  }, [targetAreas, enabled, map, currentSceneAnalyses]);

  if (!enabled) return null;

  const missingAreaMessage = targetAreas.length === 0
    ? "Nenhuma área NDVI vinculada a esta fazenda."
    : "";
  const effectiveError = missingAreaMessage || error;

  const effectiveFarmName = farmName || primaryArea?.farmName || "";

  const totalHectares = targetAreas.reduce((acc, a) => acc + (a.hectares || 0), 0);
  const validAnalyses = targetAreas
    .map((a) => ({ area: a, analysis: currentSceneAnalyses[a.id] }))
    .filter((x): x is { area: NdviArea; analysis: NdviAnalysis } => Boolean(x.analysis?.mean != null));

  const overallMean =
    validAnalyses.length > 0
      ? validAnalyses.reduce((acc, x) => acc + (x.analysis.mean ?? 0) * (x.area.hectares || 1), 0) /
        validAnalyses.reduce((acc, x) => acc + (x.area.hectares || 1), 0)
      : null;

  return (
    <Box
      ref={stopLeafletEvents}
      as="aside"
      role="status"
      aria-live="polite"
      pointerEvents="auto"
      position="absolute"
      zIndex={740}
      bg="rgba(10, 18, 38, 0.94)"
      backdropFilter="blur(8px)"
      border="1px solid"
      borderColor="#1e3a5f"
      boxShadow="0 6px 24px rgba(0,0,0,0.4)"
      left={{ base: "8px", md: "17px" }}
      right={{ base: "8px", md: "auto" }}
      bottom={{ base: "16px", md: "36px" }}
      w="auto"
      minW={{ base: "210px", sm: "240px" }}
      maxW={{ base: "300px", sm: "320px" }}
      borderRadius="xl"
      p={3}
      onMouseEnter={() => map?.dragging?.disable()}
      onMouseLeave={() => map?.dragging?.enable()}
      onPointerDown={(e: React.PointerEvent<HTMLElement>) => {
        e.stopPropagation();
        map?.dragging?.disable();
      }}
      onMouseDown={(e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        map?.dragging?.disable();
      }}
      onTouchStart={(e: React.TouchEvent<HTMLElement>) => {
        e.stopPropagation();
        map?.dragging?.disable();
      }}
      onFocus={() => map?.dragging?.disable()}
      onBlur={() => map?.dragging?.enable()}
    >
      {loading && (
        <HStack spacing={2} align="center">
          <Spinner size="xs" color="blue.300" />
          <Text fontSize="xs" color="blue.200">
            Processando NDVI da fazenda...
          </Text>
        </HStack>
      )}
      {!loading && effectiveError && (
        <HStack spacing={2} color="orange.300" align="center">
          <AlertTriangle size={15} />
          <Text fontSize="xs">{effectiveError}</Text>
        </HStack>
      )}
      {!loading && !effectiveError && targetAreas.length > 0 && activeScene && (
        <VStack spacing={2} align="stretch">
          {/* Título com Nome da Fazenda e Quantidade de Áreas */}
          <Flex justify="space-between" align="center" gap={2}>
            <HStack spacing={1.5} minW={0} flex="1">
              <Box as="span" w="6px" h="6px" borderRadius="full" bg="#3084C9" flexShrink={0} />
              <Text fontSize="xs" fontWeight="bold" color="white" noOfLines={1}>
                {effectiveFarmName || targetAreas[0]?.deviceName || targetAreas[0]?.deviceEsn || targetAreas[0]?.name}
              </Text>
            </HStack>
            {targetAreas.length > 1 ? (
              <Badge
                colorScheme="blue"
                variant="subtle"
                fontSize="9px"
                px={1.5}
                py={0.2}
                borderRadius="sm"
                flexShrink={0}
              >
                {targetAreas.length} áreas ({totalHectares.toFixed(1).replace(".", ",")} ha)
              </Badge>
            ) : effectiveFarmName && (targetAreas[0]?.deviceName || targetAreas[0]?.deviceEsn || targetAreas[0]?.name) ? (
              <Badge
                colorScheme="blue"
                variant="subtle"
                fontSize="9px"
                px={1.5}
                py={0.2}
                borderRadius="sm"
                flexShrink={0}
              >
                {targetAreas[0].deviceName || targetAreas[0].deviceEsn || targetAreas[0].name}
              </Badge>
            ) : null}
          </Flex>

          {/* Vigor médio ponderado e status da fazenda */}
          {overallMean != null && (
            <Flex justify="space-between" align="center" fontSize="10px">
              <Text color="gray.300">
                NDVI Médio: <strong style={{ color: "#ffffff" }}>{overallMean.toFixed(2).replace(".", ",")}</strong>
              </Text>
              <Text
                fontWeight="semibold"
                color={
                  overallMean >= 0.65
                    ? "#48bb78"
                    : overallMean >= 0.45
                    ? "#ecc94b"
                    : "#f56565"
                }
              >
                {overallMean >= 0.65
                  ? "Vigor alto"
                  : overallMean >= 0.45
                  ? "Moderado"
                  : "Em atenção"}
              </Text>
            </Flex>
          )}

          {/* Barra de gradiente NDVI */}
          <Box position="relative">
            <Box
              h="8px"
              w="100%"
              borderRadius="full"
              bg="linear-gradient(to right, #d71900 0%, #eb2d00 15%, #ff6e00 30%, #ffe600 48%, #73e60a 66%, #0fc319 82%, #006e14 100%)"
              boxShadow="inset 0 1px 3px rgba(0,0,0,0.5)"
            />
            {/* Ticks numéricos */}
            <Flex justify="space-between" fontSize="9px" color="#90a8b8" mt={0.5} px={0.5}>
              <Text as="span">0,10</Text>
              <Text as="span">0,30</Text>
              <Text as="span">0,50</Text>
              <Text as="span">0,70</Text>
              <Text as="span">0,85+</Text>
            </Flex>
          </Box>

          {/* Legenda de extremos */}
          <Flex justify="space-between" fontSize="9px" color="#718096">
            <Text as="span">Solo exposto</Text>
            <Text as="span">Vigor alto</Text>
          </Flex>
        </VStack>
      )}
    </Box>
  );
}
