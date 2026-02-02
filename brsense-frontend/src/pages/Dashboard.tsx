import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Box, Flex, Text, useToast, Spinner, Button,
  Container, Heading, Badge,
  VStack,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Icon, Tooltip as ChakraTooltip // Adicionado Tooltip
} from '@chakra-ui/react';
import { useSearchParams } from 'react-router-dom';
import {
  MdArrowBack,
  MdBarChart,
  MdBatteryFull,
  MdBattery60,
  MdBatteryAlert,
  MdBatteryUnknown
} from 'react-icons/md';
import { getProbes, getFarms, getDeviceHistory } from '../services/api';
import type { Probe, Farm } from '../types';
import { SoilMoistureChart, type RawApiData } from '../components/SoilMoistureChart/SoilMoistureChart';
import { COLORS } from '../colors/colors';
import { SatelliteMap, type MapPoint } from '../components/SatelliteMap/SatelliteMap';
import { isUserAdmin } from '../services/auth';

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const probeIdParam = searchParams.get('probeId');

  const [probes, setProbes] = useState<Probe[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm] = useState<Farm | null>(null);

  // Armazena TODOS os dados brutos (Temp + Umidade misturados)
  const [chartData, setChartData] = useState<RawApiData[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const toast = useToast();
  const isMountedRef = useRef(true);
  const userIsAdmin = isUserAdmin();

  const selectedProbe = useMemo(() => {
    if (!probeIdParam) return null;
    return probes.find(p => p.id === Number(probeIdParam)) || null;
  }, [probes, probeIdParam]);

  const viewMode = selectedProbe ? 'chart' : 'map';

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const filteredProbes = useMemo(() => {
    if (!selectedFarm) return probes;
    return probes.filter(probe => probe.farm_id === selectedFarm.id);
  }, [selectedFarm, probes]);

  const handleMapGraphClick = (deviceId: number) => {
    setSearchParams({ probeId: String(deviceId) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToMap = () => {
    setSearchParams({});
    setChartData([]);
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
      const validReading = readings
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .find(r => r.moisture_pct !== null && r.moisture_pct !== undefined);

      if (validReading) {
        const val = Number(validReading.moisture_pct);
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

  useEffect(() => {
    if (!selectedProbe || viewMode !== 'chart') return;

    const fetchFullHistory = async () => {
      try {
        setLoadingChart(true);
        setChartData([]);

        const now = new Date();
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - 3);

        const recentHistory = await getDeviceHistory(selectedProbe.esn, {
          start_date: cutoffDate.toISOString()
        });

        if (!isMountedRef.current) return;

        let pivotDate: string;
        if (recentHistory.length > 0) {
          pivotDate = recentHistory[0].timestamp;
        } else {
          pivotDate = cutoffDate.toISOString();
        }

        const olderHistory = await getDeviceHistory(selectedProbe.esn, {
          end_date: pivotDate,
          limit: 50000
        });

        if (!isMountedRef.current) return;

        const allReadings = [...olderHistory, ...recentHistory];

        const formattedData: RawApiData[] = allReadings.map(r => ({
          timestamp: r.timestamp,
          depth_cm: r.depth_cm,
          moisture_pct: r.moisture_pct,
          temperature_c: r.temperature_c,
          // Se quiser passar bateria para o gráfico no futuro, adicione aqui
          // battery_status: r.battery_status 
        }));

        if (isMountedRef.current) {
          setChartData(formattedData);
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

  // --- HELPER PARA ÍCONE DE BATERIA (0-7) ---
  const getBatteryIcon = (level: number | null | undefined) => {
    if (level === null || level === undefined)
      return <Icon as={MdBatteryUnknown} color="gray.600" boxSize={6} />;

    // Nível 7: Bateria Nova/Cheia -> Verde
    if (level >= 7) {
      return <Icon as={MdBatteryFull} color="green.400" boxSize={6} />;
    }

    // Nível 6: Bateria Média -> Amarelo (Atenção)
    if (level === 6) {
      return <Icon as={MdBattery60} color="yellow.400" boxSize={6} />;
    }

    // Nível 5 ou menor: Bateria Fraca/Crítica -> Vermelho (Trocar)
    // Usamos <= 5 para garantir que se vier um 4 ou 0 (erro), também mostre crítico
    if (level <= 5) {
      return <Icon as={MdBatteryAlert} color="red.500" boxSize={6} />;
    }

    return <Icon as={MdBatteryUnknown} color="gray.600" boxSize={6} />;
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
      {viewMode === 'map' && (
        <>
          <Box
            w="100%"
            mt={6}
            pr={6}
            pl={6}
            borderRadius="xl"
            overflow="hidden"
            boxShadow="2xl"
          >
            <Box w="100%" h="90vh" position="relative" bg="black">
              <SatelliteMap
                points={mapPoints}
                onViewGraph={handleMapGraphClick}
              />
            </Box>
          </Box>

          <Container maxW="container.xl" mt={8} mb={10}>
            <Heading size="md" mb={6} color={COLORS.textPrimary} borderLeft="4px solid" borderColor="blue.500" pl={3}>
              Monitoramento Detalhado
            </Heading>

            {filteredProbes.length === 0 ? (
              <Text color="gray.500" fontStyle="italic">Nenhuma sonda encontrada.</Text>
            ) : (
              <TableContainer bg="gray.800" borderRadius="xl" border="1px solid" borderColor="gray.700" boxShadow="lg">
                <Table variant="simple" colorScheme="whiteAlpha">
                  <Thead>
                    <Tr>
                      <Th color="gray.400" borderColor="gray.700">ESN</Th>
                      <Th color="gray.400" borderColor="gray.700">Nome</Th>
                      <Th color="gray.400" borderColor="gray.700">Fazenda</Th>
                      <Th color="gray.400" borderColor="gray.700">Status</Th>
                      <Th color="gray.400" borderColor="gray.700" textAlign="center">Bateria</Th>
                      <Th color="gray.400" borderColor="gray.700" isNumeric>Ações</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredProbes.map((probe) => {
                      const mapPoint = mapPoints.find(mp => mp.id === probe.id);
                      const status = mapPoint ? mapPoint.statusCode : 'status_offline';
                      const farm = farms.find(f => f.id === probe.farm_id);
                      const farmName = farm ? farm.name : '-';

                      // --- BUSCA A LEITURA MAIS RECENTE COM BATERIA ---
                      const batteryReading = probe.readings
                        ?.filter(r => r.battery_status !== null && r.battery_status !== undefined)
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

                      const batteryLevel = batteryReading?.battery_status;
                      const batteryDate = batteryReading ? new Date(batteryReading.timestamp).toLocaleDateString() : '';

                      return (
                        <Tr key={probe.id} _hover={{ bg: 'whiteAlpha.50' }} transition="background 0.2s">
                          <Td borderColor="gray.700" fontWeight="medium" color="white">{probe.esn}</Td>
                          <Td borderColor="gray.700" color="gray.300">{probe.name || '-'}</Td>
                          <Td borderColor="gray.700" color="gray.300">{farmName}</Td>
                          <Td borderColor="gray.700">
                            <Badge
                              colorScheme={getStatusColor(status)}
                              variant="subtle"
                              borderRadius="md"
                              px={2}
                              fontSize="0.75rem"
                            >
                              {getStatusLabel(status)}
                            </Badge>
                          </Td>

                          {/* COLUNA DE BATERIA ATUALIZADA */}
                          <Td borderColor="gray.700" textAlign="center">
                            <ChakraTooltip
                              label={batteryLevel !== undefined ? `Nível: ${batteryLevel} / 7 (${batteryDate})` : 'Sem dados'}
                              hasArrow
                              bg="gray.700"
                              color="white"
                            >
                              <Flex justify="center" align="center">
                                {getBatteryIcon(batteryLevel)}
                              </Flex>
                            </ChakraTooltip>
                          </Td>
                          <Td borderColor="gray.700" isNumeric>
                            <Button
                              size="sm"
                              leftIcon={<MdBarChart />}
                              colorScheme="blue"
                              variant="solid"
                              onClick={() => handleMapGraphClick(probe.id)}
                            >
                              Gráfico
                            </Button>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </Container>
        </>
      )}

      {viewMode === 'chart' && selectedProbe && (
        <Box w="100%" px={6} py={6} minH="100vh">
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
            {loadingChart ? (
              <Flex justify="center" align="center" h="300px"><Spinner size="xl" color="blue.500" /></Flex>
            ) : (
              <VStack spacing={8} align="stretch">

                {/* GRÁFICO 1: UMIDADE */}
                <Box bg="gray.900" borderRadius="lg" p={4}>
                  {chartData.length > 0 ? (
                    <SoilMoistureChart
                      data={chartData}
                      title="Perfil de Umidade (%)"
                      unit="%"
                      yDomain={[0, 100]}
                      showZones={true}
                      metric="moisture"
                      isAdmin={userIsAdmin}
                      esn={selectedProbe.esn}
                      initialMin={selectedProbe.config_moisture_min ?? 45}
                      initialMax={selectedProbe.config_moisture_max ?? 55}
                      onConfigUpdate={() => loadData()}
                    />
                  ) : (
                    <Flex h="300px" justify="center" align="center">
                      <Text color="gray.500">Sem dados de umidade recentes.</Text>
                    </Flex>
                  )}
                </Box>

                {/* GRÁFICO 2: TEMPERATURA */}
                <Box bg="gray.900" borderRadius="lg" p={4}>
                  {chartData.length > 0 ? (
                    <SoilMoistureChart
                      data={chartData}
                      title="Perfil de Temperatura (°C)"
                      unit="°C"
                      yDomain={['auto', 'auto']}
                      showZones={true}
                      metric="temperature"
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
        </Box>
      )}
    </Box>
  );
}