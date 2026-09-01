import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";
import {
  Box,
  Flex,
  Text,
  useToast,
  Spinner,
  Button,
  Container,
  Heading,
  VStack,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MdArrowBack, MdArrowDropDown } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { getProbes, getFarms, getDeviceHistory } from "../services/api";
import type { Probe, Farm } from "../types";
import type {
  RawApiData,
  TimeRange,
} from "../components/SoilMoistureChart/SoilMoistureChart";
import { COLORS } from "../colors/colors";
import type { MapPoint } from "../components/SatelliteMap/SatelliteMap";
import { isUserAdmin } from "../services/auth";
import { BatteryStatusChart } from "../components/BatteryStatus/BatteryStatusChart";
import { RainAccumulationCard } from "../components/RainAccumulationCard/RainAccumulationCard";
import {
  DeviceTable,
  type TableRowData,
  type SortKey,
} from "../components/DeviceTable/DeviceTable";
import { WeatherChart } from "../components/WeatherChart/WeatherChart";
import { useWeatherForecast } from "../hooks/useWeatherForecast";
import { ExportPdfButton } from "../components/ExportPdfButton/ExportPdfButton";

const SoilMoistureChart = lazy(() =>
  import("../components/SoilMoistureChart/SoilMoistureChart").then(
    (module) => ({ default: module.SoilMoistureChart }),
  ),
);
const SatelliteMap = lazy(() =>
  import("../components/SatelliteMap/SatelliteMap").then((module) => ({
    default: module.SatelliteMap,
  })),
);

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const formatLastCommunication = (value?: string) => {
  if (!value) return "-";
  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalizedValue);
  if (Number.isNaN(parsed.getTime())) return "-";

  const parts = dateTimeFormatter.formatToParts(parsed);
  const day = parts.find((p) => p.type === "day")?.value ?? "--";
  const month = parts.find((p) => p.type === "month")?.value ?? "--";
  const year = parts.find((p) => p.type === "year")?.value ?? "--";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "--";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "--";

  return `${day}/${month}/${year} - ${hour}:${minute}`;
};

const getLastCommunicationTimestamp = (probe: Probe) => {
  const parseToUTC = (dateStr: string) => {
    const normalized = dateStr.includes("T")
      ? dateStr
      : dateStr.replace(" ", "T");
    const utcStr = normalized.endsWith("Z") ? normalized : normalized + "Z";
    return new Date(utcStr).getTime();
  };

  const latestReadingTimestamp = probe.readings
    ?.map((reading) => parseToUTC(reading.timestamp))
    .filter((ts) => !Number.isNaN(ts))
    .sort((a, b) => b - a)[0];

  const probeLastCommunication = probe.last_communication
    ? parseToUTC(probe.last_communication)
    : NaN;

  if (!Number.isNaN(probeLastCommunication)) return probeLastCommunication;
  if (latestReadingTimestamp !== undefined) return latestReadingTimestamp;
  return 0;
};

