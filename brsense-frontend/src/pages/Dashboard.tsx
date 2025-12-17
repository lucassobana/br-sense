// brsense-frontend/src/pages/Dashboard.tsx
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box,
  Flex,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  VStack,
  HStack,
  Icon,
  useToast,
  Spinner,
  Button,
  useDisclosure,
} from '@chakra-ui/react';
import { MdSearch, MdAdd, MdAgriculture, MdSensors } from 'react-icons/md';
import {
  getProbes,
  getFarms,
  getDeviceHistory,
  type ReadingHistory
} from '../services/api';
import type { Probe, Farm } from '../types';
import { SoilMoistureChart } from '../components/SoilMoistureChart/SoilMoistureChart';
import { CreateFarmModal } from '../components/CreateFarmModal/CreateFarmModal';
import { AddDeviceModal } from '../components/AddDeviceModal/AddDeviceModal';
import { COLORS } from '../colors/colors';

// ... (Funções auxiliares processReadingsToChartData e getStatusColor mantidas iguais) ...
interface ChartDataPoint {
  time: string;
  [key: string]: string | number;
}

function processReadingsToChartData(readings: ReadingHistory[]): ChartDataPoint[] {
  const grouped: Record<string, ChartDataPoint> = {};
  readings.forEach((r) => {
    const dateObj = new Date(r.timestamp);
    const timeKey = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!grouped[timeKey]) {
      grouped[timeKey] = { time: timeKey };
    }
    const depthKey = `depth${Math.round(r.depth_cm)}`;
    grouped[timeKey][depthKey] = r.moisture_pct;
  });
  return Object.values(grouped);
}

