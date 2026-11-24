import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Flex,
  HStack,
  Icon,
  IconButton,
  Switch,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { MdClose } from "react-icons/md";
import { Calendar, ExternalLink, Satellite } from "lucide-react";
import {
  FaChevronDown,
  FaChevronRight,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import type { NdviArea, NdviScene, NdviAnalysis } from "../../modules/ndvi";
import type { Farm } from "../../types";

interface NdviLayersControlProps {
  showNdvi: boolean;
  onToggleNdvi: () => void;
  areas: NdviArea[];
  visibleAreaIds?: Set<string>;
  onToggleArea?: (id: string) => void;
  onToggleFarm?: (farmName: string) => void;
  selectedFarmName?: string;
  onSelectFarmName?: (farmName: string) => void;
  selectedAreaId?: string;
  onSelectAreaId?: (id: string) => void;
  scenes: NdviScene[];
  analyses: Record<string, NdviAnalysis>;
  selectedSceneId: string;
  onSelectSceneId: (id: string) => void;
  farms?: Farm[];
  disabled?: boolean;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onClose?: () => void;
}

export const NdviLayersControl: React.FC<NdviLayersControlProps> = ({
  showNdvi,
  onToggleNdvi,
  areas,
  visibleAreaIds = new Set(),
  onToggleArea,
  onToggleFarm,
  selectedFarmName = "",
  onSelectFarmName,
  selectedAreaId,
  onSelectAreaId,
  scenes,
  analyses,
  selectedSceneId,
  onSelectSceneId,
  farms = [],
  disabled = false,
  isOpen,
  onToggleOpen,
  onClose,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isPanelOpen = isOpen !== undefined ? isOpen : internalOpen;
  const [expandedFarmNames, setExpandedFarmNames] = useState<Set<string>>(() => new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleToggleOpen = () => {
    if (onToggleOpen) onToggleOpen();
    else setInternalOpen((v) => !v);
  };

  const handleClose = () => {
    if (onClose) onClose();
    else setInternalOpen(false);
  };

  // Stop scroll propagation to Leaflet
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const stop = (e: WheelEvent) => e.stopPropagation();
    el.addEventListener("wheel", stop, { passive: false });
    return () => el.removeEventListener("wheel", stop);
  }, [isPanelOpen]);

  const farmNameById = useMemo(
    () => new Map<number, string>(farms.map((f) => [f.id, f.name])),
    [farms]
  );

  const getFarmName = (area: NdviArea): string => {
    if (area.farmName) return area.farmName;
    if (area.farmId && farmNameById.has(area.farmId)) {
      return farmNameById.get(area.farmId)!;
    }
    return "Fazenda";
  };

  const groupedAreas = useMemo<{ farmName: string; areas: NdviArea[] }[]>(() => {
    const groups: { farmName: string; areas: NdviArea[] }[] = [];
    const map = new Map<string, NdviArea[]>();
    for (const a of areas) {
      const fn = getFarmName(a);
      if (!map.has(fn)) {
        const list: NdviArea[] = [];
        map.set(fn, list);
        groups.push({ farmName: fn, areas: list });
      }
      map.get(fn)!.push(a);
    }
    return groups;
  }, [areas, farmNameById]);

  // Expandir todas as fazendas por padrão para visualização imediata dos switches
  useEffect(() => {
    if (groupedAreas.length > 0) {
      setExpandedFarmNames(new Set(groupedAreas.map((g) => g.farmName)));
    }
  }, [groupedAreas]);

  const toggleFarmExpand = (farmName: string) => {
    setExpandedFarmNames((prev) => {
      const next = new Set(prev);
      if (next.has(farmName)) next.delete(farmName);
      else next.add(farmName);
      return next;
    });
  };

  // Limita estritamente às últimas 5 medições
  const recentScenes = scenes.slice(0, 5);

  return (
    <Box position="relative">
      {/* ── Botão no estilo KmlLayersControl ───────────────────────────── */}
      <Tooltip label="Camadas NDVI" placement="left">
        <Box
          as="button"
          onClick={handleToggleOpen}
          w="36px"
          h="36px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg={isPanelOpen || showNdvi ? "blue.600" : "gray.800"}
          border="1px solid"
          borderColor={isPanelOpen || showNdvi ? "blue.400" : "whiteAlpha.300"}
          borderRadius="lg"
          color="white"
          cursor={disabled ? "not-allowed" : "pointer"}
          transition="all 0.2s"
          _hover={{ bg: isPanelOpen || showNdvi ? "blue.500" : "gray.700" }}
          opacity={disabled ? 0.6 : 1}
          title="Camada NDVI"
        >
          <Satellite size={16} />
        </Box>
      </Tooltip>

      {/* ── Painel Flutuante estilo KML ─────────────────────────────────── */}
      {isPanelOpen && (
        <Box
          ref={panelRef}
          position="absolute"
          right="44px"
          top="0"
          w="290px"
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
            py={2.5}
            justify="space-between"
            borderBottom="1px solid"
            borderColor="whiteAlpha.100"
          >
            <HStack spacing={2}>
              <Satellite size={15} color="#63b3ed" />
              <Text
                fontSize="xs"
                fontWeight="semibold"
                color="white"
                letterSpacing="wide"
              >
                CAMADA NDVI
              </Text>
            </HStack>
            <IconButton
              aria-label="Fechar"
              icon={<Icon as={MdClose} />}
              size="xs"
              variant="ghost"
              color="whiteAlpha.600"
              _hover={{ color: "white", bg: "whiteAlpha.100" }}
              onClick={handleClose}
            />
          </HStack>

          {/* Master Switch: Habilitar / Desabilitar NDVI no Mapa */}
          <HStack
            px={3}
            py={2.5}
            justify="space-between"
            bg="whiteAlpha.100"
            borderBottom="1px solid"
            borderColor="whiteAlpha.100"
          >
            <VStack align="start" spacing={0}>
              <Text fontSize="xs" fontWeight="semibold" color="white">
                Exibir NDVI no mapa
              </Text>
              <Text fontSize="10px" color="whiteAlpha.600">
                {showNdvi ? "Camada ativa" : "Camada desabilitada"}
              </Text>
            </VStack>
            <Switch
              size="sm"
              colorScheme="blue"
              isChecked={showNdvi}
              onChange={onToggleNdvi}
            />
          </HStack>

          {/* Conteúdo com seleção de área e histórico */}
          {areas.length === 0 ? (
            <Box px={3} py={4} textAlign="center">
              <Text fontSize="xs" color="whiteAlpha.500">
                Nenhuma área NDVI cadastrada
              </Text>
              <Button
                size="xs"
                colorScheme="blue"
                variant="ghost"
                mt={2}
                rightIcon={<ExternalLink size={12} />}
                onClick={() => navigate("/ndvi")}
              >
                Desenhar área no módulo NDVI
              </Button>
            </Box>
          ) : (
            <VStack spacing={0} align="stretch" maxH="380px" overflowY="auto">
              {/* Seção Áreas */}
              <Box px={3} pt={2.5} pb={1.5}>
                <Text
                  fontSize="10px"
                  fontWeight="bold"
                  color="blue.300"
                  letterSpacing="wider"
                  textTransform="uppercase"
                >
                  Áreas NDVI
                </Text>
              </Box>

              <VStack spacing={0} align="stretch" pb={2}>
                {groupedAreas.map(({ farmName, areas: farmAreas }, idx) => {
                  const isExpanded = expandedFarmNames.has(farmName);
                  const isFarmVisible = farmAreas.some((a) => visibleAreaIds.has(a.id));
                  const isSelected = selectedFarmName === farmName;

                  return (
                    <Box key={farmName}>
                      {idx > 0 && <Divider borderColor="whiteAlpha.100" />}

                      {/* ── Linha da Fazenda (estilo KmlLayersControl) ──────────────── */}
                      <HStack
                        px={3}
                        py={2}
                        spacing={1.5}
                        justify="space-between"
                        bg={isSelected ? "rgba(48, 132, 201, 0.15)" : isExpanded ? "whiteAlpha.50" : "transparent"}
                        _hover={{ bg: "whiteAlpha.100" }}
                        transition="background 0.15s"
                      >
                        {/* Chevron para expandir/colapsar */}
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
                          onClick={() => toggleFarmExpand(farmName)}
                          flexShrink={0}
                        />

                        {/* Switch da Fazenda (liga/desliga todas as áreas da fazenda) */}
                        <Switch
                          size="sm"
                          colorScheme="blue"
                          isChecked={isFarmVisible}
                          onChange={() => onToggleFarm?.(farmName)}
                          flexShrink={0}
                        />

                        {/* Nome da Fazenda e contagem de áreas */}
                        <VStack
                          align="start"
                          spacing={0}
                          flex={1}
                          minW={0}
                          cursor="pointer"
                          onClick={() => {
                            onSelectFarmName?.(farmName);
                            toggleFarmExpand(farmName);
                          }}
                        >
                          <Text
                            fontSize="xs"
                            fontWeight="semibold"
                            color={isFarmVisible ? "white" : "whiteAlpha.400"}
                            noOfLines={1}
                            transition="color 0.2s"
                          >
                            {farmName}
                          </Text>
                          <Text fontSize="10px" color="whiteAlpha.500">
                            {farmAreas.length} {farmAreas.length === 1 ? "área monitorada" : "áreas monitoradas"}
                          </Text>
                        </VStack>

                        {/* Badge com a quantidade de áreas */}
                        <Badge
                          colorScheme="blue"
                          variant="subtle"
                          fontSize="9px"
                          px={1.5}
                          borderRadius="sm"
                          flexShrink={0}
                        >
                          {farmAreas.length}
                        </Badge>
                      </HStack>

                      {/* ── Áreas NDVI individuais vinculadas à fazenda (Collapse estilo features KML) ── */}
                      <Collapse in={isExpanded} animateOpacity>
                        <VStack spacing={0} align="stretch" pl={7} pr={2} py={1} bg="whiteAlpha.50">
                          {farmAreas.map((area) => {
                            const isAreaVisible = visibleAreaIds.has(area.id);
                            return (
                              <HStack
                                key={area.id}
                                py={1.5}
                                px={2}
                                justify="space-between"
                                borderRadius="md"
                                bg={selectedAreaId === area.id ? "rgba(48, 132, 201, 0.15)" : "transparent"}
                                _hover={{ bg: "whiteAlpha.100" }}
                                transition="all 0.15s ease"
                              >
                                <HStack
                                  spacing={2}
                                  minW={0}
                                  flex={1}
                                  cursor="pointer"
                                  onClick={() => onSelectAreaId?.(area.id)}
                                >
                                  <Box
                                    as="span"
                                    w="7px"
                                    h="7px"
                                    borderRadius="full"
                                    bg={isAreaVisible ? "#3084C9" : "whiteAlpha.400"}
                                    flexShrink={0}
                                  />
                                  <VStack align="start" spacing={0} minW={0} flex={1}>
                                    <Text
                                      fontSize="xs"
                                      color={isAreaVisible ? "white" : "whiteAlpha.400"}
                                      fontWeight={selectedAreaId === area.id ? "bold" : isAreaVisible ? "medium" : "normal"}
                                      noOfLines={1}
                                    >
                                      {area.deviceName || area.deviceEsn || area.name}
                                    </Text>
                                    <Text fontSize="10px" color="whiteAlpha.500" noOfLines={1}>
                                      {area.hectares.toFixed(1).replace(".", ",")} ha · {area.crop}
                                    </Text>
                                  </VStack>
                                </HStack>

                                {/* Switch individual para habilitar ou desabilitar este NDVI */}
                                <Switch
                                  size="sm"
                                  colorScheme="blue"
                                  isChecked={isAreaVisible}
                                  onChange={() => onToggleArea?.(area.id)}
                                  flexShrink={0}
                                />
                              </HStack>
                            );
                          })}
                        </VStack>
                      </Collapse>
                    </Box>
                  );
                })}
              </VStack>

              <Divider borderColor="whiteAlpha.100" />

              {/* Seção Histórico (Últimas 5 medições) */}
              <Box px={3} pt={2.5} pb={1.5}>
                <Flex justify="space-between" align="center">
                  <Text
                    fontSize="10px"
                    fontWeight="bold"
                    color="teal.300"
                    letterSpacing="wider"
                    textTransform="uppercase"
                  >
                    Histórico (Últimas 5)
                  </Text>
                  {scenes.length > 5 && (
                    <Text fontSize="9px" color="whiteAlpha.500">
                      5 de {scenes.length} passagens
                    </Text>
                  )}
                </Flex>
              </Box>

              {recentScenes.length === 0 ? (
                <Box px={3} py={2}>
                  <Text fontSize="xs" color="whiteAlpha.500">
                    Carregando passagens de satélite...
                  </Text>
                </Box>
              ) : (
                <VStack spacing={1} align="stretch" px={2} pb={2}>
                  {recentScenes.map((s) => {
                    const a = analyses[s.id];
                    const isSceneActive = s.id === selectedSceneId;
                    const dateStr = new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(s.acquiredAt));

                    return (
                      <Box
                        key={s.id}
                        as="button"
                        type="button"
                        onClick={() => onSelectSceneId(s.id)}
                        px={2.5}
                        py={1.5}
                        borderRadius="md"
                        bg={
                          isSceneActive
                            ? "rgba(49, 151, 149, 0.25)"
                            : "transparent"
                        }
                        border="1px solid"
                        borderColor={
                          isSceneActive ? "teal.400" : "whiteAlpha.100"
                        }
                        textAlign="left"
                        _hover={{
                          bg: isSceneActive
                            ? "rgba(49, 151, 149, 0.35)"
                            : "whiteAlpha.100",
                        }}
                      >
                        <Flex justify="space-between" align="center">
                          <HStack spacing={1.5}>
                            <Calendar size={12} color="#81e6d9" />
                            <Text fontSize="xs" color="white">
                              {dateStr}
                            </Text>
                          </HStack>
                          {a?.mean != null ? (
                            <Badge
                              colorScheme={
                                a.mean >= 0.65
                                  ? "green"
                                  : a.mean >= 0.45
                                  ? "yellow"
                                  : "red"
                              }
                              variant="subtle"
                              fontSize="9px"
                            >
                              NDVI {a.mean.toFixed(2).replace(".", ",")}
                            </Badge>
                          ) : (
                            <Text fontSize="10px" color="whiteAlpha.500">
                              --
                            </Text>
                          )}
                        </Flex>
                      </Box>
                    );
                  })}
                </VStack>
              )}

              {/* Botão Ver mais na página de NDVI */}
              <Box px={2} pb={3} pt={1}>
                <Button
                  size="xs"
                  w="100%"
                  colorScheme="blue"
                  variant="outline"
                  borderColor="blue.500"
                  color="blue.300"
                  _hover={{ bg: "rgba(48, 132, 201, 0.2)", color: "white" }}
                  rightIcon={<ExternalLink size={12} />}
                  onClick={() => navigate("/ndvi")}
                >
                  Ver mais na página de NDVI
                </Button>
              </Box>
            </VStack>
          )}
        </Box>
      )}
    </Box>
  );
};
