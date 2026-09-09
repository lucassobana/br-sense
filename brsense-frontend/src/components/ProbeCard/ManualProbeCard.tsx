import { useState, useEffect } from "react";
import {
  Box,
  Text,
  VStack,
  HStack,
  CloseButton,
  Divider,
  Flex,
  IconButton,
  Spinner,
  Icon
} from "@chakra-ui/react";
import { MdWaterDrop, MdCloud, MdDelete } from "react-icons/md";
import { Grid } from "@chakra-ui/react";
import { RainBox, TabButton } from "./ProbeCard";
import { motion, AnimatePresence } from "framer-motion";
import { ForecastTab } from "../ForecastTab/ForecastTab";
import { FaTint, FaList } from "react-icons/fa";
import type { MapPoint } from "../SatelliteMap/SatelliteMap";
import { getManualIrrigations } from "../../services/api";
import type { ManualIrrigationRecord } from "../../types";

interface ManualProbeCardProps {
  point: MapPoint | null;
  onClose: () => void;
  onBatchUpdateClick?: () => void;
  onDeleteManualProbe?: (id: number) => void;
}

export function ManualProbeCard({ point, onClose, onBatchUpdateClick, onDeleteManualProbe }: ManualProbeCardProps) {
  const [activeTab, setActiveTab] = useState<'front' | 'rain' | 'forecast'>('front');

  const [fetching, setFetching] = useState(true);
  const [records, setRecords] = useState<ManualIrrigationRecord[]>([]);

  useEffect(() => {
    if (!point || !point.isManualProbe) return;

    const fetchHistory = async () => {
      try {
        setFetching(true);
        const data = await getManualIrrigations(point.id);
        setRecords(data);
      } catch (error) {
        console.error("Erro ao carregar irrigações", error);
      } finally {
        setFetching(false);
      }
    };

    fetchHistory();
  }, [point]);

  if (!point || !point.isManualProbe) return null;


  return (
    <Box
      w={{ base: "85vw", sm: "340px" }}
      maxW="400px"
      mx="auto"
      h={{ base: "400px", sm: "420px" }}
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
      <Box flex="1" position="relative" sx={{ perspective: "1500px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {activeTab === 'front' && (
              <Flex direction="column" h="100%">
                <Text fontSize="sm" fontWeight="bold" color="gray.300" mb={3}>
                  Últimas Irrigações
                </Text>

                {fetching ? (
                  <Flex flex="1" justify="center" align="center">
                    <Spinner color="blue.500" />
                  </Flex>
                ) : records.length === 0 ? (
                  <Flex flex="1" justify="center" align="center">
                    <Text color="gray.500" fontSize="sm">Nenhum registro encontrado.</Text>
                  </Flex>
                ) : (
                  <VStack align="stretch" spacing={2} flex="1" pb={2} overflowY="auto" pr={1}
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
                      <HStack key={r.id} justify="space-between" p={2} bg="whiteAlpha.50" borderRadius="md">
                        <VStack align="start" spacing={0}>
                          <Text color="white" fontSize="sm">
                            {new Date(r.date).toLocaleDateString("pt-BR")}
                          </Text>
                          <Text color="gray.400" fontSize="xs">
                            {new Date(r.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </Text>
                        </VStack>
                        <HStack>
                          <Icon as={MdWaterDrop} color="blue.400" />
                          <Text color="blue.300" fontWeight="bold" fontSize="sm">
                            {r.irrigation_value_mm.toFixed(1)} mm
                          </Text>
                        </HStack>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </Flex>
            )}



            {activeTab === 'rain' && (() => {
              const now = Date.now();
              const stats = { '24h': 0, '7d': 0, '15d': 0, '30d': 0 };
              records.forEach(r => {
                const rDate = new Date(r.date).getTime();
                const val = r.irrigation_value_mm || 0;
                if (rDate >= now - 24 * 60 * 60 * 1000) stats['24h'] += val;
                if (rDate >= now - 7 * 24 * 60 * 60 * 1000) stats['7d'] += val;
                if (rDate >= now - 15 * 24 * 60 * 60 * 1000) stats['15d'] += val;
                if (rDate >= now - 30 * 24 * 60 * 60 * 1000) stats['30d'] += val;
              });

              return (
                <Flex direction="column" h="100%">
                  <Text fontSize="sm" fontWeight="bold" color="gray.300" mb={4}>Chuva/Irrigação Acumulada</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={3} flex="1" alignContent="start" overflowY="auto">
                    <RainBox label="24 Horas" value={stats["24h"]} isHighlight />
                    <RainBox label="7 Dias" value={stats["7d"]} />
                    <RainBox label="15 Dias" value={stats["15d"]} />
                    <RainBox label="30 Dias" value={stats["30d"]} />
                  </Grid>
                </Flex>
              );
            })()}

            {activeTab === 'forecast' && (
              <Flex direction="column" h="100%">
                <Box flex="1" overflowY="auto">
                  <ForecastTab lat={point.lat} lng={point.lng} />
                </Box>
              </Flex>
            )}
          </motion.div>
        </AnimatePresence>
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
          onClick={() => setActiveTab("front")}
        />
        <TabButton
          label="Acumulado"
          icon={MdWaterDrop}
          isActive={activeTab === "rain"}
          onClick={() => setActiveTab("rain")}
        />
        <TabButton
          label="Previsão"
          icon={MdCloud}
          isActive={activeTab === "forecast"}
          onClick={() => setActiveTab("forecast")}
        />
      </HStack>
    </Box>
  );
}