const getStatusColor = (statusCode: string) => {
  switch (statusCode) {
    case "status_critical":
      return "#E53E3E";
    case "status_alert":
      return "#D69E2E";
    case "status_ok":
      return "#38A169";
    case "status_saturated":
      return "#3182CE";
    default:
      return "#718096";
  }
};

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const probeIdParam = searchParams.get("probeId");

  const navigate = useNavigate();
  const isMobile = useBreakpointValue({ base: true, md: false });

  const [probes, setProbes] = useState<Probe[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm] = useState<Farm | null>(null);
  const [selectedDepthRefs, setSelectedDepthRefs] = useState<
    Record<number, number | null>
  >({});
  const [mapDepthFilter, setMapDepthFilter] = useState<number>(20);

  const handleSelectDepthRef = useCallback(
    (probeId: number, depth: number | null) => {
      setSelectedDepthRefs((prev) => ({ ...prev, [probeId]: depth }));
    },
    [],
  );

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({
    key: "status",
    direction: "asc",
  });

  const [selectedPeriod, setSelectedPeriod] = useState<TimeRange>("30d");
  const [customRange, setCustomRange] = useState<{
    start?: string;
    end?: string;
  }>({});

  const [chartData, setChartData] = useState<RawApiData[]>([]);
  const [batteryData, setBatteryData] = useState<RawApiData[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const toast = useToast();
  const isMountedRef = useRef(true);
  const userIsAdmin = isUserAdmin();
  const [direction, setDirection] = useState(1);

  const selectedProbe = useMemo(() => {
    if (!probeIdParam) return null;
    return probes.find((p) => p.id === Number(probeIdParam)) || null;
  }, [probes, probeIdParam]);

  const { forecast, loading: loadingForecast } = useWeatherForecast(
    selectedProbe?.latitude ? Number(selectedProbe.latitude) : undefined,
    selectedProbe?.longitude ? Number(selectedProbe.longitude) : undefined,
  );

  const viewMode = selectedProbe ? "chart" : "map";

  useEffect(() => {
    if (selectedProbe) {
      setSelectedPeriod("30d");
      setCustomRange({});
    }
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, [selectedProbe]);

  const filteredProbes = useMemo(() => {
    if (!selectedFarm) return probes;
    return probes.filter((probe) => probe.farm_id === selectedFarm.id);
  }, [selectedFarm, probes]);

  const handleMapGraphClick = (deviceId: number) => {
    setDirection(1);
    setSearchParams({ probeId: String(deviceId) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToMap = () => {
    setDirection(-1);
    setSearchParams({});
    setChartData([]);
    setBatteryData([]);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const mapPoints: MapPoint[] = useMemo(() => {
    return filteredProbes.map((probe) => {
      const hasLocation =
        probe.latitude !== undefined &&
        probe.latitude !== null &&
        probe.longitude !== undefined &&
        probe.longitude !== null;

      const finalLat = hasLocation ? Number(probe.latitude) : -15.793889;
      const finalLng = hasLocation ? Number(probe.longitude) : -47.882778;

      const v1 = probe.config_moisture_v1 ?? 30;
      const v2 = probe.config_moisture_v2 ?? 45;
      const v3 = probe.config_moisture_v3 ?? 60;

      let currentStatusCode = "status_offline";
      const readings = probe.readings || [];
      const probeDepthRef = selectedDepthRefs[probe.id];
      const activeDepth =
        probeDepthRef !== undefined && probeDepthRef !== null
          ? probeDepthRef
          : mapDepthFilter;

      let filteredReadings = readings;
      if (activeDepth !== null && activeDepth !== undefined) {
        filteredReadings = readings.filter((r) => r.depth_cm === activeDepth);
      }

      const validReading = [...filteredReadings]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .find((r) => r.moisture_pct !== null && r.moisture_pct !== undefined);

      if (validReading) {
        const val = Number(validReading.moisture_pct);
        if (val < v1) {
          currentStatusCode = "status_critical";
        } else if (val < v2) {
          currentStatusCode = "status_alert";
        } else if (val <= v3) {
          currentStatusCode = "status_ok";
        } else {
          currentStatusCode = "status_saturated";
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
        config_moisture_v1: v1,
        config_moisture_v2: v2,
        config_moisture_v3: v3,
        rain_1h: probe.rain_1h,
        rain_24h: probe.rain_24h,
        rain_7d: probe.rain_7d,
        rain_15d: probe.rain_15d,
        rain_30d: probe.rain_30d,
      };
    });
  }, [filteredProbes, selectedDepthRefs, mapDepthFilter]);

  const initialMapPosition = useMemo(() => {
    if (viewMode !== "map") return null;
    if (probes.length === 0) return null;
    const validProbes = probes.filter(
      (p) =>
        p.latitude !== undefined &&
        p.latitude !== null &&
        p.longitude !== undefined &&
        p.longitude !== null,
    );
    if (validProbes.length === 0) return null;
    const sortedProbes = [...validProbes].sort((a, b) => a.id - b.id);
    const firstProbe = sortedProbes[0];
    return {
      lat: Number(firstProbe.latitude),
      lng: Number(firstProbe.longitude),
    };
  }, [probes, viewMode]);

  const processedTableData = useMemo(() => {
    const mapPointById = new Map(mapPoints.map((point) => [point.id, point]));
    const farmNameById = new Map<number | undefined, string>(
      farms.map((farm) => [farm.id, farm.name]),
    );

    const mapped: TableRowData[] = filteredProbes.map((probe) => {
      const mapPoint = mapPointById.get(probe.id);
      const status = mapPoint ? mapPoint.statusCode : "status_offline";
      const farmName = farmNameById.get(probe.farm_id) ?? "-";

      const batteryReading = probe.readings
        ?.filter(
          (r) => r.battery_status !== null && r.battery_status !== undefined,
        )
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )[0];

      const lastCommunicationTimestamp = getLastCommunicationTimestamp(probe);

      return {
        ...probe,
        farmName,
        status,
        batteryLevel: batteryReading?.battery_status ?? undefined,
        batteryDate: batteryReading
          ? new Date(batteryReading.timestamp).toLocaleDateString()
          : "",
        lastCommunicationFormatted: lastCommunicationTimestamp
          ? formatLastCommunication(
            new Date(lastCommunicationTimestamp).toISOString(),
          )
          : "-",
        lastCommunicationTimestamp,
      };
    });
    const statusWeight: Record<string, number> = {
      status_critical: 1,
      status_alert: 2,
      status_ok: 3,
      status_saturated: 4,
      status_offline: 5,
    };

    return mapped.sort((a, b) => {
      if (sortConfig.key === "status") {
        const weightA = statusWeight[a.status] || 99;
        const weightB = statusWeight[b.status] || 99;
        if (weightA < weightB) return sortConfig.direction === "asc" ? -1 : 1;
        if (weightA > weightB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      }

      const valA = a[sortConfig.key as keyof TableRowData];
      const valB = b[sortConfig.key as keyof TableRowData];

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredProbes, mapPoints, farms, sortConfig]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [probesData, farmsData] = await Promise.all([
        getProbes(),
        getFarms(),
      ]);
      if (isMountedRef.current) {
        setProbes(probesData);
        setFarms(farmsData);
      }
    } catch (error) {
      console.error(error);
      if (isMountedRef.current) {
        toast({
          title: "Erro ao carregar dados",
          status: "error",
          duration: 3000,
        });
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (viewMode !== "chart" || !selectedProbe || !userIsAdmin) return;

    const fetchBatteryData = async () => {
      const now = new Date();
      const target = new Date(now);
      target.setDate(now.getDate() - 30);

      try {
        const history = await getDeviceHistory(selectedProbe.esn, {
          start_date: target.toISOString(),
          end_date: now.toISOString(),
          limit: 50000,
        });

        if (isMountedRef.current) {
          const formatted: RawApiData[] = history.map((r) => ({
            timestamp: r.timestamp,
            depth_cm: r.depth_cm,
            moisture_pct: r.moisture_pct,
            temperature_c: r.temperature_c,
            rain_cm: r.rain_cm,
            battery_status: r.battery_status,
            solar_status: r.solar_status,
            latitude: r.latitude,
            longitude: r.longitude,
            reading_type: r.reading_type,
          }));
          setBatteryData(formatted);
        }
      } catch (error) {
        console.error("Erro ao carregar histórico de bateria", error);
      }
    };

    fetchBatteryData();
  }, [selectedProbe, viewMode, userIsAdmin]);

  const fetchHistory = useCallback(
    async (period: TimeRange, startDateStr?: string, endDateStr?: string) => {
      if (!selectedProbe) return;

      try {
        setLoadingChart(true);

        let finalStart: string | undefined;
        let finalEnd: string | undefined;

        if (period === "Personalizado" && startDateStr && endDateStr) {
          finalStart = new Date(startDateStr).toISOString();

          const endObj = new Date(endDateStr);
          endObj.setHours(23, 59, 59, 999);
          finalEnd = endObj.toISOString();
        } else if (period !== "Personalizado") {
          const now = new Date();
          const target = new Date(now);

          switch (period) {
            case "24h":
              target.setHours(now.getHours() - 24);
              break;
            case "7d":
              target.setDate(now.getDate() - 7);
              break;
            case "15d":
              target.setDate(now.getDate() - 15);
              break;
            case "30d":
              target.setDate(now.getDate() - 30);
              break;
            case "60d":
              target.setDate(now.getDate() - 60);
              break;
            case "90d":
              target.setDate(now.getDate() - 90);
              break;
            case "120d":
              target.setDate(now.getDate() - 120);
              break;
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
          limit: 500000,
        });

        if (!isMountedRef.current) return;

        const sortedHistory = [...history].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

        const formattedData: RawApiData[] = sortedHistory.map((r) => ({
          timestamp: r.timestamp,
          depth_cm: r.depth_cm,
          moisture_pct: r.moisture_pct,
          temperature_c: r.temperature_c,
          rain_cm: r.rain_cm,
          battery_status: r.battery_status,
          solar_status: r.solar_status,
          latitude: r.latitude,
          longitude: r.longitude,
          reading_type: r.reading_type,
        }));

        setChartData(formattedData);
      } catch (error) {
        console.error("Erro ao carregar histórico", error);
        if (isMountedRef.current) {
          toast({ title: "Erro ao carregar histórico", status: "error" });
        }
      } finally {
        if (isMountedRef.current) {
          setLoadingChart(false);
        }
      }
    },
    [selectedProbe, toast],
  );

  const handlePeriodChange = (
    period: TimeRange,
    start?: string,
    end?: string,
  ) => {
    setSelectedPeriod(period);
    if (period === "Personalizado" && start && end) {
      setCustomRange({ start, end });
    }
  };

  useEffect(() => {
    if (viewMode !== "chart" || !selectedProbe) return;
    if (selectedPeriod === "Personalizado") {
      if (customRange.start && customRange.end) {
        fetchHistory("Personalizado", customRange.start, customRange.end);
      }
    } else {
      fetchHistory(selectedPeriod);
    }
  }, [selectedProbe, viewMode, selectedPeriod, customRange, fetchHistory]);

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
      opacity: 0,
    }),
    animate: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction > 0 ? -100 : 100,
      opacity: 0,
    }),
  };

  return (
    <Box
      w="100%"
      bg={COLORS.background}
      pb={{ base: viewMode === "map" ? 0 : 20, md: 10 }}
    >
      <AnimatePresence mode="wait" custom={direction}>
        {viewMode === "map" && (
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
            // CORREÇÃO 1: Alterado "h" para "minH" para evitar a dupla rolagem vertical
            minH={{
              base: "calc(100dvh - 65px - env(safe-area-inset-bottom))",
              md: "100vh",
            }}
          >
            <Box
              w="100%"
              mt={{ base: 0, md: 6 }}
              px={{ base: 0, md: 6 }}
              borderRadius={{ base: "none", md: "xl" }}
              overflow="hidden"
              boxShadow={{ base: "none", md: "2xl" }}
            >
              <Box
                w="100%"
                h={{
                  base: "calc(100dvh - 65px - env(safe-area-inset-bottom))",
                  md: "90vh",
                }}
                position="relative"
                bg="black"
              >
                <Suspense
                  fallback={
                    <Flex justify="center" align="center" h="100%">
                      <Spinner size="xl" color="blue.500" />
                    </Flex>
                  }
                >
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

            {/* CORREÇÃO 2: Removido o display="none" para dispositivos móveis 
                Assim os cards mobile do DeviceTable renderizam na tela normalmente */}
            <Container maxW="full" mt={8} mb={10} px={{ base: 4, lg: 12 }} display={{ base: "none", md: "block" }}>
              <Flex
                justify="space-between"
                align="center"
                mb={6}
                wrap="wrap"
                gap={4}
              >
                <Heading
                  size={{ base: "sm", md: "md" }}
                  color={COLORS.textPrimary}
                  borderLeft="4px solid"
                  borderColor="blue.500"
                  pl={3}
                  isTruncated
                >
                  Monitoramento Detalhado
                </Heading>

                <ExportPdfButton data={processedTableData} />
              </Flex>

              <DeviceTable
                data={processedTableData}
                onRowClick={handleMapGraphClick}
                sortConfig={sortConfig}
                onSort={handleSort}
                isAdmin={userIsAdmin}
              />
            </Container>
          </MotionBox>
        )}

        {viewMode === "chart" && selectedProbe && (
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
              onClick={() => {
                if (isMobile) {
                  navigate("/probes");
                } else {
                  handleBackToMap();
                }
              }}
              _hover={{ bg: "whiteAlpha.200" }}
            >
              {isMobile ? "Voltar ao monitoramento" : "Voltar ao Mapa"}
            </Button>

            <MotionBox mb={6}>
              <Flex
                justify="space-between"
                align={{ base: "flex-start", md: "center" }}
                wrap="wrap"
                gap={3}
              >
                <Menu>
                  <MenuButton
                    as={Button}
                    variant="unstyled"
                    display="flex"
                    alignItems="center"
                    _hover={{ color: "gray.300" }}
                    _active={{ color: "gray.400" }}
                    sx={{ textAlign: "left", height: "auto", p: 0, minW: 0 }}
                  >
                    <Heading
                      size="lg"
                      color="white"
                      display="flex"
                      alignItems="center"
                      gap={2}
                    >
                      {selectedProbe.name || selectedProbe.esn}
                      <motion.div
                        animate={{ rotate: selectedProbe ? 0 : 180 }}
                        transition={{ duration: 0.4 }}
                      >
                        <Icon as={MdArrowDropDown} boxSize={8} />
                      </motion.div>
                    </Heading>
                  </MenuButton>

                  <MenuList
                    bg="gray.800"
                    borderColor="gray.600"
                    maxH="300px"
                    overflowY="auto"
                    zIndex={10}
                  >
                    {processedTableData.map((probe) => (
                      <MenuItem
                        key={probe.id}
                        onClick={() => handleProbeSelect(probe.id)}
                        bg={
                          probe.id === selectedProbe.id
                            ? COLORS.primary
                            : "gray.800"
                        }
                        color="white"
                        _hover={{
                          bg:
                            probe.id === selectedProbe.id
                              ? COLORS.primaryDark
                              : "gray.700",
                        }}
                        _focus={{
                          bg:
                            probe.id === selectedProbe.id
                              ? COLORS.primaryDark
                              : "gray.700",
                        }}
                      >
                        <Flex align="center" gap={3} w="100%">
                          <Box
                            w="12px"
                            h="12px"
                            borderRadius="full"
                            bg={getStatusColor(probe.status)}
                            flexShrink={0}
                          />
                          <Text flex="1" isTruncated>
                            {probe.name || probe.esn}
                          </Text>
                        </Flex>
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>
              </Flex>
              <Text color="gray.400" mt={1}>
                {farms.find((f) => f.id === selectedProbe?.farm_id)?.name ||
                  "Fazenda não identificada"}
              </Text>
            </MotionBox>

            <Box p={{ base: 0, md: 2 }}>
              {loadingChart ? (
                <Flex justify="center" align="center" h="300px">
                  <Spinner size="xl" color="blue.500" />
                </Flex>
              ) : (
                <VStack
                  spacing={8}
                  align="stretch"
                  as={motion.div}
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.15 } },
                  }}
                >
                  <MotionBox
                    p={0}
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.4 }}
                    mb={6}
                  >
                    <RainAccumulationCard
                      readings={chartData}
                      isLoading={loadingChart}
                      cardTitle={`Pluviometria`}
                      esn={selectedProbe.esn}
                    />
                    <WeatherChart data={forecast} isLoading={loadingForecast} lat={selectedProbe?.latitude} lng={selectedProbe?.longitude} />
                    <Suspense
                      fallback={
                        <Flex h="300px" justify="center" align="center">
                          <Spinner size="lg" color="blue.500" />
                        </Flex>
                      }
                    >
                      {chartData.length > 0 ? (
                        <SoilMoistureChart
                          data={chartData}
                          title="Perfil de Umidade (%)"
                          cultura={selectedProbe.cultura ?? "Sem cultura"}
                          dap={
                            selectedProbe.data_plantio
                              ? Math.floor(
                                (Date.now() -
                                  new Date(
                                    selectedProbe.data_plantio,
                                  ).getTime()) /
                                (1000 * 60 * 60 * 24),
                              )
                              : undefined
                          }
                          unit="%"
                          yDomain={[0, 100]}
                          showZones={true}
                          metric="moisture"
                          isAdmin={userIsAdmin}
                          esn={selectedProbe.esn}
                          initialV1={selectedProbe.config_moisture_v1 ?? 30}
                          initialV2={selectedProbe.config_moisture_v2 ?? 45}
                          initialV3={selectedProbe.config_moisture_v3 ?? 60}
                          intensity={
                            selectedProbe.config_gradient_intensity ?? 50
                          }
                          onConfigUpdate={() => loadData()}
                          selectedPeriod={selectedPeriod}
                          onPeriodChange={handlePeriodChange}
                          selectedDepthRef={
                            selectedDepthRefs[selectedProbe.id] ?? null
                          }
                          onSelectDepthRef={(depth) =>
                            handleSelectDepthRef(selectedProbe.id, depth)
                          }
                        />
                      ) : (
                        <Flex h="300px" justify="center" align="center">
                          <Text color="gray.500">
                            Sem dados de umidade para este período.
                          </Text>
                        </Flex>
                      )}
                    </Suspense>
                  </MotionBox>

                  <MotionBox
                    p={0}
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.4 }}
                  >
                    <Suspense
                      fallback={
                        <Flex h="300px" justify="center" align="center">
                          <Spinner size="lg" color="blue.500" />
                        </Flex>
                      }
                    >
                      {chartData.length > 0 ? (
                        <SoilMoistureChart
                          data={chartData}
                          title="Perfil de Temperatura (°C)"
                          unit="°C"
                          yDomain={["auto", "auto"]}
                          showZones={true}
                          metric="temperature"
                          selectedPeriod={selectedPeriod}
                          onPeriodChange={handlePeriodChange}
                        />
                      ) : (
                        <Flex h="300px" justify="center" align="center">
                          <Text color="gray.500">
                            Sem dados de temperatura para este período.
                          </Text>
                        </Flex>
                      )}
                    </Suspense>
                  </MotionBox>

                  {userIsAdmin && (
                    <MotionBox
                      p={0}
                      variants={{
                        hidden: { opacity: 0, y: 30 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      transition={{ duration: 0.4 }}
                    >
                      <BatteryStatusChart
                        data={batteryData}
                        selectedPeriod={selectedPeriod}
                        onPeriodChange={handlePeriodChange}
                      />
                    </MotionBox>
                  )}
                </VStack>
              )}
            </Box>
          </MotionBox>
        )}
      </AnimatePresence>
    </Box>
  );
}
