import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Text,
  Button,
  VStack,
  HStack,
  CloseButton,
  Divider,
  Flex,
  IconButton,
  Spinner,
  Icon,
  Grid,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { MdWaterDrop, MdCloud, MdDelete, MdEdit } from "react-icons/md";
import { RainBox, TabButton } from "./ProbeCard";
import { ForecastTab } from "../ForecastTab/ForecastTab";
import { FaTint, FaList } from "react-icons/fa";
import { GiGroundSprout } from "react-icons/gi";
import { PinBalanceCompact } from "../../modules/soil/PinBalanceCompact";
import type { MapPoint } from "../SatelliteMap/SatelliteMap";
import { getManualIrrigations, deleteManualIrrigation } from "../../services/api";
import type { ManualIrrigationRecord } from "../../types";
import { EditIrrigationModal } from "../ManualProbeModals/EditIrrigationModal";
import { COLORS } from "../../colors/colors";

interface ManualProbeCardProps {
  point: MapPoint | null;
  onClose: () => void;
  onBatchUpdateClick?: () => void;
  onDeleteManualProbe?: (id: number) => void;
  onEditManualProbe?: (id: number) => void;
  onManualProbeUpdated?: () => void;
  onViewDetails?: (id: number | string) => void;
}

export function ManualProbeCard({
  point,
  onClose,
  onBatchUpdateClick,
  onDeleteManualProbe,
  onEditManualProbe,
  onManualProbeUpdated,
  onViewDetails,
}: ManualProbeCardProps) {
  const calcularDAP = (dataPlantio?: string | null) => {
    if (!dataPlantio) return "-";
    const hoje = new Date();
    const dataP = new Date(dataPlantio);
    const diffTime = Math.abs(hoje.getTime() - dataP.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  type ManualTabType = 'front' | 'rain' | 'forecast' | 'balance';

  const [activeTab, setActiveTab] = useState<ManualTabType>('front');
  const [rotation, setRotation] = useState(0);
  const [frontContent, setFrontContent] = useState<ManualTabType>('front');
  const [backContent, setBackContent] = useState<ManualTabType>('balance');

  const handleTabChange = (nextTab: ManualTabType) => {
    if (nextTab === activeTab) return;

    const isFrontVisible = rotation % 360 === 0;

    if (isFrontVisible) {
      setBackContent(nextTab);
    } else {
      setFrontContent(nextTab);
    }

    setRotation((prev) => prev + 180);
    setActiveTab(nextTab);
  };

  const [fetching, setFetching] = useState(true);
  const [records, setRecords] = useState<ManualIrrigationRecord[]>([]);

  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const [editingRecord, setEditingRecord] = useState<ManualIrrigationRecord | null>(null);
  const toast = useToast();

  const fetchHistory = useCallback(async () => {
    if (!point || !point.isManualProbe) return;
    try {
      setFetching(true);
      const data = await getManualIrrigations(point.id);
      setRecords(data);
    } catch (error) {
      console.error("Erro ao carregar irrigações", error);
    } finally {
      setFetching(false);
    }
  }, [point]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDeleteIrrigation = async (recordId: number) => {
    if (!window.confirm("Deseja realmente deletar esta irrigação?")) return;
    try {
      await deleteManualIrrigation(recordId);
      toast({ title: "Irrigação removida", status: "success", duration: 2000 });
      fetchHistory();
      onManualProbeUpdated?.();
    } catch {
      toast({ title: "Erro ao deletar", status: "error", duration: 3000 });
    }
  };

  if (!point || !point.isManualProbe) return null;

  const renderTabContent = (tab: ManualTabType) => {
    if (tab === 'front') {
      return (
        <Flex direction="column" h="100%">
          <Flex justify="space-between" align="center" mb={3}>
            <Text fontSize="sm" fontWeight="bold" color="gray.300">
              Últimas Irrigações
            </Text>
            {point.data_plantio && (
              <Text fontSize="xs" fontWeight="bold" color="green.400" bg="green.900" px={2} py={1} borderRadius="md">
                DAP: {calcularDAP(point.data_plantio)} dias
              </Text>
            )}
          </Flex>

          {fetching ? (
            <Flex flex="1" justify="center" align="center">
              <Spinner color="blue.500" />
            </Flex>
          ) : records.length === 0 ? (
            <Flex flex="1" justify="center" align="center">
              <Text color="gray.500" fontSize="sm">Nenhum registro encontrado.</Text>
            </Flex>
          ) : (
            <VStack
              align="stretch"
              spacing={2}
              flex="1"
              pb={2}
              overflowY="auto"
              pr={1}
              sx={{
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-track": { width: "6px" },
                "&::-webkit-scrollbar-thumb": {
                  background: "gray.600",
                  borderRadius: "24px",
                },
              }}
            >
              {records.slice(0, 7).map((r) => (
                <HStack key={r.id} justify="space-between" p={2} bg="whiteAlpha.50" borderRadius="md" role="group">
                  <VStack align="start" spacing={0}>
                    <Text color="white" fontSize="sm">
                      {new Date(r.date).toLocaleDateString("pt-BR")}
                    </Text>
                    <Text color="gray.400" fontSize="xs">
                      {new Date(r.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </VStack>
                  <HStack spacing={1}>
                    <HStack mr={2}>
                      <Icon as={MdWaterDrop} color="blue.400" />
                      <Text color="blue.300" fontWeight="bold" fontSize="sm">
                        {r.irrigation_value_mm.toFixed(1)} mm
                      </Text>
                    </HStack>

                    {/* Botões de Ação */}
                    <HStack spacing={1}>
                      <IconButton
                        aria-label="Editar irrigação"
                        icon={<Icon as={MdEdit} />}
                        size="xs"
                        color="white"
                        bg="gray"
                        variant="ghost"
                        _hover={{ bg: "whiteAlpha.500" }}
                        onClick={() => {
                          setEditingRecord(r);
                          onEditModalOpen();
                        }}
                      />
                      <IconButton
                        aria-label="Deletar irrigação"
                        icon={<Icon as={MdDelete} />}
                        size="xs"
                        color="white"
                        bg="red.500"
                        variant="solid"
                        _hover={{ bg: "red.700" }}
                        onClick={() => handleDeleteIrrigation(r.id)}
                      />
                    </HStack>
                  </HStack>
                </HStack>
              ))}
            </VStack>
          )}

          <Button
            size="sm"
            color={COLORS.primaryDark}
            variant="ghost"
            _hover={{ bg: "whiteAlpha.100", color: "blue.300" }}
            rightIcon={<Icon as={GiGroundSprout} />}
            onClick={() => handleTabChange("balance")}
            w="100%"
            mt={2}
          >
            Ver Balanço Hídrico
          </Button>
        </Flex>
      );
    }

    if (tab === 'rain') {
      const now = Date.now();
      const stats = { '24h': 0, '7d': 0, '15d': 0, '30d': 0 };
      records.forEach((r) => {
        const rDate = new Date(r.date).getTime();
        const val = r.irrigation_value_mm || 0;
        if (rDate >= now - 24 * 60 * 60 * 1000) stats['24h'] += val;
        if (rDate >= now - 7 * 24 * 60 * 60 * 1000) stats['7d'] += val;
        if (rDate >= now - 15 * 24 * 60 * 60 * 1000) stats['15d'] += val;
        if (rDate >= now - 30 * 24 * 60 * 60 * 1000) stats['30d'] += val;
      });

      return (
        <Flex direction="column" h="100%">
          <Text fontSize="sm" fontWeight="bold" color="gray.300" mb={3}>
            Chuva/Irrigação Acumulada
          </Text>
          <Grid templateColumns="repeat(2, 1fr)" gap={3} flex="1" alignContent="start" overflowY="auto">
            <RainBox label="24 Horas" value={stats["24h"]} isHighlight />
            <RainBox label="7 Dias" value={stats["7d"]} />
            <RainBox label="15 Dias" value={stats["15d"]} />
            <RainBox label="30 Dias" value={stats["30d"]} />
          </Grid>
          <Button
            size="sm"
            color={COLORS.primaryDark}
            variant="ghost"
            _hover={{ bg: "whiteAlpha.100", color: "blue.300" }}
            rightIcon={<Icon as={GiGroundSprout} />}
            onClick={() => handleTabChange("balance")}
            w="100%"
            mt={2}
          >
            Ver Balanço Hídrico
          </Button>
        </Flex>
      );
    }

    if (tab === 'forecast') {
      return (
        <Flex direction="column" h="100%">
          <Box flex="1" overflowY="auto">
            <ForecastTab lat={point.lat} lng={point.lng} />
          </Box>
          <Button
            size="sm"
            color={COLORS.primaryDark}
            variant="ghost"
            _hover={{ bg: "whiteAlpha.100", color: "blue.300" }}
            rightIcon={<Icon as={GiGroundSprout} />}
            onClick={() => handleTabChange("balance")}
            w="100%"
            mt={2}
          >
            Ver Balanço Hídrico
          </Button>
        </Flex>
      );
    }

    if (tab === 'balance') {
      return (
        <Flex direction="column" h="100%">
          <PinBalanceCompact
            pin={{
              id: point.id,
              name: point.name,
              latitude: point.lat,
              longitude: point.lng,
            }}
            cultura={point.cultura}
            dataPlantio={point.data_plantio}
            irrigationRecords={records}
            onOpenFullDetails={() => onViewDetails?.(point.id)}
          />
        </Flex>
      );
    }

    return null;
  };

  return (
    <Box
      w={{ base: "88vw", sm: "385px" }}
      maxW="420px"
      mx="auto"
      h={{ base: "430px", sm: "450px" }}
      bg="gray.800"
      borderRadius="xl"
      boxShadow="2xl"
      p={4}
      borderColor="whiteAlpha.200"
      borderWidth="1px"
      display="flex"
      flexDirection="column"
    >
      <HStack justify="space-between" align="center">
        <VStack align="center" spacing={1.5} mb={1}>
          <HStack spacing={3}>
            <Text fontWeight="bold" fontSize="lg" color="white" lineHeight="1">
              {point.name}
            </Text>
            <IconButton
              aria-label="Adicionar irrigação"
              icon={<Icon as={FaTint} />}
              size="sm"
              colorScheme="blue"
              onClick={() => onBatchUpdateClick && onBatchUpdateClick()}
              borderRadius="md"
            />
            {onEditManualProbe && (
              <IconButton
                aria-label="Editar"
                icon={<Icon as={MdEdit} />}
                size="sm"
                bg="gray.500"
                color="white"
                onClick={() => onEditManualProbe(point.id)}
                borderRadius="md"
                _hover={{ bg: "gray.600" }}
              />
            )}
            {onDeleteManualProbe && (
              <IconButton
                aria-label="Excluir"
                icon={<Icon as={MdDelete} />}
                size="sm"
                colorScheme="red"
                onClick={() => {
                  if (window.confirm("Tem certeza que deseja excluir este Pin Manual?")) {
                    onDeleteManualProbe(point.id);
                  }
                }}
                borderRadius="md"
              />
            )}
          </HStack>
        </VStack>
        <CloseButton size="md" onClick={onClose} color="gray.400" _hover={{ color: "white", bg: "whiteAlpha.200" }} />
      </HStack>

      <Divider borderColor="whiteAlpha.300" my={3} />
      <Box flex="1" position="relative" sx={{ perspective: "1000px" }}>
        <Box
          position="relative"
          w="100%"
          h="100%"
          transition="transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)"
          sx={{ transformStyle: "preserve-3d" }}
          transform={`rotateY(${rotation}deg)`}
        >
          <Box
            position="absolute"
            w="100%"
            h="100%"
            sx={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
            display="flex"
            flexDirection="column"
          >
            {renderTabContent(frontContent)}
          </Box>

          <Box
            position="absolute"
            w="100%"
            h="100%"
            sx={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
            display="flex"
            flexDirection="column"
          >
            {renderTabContent(backContent)}
          </Box>
        </Box>
      </Box>

      <HStack
        mt={3}
        pt={3}
        borderTop="1px solid"
        borderColor="whiteAlpha.200"
        spacing={2}
        w="100%"
      >
        <TabButton
          label="Irrigações"
          icon={FaList}
          isActive={activeTab === "front"}
          onClick={() => handleTabChange("front")}
        />
        <TabButton
          label="Acumulado"
          icon={MdWaterDrop}
          isActive={activeTab === "rain"}
          onClick={() => handleTabChange("rain")}
        />
        <TabButton
          label="Previsão"
          icon={MdCloud}
          isActive={activeTab === "forecast"}
          onClick={() => handleTabChange("forecast")}
        />
      </HStack>

      <EditIrrigationModal
        isOpen={isEditModalOpen}
        onClose={() => {
          onEditModalClose();
          setEditingRecord(null);
        }}
        record={editingRecord}
        onUpdated={() => {
          fetchHistory();
          onManualProbeUpdated?.();
        }}
      />
    </Box>
  );
}
