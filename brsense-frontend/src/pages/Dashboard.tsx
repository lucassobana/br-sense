import { useEffect, useState, useMemo, useCallback } from 'react';
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

// Importação do Componente de Mapa Satelital
import { SatelliteMap } from '../components/SatelliteMap/SatelliteMap';
import type { MapPoint } from '../components/SatelliteMap/SatelliteMap';

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
  // selectedFarm continuará existindo, mas como removemos o select, ele ficará sempre null (mostrando tudo)
  const [selectedFarm] = useState<Farm | null>(null);
  const [selectedProbe, setSelectedProbe] = useState<Probe | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'chart'>('map');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const toast = useToast();

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
      setProbes(probesData);
      setFarms(farmsData);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao carregar dados', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!selectedProbe || viewMode !== 'chart') return;
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
  }, [selectedProbe, viewMode]);

  const handleBackToMap = () => {
    setSelectedProbe(null);
    setChartData([]);
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
          {/* 1. ÁREA DO MAPA AJUSTADA
              - Usamos um Container para limitar a largura.
              - Usamos mt={6} para dar um respiro do topo.
              - Arredondamos as bordas (borderRadius="xl") para um visual mais moderno.
          */}
          <Container maxW="container.xl" p={0} mt={6} borderRadius="xl" overflow="hidden" boxShadow="2xl">
            <Box
              w="100%"
              h="80vh" // <--- ALTURA REDUZIDA (era 100vh)
              position="relative"
              bg="black"
            >
              <SatelliteMap
                points={mapPoints}
                onViewGraph={handleMapGraphClick}
              />
            </Box>
          </Container>

          {/* 2. LISTAGEM DE SONDAS */}
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

      {/* MODO GRÁFICO (Mantido igual) */}
      {viewMode === 'chart' && selectedProbe && (
        // ... (Conteúdo do modo gráfico sem alterações)
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

          <Box bg="gray.800" borderRadius="xl" p={6} border="1px solid" borderColor="gray.700">
            <Box bg="gray.900" borderRadius="lg" p={4} minH="400px">
              {loadingChart ? (
                <Flex justify="center" align="center" h="300px"><Spinner size="xl" color="blue.500" /></Flex>
              ) : chartData.length > 0 ? (
                <SoilMoistureChart data={chartData} />
              ) : (
                <Flex h="300px" justify="center" align="center">
                  <Text color="gray.500">Sem dados recentes para exibir.</Text>
                </Flex>
              )}
            </Box>
          </Box>
        </Container>
      )}

    </Box>
  );
}