// brsense-frontend/src/pages/Dashboard.tsx
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Box, Flex, Text, useToast, Spinner, Button,
  SimpleGrid, Container, Heading, Card, CardBody, Badge,
  VStack, HStack, Icon
} from '@chakra-ui/react';
import { MdArrowBack, MdSensors, MdBarChart, MdAgriculture } from 'react-icons/md';
import { getProbes, getFarms, getDeviceHistory, type ReadingHistory } from '../services/api';
import type { Probe, Farm } from '../types';
import { SoilMoistureChart } from '../components/SoilMoistureChart/SoilMoistureChart';
import { COLORS } from '../colors/colors';
import { SatelliteMap, type MapPoint } from '../components/SatelliteMap/SatelliteMap';

interface ChartDataPoint {
  time: string;
  [key: string]: string | number;
}

// Helper para processar e separar os dados
function processReadingsToChartData(readings: ReadingHistory[]) {
  const groupedMoisture: Record<string, ChartDataPoint> = {};
  const groupedTemp: Record<string, ChartDataPoint> = {};

  readings.forEach((r) => {
    const dateObj = new Date(r.timestamp);
    // Agrupa por minuto
    const timeKey = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const depthKey = `depth${Math.round(r.depth_cm)}`;

    // Processa Umidade
    if (r.moisture_pct !== null && r.moisture_pct !== undefined) {
      if (!groupedMoisture[timeKey]) {
        groupedMoisture[timeKey] = { time: timeKey };
      }
      groupedMoisture[timeKey][depthKey] = r.moisture_pct;
    }

    // Processa Temperatura
    if (r.temperature_c !== null && r.temperature_c !== undefined) {
      if (!groupedTemp[timeKey]) {
        groupedTemp[timeKey] = { time: timeKey };
      }
      groupedTemp[timeKey][depthKey] = r.temperature_c;
    }
  });

  // Função auxiliar para ordenar cronologicamente
  const sorter = (a: ChartDataPoint, b: ChartDataPoint) => {
    const [dateA, timeA] = a.time.split(' ');
    const [d1, m1, y1] = dateA.split('/').map(Number);
    const [h1, min1] = timeA.split(':').map(Number);

    const [dateB, timeB] = b.time.split(' ');
    const [d2, m2, y2] = dateB.split('/').map(Number);
    const [h2, min2] = timeB.split(':').map(Number);

    return new Date(y1, m1 - 1, d1, h1, min1).getTime() - new Date(y2, m2 - 1, d2, h2, min2).getTime();
  };

  return {
    moisture: Object.values(groupedMoisture).sort(sorter),
    temperature: Object.values(groupedTemp).sort(sorter)
  };
}

