import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Spinner,
  Text,
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
  api,
  enabled,
  selectedSceneId,
  onSelectSceneId,
  onScenesLoaded,
}: {
  map: L.Map | null;
  area?: NdviArea;
  api: NdviApi;
  enabled: boolean;
  selectedSceneId?: string;
  onSelectSceneId?: (sceneId: string) => void;
  onScenesLoaded?: (
    scenes: NdviScene[],
    analyses: Record<string, NdviAnalysis>,
  ) => void;
}) {
  const layerRef = useRef<MapNdviLayerHandle | null>(null);
  const [scenes, setScenes] = useState<NdviScene[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, NdviAnalysis>>({});
  const [internalSceneId, setInternalSceneId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeSceneId = selectedSceneId || internalSceneId;

  useEffect(() => {
    if (!enabled || !area) {
      layerRef.current?.remove();
      layerRef.current = null;
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
      try {
        const list = await api.listScenes(area, ac.signal);
        if (ac.signal.aborted) return;
        if (!list.length) {
          throw new Error(
            "Nenhuma passagem de satélite foi encontrada para esta área.",
          );
        }
        setScenes(list);
        const firstClean =
          list.find((s) => (s.tileCloudPct ?? 0) <= 45) ?? list[0];
        const initialId = firstClean?.id ?? list[0].id;
        setInternalSceneId(initialId);
        onSelectSceneId?.(initialId);

        const firstAnalysis = await api.analyzeScene(
          area,
          firstClean ?? list[0],
          ac.signal,
        );
        if (ac.signal.aborted) return;
        const nextMap: Record<string, NdviAnalysis> = {
          [initialId]: firstAnalysis,
        };
        setAnalyses(nextMap);
        setLoading(false);
        onScenesLoaded?.(list, nextMap);

        for (const s of list) {
          if (ac.signal.aborted) return;
          if (s.id === initialId) continue;
          try {
            const a = await api.analyzeScene(area, s, ac.signal);
            if (!ac.signal.aborted) {
              nextMap[s.id] = a;
              setAnalyses((prev) => {
                const updated = { ...prev, [s.id]: a };
                onScenesLoaded?.(list, updated);
                return updated;
              });
            }
          } catch {
            // ignora falha individual de cena em segundo plano
          }
        }
      } catch (e: unknown) {
        if (ac.signal.aborted) return;
        layerRef.current?.remove();
        layerRef.current = null;
        setLoading(false);
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível carregar o histórico de NDVI desta área.",
        );
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, area?.id, enabled]);

  const activeScene =
    scenes.find((s) => s.id === activeSceneId) ?? scenes[0] ?? null;
  const activeAnalysis = activeScene ? analyses[activeScene.id] : null;

  useEffect(() => {
    if (!enabled || !area || !activeScene || analyses[activeScene.id]) return;
    const ac = new AbortController();
    api
      .analyzeScene(area, activeScene, ac.signal)
      .then((a) => {
        if (!ac.signal.aborted) {
          setAnalyses((prev) => ({ ...prev, [activeScene.id]: a }));
        }
      })
      .catch(() => {});
    return () => ac.abort();
  }, [analyses, api, area, enabled, activeScene]);

  useEffect(() => {
    layerRef.current?.remove();
    layerRef.current = null;
    if (
      !enabled ||
      !map ||
      !area ||
      !activeAnalysis ||
      activeAnalysis.areaId !== area.id
    ) {
      return;
    }
    layerRef.current = attachNdviToLeafletMap(map, area, activeAnalysis, {
      opacity: 0.84,
      showContour: true,
    });
    return () => {
      layerRef.current?.remove();
      layerRef.current = null;
      map?.dragging?.enable();
    };
  }, [area, enabled, map, activeAnalysis]);

  if (!enabled) return null;

  const missingAreaMessage = !area
    ? "Selecione uma área desenhada para mostrar o NDVI."
    : "";
  const effectiveError = missingAreaMessage || error;

  return (
    <Box
      ref={stopLeafletEvents}
      as="aside"
      role="status"
      aria-live="polite"
      pointerEvents="auto"
      position="absolute"
      zIndex={740}
      bg="rgba(11, 24, 45, 0.92)"
      backdropFilter="blur(8px)"
      border="1px solid #49637b"
      boxShadow="0 4px 22px rgba(0,0,0,0.3)"
      left={{ base: "8px", md: "17px" }}
      right={{ base: "8px", md: "auto" }}
      bottom={{ base: "16px", md: "36px" }}
      w="auto"
      minW="0"
      maxW="fit-content"
      borderRadius="lg"
      p={2}
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
          <Spinner size="xs" color="green.300" />
        </HStack>
      )}
      {!loading && effectiveError && (
        <HStack spacing={2} color="orange.300" align="center">
          <AlertTriangle size={15} />
        </HStack>
      )}
      {!loading && !effectiveError && area && activeScene && (
        <HStack spacing={2} align="center">
          <Box as="span" w="6px" h="6px" borderRadius="full" bg="#68c7a7" flexShrink={0} />
          <Box
            h="6px"
            w={{ base: "110px", md: "150px" }}
            borderRadius="full"
            bg="linear-gradient(to right, #436784 0%, #b85b3f 50%, #e7d067 70%, #42a336 90%, #187037 100%)"
          />
        </HStack>
      )}
    </Box>
  );
}
