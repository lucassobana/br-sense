import { useMemo } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
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
import type { RawApiData } from "../SoilMoistureChart/SoilMoistureChart";

interface BatteryStatusChartProps {
  data: RawApiData[];
}

interface ChartPoint {
  time: string;
  battery?: number;
  solar?: number;
  
  // Dados de localização (injetados matematicamente)
  hasLocation?: boolean;
  locTime?: string; 
  lat?: number;
  lon?: number;
  distance?: number;
  isChange?: boolean;
  locY?: number; 
}

// Tipo específico para corrigir a lista temporária (Erro 1)
interface TempLocation {
  time: string;
  lat: number;
  lon: number;
  distance: number;
  isChange: boolean;
}

const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; 
  const toRad = (val: number) => (val * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export function BatteryStatusChart({ data }: BatteryStatusChartProps) {
  
  const chartData = useMemo<ChartPoint[]>(() => {
    
    const mapByTimestamp = new Map<string, ChartPoint>();
    data.forEach((item) => {
      const utcStr = item.timestamp.includes("Z") || item.timestamp.includes("+") ? item.timestamp : `${item.timestamp}Z`;
      const point = mapByTimestamp.get(utcStr) ?? { time: utcStr };
      
      const batteryValue = Number(item.battery_status);
      const solarValue = Number(item.solar_status);

      if (item.battery_status != null && !Number.isNaN(batteryValue) && batteryValue >= 0) {
        point.battery = batteryValue;
      }
      if (item.solar_status != null && !Number.isNaN(solarValue) && solarValue >= 0) {
        point.solar = solarValue;
      }

      if (point.battery !== undefined || point.solar !== undefined) {
        mapByTimestamp.set(utcStr, point);
      }
    });

    const batteryArray = Array.from(mapByTimestamp.values()).sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    if (batteryArray.length === 0) return []; 

    const initialRef = data.find((d) => d.latitude != null && d.longitude != null && Number.isFinite(Number(d.latitude)));
    const refLat = initialRef ? Number(initialRef.latitude) : null;
    const refLon = initialRef ? Number(initialRef.longitude) : null;

    // CORREÇÃO 1: Substituição de "any[]" pelo tipo exato dos dados
    const allLocs: TempLocation[] = [];
    
    data.forEach((item) => {
      const lat = Number(item.latitude);
      const lon = Number(item.longitude);

      if (item.latitude != null && item.longitude != null && Number.isFinite(lat) && Number.isFinite(lon)) {
        const utcStr = item.timestamp.includes("Z") || item.timestamp.includes("+") ? item.timestamp : `${item.timestamp}Z`;
        let dist = 0;
        let isChange = false;
        
        if (refLat !== null && refLon !== null) {
          dist = getDistanceInMeters(refLat, refLon, lat, lon);
          isChange = dist >= 10;
        }

        allLocs.push({ time: utcStr, lat, lon, distance: dist, isChange });
      }
    });

    allLocs.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const last15Locs = allLocs.slice(-15);

    const finalData = batteryArray.map(p => ({ ...p })); 
    const N = finalData.length;
    const L = last15Locs.length;

    if (L > 0) {
      last15Locs.forEach((loc, index) => {
        const targetIndex = L === 1 ? Math.floor((N - 1) / 2) : Math.floor(index * (N - 1) / (L - 1));
        
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
  }, [data]);

  const yDomain = useMemo<[number, number]>(() => {
    const values = chartData
      .flatMap((point) => [point.battery, point.solar])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    if (values.length === 0) return [0, 1];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max((max - min) * 0.12, 0.5);

    if (min === max) return [Math.max(0, min - padding), max + padding];
    
    const lowerBound = Math.floor((min - padding) * 10) / 10;
    const upperBound = Math.ceil((max + padding) * 10) / 10;
    
    return [Math.max(0, lowerBound), upperBound];
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Box bg="black" borderRadius="lg" p={4} border="1px solid" borderColor="whiteAlpha.300">
        <Text color="gray.300">Sem dados para este período.</Text>
      </Box>
    );
  }

  return (
    <Box bg="black" borderRadius="lg" p={4} border="1px solid" borderColor="whiteAlpha.300">
      <Flex justify="space-between" align="center" mb={4}>
        <Text color="white" fontWeight="semibold">
          Status de Componentes & Localização
        </Text>
        <Flex gap={3} align="center" color="gray.400" fontSize="xs">
          <Flex align="center" gap={1}>
            <Box w="8px" h="8px" borderRadius="full" bg="green.400" /> &lt; 10m (Válida)
          </Flex>
          <Flex align="center" gap={1}>
            <Box w="8px" h="8px" borderRadius="full" bg="red.400" /> &ge; 10m (Alerta)
          </Flex>
        </Flex>
      </Flex>

      <Box h="300px">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
            
            <XAxis
              dataKey="time"
              tick={{ fill: "#e2e8f0", fontSize: 11 }}
              tickFormatter={(val) => {
                const d = new Date(val);
                return isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
              }}
              minTickGap={35}
              axisLine={{ stroke: "rgba(255,255,255,0.35)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.35)" }}
            />

            <YAxis
              yAxisId="main"
              orientation="left"
              tick={{ fill: "#e2e8f0", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.35)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.35)" }}
              domain={yDomain}
              width={50}
            />

            <YAxis yAxisId="loc" orientation="right" hide domain={[0, 1.05]} />

            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const dataPoint = payload[0].payload as ChartPoint;
                const hasBatteryData = dataPoint.battery !== undefined || dataPoint.solar !== undefined;

                return (
                  <Box bg="#111" p={3} border="1px solid rgba(255,255,255,0.35)" borderRadius="md" boxShadow="lg">
                    
                    {hasBatteryData && (
                      <Box mb={dataPoint.hasLocation ? 2 : 0} pb={dataPoint.hasLocation ? 2 : 0} borderBottom={dataPoint.hasLocation ? "1px dashed rgba(255,255,255,0.2)" : "none"}>
                        <Text color="white" mb={2} fontWeight="bold" borderBottom="1px solid rgba(255,255,255,0.2)" pb={1}>
                          {new Date(dataPoint.time).toLocaleString("pt-BR")}
                        </Text>
                        {dataPoint.battery !== undefined && <Text color="white" fontSize="sm">Bateria: {dataPoint.battery.toFixed(2)}</Text>}
                        {dataPoint.solar !== undefined && <Text color="#FACC15" fontSize="sm">Painel solar: {dataPoint.solar.toFixed(2)}</Text>}
                      </Box>
                    )}

                    {dataPoint.hasLocation && (
                      <Box>
                        <Text color="white" mb={1} fontWeight="bold" fontSize="xs">
                          GPS capturado em: {new Date(dataPoint.locTime!).toLocaleString("pt-BR")}
                        </Text>
                        <Text color={dataPoint.isChange ? "red.400" : "green.400"} fontWeight="bold" fontSize="sm">
                          {dataPoint.isChange ? "Alerta de Deslocamento" : "Localização Válida"}
                        </Text>
                        <Text color="gray.300" fontSize="sm">Lat: {dataPoint.lat?.toFixed(6)}</Text>
                        <Text color="gray.300" fontSize="sm">Lng: {dataPoint.lon?.toFixed(6)}</Text>
                        <Text color="gray.400" fontSize="xs" mt={1}>
                          Distância da ref: {dataPoint.distance?.toFixed(2)} metros
                        </Text>
                      </Box>
                    )}
                  </Box>
                );
              }}
            />

            <Legend verticalAlign="top" align="right" iconType="line" wrapperStyle={{ color: "#e2e8f0", fontSize: 12, paddingBottom: 8 }} />

            <Line yAxisId="main" type="monotone" dataKey="battery" name="Bateria" stroke="#FFFFFF" strokeWidth={2} dot={{ r: 3, fill: "#FFFFFF", stroke: "#FFFFFF" }} activeDot={{ r: 5 }} isAnimationActive={false} connectNulls />
            <Line yAxisId="main" type="monotone" dataKey="solar" name="Painel solar" stroke="#FACC15" strokeWidth={2} dot={{ r: 3, fill: "#FACC15", stroke: "#FACC15" }} activeDot={{ r: 5 }} isAnimationActive={false} connectNulls />
            
            <Line
              yAxisId="loc"
              dataKey="locY"
              name="Localização"
              stroke="none"
              isAnimationActive={false}
              activeDot={false}
              // CORREÇÃO 2: Tipagem explícita dos props que o Recharts passa
              dot={(props: { cx?: number; cy?: number; payload: ChartPoint }) => {
                const { cx, cy, payload } = props;
                if (!payload.hasLocation || cx === undefined || cy === undefined) return null;
                
                return (
                  <circle
                    key={`loc-${payload.time}`}
                    cx={cx}
                    cy={cy}
                    r={5}
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