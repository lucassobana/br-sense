import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  Flex,
  HStack,
  IconButton,
  Select,
  Text,
  VStack,
} from "@chakra-ui/react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Crosshair,
  Droplets,
  Layers,
  Maximize2,
  Minus,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { boundsOf } from "../shared/geometry";
import type { ContourBuildResult, LngLat } from "../shared/contours";
import type {
  NdviAnalysis,
  NdviApi,
  NdviArea,
  NdviProbeOption,
} from "../shared/types";
import type { MapLayer } from "../../../types";
import { useContourDrawing } from "../lib/useContourDrawing";
import { NdviContourTools, type DrawMode } from "./NdviContourTools";
import { NdviMapOverlay, NdviMapToggle } from "./NdviMapOverlay";

const dFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export interface MapBasemap {
  tileUrl: string;
  attribution?: string;
  maxZoom?: number;
  subdomains?: string | string[];
}

export function AreaMap({
  areas,
  selected,
  analysis,
  probes = [],
  mapLayers = [],
  activeProbeId,
  focusCenter,
  onSelect,
  drawing,
  initialDrawMode = "pivo",
  onFinishDrawing,
  onCancelDrawing,
  basemap,
  compact,
  mainMap,
  ndviApi,
}: {
  areas: NdviArea[];
  selected?: NdviArea;
  analysis?: NdviAnalysis | null;
  probes?: NdviProbeOption[];
  mapLayers?: MapLayer[];
  activeProbeId?: number;
  focusCenter?: [number, number];
  onSelect: (id: string) => void;
  drawing?: boolean;
  initialDrawMode?: DrawMode;
  onFinishDrawing?: (contour: ContourBuildResult) => void;
  onCancelDrawing?: () => void;
  basemap?: MapBasemap;
  compact?: boolean;
  mainMap?: boolean;
  ndviApi?: NdviApi;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const drawLayerRef = useRef<L.LayerGroup | null>(null);
  const drawGeometryLayerRef = useRef<L.LayerGroup | null>(null);
  const drawMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const edgeMarkerRef = useRef<L.Marker | null>(null);
  const isDraggingCenterRef = useRef(false);
  const isDraggingEdgeRef = useRef(false);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showContours, setShowContours] = useState(true);
  const [showMainMapNdvi, setShowMainMapNdvi] = useState(true);
  const draw = useContourDrawing(
    mapInstance,
    Boolean(drawing),
    initialDrawMode,
  );
  const lastFitId = useRef<string>("");

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;
    lastFitId.current = "";
    const map = L.map(hostRef.current, {
      zoomControl: false,
      attributionControl: Boolean(basemap),
      preferCanvas: true,
    }).setView([-12.253, -45.821], 14);
    L.control
      .scale({ imperial: false, maxWidth: 110, position: "bottomleft" })
      .addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    drawLayerRef.current = L.layerGroup().addTo(map);
    drawGeometryLayerRef.current = L.layerGroup().addTo(map);
    drawMarkersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    Promise.resolve().then(() => setMapInstance(map));
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(hostRef.current);
    const t1 = window.setTimeout(() => map.invalidateSize(), 100);
    const t2 = window.setTimeout(() => map.invalidateSize(), 350);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      drawLayerRef.current = null;
      drawGeometryLayerRef.current = null;
      drawMarkersLayerRef.current = null;
      centerMarkerRef.current = null;
      edgeMarkerRef.current = null;
      baseLayerRef.current = null;
      lastFitId.current = "";
      Promise.resolve().then(() => setMapInstance(null));
    };
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    baseLayerRef.current?.remove();
    baseLayerRef.current = null;
    if (basemap?.tileUrl) {
      baseLayerRef.current = L.tileLayer(basemap.tileUrl, {
        attribution: basemap.attribution ?? "",
        maxZoom: basemap.maxZoom ?? 20,
        ...(basemap.subdomains ? { subdomains: basemap.subdomains } : {}),
      }).addTo(map);
    }
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!map || !group) return;
    group.clearLayers();
    if (!mainMap && showOverlay && analysis?.pngUrl && selected) {
      const b = analysis.bounds;
      L.imageOverlay(
        analysis.pngUrl,
        [
          [b[1], b[0]],
          [b[3], b[2]],
        ],
        {
          opacity: 0.86,
          interactive: false,
          className: "ndvi-raster",
        },
      ).addTo(group);
    }
    const kmlBounds = L.latLngBounds([]);
    if (showContours) {
      for (const kmlLayer of mapLayers) {
        if (kmlLayer.is_active === false) continue;
        const hiddenSet = new Set<number>(kmlLayer.hidden_feature_indices ?? []);
        const visibleFeatures = (kmlLayer.geojson?.features ?? []).filter(
          (_, idx) => !hiddenSet.has(idx),
        );
        if (visibleFeatures.length === 0) continue;
        const geoLayer = L.geoJSON(
          {
            type: "FeatureCollection",
            features: visibleFeatures,
          } as GeoJSON.FeatureCollection,
          {
            interactive: false,
            style: () => ({
              color: "#3B82F6",
              weight: 2.2,
              opacity: 0.85,
              fillColor: "#3B82F6",
              fillOpacity: 0.12,
            }),
          },
        ).addTo(group);
        const lb = geoLayer.getBounds();
        if (lb.isValid()) {
          kmlBounds.extend(lb);
        }
      }
      for (const area of areas) {
        const isSelected = area.id === selected?.id;
        const layer = L.geoJSON(
          {
            type: "Feature",
            properties: { id: area.id, name: area.name },
            geometry: area.geometry,
          } as GeoJSON.Feature,
          {
            style: {
              color: isSelected ? "#58b7ff" : "#9ec6de",
              weight: isSelected ? 2.5 : 1.3,
              dashArray: isSelected ? undefined : "4 5",
              fillColor: "#14354c",
              fillOpacity:
                isSelected &&
                ((!mainMap && showOverlay && analysis?.pngUrl) ||
                  (mainMap && showMainMapNdvi))
                  ? 0.02
                  : 0.16,
            },
          },
        );
        layer.on("click", () => onSelect(area.id));
        layer.addTo(group);
      }
    }
    for (const p of probes) {
      if (
        p.latitude == null ||
        p.longitude == null ||
        !Number.isFinite(Number(p.latitude)) ||
        !Number.isFinite(Number(p.longitude)) ||
        (Number(p.latitude) === 0 && Number(p.longitude) === 0)
      ) {
        continue;
      }
      const isLinkedToSelected =
        p.id === activeProbeId ||
        (selected?.deviceId && p.id === selected.deviceId);
      L.circleMarker([Number(p.latitude), Number(p.longitude)], {
        radius: isLinkedToSelected ? 8 : 5,
        color: "#092033",
        weight: 2,
        fillColor: isLinkedToSelected ? "#3084C9" : "#63b3ed",
        fillOpacity: 1,
      })
        .bindTooltip(`${p.name} (${p.esn})`, {
          permanent: Boolean(drawing && isLinkedToSelected),
          direction: "top",
          offset: [0, -8],
          className: "draw-point-label",
        })
        .addTo(group);
    }
    let fitTimer: number | undefined;
    if (drawing && focusCenter) {
      const focusKey = `probe-${activeProbeId}-${focusCenter[0].toFixed(5)}-${focusCenter[1].toFixed(5)}`;
      if (lastFitId.current !== focusKey) {
        map.invalidateSize();
        map.setView(focusCenter, 15);
        lastFitId.current = focusKey;
      }
    } else if (selected && lastFitId.current !== selected.id) {
      const b = boundsOf(selected.geometry);
      const targetBounds: L.LatLngBoundsExpression = [
        [b[1], b[0]],
        [b[3], b[2]],
      ];
      map.invalidateSize();
      map.fitBounds(targetBounds, { padding: [28, 28], maxZoom: 15 });
      lastFitId.current = selected.id;
      fitTimer = window.setTimeout(() => {
        if (mapRef.current === map) {
          map.invalidateSize();
          map.fitBounds(targetBounds, {
            padding: [28, 28],
            maxZoom: 15,
            animate: false,
          });
        }
      }, 150);
    } else if (!selected && kmlBounds.isValid() && lastFitId.current !== "init-kml") {
      map.invalidateSize();
      map.fitBounds(kmlBounds, { padding: [28, 28], maxZoom: 15 });
      lastFitId.current = "init-kml";
    } else if (!selected && probes.length > 0 && lastFitId.current === "") {
      const firstValid = probes.find(
        (p) =>
          p.latitude != null &&
          p.longitude != null &&
          Number.isFinite(Number(p.latitude)) &&
          Number.isFinite(Number(p.longitude)) &&
          !(Number(p.latitude) === 0 && Number(p.longitude) === 0),
      );
      if (firstValid) {
        map.invalidateSize();
        map.setView(
          [Number(firstValid.latitude), Number(firstValid.longitude)],
          14,
        );
        lastFitId.current = `init-probe-${firstValid.id}`;
      }
    }
    return () => {
      if (fitTimer !== undefined) {
        window.clearTimeout(fitTimer);
      }
    };
  }, [
    activeProbeId,
    analysis,
    areas,
    drawing,
    focusCenter,
    mainMap,
    mapInstance,
    mapLayers,
    onSelect,
    probes,
    selected,
    showContours,
    showMainMapNdvi,
    showOverlay,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const geomGroup = drawGeometryLayerRef.current;
    const markersGroup = drawMarkersLayerRef.current;
    if (!geomGroup || !markersGroup || !map) return;

    if (!drawing) {
      geomGroup.clearLayers();
      markersGroup.clearLayers();
      if (centerMarkerRef.current) {
        centerMarkerRef.current.remove();
        centerMarkerRef.current = null;
      }
      if (edgeMarkerRef.current) {
        edgeMarkerRef.current.remove();
        edgeMarkerRef.current = null;
      }
      return;
    }

    geomGroup.clearLayers();
    const active = draw.confirmed ?? draw.preview;
    if (active) {
      L.geoJSON(
        {
          type: "Feature",
          properties: {},
          geometry: active.geometry,
        } as GeoJSON.Feature,
        {
          interactive: false,
          style: {
            color: "#3084C9",
            weight: 2.6,
            dashArray: draw.confirmed ? undefined : "6 5",
            fillColor: "#3084C9",
            fillOpacity: 0.22,
          },
        },
      ).addTo(geomGroup);
    }

    if (draw.mode === "pivo" && active?.center && active?.edge) {
      L.polyline(
        [
          [active.center[1], active.center[0]],
          [active.edge[1], active.edge[0]],
        ],
        {
          color: "#90CDF4",
          weight: 2,
          dashArray: "4 4",
          interactive: false,
        },
      ).addTo(geomGroup);
    }

    if (draw.mode === "pivo") {
      const center = draw.points[0];
      const edge = draw.points[1];

      // Handle Center Marker (Draggable com cursor para mover o pivô no equipamento)
      if (center) {
        if (!centerMarkerRef.current) {
          const centerIcon = L.divIcon({
            className: "pivo-center-marker-icon",
            html: `
              <div style="
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: #3084C9;
                border: 3px solid #FFFFFF;
                box-shadow: 0 0 12px rgba(0,0,0,0.7), 0 0 0 2px #1E4E79;
                cursor: grab;
                display: flex;
                align-items: center;
                justify-content: center;
                user-select: none;
              ">
                <div style="
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  background: #FFFFFF;
                "></div>
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const m = L.marker([center[1], center[0]], {
            draggable: true,
            zIndexOffset: 1500,
            icon: centerIcon,
          });

          m.bindTooltip("Centro do Pivô (Arraste para ajustar o centro)", {
            permanent: true,
            direction: "top",
            offset: [0, -14],
            className: "draw-point-label",
          });

          m.on("dragstart", () => {
            isDraggingCenterRef.current = true;
            if (draw.isDraggingRef) draw.isDraggingRef.current = true;
            map.dragging.disable();
          });

          m.on("drag", (e: L.LeafletEvent) => {
            const latlng = (e.target as L.Marker).getLatLng();
            const newPt: LngLat = [
              Number(latlng.lng.toFixed(6)),
              Number(latlng.lat.toFixed(6)),
            ];
            draw.movePivotCenter?.(newPt);
          });

          m.on("dragend", () => {
            map.dragging.enable();
            isDraggingCenterRef.current = false;
            window.setTimeout(() => {
              if (draw.isDraggingRef) draw.isDraggingRef.current = false;
            }, 120);
          });

          m.addTo(markersGroup);
          centerMarkerRef.current = m;
        } else if (!isDraggingCenterRef.current) {
          centerMarkerRef.current.setLatLng([center[1], center[0]]);
        }
      } else if (centerMarkerRef.current) {
        centerMarkerRef.current.remove();
        centerMarkerRef.current = null;
      }

      // Handle Edge Marker (Draggable para ajustar o raio)
      if (edge) {
        if (!edgeMarkerRef.current) {
          const edgeIcon = L.divIcon({
            className: "pivo-edge-marker-icon",
            html: `
              <div style="
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: #63B3ED;
                border: 3px solid #FFFFFF;
                box-shadow: 0 0 10px rgba(0,0,0,0.6), 0 0 0 2px #2B6CB0;
                cursor: grab;
                display: flex;
                align-items: center;
                justify-content: center;
                user-select: none;
              ">
                <div style="
                  width: 6px;
                  height: 6px;
                  border-radius: 50%;
                  background: #1A365D;
                "></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          const m = L.marker([edge[1], edge[0]], {
            draggable: true,
            zIndexOffset: 1400,
            icon: edgeIcon,
          });

          m.bindTooltip(
            active?.radiusM
              ? `Raio: ${active.radiusM} m (Arraste para ajustar)`
              : "Borda do Pivô (Arraste para ajustar)",
            {
              permanent: true,
              direction: "top",
              offset: [0, -12],
              className: "draw-point-label",
            },
          );

          m.on("dragstart", () => {
            isDraggingEdgeRef.current = true;
            if (draw.isDraggingRef) draw.isDraggingRef.current = true;
            map.dragging.disable();
          });

          m.on("drag", (e: L.LeafletEvent) => {
            const latlng = (e.target as L.Marker).getLatLng();
            const newPt: LngLat = [
              Number(latlng.lng.toFixed(6)),
              Number(latlng.lat.toFixed(6)),
            ];
            draw.setPoint?.(1, newPt);
          });

          m.on("dragend", () => {
            map.dragging.enable();
            isDraggingEdgeRef.current = false;
            window.setTimeout(() => {
              if (draw.isDraggingRef) draw.isDraggingRef.current = false;
            }, 120);
          });

          m.addTo(markersGroup);
          edgeMarkerRef.current = m;
        } else if (!isDraggingEdgeRef.current) {
          edgeMarkerRef.current.setLatLng([edge[1], edge[0]]);
          if (active?.radiusM) {
            edgeMarkerRef.current.setTooltipContent(
              `Raio: ${active.radiusM} m (Arraste para ajustar)`,
            );
          }
        }
      } else if (edgeMarkerRef.current) {
        edgeMarkerRef.current.remove();
        edgeMarkerRef.current = null;
      }
    } else {
      // mode !== "pivo" (talhão)
      if (centerMarkerRef.current) {
        centerMarkerRef.current.remove();
        centerMarkerRef.current = null;
      }
      if (edgeMarkerRef.current) {
        edgeMarkerRef.current.remove();
        edgeMarkerRef.current = null;
      }
      markersGroup.clearLayers();
      draw.points.forEach((p, idx) => {
        L.circleMarker([p[1], p[0]], {
          radius: 5,
          color: "#092033",
          weight: 2,
          fillColor: "#6bc2ff",
          fillOpacity: 1,
        })
          .bindTooltip(`Vértice ${idx + 1}`, {
            permanent: false,
            direction: "top",
            offset: [0, -8],
            className: "draw-point-label",
          })
          .addTo(markersGroup);
      });
    }
  }, [draw.confirmed, draw.mode, draw.points, draw.preview, drawing, draw]);

  const fitSelected = () => {
    if (!selected || !mapRef.current) return;
    const b = boundsOf(selected.geometry);
    mapRef.current.fitBounds(
      [
        [b[1], b[0]],
        [b[3], b[2]],
      ],
      { padding: [28, 28], maxZoom: 15 },
    );
  };

  return (
    <Box
      className={`map-stage ${compact ? "compact" : ""} ${drawing ? "drawing" : ""} ${mainMap ? "principal-map" : ""}`}
      position="relative"
      w="100%"
      mt={0}
      borderRadius={drawing ? "none" : "xl"}
      overflow="hidden"
      h={
        drawing
          ? "100%"
          : compact
            ? "315px"
            : mainMap
              ? "calc(100dvh - 153px)"
              : { base: "380px", xl: "460px" }
      }
      minH={drawing ? "480px" : compact ? "315px" : "380px"}
      sx={{
        ".leaflet-tile-pane": {
          filter: "none !important",
        },
      }}
    >
      {!basemap?.tileUrl && (
        <Box position="absolute" inset={0} opacity={0.8} bg="#1e352d" zIndex={0} aria-hidden="true" />
      )}
      <Box
        ref={hostRef}
        w="100%"
        h="100%"
        minH="inherit"
        role="region"
        aria-label={`Mapa de satélite ${selected ? `de ${selected.name}` : ""}`}
      />
      {selected && !drawing && !mainMap && (
        <HStack
          position="absolute"
          top="14px"
          left="15px"
          zIndex={500}
          bg="rgba(12, 32, 43, 0.9)"
          backdropFilter="blur(6px)"
          border="1px solid"
          borderColor="rgba(58, 87, 92, 0.75)"
          px={2.5}
          py={1.5}
          borderRadius="md"
          spacing={2}
          pointerEvents="none"
        >
          <Box as="span" w="6px" h="6px" borderRadius="full" bg="#60c48a" flexShrink={0} />
          <Text as="strong" fontSize="xs" color="#fff">
            {selected.name}
          </Text>
          <Text as="span" fontSize="xs" color="#9ec6de">
            {analysis
              ? dFmt.format(new Date(analysis.acquiredAt))
              : "Sem passagem"}
          </Text>
          <Badge colorScheme="blue" variant="subtle" fontSize="10px">
            NDVI · 10 m
          </Badge>
        </HStack>
      )}
      {mainMap && !drawing && (
        <HStack
          position="absolute"
          top="15px"
          left="15px"
          zIndex={740}
          bg="#fff"
          color="#4a5a70"
          borderRadius="8px"
          p="6px 12px"
          boxShadow="0 3px 14px rgba(0,0,0,0.15)"
          role="region"
          aria-label="Filtros do mapa principal"
          spacing={3}
        >
          <HStack spacing={1.5}>
            <SlidersHorizontal size={13} />
            <Text fontSize="xs">Profundidade:</Text>
            <Select
              size="xs"
              defaultValue="20"
              aria-label="Profundidade da sonda"
              w="80px"
            >
              <option value="10">10 cm</option>
              <option value="20">20 cm</option>
              <option value="30">30 cm</option>
              <option value="40">40 cm</option>
              <option value="50">50 cm</option>
              <option value="60">60 cm</option>
            </Select>
          </HStack>
          <HStack spacing={1.5}>
            <Droplets size={13} />
            <Text fontSize="xs">Chuva:</Text>
            <Select
              size="xs"
              defaultValue="24h"
              aria-label="Janela de chuva"
              w="95px"
            >
              <option value="24h">24 Horas</option>
              <option value="7d">7 Dias</option>
            </Select>
          </HStack>
          {areas.length > 0 && (
            <HStack spacing={1.5} className="principal-area-filter">
              <Text fontSize="xs">Área NDVI:</Text>
              <Select
                size="xs"
                value={selected?.id ?? ""}
                aria-label="Área do NDVI no mapa"
                onChange={(e) => onSelect(e.target.value)}
                w="150px"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </HStack>
          )}
        </HStack>
      )}
      {!compact && (
        <VStack
          position="absolute"
          right="12px"
          top="14px"
          zIndex={500}
          role="toolbar"
          aria-label="Controles do mapa"
          spacing={1.5}
        >
          <IconButton
            size="xs"
            aria-label="Aproximar mapa"
            icon={<Plus size={15} />}
            bg="rgba(9, 26, 40, 0.9)"
            color="#d8eaf6"
            border="1px solid"
            borderColor="#29465b"
            _hover={{ bg: "#143147" }}
            onClick={() => mapRef.current?.zoomIn()}
          />
          <IconButton
            size="xs"
            aria-label="Afastar mapa"
            icon={<Minus size={15} />}
            bg="rgba(9, 26, 40, 0.9)"
            color="#d8eaf6"
            border="1px solid"
            borderColor="#29465b"
            _hover={{ bg: "#143147" }}
            onClick={() => mapRef.current?.zoomOut()}
          />
          <IconButton
            size="xs"
            aria-label="Centralizar na área selecionada"
            icon={<Crosshair size={15} />}
            bg="rgba(9, 26, 40, 0.9)"
            color="#d8eaf6"
            border="1px solid"
            borderColor="#29465b"
            _hover={{ bg: "#143147" }}
            onClick={fitSelected}
          />
          {mainMap ? (
            <>
              <IconButton
                size="xs"
                className="rain-map-toggle active"
                aria-label="Camada de chuva ativa"
                title="Chuva nas sondas"
                icon={<Droplets size={15} />}
                colorScheme="blue"
              />
              <IconButton
                size="xs"
                className="base-map-toggle"
                aria-pressed={showContours}
                aria-label="Alternar contornos das áreas"
                title="Camadas do mapa"
                icon={<Layers size={15} />}
                bg="rgba(9, 26, 40, 0.9)"
                color="#d8eaf6"
                onClick={() => setShowContours((v) => !v)}
              />
              <NdviMapToggle
                active={showMainMapNdvi}
                disabled={!selected || !ndviApi}
                onToggle={() => setShowMainMapNdvi((v) => !v)}
              />
            </>
          ) : (
            !drawing && (
              <>
                <IconButton
                  size="xs"
                  aria-pressed={showOverlay}
                  aria-label="Alternar camada NDVI"
                  icon={<Layers size={15} />}
                  bg={showOverlay ? "#1e4e72" : "rgba(9, 26, 40, 0.9)"}
                  color="#d8eaf6"
                  border="1px solid"
                  borderColor="#29465b"
                  _hover={{ bg: "#143147" }}
                  onClick={() => setShowOverlay((v) => !v)}
                />
                <IconButton
                  size="xs"
                  aria-pressed={showContours}
                  aria-label="Alternar contorno dos talhões"
                  icon={<Maximize2 size={15} />}
                  bg={showContours ? "#1e4e72" : "rgba(9, 26, 40, 0.9)"}
                  color="#d8eaf6"
                  border="1px solid"
                  borderColor="#29465b"
                  _hover={{ bg: "#143147" }}
                  onClick={() => setShowContours((v) => !v)}
                />
              </>
            )
          )}
        </VStack>
      )}
      {mainMap && ndviApi && (
        <NdviMapOverlay
          map={mapInstance}
          area={selected}
          api={ndviApi}
          enabled={showMainMapNdvi}
        />
      )}
      {drawing && onFinishDrawing && onCancelDrawing && (
        <NdviContourTools
          state={draw}
          onConfirm={onFinishDrawing}
          onCancel={onCancelDrawing}
        />
      )}
      {analysis &&
        analysis.quality === "insuficiente" &&
        !drawing &&
        !mainMap && (
          <Flex
            position="absolute"
            zIndex={490}
            inset={0}
            align="center"
            justify="center"
            direction="column"
            gap={2}
            bg="rgba(10, 18, 38, 0.88)"
            backdropFilter="blur(4px)"
            p={6}
            textAlign="center"
            role="status"
          >
            <Text as="strong" fontSize="md" color="#deebed" fontWeight="600">
              Passagem com cobertura de nuvens alta
            </Text>
            <Text as="span" fontSize="xs" color="#91aab5" maxW="400px">
              {Math.round(100 - analysis.validPct)}% dos pixels da área foram
              descartados pela máscara de nuvens. Selecione outra data abaixo.
            </Text>
          </Flex>
        )}
      <Flex
        position="absolute"
        bottom="8px"
        right="12px"
        left="12px"
        zIndex={450}
        align="center"
        justify="space-between"
        fontSize="10px"
        color="#b0c3b9"
        pointerEvents="none"
      >
        <Text as="span" fontSize="xs">
          {basemap?.tileUrl
            ? "Mapa base da plataforma BR Sense"
            : "Pré-visualização local · Camada de satélite BR Sense"}
        </Text>
      </Flex>
    </Box>
  );
}
