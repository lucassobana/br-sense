import React, { useMemo, useState, useRef } from "react";
import {
  Box,
  Flex,
  Spinner,
  Text,
  HStack,
  Icon,
  VStack,
  Fade,
  Stack,
  Button,
  FormControl,
  FormLabel,
  Input,
  useToast,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";
import { BsCloudRainFill } from "react-icons/bs";
import { MdHistory, MdArrowBack, MdWaterDrop } from "react-icons/md";
import { WiHot } from "react-icons/wi";
import { FaThermometerFull, FaThermometerQuarter } from "react-icons/fa";
import type { DailyForecast } from "../../types";
import { COLORS } from "../../colors/colors";
import { useWeatherHistory } from "../../hooks/useWeatherHistory";

interface WeatherChartProps {
  data: DailyForecast[];
  isLoading?: boolean;
  error?: string | null;
  lat?: number;
  lng?: number;
}

const MotionBox = motion(Box);

export const WeatherChart: React.FC<WeatherChartProps> = ({
  data,
  isLoading,
  error,
  lat,
  lng,
}) => {
  const chartData = useMemo(() => data.slice(0, 14), [data]);
  
  // Flip states
  const [isFlipped, setIsFlipped] = useState(false);
  
  // History states
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const endDateRef = useRef<HTMLInputElement>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});

  const handleLegendClick = (e: unknown) => {
    const payload = e as { dataKey?: string | number };
    const dataKey = payload.dataKey;
    if (typeof dataKey === 'string') {
      setHiddenSeries((prev) => ({
        ...prev,
        [dataKey]: !prev[dataKey]
      }));
    }
  };
  
  const { history, loading: historyLoading, error: historyError, loadHistory, clearHistory } = useWeatherHistory();
  const toast = useToast();

  const handleFetchHistory = () => {
    if (!lat || !lng) {
      toast({
        title: "Coordenadas não disponíveis.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    if (!tempStartDate || !tempEndDate) {
      toast({
        title: "Selecione as datas.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    loadHistory(lat, lng, tempStartDate, tempEndDate);
  };

  const handleFlipBack = () => {
    setIsFlipped(false);
    clearHistory();
    setTempStartDate("");
    setTempEndDate("");
  };

  if (isLoading) {
    return (
      <Flex h="540px" align="center" justify="center" bg="gray.800" borderRadius="xl">
        <Spinner color="blue.400" />
      </Flex>
    );
  }

  if (error || (chartData.length === 0 && !isFlipped)) {
    return (
      <Flex h="540px" align="center" justify="center" bg="gray.800" borderRadius="xl">
        <Text color="gray.500">Previsão indisponível no momento.</Text>
      </Flex>
    );
  }

  // --- Rendering functions for the chart ---
  const renderForecastChart = (dataToRender: DailyForecast[], maxRainVol: number, isHistory: boolean) => {
    return (
    <Box minW={`max(100%, ${dataToRender.length * 80}px)`} h="100%">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dataToRender} margin={{ top: 10, right: 15, left: 0, bottom: 145 }}>
          <defs>
            <linearGradient id="rainBarGradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#003764de" />
              <stop offset="50%" stopColor="#0064b6e3" />
              <stop offset="100%" stopColor="#0093fc" />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="dayName"
            axisLine={false}
            tickLine={false}
            tick={(props) => renderCustomXAxisTick(props, dataToRender, isHistory)}
            interval={0}
          />

          <YAxis
            domain={[0, maxRainVol]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#A0AEC0", fontSize: 12, fontWeight: "bold" }}
            width={40}
            tickFormatter={(val) => `${Math.round(val)}`}
          />

          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" vertical={false} />

          <ReferenceLine y={0} stroke="#4A5568" strokeDasharray="3 3" />

          <Bar
            dataKey="precipSum"
            fill="url(#rainBarGradient)"
            radius={[6, 6, 0, 0]}
            maxBarSize={70}
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-out"
          >
            <LabelList
              dataKey="precipSum"
              position="top"
              fill="white"
              fontSize={12}
              fontWeight="bold"
              formatter={(val: unknown) =>
                (typeof val === "number" || typeof val === "string") && Number(val) > 0
                  ? `${Math.round(Number(val))}mm`
                  : ""
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
    );
  };

  const renderHistoryChart = (dataToRender: DailyForecast[], maxRainVol: number, isHistory: boolean) => {
    return (
    <Box minW={`max(100%, ${dataToRender.length * 80}px)`} h="100%">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart 
          data={dataToRender} 
          margin={{ top: 25, right: 15, left: 0, bottom: 40 }}
        >
          <defs>
            <linearGradient id="historyRainBarGradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#003764de" />
              <stop offset="50%" stopColor="#0064b6e3" />
              <stop offset="100%" stopColor="#0093fc" />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="dayName"
            axisLine={false}
            tickLine={false}
            tick={(props) => renderCustomXAxisTick(props, dataToRender, isHistory)}
            interval={0}
          />

          <YAxis
            yAxisId="left"
            domain={["auto", "auto"]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#A0AEC0", fontSize: 12, fontWeight: "bold" }}
            width={40}
            tickFormatter={(val) => `${Math.round(val)}`}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, maxRainVol]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#A0AEC0", fontSize: 12, fontWeight: "bold" }}
            width={40}
            tickFormatter={(val) => `${Math.round(val)}`}
          />

          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" vertical={false} />

          <ReferenceLine yAxisId="left" y={0} stroke="#4A5568" strokeDasharray="3 3" />

          <Legend 
            align="left"
            verticalAlign="top" 
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '15px', cursor: 'pointer', userSelect: 'none', fontSize: '12px', fontWeight: '500' }}
            formatter={(value: string, entry: unknown) => {
              const payload = entry as { dataKey?: string | number };
              return (
                <span style={{ color: typeof payload.dataKey === 'string' && hiddenSeries[payload.dataKey] ? '#718096' : '#E2E8F0', marginLeft: '2px', transition: 'color 0.2s' }}>
                  {value}
                </span>
              );
            }}
            onClick={handleLegendClick}
          />

          <Bar
            name="Chuva"
            dataKey="precipSum"
            yAxisId="right"
            hide={hiddenSeries['precipSum']}
            fill="url(#historyRainBarGradient)"
            radius={[6, 6, 0, 0]}
            maxBarSize={70}
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-out"
          >
            <LabelList
              dataKey="precipSum"
              position="top"
              dx={-8}
              fill="white"
              fontSize={10}
              fontWeight="bold"
              stroke="#1E293B"
              strokeWidth={3}
              style={{ paintOrder: 'stroke' }}
              formatter={(val: unknown) =>
                (typeof val === "number" || typeof val === "string") && Number(val) > 0
                  ? `${Math.round(Number(val))}mm`
                  : ""
              }
            />
          </Bar>

          <Line
            name="Temp. Máx"
            hide={hiddenSeries['tempMax']}
            type="monotone"
            dataKey="tempMax"
            yAxisId="left"
            stroke="#E53E3E"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#E53E3E" }}
            activeDot={{ r: 5, fill: "#E53E3E", stroke: "#fff", strokeWidth: 1 }}
            isAnimationActive={true}
          >
            <LabelList dataKey="tempMax" position="top" dx={8} fill="#E53E3E" fontSize={10} fontWeight="bold" stroke="#1E293B" strokeWidth={3} style={{ paintOrder: 'stroke' }} formatter={(val: unknown) => (typeof val === 'number' ? `${Math.round(val)}°` : '')} />
          </Line>
          <Line
            name="Temp. Mín"
            hide={hiddenSeries['tempMin']}
            type="monotone"
            dataKey="tempMin"
            yAxisId="left"
            stroke="#3182CE"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#3182CE" }}
            activeDot={{ r: 5, fill: "#3182CE", stroke: "#fff", strokeWidth: 1 }}
            isAnimationActive={true}
          >
            <LabelList dataKey="tempMin" position="bottom" dx={8} fill="#3182CE" fontSize={10} fontWeight="bold" stroke="#1E293B" strokeWidth={3} style={{ paintOrder: 'stroke' }} formatter={(val: unknown) => (typeof val === 'number' ? `${Math.round(val)}°` : '')} />
          </Line>
          <Line
            name="ETo"
            hide={hiddenSeries['et0']}
            type="monotone"
            dataKey="et0"
            yAxisId="left"
            stroke="#DD6B20"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#DD6B20" }}
            activeDot={{ r: 5, fill: "#DD6B20", stroke: "#fff", strokeWidth: 1 }}
            isAnimationActive={true}
          >
            <LabelList dataKey="et0" position="bottom" dx={8} fill="#DD6B20" fontSize={10} fontWeight="bold" stroke="#1E293B" strokeWidth={3} style={{ paintOrder: 'stroke' }} formatter={(val: unknown) => (typeof val === 'number' ? `${val.toFixed(1)}mm` : '')} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
  };

  const renderCustomXAxisTick = ({ x, y, index }: { x?: number; y?: number; index?: number }, dataRef: DailyForecast[], isHistory: boolean) => {
    if (index === undefined || x === undefined || y === undefined) return null;
    const currentDay = dataRef[index];
    if (!currentDay) return null;

    return (
      <g transform={`translate(${x},${y})`}>
        {!isHistory && (currentDay.precipProb > 0 || currentDay.precipSum > 0) && (
          <foreignObject x={-30} y={0} width={60} height={40}>
            <Flex align="center" justify="center" h="100%">
              <VStack spacing={1} align="center">
                {currentDay.precipProb > 0 && (
                  <HStack spacing={1}>
                    <Icon as={MdWaterDrop} boxSize={3.5} color={COLORS.primaryDark} />
                    <Text fontSize={{ base: "10px", md: "12px" }} fontWeight="bold" color={COLORS.primaryDark}>
                      {currentDay.precipProb}%
                    </Text>
                  </HStack>
                )}
                {currentDay.precipSum > 0 && (
                  <Text fontSize={{ base: "10px", md: "12px" }} fontWeight="medium" color={COLORS.textPrimary}>
                    {Math.round(currentDay.precipSum)} mm
                  </Text>
                )}
              </VStack>
            </Flex>
          </foreignObject>
        )}

        {!isHistory && (
          <text x={0} y={52} textAnchor="middle" fill="#A0AEC0" fontSize={12} fontWeight="bold">
            {currentDay.dayName.charAt(0).toUpperCase() + currentDay.dayName.slice(1)}
          </text>
        )}

        <text 
          x={0} 
          y={isHistory ? 25 : 70} 
          textAnchor="middle" 
          fill={isHistory ? "#A0AEC0" : "#718096"} 
          fontSize={isHistory ? 11 : 10} 
          fontWeight={isHistory ? "bold" : "normal"}
        >
          {isHistory 
            ? (currentDay.date ? currentDay.date.split("-").reverse().slice(0, 2).join("/") : currentDay.dayNumber)
            : currentDay.dayNumber}
        </text>

        {!isHistory && currentDay.tempMin !== undefined && currentDay.tempMax !== undefined && (
          <foreignObject x={-47} y={76} width={90} height={65}>
            <Flex align="center" justify="center" h="100%" direction="column" gap="4px">
              <Flex align="center">
                <Icon as={FaThermometerFull} boxSize={3} color="red.400" />
                <Text fontSize="12px" color="gray.300" fontWeight="medium">
                  {Math.round(currentDay.tempMax)}°
                </Text>
              </Flex>
              <Flex align="center">
                <Icon as={FaThermometerQuarter} boxSize={3} color="blue.300" />
                <Text fontSize="12px" color="gray.300" fontWeight="medium">
                  {Math.round(currentDay.tempMin)}°
                </Text>
              </Flex>
              {currentDay.et0 !== undefined && currentDay.et0 !== null && (
                <Flex align="center">
                  <Icon as={WiHot} boxSize={5} color="orange.400" />
                  <Text fontSize={{ base: "10px", md: "12px" }} color={COLORS.textPrimary} fontWeight="medium">
                    {currentDay.et0.toFixed(1)}mm
                  </Text>
                </Flex>
              )}
            </Flex>
          </foreignObject>
        )}
      </g>
    );
  };

  const frontMaxRainVol = chartData.length > 0 ? Math.max(...chartData.map((d) => d.precipSum)) + 5 : 5;
  const backMaxRainVol = history.length > 0 ? Math.max(...history.map((d) => d.precipSum)) + 5 : 5;

  return (
    <Fade in={true} transition={{ enter: { duration: 0.8 } }}>
      <Box style={{ perspective: "1500px" }} w="100%" h="540px" mb={4}>
        <MotionBox
          w="100%"
          h="100%"
          position="relative"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.8, type: "spring", stiffness: 200, damping: 25 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* FRONT: Previsão */}
          <Flex
            position="absolute"
            top={0}
            left={0}
            w="100%"
            h="100%"
            direction="column"
            bg={COLORS.surface}
            borderRadius="xl"
            p={4}
            boxShadow="md"
            border="1px solid"
            borderColor="whiteAlpha.100"
            style={{ backfaceVisibility: "hidden" }}
          >
            <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={4} shrink={0}>
              <HStack spacing={3}>
                <Flex align="center" justify="center" w="38px" h="38px" bg="whiteAlpha.100" borderRadius="md">
                  <Icon as={BsCloudRainFill} color={COLORS.primary} boxSize={5} />
                </Flex>
                <VStack align="start" spacing={0}>
                  <Text color="white" fontWeight="bold" fontSize="md" noOfLines={1}>
                    Previsão de Chuva
                  </Text>
                </VStack>
                <Button 
                  size="sm" 
                  leftIcon={<Icon as={MdHistory} />} 
                  colorScheme="blue" 
                  variant="outline"
                  onClick={() => setIsFlipped(true)}
                  ml={2}
                >
                  Histórico
                </Button>
              </HStack>

              <HStack spacing={3}>
                <Stack direction="row" spacing={4} fontSize={{ base: "10px", md: "xs" }} gap={3} flexWrap="wrap">
                  <HStack spacing={1.5}>
                    <Box w="12px" h="12px" bgGradient="linear(to-t, #003764de, #0093fc)" borderRadius="sm" />
                    <Text color="gray.300">Prec (mm)</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <Icon as={MdWaterDrop} boxSize={4} color={COLORS.primaryDark} />
                    <Text color="gray.300">Prob (%)</Text>
                  </HStack>
                  <HStack spacing={1.5}>
                    <Icon as={WiHot} boxSize={4} color="orange.400" />
                    <Text color="gray.300">ETo (mm)</Text>
                  </HStack>
                </Stack>
              </HStack>
            </Flex>

            <Box
              flex="1"
              w="100%"
              overflowX="auto"
              overflowY="hidden"
              sx={{
                "&::-webkit-scrollbar": { height: "6px" },
                "&::-webkit-scrollbar-track": { background: "transparent" },
                "&::-webkit-scrollbar-thumb": { background: "whiteAlpha.300", borderRadius: "4px" },
              }}
            >
              {renderForecastChart(chartData, frontMaxRainVol, false)}
            </Box>
          </Flex>

          {/* BACK: Histórico */}
          <Flex
            position="absolute"
            top={0}
            left={0}
            w="100%"
            h="100%"
            direction="column"
            bg={COLORS.surface}
            borderRadius="xl"
            p={4}
            boxShadow="md"
            border="1px solid"
            borderColor="whiteAlpha.100"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={4} shrink={0}>
              <HStack spacing={3}>
                <Button size="sm" onClick={handleFlipBack} leftIcon={<Icon as={MdArrowBack}/>} variant="outline" colorScheme="blue">
                  Voltar
                </Button>
                <VStack align="start" spacing={0}>
                  <Text color="white" fontWeight="bold" fontSize="md" noOfLines={1}>
                    Histórico Climático
                  </Text>
                </VStack>
              </HStack>

              <HStack spacing={3} wrap="wrap">
                <FormControl w="140px">
                  <FormLabel fontSize="xs" color="gray.400" mb={1} m={0}>Data Inicial</FormLabel>
                  <Input 
                      size="sm" 
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
                      color="white"
                  />
                </FormControl>
                <FormControl w="140px">
                  <FormLabel fontSize="xs" color="gray.400" mb={1} m={0}>Data Final</FormLabel>
                  <Input 
                      ref={endDateRef}
                      size="sm" 
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
                      color="white"
                  />
                </FormControl>
                <Button 
                  mt={4}
                  size="sm" 
                  colorScheme="blue" 
                  onClick={handleFetchHistory}
                  isLoading={historyLoading}
                  isDisabled={!tempStartDate || !tempEndDate}
                >
                  Buscar
                </Button>
              </HStack>
            </Flex>

            <Box
              flex="1"
              w="100%"
              overflowX="auto"
              overflowY="hidden"
              display="flex"
              alignItems="center"
              justifyContent="center"
              sx={{
                "&::-webkit-scrollbar": { height: "6px" },
                "&::-webkit-scrollbar-track": { background: "transparent" },
                "&::-webkit-scrollbar-thumb": { background: "whiteAlpha.300", borderRadius: "4px" },
              }}
            >
              {historyLoading ? (
                <Spinner color="blue.400" />
              ) : historyError ? (
                <Text color="red.400">{historyError}</Text>
              ) : history.length > 0 ? (
                renderHistoryChart(history, backMaxRainVol, true)
              ) : (
                <Text color="gray.500">Selecione um período para ver o histórico.</Text>
              )}
            </Box>
          </Flex>

        </MotionBox>
      </Box>
    </Fade>
  );
};
