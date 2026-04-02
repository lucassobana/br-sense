import { useEffect, useState, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import {
  Box, Flex, Text, useToast, Spinner, Button,
  Container, Heading, Badge,
  VStack,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Icon, Tooltip as ChakraTooltip,
  Input, InputGroup, InputLeftElement, HStack, Menu, MenuButton, MenuList, MenuItem,
} from '@chakra-ui/react';
import { useSearchParams } from 'react-router-dom';
import {
  MdArrowBack,
  MdSearch,
  MdArrowUpward,
  MdArrowDownward,
  MdArrowDropDown,
} from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { getProbes, getFarms, getDeviceHistory } from '../services/api';
import type { Probe, Farm } from '../types';
// import { SoilMoistureChart, type RawApiData, type TimeRange } from '../components/SoilMoistureChart/SoilMoistureChart';
import type { RawApiData, TimeRange } from '../components/SoilMoistureChart/SoilMoistureChart';
import { COLORS } from '../colors/colors';
// import { SatelliteMap, type MapPoint } from '../components/SatelliteMap/SatelliteMap';
import type { MapPoint } from '../components/SatelliteMap/SatelliteMap';
import { isUserAdmin } from '../services/auth';
import { BatteryStatusChart } from '../components/BatteryStatus/BatteryStatusChart';

const SoilMoistureChart = lazy(() =>
  import('../components/SoilMoistureChart/SoilMoistureChart').then((module) => ({ default: module.SoilMoistureChart }))
);
const SatelliteMap = lazy(() =>
  import('../components/SatelliteMap/SatelliteMap').then((module) => ({ default: module.SatelliteMap }))
);

interface TableRowData extends Probe {
  farmName: string;
  status: string;
  batteryLevel: number | undefined;
  batteryDate: string;
}

type SortKey = 'esn' | 'name' | 'farmName' | 'status' | 'batteryLevel';

const formatRain = (val?: number) => {
  if (val === undefined || val === null) return '-';
  return `${val.toFixed(1)} mm`;
};

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const probeIdParam = searchParams.get('probeId');

  const [probes, setProbes] = useState<Probe[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm] = useState<Farm | null>(null);
  const [selectedDepthRefs, setSelectedDepthRefs] = useState<Record<number, number | null>>({});
  const [mapDepthFilter, setMapDepthFilter] = useState<number>(20);

  const handleSelectDepthRef = useCallback((probeId: number, depth: number | null) => {
    setSelectedDepthRefs(prev => ({ ...prev, [probeId]: depth }));
  }, []);

  const [filterText, setFilterText] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'status',
    direction: 'asc'
  });

  // --- ESTADO DO FILTRO DE PERÍODO ---
  const [selectedPeriod, setSelectedPeriod] = useState<TimeRange>('30d');

  // Novos estados para guardar as datas customizadas caso o usuário navegue entre abas
  const [customRange, setCustomRange] = useState<{ start?: string, end?: string }>({});

  const [chartData, setChartData] = useState<RawApiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const toast = useToast();
  const isMountedRef = useRef(true);
  const userIsAdmin = isUserAdmin();
  // const [showBatteryChart, setShowBatteryChart] = useState(false);
  const [direction, setDirection] = useState(1);

  const selectedProbe = useMemo(() => {
    if (!probeIdParam) return null;
    return probes.find(p => p.id === Number(probeIdParam)) || null;
  }, [probes, probeIdParam]);

  const viewMode = selectedProbe ? 'chart' : 'map';

  useEffect(() => {
    if (selectedProbe) {
      // Sempre que trocar de sonda, volta para o padrão de 30 dias
      setSelectedPeriod('30d');
      setCustomRange({});
      // setShowBatteryChart(false);
      // O fetchHistory será disparado automaticamente pela mudança do selectedPeriod
    }
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, [selectedProbe]);

  const filteredProbes = useMemo(() => {
    if (!selectedFarm) return probes;
    return probes.filter(probe => probe.farm_id === selectedFarm.id);
  }, [selectedFarm, probes]);

  const handleMapGraphClick = (deviceId: number) => {
    setDirection(1);
    setSearchParams({ probeId: String(deviceId) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToMap = () => {
    setDirection(-1);
    setSearchParams({});
    setChartData([]);
    // Opcional: Resetar filtro ao voltar
    // setSelectedPeriod('30d'); 
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // --- LÓGICA DO MAPA (Mantida) ---
  const mapPoints: MapPoint[] = useMemo(() => {
    if (viewMode !== 'map') return [];

    return filteredProbes.map((probe) => {
      const hasLocation =
        probe.latitude !== undefined && probe.latitude !== null &&
        probe.longitude !== undefined && probe.longitude !== null;

      const finalLat = hasLocation ? Number(probe.latitude) : -15.793889;
      const finalLng = hasLocation ? Number(probe.longitude) : -47.882778;

      // Lê os novos valores (com fallback caso a API não retorne)
      const v1 = probe.config_moisture_v1 ?? 30;
      const v2 = probe.config_moisture_v2 ?? 45;
      const v3 = probe.config_moisture_v3 ?? 60;

      let currentStatusCode = 'status_offline';

      const readings = probe.readings || [];

      const probeDepthRef = selectedDepthRefs[probe.id];
      const activeDepth = probeDepthRef !== undefined && probeDepthRef !== null
        ? probeDepthRef
        : mapDepthFilter;

      let filteredReadings = readings;
      if (activeDepth !== null && activeDepth !== undefined) {
        filteredReadings = readings.filter(r => r.depth_cm === activeDepth);
      }

      const validReading = [...filteredReadings]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .find(r => r.moisture_pct !== null && r.moisture_pct !== undefined);

      // Nova lógica de status baseada nas 4 zonas
      if (validReading) {
        const val = Number(validReading.moisture_pct);
        if (val < v1) {
          currentStatusCode = 'status_critical';
        } else if (val < v2) {
          currentStatusCode = 'status_alert';
        } else if (val <= v3) {
          currentStatusCode = 'status_ok';
        } else {
          currentStatusCode = 'status_saturated';
        }
      }

      return {
        id: probe.id,
        esn: probe.esn,
        name: probe.name,
        lat: finalLat,
        lng: finalLng,
        statusCode: currentStatusCode,
        readings: readings,
        last_communication: probe.last_communication,
        // Passa as novas propriedades para o Mapa
        config_moisture_v1: v1,
        config_moisture_v2: v2,
        config_moisture_v3: v3
      };
    });
  }, [filteredProbes, selectedDepthRefs, mapDepthFilter, viewMode]);

  const initialMapPosition = useMemo(() => {
    if (viewMode !== 'map') return null;

    if (probes.length === 0) return null;
    const validProbes = probes.filter(p =>
      p.latitude !== undefined && p.latitude !== null &&
      p.longitude !== undefined && p.longitude !== null
    );
    if (validProbes.length === 0) return null;
    const sortedProbes = [...validProbes].sort((a, b) => a.id - b.id);
    const firstProbe = sortedProbes[0];
    return {
      lat: Number(firstProbe.latitude),
      lng: Number(firstProbe.longitude)
    };
  }, [probes, viewMode]);

  // --- TABELA (Mantida) ---
  const processedTableData = useMemo(() => {
    if (viewMode !== 'map') return [];

    const mapPointById = new Map(mapPoints.map((point) => [point.id, point]));
    const farmNameById = new Map<number | undefined, string>(farms.map((farm) => [farm.id, farm.name]));

    const mapped: TableRowData[] = filteredProbes.map(probe => {
      // const mapPoint = mapPoints.find(mp => mp.id === probe.id);
      const mapPoint = mapPointById.get(probe.id);
      const status = mapPoint ? mapPoint.statusCode : 'status_offline';
      // const farm = farms.find(f => f.id === probe.farm_id);
      // const farmName = farm ? farm.name : '-';
      const farmName = farmNameById.get(probe.farm_id) ?? '-';

      const batteryReading = probe.readings
        ?.filter(r => r.battery_status !== null && r.battery_status !== undefined)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      return {
        ...probe,
        farmName,
        status,
        batteryLevel: batteryReading?.battery_status ?? undefined,
        batteryDate: batteryReading ? new Date(batteryReading.timestamp).toLocaleDateString() : ''
      };
    });

    let filtered = mapped;
    if (filterText.trim()) {
      const lowerSearch = filterText.toLowerCase();
      filtered = mapped.filter(item =>
        (item.name?.toLowerCase() || '').includes(lowerSearch) ||
        item.esn.toLowerCase().includes(lowerSearch)
      );
    }

    return filtered.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  }, [filteredProbes, mapPoints, farms, filterText, sortConfig, viewMode]);

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

  // --- FUNÇÃO CENTRAL DE BUSCA DE HISTÓRICO ---
  const fetchHistory = useCallback(async (period: TimeRange, startDateStr?: string, endDateStr?: string) => {
    if (!selectedProbe) return;

    try {
      setLoadingChart(true);

      let finalStart: string | undefined;
      let finalEnd: string | undefined;

      // Lógica de Datas
      if (period === 'Personalizado' && startDateStr && endDateStr) {
        finalStart = new Date(startDateStr).toISOString();

        const endObj = new Date(endDateStr);
        endObj.setHours(23, 59, 59, 999);
        finalEnd = endObj.toISOString();

      } else if (period !== 'Personalizado') {
        const now = new Date();
        const target = new Date(now);

        switch (period) {
          case '24h': target.setHours(now.getHours() - 24); break;
          case '7d': target.setDate(now.getDate() - 7); break;
          case '15d': target.setDate(now.getDate() - 15); break;
          case '30d': target.setDate(now.getDate() - 30); break;
          case '60d': target.setDate(now.getDate() - 60); break;
          case '90d': target.setDate(now.getDate() - 90); break;
          case '120d': target.setDate(now.getDate() - 120); break;
        }
        finalStart = target.toISOString();
        finalEnd = now.toISOString();
      } else {
        setLoadingChart(false);
        return;
      }

      const history = await getDeviceHistory(selectedProbe.esn, {
        start_date: finalStart,
        end_date: finalEnd,
        limit: 500000
      });

      if (!isMountedRef.current) return;

      const sortedHistory = [...history].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const formattedData: RawApiData[] = sortedHistory.map(r => ({
        timestamp: r.timestamp,
        depth_cm: r.depth_cm,
        moisture_pct: r.moisture_pct,
        temperature_c: r.temperature_c,
        rain_cm: r.rain_cm,
        battery_status: r.battery_status
      }));

      setChartData(formattedData);

    } catch (error) {
      console.error("Erro ao carregar histórico", error);
      if (isMountedRef.current) {
        toast({ title: 'Erro ao carregar histórico', status: 'error' });
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingChart(false);
      }
    }
  }, [selectedProbe, toast]);


  const handlePeriodChange = (period: TimeRange, start?: string, end?: string) => {
    setSelectedPeriod(period);

    if (period === 'Personalizado' && start && end) {
      setCustomRange({ start, end });
    }
  };

  // Carrega dados iniciais quando seleciona a sonda
  useEffect(() => {
    if (viewMode !== 'chart' || !selectedProbe) return;

    if (selectedPeriod === 'Personalizado') {
      if (customRange.start && customRange.end) {
        fetchHistory('Personalizado', customRange.start, customRange.end);
      }
    } else {
      fetchHistory(selectedPeriod);
    }
  }, [selectedProbe, viewMode, selectedPeriod, customRange, fetchHistory]);


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

  // Nova lógica de Bateria Unificada
  const getBatteryStatus = (voltage: number | null | undefined) => {
    if (voltage === null || voltage === undefined) return { color: "gray.500", text: "--" };

    const isPercentage = voltage > 10;
    const isGood = isPercentage ? voltage > 40 : voltage >= 3.7;
    const isWarn = isPercentage ? voltage > 15 : voltage >= 3.4;

    if (isGood) return { color: "green.400", text: isPercentage ? `${voltage.toFixed(0)}%` : `${voltage.toFixed(2)}V` };
    if (isWarn) return { color: "yellow.400", text: isPercentage ? `${voltage.toFixed(0)}%` : `${voltage.toFixed(2)}V` };
    return { color: "red.400", text: isPercentage ? `${voltage.toFixed(0)}%` : `${voltage.toFixed(2)}V` };
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return null;
    return <Icon as={sortConfig.direction === 'asc' ? MdArrowUpward : MdArrowDownward} ml={1} />;
  };

  if (loading) {
    return (
      <Flex h="100vh" align="center" justify="center" bg={COLORS.background}>
        <Spinner size="xl" color={COLORS.primary} />
      </Flex>
    );
  }

  const handleProbeSelect = (probeId: number) => {
    setSearchParams({ probeId: String(probeId) });
  };

  const MotionBox = motion.create(Box);

  const pageVariants = {
    initial: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -100 : 100,
      opacity: 0
    })
  };

  return (
    <Box minH="100vh" bg={COLORS.background} pb={10}>
      <AnimatePresence mode="wait" custom={direction}>
        {viewMode === 'map' && (
          <MotionBox
            key="map"
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: "easeInOut" }}
            position="relative"
            w="100%"
            bg={COLORS.background}
            minH="100vh"
          >
            <Box w="100%" mt={6} pr={6} pl={6} borderRadius="xl" overflow="hidden" boxShadow="2xl">
              <Box w="100%" h="90vh" position="relative" bg="black">
                {/* <SatelliteMap
                  points={mapPoints}
                  onViewGraph={handleMapGraphClick}
                  initialCenter={initialMapPosition}
                  selectedDepthRefs={selectedDepthRefs}
                  onSelectDepthRef={handleSelectDepthRef}
                  mapDepthFilter={mapDepthFilter}
                  onMapDepthFilterChange={setMapDepthFilter}
                /> */}

                <Suspense fallback={<Flex justify="center" align="center" h="100%"><Spinner size="xl" color="blue.500" /></Flex>}>
                  <SatelliteMap
                    points={mapPoints}
                    onViewGraph={handleMapGraphClick}
                    initialCenter={initialMapPosition}
                    selectedDepthRefs={selectedDepthRefs}
                    onSelectDepthRef={handleSelectDepthRef}
                    mapDepthFilter={mapDepthFilter}
                    onMapDepthFilterChange={setMapDepthFilter}
                  />
                </Suspense>
              </Box>
            </Box>

            <Container maxW="container.xl" mt={8} mb={10}>
              <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={4}>
                <Heading size="md" color={COLORS.textPrimary} borderLeft="4px solid" borderColor="blue.500" pl={3}>
                  Monitoramento Detalhado
                </Heading>

                <InputGroup maxW="300px">
                  <InputLeftElement pointerEvents="none">
                    <Icon as={MdSearch} color="gray.500" />
                  </InputLeftElement>
                  <Input
                    placeholder="Buscar por nome ou ESN..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    bg="gray.800"
                    color="white"
                    borderColor="gray.700"
                    _placeholder={{ color: 'gray.500' }}
                    _focus={{ borderColor: 'blue.500' }}
                  />
                </InputGroup>
              </Flex>

              {filteredProbes.length === 0 ? (
                <Text color="gray.500" fontStyle="italic">Nenhuma sonda encontrada.</Text>
              ) : (
                <TableContainer bg="gray.800" borderRadius="xl" border="1px solid" borderColor="gray.700" boxShadow="lg">
                  <Table variant="simple" colorScheme="whiteAlpha" size="md">
                    <Thead>
                      <Tr>
                        <Th rowSpan={2} color="gray.400" borderColor="gray.700" cursor="pointer" onClick={() => handleSort('esn')} verticalAlign="bottom" pb={4}>
                          <HStack spacing={0}><Text>ESN</Text><SortIcon column="esn" /></HStack>
                        </Th>
                        <Th rowSpan={2} color="gray.400" borderColor="gray.700" cursor="pointer" onClick={() => handleSort('name')} verticalAlign="bottom" pb={4}>
                          <HStack spacing={0}><Text>Nome</Text><SortIcon column="name" /></HStack>
                        </Th>
                        <Th rowSpan={2} color="gray.400" borderColor="gray.700" cursor="pointer" onClick={() => handleSort('farmName')} verticalAlign="bottom" pb={4}>
                          <HStack spacing={0}><Text>Fazenda</Text><SortIcon column="farmName" /></HStack>
                        </Th>
                        <Th rowSpan={2} color="gray.400" borderColor="gray.700" cursor="pointer" onClick={() => handleSort('status')} verticalAlign="bottom" pb={4}>
                          <HStack spacing={0}><Text>Status</Text><SortIcon column="status" /></HStack>
                        </Th>

                        <Th colSpan={3} color="blue.300" borderColor="gray.600" textAlign="center" borderBottomWidth="1px" pt={2}>
                          PRECIPITAÇÃO (mm)
                        </Th>

                        <Th rowSpan={2} color="gray.400" borderColor="gray.700" textAlign="center" cursor="pointer" onClick={() => handleSort('batteryLevel')} verticalAlign="bottom" pb={4}>
                          <HStack spacing={0} justify="center"><Text>Bateria</Text><SortIcon column="batteryLevel" /></HStack>
                        </Th>
                      </Tr>
                      <Tr>
                        <Th color="blue.200" borderColor="gray.700" textAlign="center" fontSize="xs" py={1}>1h</Th>
                        <Th color="blue.300" borderColor="gray.700" textAlign="center" fontSize="xs" py={1}>24h</Th>
                        <Th color="blue.400" borderColor="gray.700" textAlign="center" fontSize="xs" py={1}>7 Dias</Th>
                      </Tr>
                    </Thead>

                    <Tbody>
                      {processedTableData.map((data) => (
                        <Tr
                          key={data.id}
                          onClick={() => handleMapGraphClick(data.id)}
                          cursor="pointer"
                          _hover={{ bg: 'whiteAlpha.100', transform: "translateY(-1px)", boxShadow: "sm" }}
                          transition="all 0.2s"
                        >
                          <Td borderColor="gray.700" fontWeight="medium" color="white">{data.esn}</Td>
                          <Td borderColor="gray.700" color="gray.300">{data.name || '-'}</Td>
                          <Td borderColor="gray.700" color="gray.300">{data.farmName}</Td>
                          <Td borderColor="gray.700">
                            <Badge colorScheme={getStatusColor(data.status)} variant="subtle" borderRadius="md" px={2} fontSize="0.75rem">
                              {getStatusLabel(data.status)}
                            </Badge>
                          </Td>
                          <Td borderColor="gray.700" textAlign="center" fontWeight="bold" color="blue.200">{formatRain(data.rain_1h)}</Td>
                          <Td borderColor="gray.700" textAlign="center" fontWeight="bold" color="blue.300">{formatRain(data.rain_24h)}</Td>
                          <Td borderColor="gray.700" textAlign="center" color="blue.400">{formatRain(data.rain_7d)}</Td>

                          {/* Coluna da Bateria Atualizada */}
                          <Td borderColor="gray.700" textAlign="center">
                            {(() => {
                              const batteryData = getBatteryStatus(data.batteryLevel);
                              return (
                                <ChakraTooltip label={data.batteryDate ? `Última leitura: ${data.batteryDate}` : 'Sem dados'} hasArrow bg="gray.700" color="white">
                                  <HStack justify="center" spacing={1.5}>
                                    <Text fontSize="sm" fontWeight="bold" color={batteryData.color} fontFamily="mono">
                                      {batteryData.text}
                                    </Text>
                                  </HStack>
                                </ChakraTooltip>
                              );
                            })()}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </Container>
          </MotionBox>
        )}

        {viewMode === 'chart' && selectedProbe && (
          <MotionBox
            key={selectedProbe.id}
            w="100%"
            px={{ base: 2, md: 6 }}
            py={6}
            minH="100vh"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            custom={direction}
          >
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

            <MotionBox mb={6}>
              {/* <Menu>
                <MenuButton
                  as={Button}
                  variant="unstyled"
                  display="flex"
                  alignItems="center"
                  _hover={{ color: "gray.300" }}
                  _active={{ color: "gray.400" }}
                  sx={{ textAlign: 'left', height: 'auto', p: 0, minW: 0 }}
                >
                  <Heading size="lg" color="white" display="flex" alignItems="center" gap={2}>
                    {selectedProbe.name || selectedProbe.esn}
                    <motion.div animate={{ rotate: selectedProbe ? 0 : 180 }} transition={{ duration: 0.4 }}>
                      <Icon as={MdArrowDropDown} boxSize={8} />
                    </motion.div>
                  </Heading>
                </MenuButton>

                <MenuList bg="gray.800" borderColor="gray.600" maxH="300px" overflowY="auto" zIndex={10}>
                  {filteredProbes.map((probe) => (
                    <MenuItem
                      key={probe.id}
                      onClick={() => handleProbeSelect(probe.id)}
                      bg={probe.id === selectedProbe.id ? COLORS.primary : "gray.800"}
                      color="white"
                      _hover={{ bg: probe.id === selectedProbe.id ? COLORS.primaryDark : "gray.700" }}
                      _focus={{ bg: probe.id === selectedProbe.id ? COLORS.primaryDark : "gray.700" }}
                      justifyContent="space-between"
                    >
                      <Text>{probe.name || probe.esn}</Text>
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu> */}
              <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} wrap="wrap" gap={3}>
                <Menu>
                  <MenuButton
                    as={Button}
                    variant="unstyled"
                    display="flex"
                    alignItems="center"
                    _hover={{ color: "gray.300" }}
                    _active={{ color: "gray.400" }}
                    sx={{ textAlign: 'left', height: 'auto', p: 0, minW: 0 }}
                  >
                    <Heading size="lg" color="white" display="flex" alignItems="center" gap={2}>
                      {selectedProbe.name || selectedProbe.esn}
                      <motion.div animate={{ rotate: selectedProbe ? 0 : 180 }} transition={{ duration: 0.4 }}>
                        <Icon as={MdArrowDropDown} boxSize={8} />
                      </motion.div>
                    </Heading>
                  </MenuButton>

                  <MenuList bg="gray.800" borderColor="gray.600" maxH="300px" overflowY="auto" zIndex={10}>
                    {filteredProbes.map((probe) => (
                      <MenuItem
                        key={probe.id}
                        onClick={() => handleProbeSelect(probe.id)}
                        bg={probe.id === selectedProbe.id ? COLORS.primary : "gray.800"}
                        color="white"
                        _hover={{ bg: probe.id === selectedProbe.id ? COLORS.primaryDark : "gray.700" }}
                        _focus={{ bg: probe.id === selectedProbe.id ? COLORS.primaryDark : "gray.700" }}
                        justifyContent="space-between"
                      >
                        <Text>{probe.name || probe.esn}</Text>
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>

                {/* {userIsAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    color="white"
                    _hover={{ bg: 'whiteAlpha.200' }}
                    onClick={() => setShowBatteryChart((prev) => !prev)}
                  >
                    {showBatteryChart ? 'Ocultar Bateria' : 'Ver Status da Bateria'}
                  </Button>
                )} */}
              </Flex>
              <Text color="gray.400" mt={1}>Análise detalhada do solo</Text>
            </MotionBox>

            <Box p={{ base: 0, md: 2 }}>
              {loadingChart ? (
                <Flex justify="center" align="center" h="300px"><Spinner size="xl" color="blue.500" /></Flex>
              ) : (
                <VStack spacing={8} align="stretch" as={motion.div}
                  initial="hidden" animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
                >
                  {/* GRÁFICO DE UMIDADE */}
                  <MotionBox
                    p={0}
                    variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* {chartData.length > 0 ? (
                      <SoilMoistureChart
                        data={chartData}
                        title="Perfil de Umidade (%)"
                        unit="%"
                        yDomain={[0, 100]}
                        showZones={true}
                        metric="moisture"
                        isAdmin={userIsAdmin}
                        esn={selectedProbe.esn}
                        initialMin={selectedProbe.config_moisture_v1 ?? 30}
                        initialMax={selectedProbe.config_moisture_v3 ?? 60}
                        onConfigUpdate={() => loadData()}
                        // --- PROPS DE FILTRO ATUALIZADAS ---
                        selectedPeriod={selectedPeriod}
                        onPeriodChange={handlePeriodChange}
                        selectedDepthRef={selectedDepthRefs[selectedProbe.id] ?? null}
                        onSelectDepthRef={(depth) => handleSelectDepthRef(selectedProbe.id, depth)}
                      />
                    ) : (
                      <Flex h="300px" justify="center" align="center">
                        <Text color="gray.500">Sem dados de umidade para este período.</Text>
                      </Flex>
                    )} */}

                    <Suspense fallback={<Flex h="300px" justify="center" align="center"><Spinner size="lg" color="blue.500" /></Flex>}>
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
                          initialV1={selectedProbe.config_moisture_v1 ?? 30}
                          initialV2={selectedProbe.config_moisture_v2 ?? 45}
                          initialV3={selectedProbe.config_moisture_v3 ?? 60}
                          intensity={selectedProbe.config_gradient_intensity ?? 50}
                          onConfigUpdate={() => loadData()}
                          // --- PROPS DE FILTRO ATUALIZADAS ---
                          selectedPeriod={selectedPeriod}
                          onPeriodChange={handlePeriodChange}
                          selectedDepthRef={selectedDepthRefs[selectedProbe.id] ?? null}
                          onSelectDepthRef={(depth) => handleSelectDepthRef(selectedProbe.id, depth)}
                        />
                      ) : (
                        <Flex h="300px" justify="center" align="center">
                          <Text color="gray.500">Sem dados de umidade para este período.</Text>
                        </Flex>
                      )}
                    </Suspense>
                  </MotionBox>

                  {/* GRÁFICO DE TEMPERATURA */}
                  <MotionBox
                    p={0}
                    variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* {chartData.length > 0 ? (
                      <SoilMoistureChart
                        data={chartData}
                        title="Perfil de Temperatura (°C)"
                        unit="°C"
                        yDomain={['auto', 'auto']}
                        showZones={true}
                        metric="temperature"
                        // --- PROPS DE FILTRO ATUALIZADAS ---
                        selectedPeriod={selectedPeriod}
                        onPeriodChange={handlePeriodChange}
                      />
                    ) : (
                      <Flex h="300px" justify="center" align="center">
                        <Text color="gray.500">Sem dados de temperatura para este período.</Text>
                      </Flex>
                    )} */}

                    <Suspense fallback={<Flex h="300px" justify="center" align="center"><Spinner size="lg" color="blue.500" /></Flex>}>
                      {chartData.length > 0 ? (
                        <SoilMoistureChart
                          data={chartData}
                          title="Perfil de Temperatura (°C)"
                          unit="°C"
                          yDomain={['auto', 'auto']}
                          showZones={true}
                          metric="temperature"
                          // --- PROPS DE FILTRO ATUALIZADAS ---
                          selectedPeriod={selectedPeriod}
                          onPeriodChange={handlePeriodChange}
                        />
                      ) : (
                        <Flex h="300px" justify="center" align="center">
                          <Text color="gray.500">Sem dados de temperatura para este período.</Text>
                        </Flex>
                      )}
                    </Suspense>
                  </MotionBox>

                  {/* GRÁFICO DE BATERIA (ADMIN) */}
                  {userIsAdmin && (
                    <MotionBox
                      p={0}
                      variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
                      transition={{ duration: 0.4 }}
                    >
                      <BatteryStatusChart data={chartData} />
                    </MotionBox>
                  )}
                </VStack>
              )}
            </Box>
          </MotionBox>
        )}
      </AnimatePresence >
    </Box >
  );
}