export function Dashboard() {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);

  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [selectedProbe, setSelectedProbe] = useState<Probe | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const toast = useToast();

  // Modais
  const { isOpen: isFarmOpen, onOpen: onFarmOpen, onClose: onFarmClose } = useDisclosure();
  const { isOpen: isDeviceOpen, onOpen: onDeviceOpen, onClose: onDeviceClose } = useDisclosure();

  const filteredProbes = useMemo(() => {
    if (!selectedFarm) return probes;
    return probes.filter(probe => probe.farm_id === selectedFarm.id);
  }, [selectedFarm, probes]);

  // 1. Carga de Dados
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [probesData, farmsData] = await Promise.all([getProbes(), getFarms()]);
      setProbes(probesData);
      setFarms(farmsData);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao carregar dados', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-seleção inicial (opcional)
  useEffect(() => {
    if (farms.length > 0 && !selectedFarm) {
      // setSelectedFarm(farms[0]); // Descomente se quiser selecionar a 1ª automaticamente
    }
  }, [farms, selectedFarm]); // Removido selectedFarm para evitar loop se a lógica mudar

  // 2. Reset de seleção de sonda ao mudar fazenda
  useEffect(() => {
    if (selectedFarm) {
      const isCurrentProbeInFarm = filteredProbes.find(p => p.id === selectedProbe?.id);
      if (!isCurrentProbeInFarm) {
        setSelectedProbe(filteredProbes.length > 0 ? filteredProbes[0] : null);
      }
    }
  }, [selectedFarm, filteredProbes, selectedProbe]);

  // 3. Histórico
  useEffect(() => {
    if (!selectedProbe) return;
    const fetchHistory = async () => {
      try {
        setLoadingChart(true);
        const history = await getDeviceHistory(selectedProbe.esn);
        setChartData(processReadingsToChartData(history));
      } catch (error) {
        console.error("Erro histórico", error);
        setChartData([]);
      } finally {
        setLoadingChart(false);
      }
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 60000);
    return () => clearInterval(interval);
  }, [selectedProbe]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ativo': return COLORS.status.ok;
      case 'atenção': return COLORS.status.attention;
      case 'estresse': return COLORS.status.stress;
      default: return COLORS.status.offline;
    }
  };

  // Função Toggle (Seleciona ou Desmarca)
  const handleFarmClick = (farm: Farm) => {
    if (selectedFarm?.id === farm.id) {
      setSelectedFarm(null); // Desmarca se clicar na mesma
    } else {
      setSelectedFarm(farm); // Seleciona a nova
    }
  };

  return (
    <Flex h="calc(100vh - 80px)" bg={COLORS.background} overflow="hidden">

      {/* --- SIDEBAR --- */}
      <Box w="320px" bg={COLORS.background} borderRight="1px solid" borderColor={COLORS.surface} display="flex" flexDirection="column">

        {/* Cabeçalho da Sidebar (Busca e Botão Add) */}
        <Box p={4} borderBottom="1px solid" borderColor={COLORS.surface}>
          <HStack mb={3} justify="space-between">
            <InputGroup size="sm">
              <InputLeftElement pointerEvents="none">
                <Icon as={MdSearch} color={COLORS.textSecondary} />
              </InputLeftElement>
              <Input
                placeholder="Buscar..."
                bg={COLORS.surface}
                border="none"
                color={COLORS.textPrimary}
                borderRadius="md"
                _placeholder={{ color: COLORS.textSecondary }}
              />
            </InputGroup>
            {/* Botão de Adicionar Fazenda movido para cá ou mantido na lista */}
            <Button size="sm" bg={COLORS.primary} color="white" _hover={{ bg: COLORS.primaryDark }} onClick={onFarmOpen}>
              <Icon as={MdAdd} />
            </Button>
          </HStack>

          {/* REMOVIDO: O bloco visual de "Filtro: Fazenda X" foi retirado daqui */}
        </Box>

        {/* Listas */}
        <Box flex="1" overflowY="auto" p={4}>
          <VStack align="stretch" spacing={6}>

            {/* --- LISTA DE FAZENDAS --- */}
            <Box>
              <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" color={COLORS.textSecondary} mb={2}>
                Minhas Fazendas
              </Text>
              {loading ? (
                <Spinner size="sm" color={COLORS.primary} />
              ) : (
                <VStack align="stretch" spacing={1}>
                  {farms.map(farm => {
                    const isFarmSelected = selectedFarm?.id === farm.id;
                    return (
                      <Flex
                        key={farm.id}
                        justify="space-between"
                        align="center"
                        p={2}
                        borderRadius="md"
                        cursor="pointer"
                        bg={isFarmSelected ? COLORS.surface : 'transparent'}
                        borderLeft={isFarmSelected ? `3px solid ${COLORS.primary}` : '3px solid transparent'}
                        _hover={{ bg: COLORS.surface }}
                        onClick={() => handleFarmClick(farm)} // Usando a função de toggle
                      >
                        <Box pl={isFarmSelected ? 2 : 0}>
                          <Text fontSize="sm" fontWeight={isFarmSelected ? "bold" : "medium"} color={COLORS.textPrimary}>
                            {farm.name}
                          </Text>
                          <Text fontSize="xs" color={COLORS.textSecondary}>{farm.location}</Text>
                        </Box>
                        {/* Indicador sutil de seleção ou contador */}
                        {isFarmSelected && <Icon as={MdAgriculture} color={COLORS.primary} boxSize={3} />}
                      </Flex>
                    );
                  })}
                </VStack>
              )}
            </Box>

            {/* --- LISTA DE SONDAS --- */}
            <Box>
              <Flex justify="space-between" align="center" mb={2}>
                <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" color={COLORS.textSecondary}>
                  Sondas {selectedFarm ? `(${selectedFarm.name})` : ''}
                </Text>
                <Icon
                  as={MdAdd}
                  cursor="pointer"
                  color={COLORS.textSecondary}
                  _hover={{ color: COLORS.primary }}
                  onClick={onDeviceOpen} // Abre modal de adicionar sonda
                />
              </Flex>

              {loading ? (
                <Flex justify="center"><Spinner color={COLORS.primary} /></Flex>
              ) : filteredProbes.length === 0 ? (
                <Text fontSize="sm" color={COLORS.textSecondary} fontStyle="italic">
                  {selectedFarm ? "Nenhuma sonda nesta fazenda." : "Nenhuma sonda encontrada."}
                </Text>
              ) : (
                <VStack align="stretch" spacing={1}>
                  {filteredProbes.map(probe => {
                    const statusColor = getStatusColor(probe.status);
                    const isSelected = selectedProbe?.id === probe.id;

                    return (
                      <Flex
                        key={probe.id}
                        justify="space-between"
                        align="center"
                        p={2}
                        borderRadius="md"
                        bg={isSelected ? 'rgba(14, 107, 59, 0.1)' : 'transparent'}
                        cursor="pointer"
                        _hover={{ bg: COLORS.surface }}
                        onClick={() => setSelectedProbe(probe)}
                      >
                        <HStack spacing={2}>
                          <Icon as={MdSensors} color={isSelected ? COLORS.primary : COLORS.textSecondary} />
                          <Box>
                            <Text fontSize="sm" fontWeight="medium" color={isSelected ? COLORS.primary : COLORS.textPrimary}>
                              {probe.name || probe.esn}
                            </Text>
                            {/* Se estiver vendo "Todas", mostra a qual fazenda pertence */}
                            {!selectedFarm && probe.farm_id && (
                              <Text fontSize="xs" color={COLORS.textSecondary}>
                                {farms.find(f => f.id === probe.farm_id)?.name}
                              </Text>
                            )}
                          </Box>
                        </HStack>
                        <Box w="8px" h="8px" borderRadius="full" bg={statusColor} />
                      </Flex>
                    );
                  })}
                </VStack>
              )}
            </Box>

          </VStack>
        </Box>
      </Box>

      {/* --- ÁREA PRINCIPAL --- */}
      <Box flex="1" bg={COLORS.background} p={6} overflowY="auto">
        {selectedProbe ? (
          <>
            <Flex justify="space-between" align="center" mb={6}>
              <Box>
                <HStack>
                  <Text fontSize="2xl" fontWeight="bold" color={COLORS.textPrimary}>
                    {selectedProbe.name || selectedProbe.esn}
                  </Text>
                  <Text fontSize="xs" px={2} py={1} bg={COLORS.surface} borderRadius="md" color={COLORS.textSecondary}>
                    {selectedProbe.esn}
                  </Text>
                </HStack>
                <Text fontSize="sm" color={COLORS.textSecondary} mt={1}>
                  Fazenda: {farms.find(f => f.id === selectedProbe.farm_id)?.name || "Não vinculada"}
                </Text>
              </Box>
            </Flex>

            <Box bg={COLORS.surface} borderRadius="xl" p={4} border="1px solid" borderColor="rgba(255,255,255,0.05)" minH="400px">
              {loadingChart ? (
                <Flex justify="center" align="center" h="300px"><Spinner size="xl" color={COLORS.primary} /></Flex>
              ) : (
                <SoilMoistureChart data={chartData} />
              )}
            </Box>
          </>
        ) : (
          <Flex justify="center" align="center" h="100%" flexDirection="column">
            <Icon as={MdAgriculture} boxSize={16} color={COLORS.surface} mb={4} />
            <Text color={COLORS.textSecondary} fontSize="lg">Selecione uma sonda para visualizar os dados.</Text>
          </Flex>
        )}
      </Box>

      {/* MODAIS */}
      <CreateFarmModal isOpen={isFarmOpen} onClose={onFarmClose} onSuccess={loadData} />
      <AddDeviceModal
        isOpen={isDeviceOpen}
        onClose={onDeviceClose}
        farmId={selectedFarm?.id || null}
        onSuccess={loadData}
      />

    </Flex>
  );
}