export function Dashboard() {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm] = useState<Farm | null>(null);
  const [selectedProbe, setSelectedProbe] = useState<Probe | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'chart'>('map');

  // Estados para os dois gráficos
  const [moistureData, setMoistureData] = useState<ChartDataPoint[]>([]);
  const [temperatureData, setTemperatureData] = useState<ChartDataPoint[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const toast = useToast();

  // Ref para controlar se o componente está montado (evita erro de set state)
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const filteredProbes = useMemo(() => {
    if (!selectedFarm) return probes;
    return probes.filter(probe => probe.farm_id === selectedFarm.id);
  }, [selectedFarm, probes]);

  const handleMapGraphClick = (deviceId: number) => {
    const probe = filteredProbes.find(p => p.id === deviceId);
    if (probe) {
      setSelectedProbe(probe);
      setViewMode('chart');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const mapPoints: MapPoint[] = useMemo(() => {
    return filteredProbes.map((probe) => {
      const hasLocation =
        probe.latitude !== undefined && probe.latitude !== null &&
        probe.longitude !== undefined && probe.longitude !== null;

      const finalLat = hasLocation ? Number(probe.latitude) : -15.793889;
      const finalLng = hasLocation ? Number(probe.longitude) : -47.882778;

      let currentStatusCode = 'status_offline';
      const readings = probe.readings || [];
      let surfaceReading = readings.find(r => r.depth_cm === 10);
      if (!surfaceReading && readings.length > 0) surfaceReading = readings[0];

      if (surfaceReading && surfaceReading.moisture_pct !== null) {
        const val = Number(surfaceReading.moisture_pct);
        if (val < 25) currentStatusCode = 'status_critical';
        else if (val < 50) currentStatusCode = 'status_alert';
        else if (val < 75) currentStatusCode = 'status_ok';
        else currentStatusCode = 'status_saturated';
      }

      return {
        id: probe.id,
        esn: probe.esn,
        lat: finalLat,
        lng: finalLng,
        statusCode: currentStatusCode,
        readings: readings
      };
    });
  }, [filteredProbes]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [probesData, farmsData] = await Promise.all([getProbes(), getFarms()]);
      if (isMountedRef.current) {
        setProbes(probesData);
        setFarms(farmsData);
      }
    } catch (error) {
      console.error(error);
      if (isMountedRef.current) {
        toast({ title: 'Erro ao carregar dados', status: 'error', duration: 3000 });
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- LÓGICA DE CARREGAMENTO PROGRESSIVO ---
  useEffect(() => {
    if (!selectedProbe || viewMode !== 'chart') return;

    const fetchFullHistory = async () => {
      try {
        setLoadingChart(true);
        setMoistureData([]);
        setTemperatureData([]);

        // Janela principal: últimos 3 dias
        const now = new Date();
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - 3);

        // 1. Busca RECENTE (últimos 3 dias)
        const recentHistory = await getDeviceHistory(selectedProbe.esn, {
          start_date: cutoffDate.toISOString()
        });

        if (!isMountedRef.current) return;

        // 2. Prepara busca ANTIGA (Complementar)
        let pivotDate: string;

        if (recentHistory.length > 0) {
          pivotDate = recentHistory[0].timestamp;
        } else {
          pivotDate = cutoffDate.toISOString();
        }

        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 3);

        const olderHistory = await getDeviceHistory(selectedProbe.esn, {
          end_date: pivotDate,        // Traz o que tiver antes do pivot
          start_date: limitDate.toISOString(), // MAS só até 7 dias atrás.
          limit: 50000
        });

        if (!isMountedRef.current) return;

        const allReadings = [...olderHistory, ...recentHistory];

        // Se mesmo assim vier vazio (sem dados na última semana), o gráfico ficará vazio corretamente,
        // em vez de mostrar dados de Janeiro.
        const processedData = processReadingsToChartData(allReadings);

        if (isMountedRef.current) {
          setMoistureData(processedData.moisture);
          setTemperatureData(processedData.temperature);
        }

      } catch (error) {
        console.error("Erro ao carregar histórico", error);
        if (isMountedRef.current) {
          toast({ title: 'Erro ao carregar dados', status: 'error' });
        }
      } finally {
        if (isMountedRef.current) {
          setLoadingChart(false);
        }
      }
    };

    fetchFullHistory();
  }, [selectedProbe, viewMode, toast]);

  const handleBackToMap = () => {
    setSelectedProbe(null);
    setMoistureData([]);
    setTemperatureData([]);
    setViewMode('map');
  };

  const getStatusColor = (status: string) => {
    if (status.includes('status_critical')) return 'red';
    if (status.includes('status_alert')) return 'yellow';
    if (status.includes('status_ok')) return 'green';
    if (status.includes('status_saturated')) return 'blue';
    return 'gray';
  };

  const getStatusLabel = (status: string) => {
    if (status.includes('status_critical')) return 'Crítico';
    if (status.includes('status_alert')) return 'Atenção';
    if (status.includes('status_ok')) return 'Ideal';
    if (status.includes('status_saturated')) return 'Saturado';
    return 'Offline';
  };

  if (loading) {
    return (
      <Flex h="100vh" align="center" justify="center" bg={COLORS.background}>
        <Spinner size="xl" color={COLORS.primary} />
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bg={COLORS.background} pb={10}>

      {/* --- MODO MAPA --- */}
      {viewMode === 'map' && (
        <>
          <Container maxW="container.xl" p={0} mt={6} borderRadius="xl" overflow="hidden" boxShadow="2xl">
            <Box w="100%" h="80vh" position="relative" bg="black">
              <SatelliteMap points={mapPoints} onViewGraph={handleMapGraphClick} />
            </Box>
          </Container>

          <Container maxW="container.xl" mt={8} mb={10}>
            <Heading size="md" mb={6} color="gray.300" borderLeft="4px solid" borderColor="blue.500" pl={3}>
              Monitoramento Detalhado
            </Heading>

            {filteredProbes.length === 0 ? (
              <Text color="gray.500" fontStyle="italic">Nenhuma sonda encontrada.</Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={6}>
                {filteredProbes.map((probe) => {
                  const mapPoint = mapPoints.find(mp => mp.id === probe.id);
                  const status = mapPoint ? mapPoint.statusCode : 'status_offline';
                  const farm = farms.find(f => f.id === probe.farm_id);
                  const farmName = farm ? farm.name : 'Fazenda não definida';

                  return (
                    <Card
                      key={probe.id}
                      bg="gray.800"
                      borderColor="gray.700"
                      borderWidth="1px"
                      _hover={{ borderColor: 'blue.500', transform: 'translateY(-2px)', shadow: 'xl' }}
                      transition="all 0.3s"
                      cursor="pointer"
                      onClick={() => handleMapGraphClick(probe.id)}
                    >
                      <CardBody>
                        <Flex justify="space-between" align="start" mb={3}>
                          <HStack align="start">
                            <Icon as={MdAgriculture} color="gray.500" boxSize={5} mt={1} />
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="bold" fontSize="md" color="white" noOfLines={1}>
                                {farmName}
                              </Text>
                              <Text fontSize="xs" color="blue.300" fontWeight="bold">
                                {probe.name || probe.esn}
                              </Text>
                            </VStack>
                          </HStack>
                          <Badge
                            colorScheme={getStatusColor(status)}
                            variant="subtle"
                            borderRadius="md"
                            px={2}
                            fontSize="0.65rem"
                          >
                            {getStatusLabel(status)}
                          </Badge>
                        </Flex>

                        <Text fontSize="xs" color="gray.400" mt={3} borderTop="1px solid" borderColor="gray.700" pt={2}>
                          <Icon as={MdSensors} mr={1} verticalAlign="middle" />
                          ESN: {probe.esn}
                        </Text>

                        <Button
                          mt={3}
                          w="full"
                          size="xs"
                          variant="solid"
                          colorScheme="blue"
                          leftIcon={<MdBarChart />}
                        >
                          Analisar Gráfico
                        </Button>
                      </CardBody>
                    </Card>
                  )
                })}
              </SimpleGrid>
            )}
          </Container>
        </>
      )}

      {/* --- MODO GRÁFICO --- */}
      {viewMode === 'chart' && selectedProbe && (
        <Container maxW="container.xl" py={6} minH="100vh">
          <Button
            leftIcon={<MdArrowBack />}
            variant="ghost"
            color="white"
            mb={4}
            onClick={handleBackToMap}
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            Voltar ao Mapa
          </Button>

          <Heading size="lg" color="white" mb={2}>
            {selectedProbe.name || selectedProbe.esn}
          </Heading>
          <Text color="gray.400" mb={6}>Análise detalhada do solo</Text>

          <Box bg="gray.800" borderRadius="xl" p={6} border="1px solid" borderColor="gray.700">
            {/* O loadingChart só é true durante a primeira carga rápida */}
            {loadingChart ? (
              <Flex justify="center" align="center" h="300px"><Spinner size="xl" color="blue.500" /></Flex>
            ) : (
              <VStack spacing={8} align="stretch">

                {/* Gráfico 1: Umidade */}
                <Box bg="gray.900" borderRadius="lg" p={4} minH="400px">
                  {moistureData.length > 0 ? (
                    <SoilMoistureChart
                      data={moistureData}
                      title="Perfil de Umidade (%)"
                      unit="%"
                      yDomain={[0, 100]}
                      showZones={true}
                    />
                  ) : (
                    <Flex h="300px" justify="center" align="center">
                      <Text color="gray.500">Sem dados de umidade recentes.</Text>
                    </Flex>
                  )}
                </Box>

                {/* Gráfico 2: Temperatura */}
                <Box bg="gray.900" borderRadius="lg" p={4} minH="400px">
                  {temperatureData.length > 0 ? (
                    <SoilMoistureChart
                      data={temperatureData}
                      title="Perfil de Temperatura (°C)"
                      unit="°C"
                      yDomain={['auto', 'auto']}
                      showZones={false}
                    />
                  ) : (
                    <Flex h="300px" justify="center" align="center">
                      <Text color="gray.500">Sem dados de temperatura recentes.</Text>
                    </Flex>
                  )}
                </Box>

              </VStack>
            )}
          </Box>
        </Container>
      )}

    </Box>
  );
}