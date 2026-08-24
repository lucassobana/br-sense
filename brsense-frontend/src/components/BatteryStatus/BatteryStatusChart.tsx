import { useMemo, useState, useRef } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  FormControl,
  FormLabel,
  Input,
  ButtonGroup,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MdFilterList,
  MdArrowDropDown,
  MdDateRange,
  MdClose,
} from "react-icons/md";
import type { RawApiData } from "../SoilMoistureChart/SoilMoistureChart";

export type TimeRange =
  | "24h"
  | "7d"
  | "15d"
  | "30d"
  | "60d"
  | "90d"
  | "120d"
  | "Personalizado";

interface BatteryStatusChartProps {
  data: RawApiData[];
  selectedPeriod?: TimeRange;
  onPeriodChange?: (
    period: TimeRange,
    startDate?: string,
    endDate?: string,
  ) => void;
}

interface ChartPoint {
  time: string;
  battery?: number;
  solar?: number;
  hasLocation?: boolean;
  locTime?: string;
  lat?: number;
  lon?: number;
  distance?: number;
  isChange?: boolean;
  locY?: number;
}

interface TempLocation {
  time: string;
  lat: number;
  lon: number;
  distance: number;
  isChange: boolean;
}

const getDistanceInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371e3;
  const toRad = (val: number) => (val * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export function BatteryStatusChart({
  data,
  selectedPeriod = "24h",
  onPeriodChange,
}: BatteryStatusChartProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const endDateRef = useRef<HTMLInputElement>(null);

  const isMobileViewport = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 48em)").matches;
  }, []);

  // --- ESTADOS DO FILTRO DE DATA ---
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");

  // --- ESTADOS DA LEGENDA CLICÁVEL ---
  const [visibleSeries, setVisibleSeries] = useState({
    battery: true,
    solar: true,
    location: true,
  });

  const toggleSeries = (key: keyof typeof visibleSeries) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApplyFilters = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    if (tempStartDate && tempEndDate && onPeriodChange) {
      onPeriodChange("Personalizado", tempStartDate, tempEndDate);
    }
    onClose();
  };

  const clearDates = () => {
    setStartDate("");
    setEndDate("");
    setTempStartDate("");
    setTempEndDate("");
  };

  const handleResetView = () => {
    if (startDate || endDate || tempStartDate || tempEndDate) {
      clearDates();
      if (onPeriodChange) onPeriodChange("24h");
    }
  };

  const chartData = useMemo<ChartPoint[]>(() => {
    let filteredData = data;

    let maxTimestamp = 0;
    if (data.length > 0) {
      maxTimestamp = Math.max(
        ...data
          .map((d) => {
            const utcStr =
              d.timestamp.includes("Z") || d.timestamp.includes("+")
                ? d.timestamp
                : `${d.timestamp}Z`;
            return new Date(utcStr).getTime();
          })
          .filter((t) => !isNaN(t)),
      );
    }

    if (startDate && endDate) {
      const startObj = new Date(startDate);
      startObj.setHours(0, 0, 0, 0);

      const endObj = new Date(endDate);
      endObj.setHours(23, 59, 59, 999);

      const startTime = startObj.getTime();
      const endTime = endObj.getTime();

      filteredData = data.filter((item) => {
        const utcStr =
          item.timestamp.includes("Z") || item.timestamp.includes("+")
            ? item.timestamp
            : `${item.timestamp}Z`;
        const t = new Date(utcStr).getTime();
        return t >= startTime && t <= endTime;
      });
    } else if (
      selectedPeriod &&
      selectedPeriod !== "Personalizado" &&
      maxTimestamp > 0
    ) {
      let daysToKeep = 0;
      switch (selectedPeriod) {
        case "24h":
          daysToKeep = 1;
          break;
        case "7d":
          daysToKeep = 7;
          break;
        case "15d":
          daysToKeep = 15;
          break;
        case "30d":
          daysToKeep = 30;
          break;
        case "60d":
          daysToKeep = 60;
          break;
        case "90d":
          daysToKeep = 90;
          break;
        case "120d":
          daysToKeep = 120;
          break;
      }

      if (daysToKeep > 0) {
        const limitTime = maxTimestamp - daysToKeep * 24 * 60 * 60 * 1000;
        filteredData = data.filter((item) => {
          const utcStr =
            item.timestamp.includes("Z") || item.timestamp.includes("+")
              ? item.timestamp
              : `${item.timestamp}Z`;
          const t = new Date(utcStr).getTime();
          return t >= limitTime;
        });
      }
    }

    const mapByTimestamp = new Map<string, ChartPoint>();
    filteredData.forEach((item) => {
      const utcStr =
        item.timestamp.includes("Z") || item.timestamp.includes("+")
          ? item.timestamp
          : `${item.timestamp}Z`;
      const point = mapByTimestamp.get(utcStr) ?? { time: utcStr };

      const batteryValue = Number(item.battery_status);
      const solarValue = Number(item.solar_status);

      if (
        item.battery_status != null &&
        !Number.isNaN(batteryValue) &&
        batteryValue >= 0
      ) {
        point.battery = batteryValue;
      }
      if (
        item.solar_status != null &&
        !Number.isNaN(solarValue) &&
        solarValue >= 0
      ) {
        point.solar = solarValue;
      }

      if (point.battery !== undefined || point.solar !== undefined) {
        mapByTimestamp.set(utcStr, point);
      }
    });

    const batteryArray = Array.from(mapByTimestamp.values()).sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );

    if (batteryArray.length === 0) return [];

    const initialRef = filteredData.find(
      (d) =>
        d.latitude != null &&
        d.longitude != null &&
        Number.isFinite(Number(d.latitude)),
    );
    const refLat = initialRef ? Number(initialRef.latitude) : null;
    const refLon = initialRef ? Number(initialRef.longitude) : null;

    const allLocs: TempLocation[] = [];

    filteredData.forEach((item) => {
      const lat = Number(item.latitude);
      const lon = Number(item.longitude);

      if (
        item.latitude != null &&
        item.longitude != null &&
        Number.isFinite(lat) &&
        Number.isFinite(lon)
      ) {
        const utcStr =
          item.timestamp.includes("Z") || item.timestamp.includes("+")
            ? item.timestamp
            : `${item.timestamp}Z`;
        let dist = 0;
        let isChange = false;

        if (refLat !== null && refLon !== null) {
          dist = getDistanceInMeters(refLat, refLon, lat, lon);
          isChange = dist >= 10;
        }

        allLocs.push({ time: utcStr, lat, lon, distance: dist, isChange });
      }
    });

    allLocs.sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );
    const last15Locs = allLocs.slice(-15);

    const finalData = batteryArray.map((p) => ({ ...p }));
    const N = finalData.length;
    const L = last15Locs.length;

    if (L > 0) {
      last15Locs.forEach((loc, index) => {
        const targetIndex =
          L === 1
            ? Math.floor((N - 1) / 2)
            : Math.floor((index * (N - 1)) / (L - 1));

        if (finalData[targetIndex]) {
          finalData[targetIndex].hasLocation = true;
          finalData[targetIndex].locTime = loc.time;
          finalData[targetIndex].lat = loc.lat;
          finalData[targetIndex].lon = loc.lon;
          finalData[targetIndex].distance = loc.distance;
          finalData[targetIndex].isChange = loc.isChange;
          finalData[targetIndex].locY = 1;
        }
      });
    }

    return finalData;
  }, [data, startDate, endDate, selectedPeriod]);

  const yDomain = useMemo<[number, number]>(() => {
    const values = chartData
      .flatMap((point) => {
        const vals = [];
        if (visibleSeries.battery && point.battery !== undefined)
          vals.push(point.battery);
        if (visibleSeries.solar && point.solar !== undefined)
          vals.push(point.solar);
        return vals;
      })
      .filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      );

    if (values.length === 0) return [0, 1];

    const min = Math.min(...values);
    const max = Math.max(...values);

    const padding = Math.max((max - min) * 0.12, 1);

    if (min === max) {
      return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)];
    }

    const lowerBound = Math.floor(min - padding);
    const upperBound = Math.ceil(max + padding);

    return [Math.max(0, lowerBound), upperBound];
  }, [chartData, visibleSeries]);

  if (chartData.length === 0) {
    return (
      <Box
        bg="black"
        borderRadius="lg"
        p={4}
        border="1px solid"
        borderColor="whiteAlpha.300"
      >
        <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
          <Text
            color="white"
            fontWeight="semibold"
            fontSize={{ base: "sm", md: "md" }}
          >
            Status de Componentes & Localização
          </Text>
          {(startDate || endDate) && (
            <Button
              size="xs"
              colorScheme="red"
              onClick={handleResetView}
              px={1}
              title="Limpar Filtro"
            >
              <Icon as={MdClose} /> Limpar Filtro
            </Button>
          )}
        </Flex>
        <Text color="gray.300">Sem dados para este período.</Text>
      </Box>
    );
  }

  return (
    <Box
      bg="black"
      borderRadius="lg"
      p={{ base: 2, md: 4 }}
      border="1px solid"
      borderColor="whiteAlpha.300"
    >
      <Flex
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap={4}
        mb={4}
      >
        <Text
          color="white"
          fontWeight="semibold"
          fontSize={{ base: "sm", md: "md" }}
        >
          Status de Componentes & Localização
        </Text>

        <Flex
          wrap="wrap"
          gap={2}
          w={{ base: "100%", md: "auto" }}
          justify={{ base: "flex-start", md: "flex-end" }}
        >
          {(startDate || endDate) && (
            <Button
              size="xs"
              colorScheme="red"
              onClick={handleResetView}
              px={1}
              title="Limpar Filtro"
            >
              <Icon as={MdClose} />
            </Button>
          )}

          {onPeriodChange && (
            <ButtonGroup
              size="xs"
              isAttached
              variant="outline"
              colorScheme="blue"
            >
              <Button
                colorScheme={
                  selectedPeriod === "24h" && !startDate ? "blue" : "blue"
                }
                onClick={() => {
                  clearDates();
                  // Se já estiver ativado, desativa (mostra todos os dados)
                  if (selectedPeriod === "24h" && !startDate) {
                    onPeriodChange("Personalizado", "", "");
                  } else {
                    onPeriodChange("24h");
                  }
                }}
              >
                24h
              </Button>
              <Button
                colorScheme={
                  selectedPeriod === "7d" && !startDate ? "blue" : "blue"
                }
                onClick={() => {
                  clearDates();
                  // Se já estiver ativado, desativa (mostra todos os dados)
                  if (selectedPeriod === "7d" && !startDate) {
                    onPeriodChange("Personalizado", "", "");
                  } else {
                    onPeriodChange("7d");
                  }
                }}
              >
                7d
              </Button>
            </ButtonGroup>
          )}

          {onPeriodChange && (
            <Menu>
              <MenuButton
                as={Button}
                size="xs"
                colorScheme={startDate || endDate ? "blue" : "blue"}
                variant={startDate || endDate ? "solid" : "outline"}
                rightIcon={<MdArrowDropDown />}
                leftIcon={<MdFilterList />}
              >
                {startDate || endDate
                  ? "Personalizado"
                  : ["24h", "7d", "Personalizado"].includes(selectedPeriod)
                    ? "Mais"
                    : selectedPeriod}
              </MenuButton>
              <MenuList bg="gray.800" borderColor="gray.600" zIndex={2000}>
                <MenuItem
                  bg="gray.800"
                  color="white"
                  _hover={{ bg: "gray.700" }}
                  onClick={() => {
                    clearDates();
                    onPeriodChange("15d");
                  }}
                >
                  Últimos 15 Dias
                </MenuItem>
                <MenuItem
                  bg="gray.800"
                  color="white"
                  _hover={{ bg: "gray.700" }}
                  onClick={() => {
                    clearDates();
                    onPeriodChange("30d");
                  }}
                >
                  Últimos 30 Dias
                </MenuItem>
                <MenuItem
                  bg="gray.800"
                  color="white"
                  _hover={{ bg: "gray.700" }}
                  onClick={() => {
                    clearDates();
                    onPeriodChange("60d");
                  }}
                >
                  Últimos 60 Dias
                </MenuItem>
                <MenuItem
                  bg="gray.800"
                  color="white"
                  _hover={{ bg: "gray.700" }}
                  onClick={() => {
                    clearDates();
                    onPeriodChange("90d");
                  }}
                >
                  Últimos 90 Dias
                </MenuItem>
                <MenuItem
                  bg="gray.800"
                  color="white"
                  _hover={{ bg: "gray.700" }}
                  onClick={() => {
                    clearDates();
                    onPeriodChange("120d");
                  }}
                >
                  Últimos 120 Dias
                </MenuItem>
              </MenuList>
            </Menu>
          )}

          <Popover placement="bottom-end" isLazy isOpen={isOpen} onOpen={onOpen} onClose={onClose} closeOnBlur={false}>
            <PopoverTrigger>
              <Button
                size="xs"
                variant="outline"
                colorScheme="blue"
                leftIcon={<Icon as={MdDateRange} />}
              />
            </PopoverTrigger>
            <PopoverContent
              bg="gray.800"
              borderColor="gray.600"
              p={3}
              w="auto"
              boxShadow="xl"
              zIndex={2000}
            >
              <PopoverArrow bg="gray.800" />
              <PopoverBody>
                <VStack spacing={3} align="stretch">
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.400" mb={1}>
                      Data Inicial
                    </FormLabel>
                    <Input
                      size="xs"
                      color="white"
                      type="date"
                      value={tempStartDate}
                      onClick={(e) => {
                        try {
                          if ('showPicker' in HTMLInputElement.prototype) {
                            e.currentTarget.showPicker();
                          }
                        } catch (e) { console.debug(e); }
                      }}
                      onChange={(e) => {
                        setTempStartDate(e.target.value);
                        if (e.target.value && endDateRef.current) {
                          setTimeout(() => {
                            try {
                              if ('showPicker' in HTMLInputElement.prototype) {
                                endDateRef.current?.showPicker();
                              } else {
                                endDateRef.current?.focus();
                              }
                            } catch {
                              endDateRef.current?.focus();
                            }
                          }, 50);
                        }
                      }}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.400" mb={1}>
                      Data Final
                    </FormLabel>
                    <Input
                      ref={endDateRef}
                      size="xs"
                      color="white"
                      type="date"
                      value={tempEndDate}
                      onClick={(e) => {
                        try {
                          if ('showPicker' in HTMLInputElement.prototype) {
                            e.currentTarget.showPicker();
                          }
                        } catch (e) { console.debug(e); }
                      }}
                      onChange={(e) => setTempEndDate(e.target.value)}
                    />
                  </FormControl>
                  <Button
                    size="xs"
                    colorScheme="blue"
                    onClick={handleApplyFilters}
                    isDisabled={!tempStartDate || !tempEndDate}
                  >
                    Aplicar filtros
                  </Button>
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </Flex>
      </Flex>

      <Box h={{ base: "260px", md: "300px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 20,
              right: isMobileViewport ? 5 : 20,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="time"
              tick={{ fill: "#e2e8f0", fontSize: isMobileViewport ? 9 : 11 }}
              tickFormatter={(val) => {
                const d = new Date(val);
                return isNaN(d.getTime())
                  ? ""
                  : d.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    });
              }}
              minTickGap={isMobileViewport ? 20 : 35}
              axisLine={{ stroke: "rgba(255,255,255,0.35)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.35)" }}
            />

            <YAxis
              yAxisId="main"
              orientation="left"
              allowDecimals={false}
              tickFormatter={(val) => Math.round(val).toString()}
              tick={{ fill: "#e2e8f0", fontSize: isMobileViewport ? 9 : 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.35)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.35)" }}
              domain={yDomain}
              width={isMobileViewport ? 25 : 40}
            />

            <YAxis yAxisId="loc" orientation="right" hide domain={[0, 1.05]} />

            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const dataPoint = payload[0].payload as ChartPoint;
                const hasBatteryData =
                  (visibleSeries.battery && dataPoint.battery !== undefined) ||
                  (visibleSeries.solar && dataPoint.solar !== undefined);

                return (
                  <Box
                    bg="#111"
                    p={3}
                    border="1px solid rgba(255,255,255,0.35)"
                    borderRadius="md"
                    boxShadow="lg"
                  >
                    {hasBatteryData && (
                      <Box
                        mb={
                          visibleSeries.location && dataPoint.hasLocation
                            ? 2
                            : 0
                        }
                        pb={
                          visibleSeries.location && dataPoint.hasLocation
                            ? 2
                            : 0
                        }
                        borderBottom={
                          visibleSeries.location && dataPoint.hasLocation
                            ? "1px dashed rgba(255,255,255,0.2)"
                            : "none"
                        }
                      >
                        <Text
                          color="white"
                          mb={2}
                          fontWeight="bold"
                          borderBottom="1px solid rgba(255,255,255,0.2)"
                          pb={1}
                          fontSize={isMobileViewport ? "xs" : "sm"}
                        >
                          {new Date(dataPoint.time).toLocaleString("pt-BR")}
                        </Text>
                        {visibleSeries.battery &&
                          dataPoint.battery !== undefined && (
                            <Text
                              color="white"
                              fontSize={isMobileViewport ? "xs" : "sm"}
                            >
                              Bateria: {dataPoint.battery.toFixed(2)}
                            </Text>
                          )}
                        {visibleSeries.solar &&
                          dataPoint.solar !== undefined && (
                            <Text
                              color="#FACC15"
                              fontSize={isMobileViewport ? "xs" : "sm"}
                            >
                              Painel solar: {dataPoint.solar.toFixed(2)}
                            </Text>
                          )}
                      </Box>
                    )}

                    {visibleSeries.location && dataPoint.hasLocation && (
                      <Box>
                        <Text
                          color="white"
                          mb={1}
                          fontWeight="bold"
                          fontSize={isMobileViewport ? "xs" : "sm"}
                        >
                          GPS:{" "}
                          {new Date(dataPoint.locTime!).toLocaleString("pt-BR")}
                        </Text>
                        <Text
                          color={dataPoint.isChange ? "red.400" : "green.400"}
                          fontWeight="bold"
                          fontSize={isMobileViewport ? "xs" : "sm"}
                        >
                          {dataPoint.isChange
                            ? "Alerta de Deslocamento"
                            : "Localização Válida"}
                        </Text>
                        <Text
                          color="gray.300"
                          fontSize={isMobileViewport ? "xs" : "sm"}
                        >
                          Lat: {dataPoint.lat?.toFixed(6)} | Lng:{" "}
                          {dataPoint.lon?.toFixed(6)}
                        </Text>
                        <Text
                          color="gray.400"
                          fontSize={isMobileViewport ? "xs" : "sm"}
                          mt={1}
                        >
                          Distância da ref: {dataPoint.distance?.toFixed(2)}m
                        </Text>
                      </Box>
                    )}
                  </Box>
                );
              }}
            />

            <Legend
              verticalAlign="top"
              align="right"
              content={() => (
                <Flex
                  justify="flex-end"
                  align="center"
                  gap={4}
                  pb={2}
                  fontSize={isMobileViewport ? "10px" : "12px"}
                  color="#e2e8f0"
                  wrap="wrap"
                >
                  <Flex
                    align="center"
                    gap={3}
                    cursor="pointer"
                    opacity={visibleSeries.location ? 1 : 0.4}
                    transition="opacity 0.2s"
                    onClick={() => toggleSeries("location")}
                    _hover={{ opacity: 0.8 }}
                  >
                    <Flex align="center" gap={1.5}>
                      <Box w="10px" h="10px" borderRadius="full" bg="#48BB78" />
                      <Text>&lt; 10m</Text>
                    </Flex>
                    <Flex align="center" gap={1.5}>
                      <Box w="10px" h="10px" borderRadius="full" bg="#F56565" />
                      <Text>&ge; 10m</Text>
                    </Flex>
                  </Flex>

                  <Flex
                    align="center"
                    gap={1.5}
                    ml={{ base: 0, md: 2 }}
                    cursor="pointer"
                    opacity={visibleSeries.battery ? 1 : 0.4}
                    transition="opacity 0.2s"
                    onClick={() => toggleSeries("battery")}
                    _hover={{ opacity: 0.8 }}
                  >
                    <svg width="18" height="10" viewBox="0 0 18 10">
                      <line
                        x1="0"
                        y1="5"
                        x2="18"
                        y2="5"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                      <circle cx="9" cy="5" r="2.5" fill="#FFFFFF" />
                    </svg>
                    <Text>Bateria</Text>
                  </Flex>

                  <Flex
                    align="center"
                    gap={1.5}
                    cursor="pointer"
                    opacity={visibleSeries.solar ? 1 : 0.4}
                    transition="opacity 0.2s"
                    onClick={() => toggleSeries("solar")}
                    _hover={{ opacity: 0.8 }}
                  >
                    <svg width="18" height="10" viewBox="0 0 18 10">
                      <line
                        x1="0"
                        y1="5"
                        x2="18"
                        y2="5"
                        stroke="#FACC15"
                        strokeWidth="2"
                      />
                      <circle cx="9" cy="5" r="2.5" fill="#FACC15" />
                    </svg>
                    <Text>Painel solar</Text>
                  </Flex>
                </Flex>
              )}
            />

            <Line
              hide={!visibleSeries.battery}
              yAxisId="main"
              type="monotone"
              dataKey="battery"
              name="Bateria"
              legendType="none"
              stroke="#FFFFFF"
              strokeWidth={isMobileViewport ? 1.5 : 2}
              dot={{
                r: isMobileViewport ? 2 : 3,
                fill: "#FFFFFF",
                stroke: "#FFFFFF",
              }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              hide={!visibleSeries.solar}
              yAxisId="main"
              type="monotone"
              dataKey="solar"
              name="Painel solar"
              legendType="none"
              stroke="#FACC15"
              strokeWidth={isMobileViewport ? 1.5 : 2}
              dot={{
                r: isMobileViewport ? 2 : 3,
                fill: "#FACC15",
                stroke: "#FACC15",
              }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
              connectNulls
            />

            <Line
              hide={!visibleSeries.location}
              yAxisId="loc"
              dataKey="locY"
              name="Localização"
              legendType="none"
              stroke="none"
              isAnimationActive={false}
              activeDot={false}
              dot={(props: {
                cx?: number;
                cy?: number;
                payload: ChartPoint;
              }) => {
                const { cx, cy, payload } = props;
                if (
                  !payload.hasLocation ||
                  cx === undefined ||
                  cy === undefined
                )
                  return null;

                return (
                  <circle
                    key={`loc-${payload.time}`}
                    cx={cx}
                    cy={cy}
                    r={isMobileViewport ? 4 : 5}
                    fill={payload.isChange ? "#F56565" : "#48BB78"}
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth={1.5}
                    style={{ cursor: "crosshair" }}
                  />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}
