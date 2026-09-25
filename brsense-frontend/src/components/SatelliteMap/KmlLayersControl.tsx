import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Switch,
  Divider,
  Icon,
  Tooltip,
  Button,
  Collapse,
} from "@chakra-ui/react";
import {
  FaLayerGroup,
  FaTrash,
  FaPlus,
  FaChevronRight,
  FaChevronDown,
  FaCircle,
  FaDrawPolygon,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { MdClose, MdTimeline } from "react-icons/md";
import type { MapLayer } from "../../types";

// ── Helpers ──────────────────────────────────────────────────────────────────

type GeomType =
  | "Point"
  | "MultiPoint"
  | "LineString"
  | "MultiLineString"
  | "Polygon"
  | "MultiPolygon"
  | "GeometryCollection"
  | null;

const GEOM_LABEL: Record<string, string> = {
  Point: "Ponto",
  MultiPoint: "Multiponto",
  LineString: "Linha",
  MultiLineString: "Multilinha",
  Polygon: "Polígono",
  MultiPolygon: "Multipolígono",
  GeometryCollection: "Coleção",
};

function geomIcon(type: GeomType) {
  switch (type) {
    case "Point":
    case "MultiPoint":
      return FaMapMarkerAlt;
    case "LineString":
    case "MultiLineString":
      return MdTimeline;
    case "Polygon":
    case "MultiPolygon":
      return FaDrawPolygon;
    default:
      return FaCircle;
  }
}

function featureLabel(feature: GeoJSON.Feature, index: number): string {
  // Prefer the name from KML properties
  const name =
    (feature.properties?.name as string | undefined) ||
    (feature.properties?.Name as string | undefined);
  if (name && name.trim()) return name.trim();

  // Fallback: geometric type in Portuguese
  const geomType = feature.geometry?.type as GeomType | undefined;
  const label = geomType ? (GEOM_LABEL[geomType] ?? "Feature") : "Feature";
  return `${label} ${index + 1}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface KmlLayersControlProps {
  layers: MapLayer[];
  visibleLayerIds: Set<number>;
  onToggleLayer: (id: number) => void;
  onDeleteLayer: (id: number) => void;
  onOpenUpload: () => void;
  /** Map<layerId, Set<featureIndex>> of hidden individual features */
  hiddenFeatures: Map<number, Set<number>>;
  onToggleFeature: (layerId: number, featureIndex: number) => void;
  onDeleteFeature: (layerId: number, featureIndex: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const KmlLayersControl: React.FC<KmlLayersControlProps> = ({
  layers,
  visibleLayerIds,
  onToggleLayer,
  onDeleteLayer,
  onOpenUpload,
  hiddenFeatures,
  onToggleFeature,
  onDeleteFeature,
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [expandedLayerIds, setExpandedLayerIds] = useState<Set<number>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  // Prevent Leaflet from catching wheel events (Leaflet uses native DOM listeners,
  // React's synthetic stopPropagation doesn't reach it).
  // Depends on isPanelOpen because the Box is conditionally rendered — DOM node
  // is recreated every time the panel opens.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const stop = (e: WheelEvent) => e.stopPropagation();
    el.addEventListener("wheel", stop, { passive: false });
    return () => el.removeEventListener("wheel", stop);
  }, [isPanelOpen]);

  const toggleLayerExpand = (id: number) => {
    setExpandedLayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Box position="relative">
      {/* ── Toggle Button ───────────────────────────── */}
      <Tooltip label="Camadas KML/KMZ" placement="left">
        <Box
          as="button"
          onClick={() => setIsPanelOpen((v) => !v)}
          w="36px"
          h="36px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg={isPanelOpen ? "blue.600" : "gray.800"}
          border="1px solid"
          borderColor={isPanelOpen ? "blue.400" : "whiteAlpha.300"}
          borderRadius="lg"
          color="white"
          cursor="pointer"
          transition="all 0.2s"
          _hover={{ bg: isPanelOpen ? "blue.500" : "gray.700" }}
          title="Camadas KML/KMZ"
        >
          <Icon as={FaLayerGroup} boxSize={4} />
        </Box>
      </Tooltip>

      {/* ── Panel ───────────────────────────────────── */}
      {isPanelOpen && (
        <Box
          ref={panelRef}
          position="absolute"
          right="44px"
          top="0"
          w="260px"
          bg="gray.900"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="xl"
          boxShadow="0 8px 32px rgba(0,0,0,0.5)"
          overflow="hidden"
          zIndex={1000}
          style={{ backdropFilter: "blur(12px)" }}
        >

          {/* Header */}
          <HStack
            px={3}
            py={2}
            justify="space-between"
            borderBottom="1px solid"
            borderColor="whiteAlpha.100"
          >
            <HStack spacing={2}>
              <Icon as={FaLayerGroup} color="blue.300" boxSize={3.5} />
              <Text fontSize="xs" fontWeight="semibold" color="white" letterSpacing="wide">
                CAMADAS
              </Text>
            </HStack>
            <HStack spacing={1}>
              <Tooltip label="Importar KML/KMZ" placement="top">
                <IconButton
                  aria-label="Importar"
                  icon={<Icon as={FaPlus} />}
                  size="xs"
                  colorScheme="blue"
                  variant="ghost"
                  onClick={onOpenUpload}
                />
              </Tooltip>
              <IconButton
                aria-label="Fechar"
                icon={<Icon as={MdClose} />}
                size="xs"
                variant="ghost"
                color="whiteAlpha.600"
                onClick={() => setIsPanelOpen(false)}
              />
            </HStack>
          </HStack>

          {/* Layer list */}
          <VStack spacing={0} align="stretch" maxH="400px" overflowY="auto">
            {layers.length === 0 ? (
              <Box px={3} py={4} textAlign="center">
                <Text fontSize="xs" color="whiteAlpha.500">
                  Nenhuma camada importada
                </Text>
                <Button
                  size="xs"
                  colorScheme="blue"
                  variant="ghost"
                  mt={2}
                  leftIcon={<Icon as={FaPlus} />}
                  onClick={onOpenUpload}
                >
                  Importar KML/KMZ
                </Button>
              </Box>
            ) : (
              layers.map((layer, idx) => {
                const isLayerVisible = visibleLayerIds.has(layer.id);
                const isExpanded = expandedLayerIds.has(layer.id);
                const features = layer.geojson?.features ?? [];
                const hiddenSet = hiddenFeatures.get(layer.id) ?? new Set<number>();

                return (
                  <Box key={layer.id}>
                    {idx > 0 && <Divider borderColor="whiteAlpha.100" />}

                    {/* ── Layer row ─────────────────────────────── */}
                    <HStack
                      px={3}
                      py={2}
                      spacing={1}
                      justify="space-between"
                      bg={isExpanded ? "whiteAlpha.50" : "transparent"}
                      _hover={{ bg: "whiteAlpha.50" }}
                      transition="background 0.15s"
                    >
                      {/* Expand chevron */}
                      <IconButton
                        aria-label={isExpanded ? "Colapsar" : "Expandir"}
                        icon={
                          <Icon
                            as={isExpanded ? FaChevronDown : FaChevronRight}
                            boxSize={2.5}
                          />
                        }
                        size="xs"
                        variant="ghost"
                        color="whiteAlpha.500"
                        minW="18px"
                        h="18px"
                        onClick={() => toggleLayerExpand(layer.id)}
                        flexShrink={0}
                      />

                      {/* Layer visibility toggle */}
                      <Switch
                        size="sm"
                        colorScheme="blue"
                        isChecked={isLayerVisible}
                        onChange={() => onToggleLayer(layer.id)}
                        flexShrink={0}
                      />

                      {/* Layer name */}
                      <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        color={isLayerVisible ? "white" : "whiteAlpha.400"}
                        flex={1}
                        noOfLines={1}
                        transition="color 0.2s"
                        cursor="pointer"
                        onClick={() => toggleLayerExpand(layer.id)}
                      >
                        {layer.name}
                      </Text>

                      {/* Feature count badge */}
                      {features.length > 0 && (
                        <Text fontSize="9px" color="whiteAlpha.400" flexShrink={0}>
                          {features.length}
                        </Text>
                      )}

                      {/* Delete layer */}
                      <Tooltip label="Excluir camada" placement="top">
                        <IconButton
                          aria-label="Excluir camada"
                          icon={<Icon as={FaTrash} />}
                          size="xs"
                          variant="ghost"
                          color="red.400"
                          _hover={{ bg: "red.900", color: "red.300" }}
                          onClick={() => onDeleteLayer(layer.id)}
                          flexShrink={0}
                        />
                      </Tooltip>
                    </HStack>

                    {/* ── Feature sub-list (accordion) ──────────── */}
                    <Collapse in={isExpanded} animateOpacity>
                      {features.length === 0 ? (
                        <Box px={8} py={2}>
                          <Text fontSize="xs" color="whiteAlpha.400">
                            Nenhuma feature encontrada
                          </Text>
                        </Box>
                      ) : (
                        <Box
                          maxH="260px"
                          overflowY="auto"
                          pb={1}
                          sx={{
                            "&::-webkit-scrollbar": { width: "4px" },
                            "&::-webkit-scrollbar-track": { bg: "transparent" },
                            "&::-webkit-scrollbar-thumb": {
                              bg: "whiteAlpha.200",
                              borderRadius: "full",
                            },
                            "&::-webkit-scrollbar-thumb:hover": {
                              bg: "whiteAlpha.400",
                            },
                          }}
                        >
                        <VStack spacing={0} align="stretch">
                          {features.map((feature, fIdx) => {
                            const isFeatureVisible = !hiddenSet.has(fIdx);
                            const geomType = feature.geometry?.type as GeomType | undefined;
                            const FeatureIcon = geomIcon(geomType ?? null);
                            const label = featureLabel(feature, fIdx);

                            return (
                              <HStack
                                key={fIdx}
                                px={3}
                                py={1.5}
                                pl={8}
                                spacing={2}
                                justify="space-between"
                                _hover={{ bg: "whiteAlpha.50" }}
                                transition="background 0.15s"
                                opacity={isLayerVisible ? 1 : 0.4}
                              >
                                {/* Geometry type icon */}
                                <Icon
                                  as={FeatureIcon}
                                  boxSize={3}
                                  color={isFeatureVisible ? "blue.300" : "whiteAlpha.300"}
                                  flexShrink={0}
                                  transition="color 0.2s"
                                />

                                {/* Feature name */}
                                <Text
                                  fontSize="xs"
                                  color={
                                    isFeatureVisible && isLayerVisible
                                      ? "whiteAlpha.800"
                                      : "whiteAlpha.300"
                                  }
                                  flex={1}
                                  noOfLines={1}
                                  transition="color 0.2s"
                                >
                                  {label}
                                </Text>

                                {/* Toggle feature visibility */}
                                {/* <Tooltip
                                  label={isFeatureVisible ? "Ocultar" : "Mostrar"}
                                  placement="top"
                                > */}
                                  <Switch
                                    size="sm"
                                    colorScheme="blue"
                                    isChecked={isFeatureVisible}
                                    onChange={() => onToggleFeature(layer.id, fIdx)}
                                    flexShrink={0}
                                  />
                                {/* </Tooltip> */}

                                {/* Delete feature */}
                                <Tooltip label="Remover feature" placement="top">
                                  <IconButton
                                    aria-label="Remover feature"
                                    icon={<Icon as={FaTrash} boxSize={2.5} />}
                                    size="xs"
                                    variant="ghost"
                                    color="red.400"
                                    _hover={{ bg: "red.900", color: "red.300" }}
                                    onClick={() => onDeleteFeature(layer.id, fIdx)}
                                    flexShrink={0}
                                    minW="20px"
                                    h="20px"
                                  />
                                </Tooltip>
                              </HStack>
                            );
                          })}
                        </VStack>
                        </Box>
                      )}
                    </Collapse>
                  </Box>
                );
              })
            )}
          </VStack>

          {/* Footer */}
          {layers.length > 0 && (
            <>
              <Divider borderColor="whiteAlpha.100" />
              <Box px={3} py={2}>
                <Button
                  size="xs"
                  colorScheme="blue"
                  variant="ghost"
                  w="full"
                  leftIcon={<Icon as={FaPlus} />}
                  onClick={onOpenUpload}
                >
                  Importar nova camada
                </Button>
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};
