import React, { useMemo } from "react";
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
} from "@chakra-ui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { BsCloudRainFill } from "react-icons/bs";
import { MdWaterDrop } from "react-icons/md";
import { WiHot } from "react-icons/wi";
import { FaThermometerFull, FaThermometerQuarter } from "react-icons/fa";
import type { DailyForecast } from "../../types";
import { COLORS } from "../../colors/colors";

interface WeatherChartProps {
  data: DailyForecast[];
  isLoading?: boolean;
  error?: string | null;
}

export const WeatherChart: React.FC<WeatherChartProps> = ({
  data,
  isLoading,
  error,
}) => {
  const chartData = useMemo(() => data.slice(0, 14), [data]);

  if (isLoading) {
    return (
      <Flex
        h="500px"
        align="center"
        justify="center"
        bg="gray.800"
        borderRadius="xl"
      >
        <Spinner color="blue.400" />
      </Flex>
    );
  }

  if (error || chartData.length === 0) {
    return (
      <Flex
        h="500px"
        align="center"
        justify="center"
        bg="gray.800"
        borderRadius="xl"
      >
        <Text color="gray.500">Previsão indisponível no momento.</Text>
      </Flex>
    );
  }

  const maxRainVol = Math.max(...chartData.map((d) => d.precipSum)) + 5;

  const renderCustomXAxisTick = ({
    x,
    y,
    index,
  }: {
    x?: number;
    y?: number;
    index?: number;
  }) => {
    if (index === undefined || x === undefined || y === undefined) return null;

    const currentDay = chartData[index];
    if (!currentDay) return null;

    return (
      <g transform={`translate(${x},${y})`}>
        {currentDay.precipProb > 0 && (
          <foreignObject x={-30} y={0} width={60} height={40}>
            <Flex align="center" justify="center" h="100%">
              <VStack spacing={1} align="center">
                <HStack spacing={1}>
                  <Icon
                    as={MdWaterDrop}
                    boxSize={3.5}
                    color={COLORS.primaryDark}
                  />
                  <Text
                    fontSize={{ base: "10px", md: "12px" }}
                    fontWeight="bold"
                    color={COLORS.primaryDark}
                  >
                    {currentDay.precipProb}%
                  </Text>
                </HStack>

                <Text
                  fontSize={{ base: "10px", md: "12px" }}
                  fontWeight="medium"
                  color={COLORS.textPrimary}
                >
                  {Math.round(currentDay.precipSum)} mm
                </Text>
              </VStack>
            </Flex>
          </foreignObject>
        )}

        <text
          x={0}
          y={52}
          textAnchor="middle"
          fill="#A0AEC0"
          fontSize={12}
          fontWeight="bold"
        >
          {currentDay.dayName.charAt(0).toUpperCase() +
            currentDay.dayName.slice(1)}
        </text>

        <text x={0} y={70} textAnchor="middle" fill="#718096" fontSize={10}>
          {currentDay.dayNumber}
        </text>

        {currentDay.tempMin !== undefined &&
          currentDay.tempMax !== undefined && (
            <foreignObject x={-47} y={76} width={90} height={65}>
              <Flex
                align="center"
                justify="center"
                h="100%"
                direction="column"
                gap="4px"
              >
                <Flex align="center">
                  <Icon as={FaThermometerFull} boxSize={3} color="red.400" />
                  <Text fontSize="12px" color="gray.300" fontWeight="medium">
                    {Math.round(currentDay.tempMax)}°
                  </Text>
                </Flex>

                <Flex align="center">
                  <Icon
                    as={FaThermometerQuarter}
                    boxSize={3}
                    color="blue.300"
                  />
                  <Text fontSize="12px" color="gray.300" fontWeight="medium">
                    {Math.round(currentDay.tempMin)}°
                  </Text>
                </Flex>

                <Flex align="center">
                  <Icon as={WiHot} boxSize={5} color="orange.400" />
                  <Text
                    fontSize={{ base: "10px", md: "12px" }}
                    color={COLORS.textPrimary}
                    fontWeight="medium"
                  >
                    {currentDay.et0?.toFixed(1)}mm
                  </Text>
                </Flex>
              </Flex>
            </foreignObject>
          )}
      </g>
    );
  };

  return (
    <Fade in={true} transition={{ enter: { duration: 0.8 } }}>
      <Flex
        direction="column"
        w="100%"
        h="540px"
        bg={COLORS.surface}
        borderRadius="xl"
        p={4}
        boxShadow="md"
        border="1px solid"
        borderColor="whiteAlpha.100"
        mb={4}
      >
        <Flex
          justify="space-between"
          align="center"
          mb={4}
          wrap="wrap"
          gap={4}
          shrink={0}
        >
          <HStack spacing={3}>
            <Flex
              align="center"
              justify="center"
              w="38px"
              h="38px"
              bg="whiteAlpha.100"
              borderRadius="md"
            >
              <Icon as={BsCloudRainFill} color={COLORS.primary} boxSize={5} />
            </Flex>
            <VStack align="start" spacing={0}>
              <HStack>
                <Text
                  color="white"
                  fontWeight="bold"
                  fontSize="md"
                  noOfLines={1}
                >
                  Previsão de Chuva
                </Text>
              </HStack>
            </VStack>
          </HStack>

          <Stack
            direction={{ base: "column", md: "row" }}
            spacing={4}
            fontSize={{ base: "10px", md: "xs" }}
            gap={3}
            pl={{ base: 4, md: 0 }}
            flexWrap="wrap"
          >
            <HStack spacing={1.5}>
              <Box
                w="12px"
                h="12px"
                bgGradient="linear(to-t, #003764de, #0093fc)"
                borderRadius="sm"
              />
              <Text color="gray.300">Precipitação (mm)</Text>
            </HStack>

            <HStack spacing={1}>
              <Icon as={MdWaterDrop} boxSize={4} color={COLORS.primaryDark} />
              <Text color="gray.300">Probabilidade (%)</Text>
            </HStack>

            <HStack spacing={1.5}>
              <Icon as={WiHot} boxSize={4} color="orange.400" />
              <Text color="gray.300">Evapotranspiração (mm)</Text>
            </HStack>
          </Stack>
        </Flex>

        <Box
          flex="1"
          w="100%"
          overflowX="auto"
          overflowY="hidden"
          sx={{
            "&::-webkit-scrollbar": { height: "6px" },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              background: "whiteAlpha.300",
              borderRadius: "4px",
            },
          }}
        >
          {/* ADICIONADO: Mudança de md para lg e xl. Agora Tablets ganham o scroll horizontal em vez de espremer o conteúdo */}
          <Box minW={{ base: "1100px", xl: "100%" }} h="100%">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 15, left: 0, bottom: 145 }}
              >
                <defs>
                  <linearGradient
                    id="rainBarGradient"
                    x1="0"
                    y1="1"
                    x2="0"
                    y2="0"
                  >
                    <stop offset="0%" stopColor="#003764de" />
                    <stop offset="50%" stopColor="#0064b6e3" />
                    <stop offset="100%" stopColor="#0093fc" />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="dayName"
                  axisLine={false}
                  tickLine={false}
                  tick={renderCustomXAxisTick}
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

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#4A5568"
                  vertical={false}
                />

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
                      (typeof val === "number" || typeof val === "string") &&
                      Number(val) > 0
                        ? `${Math.round(Number(val))}mm`
                        : ""
                    }
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Flex>
    </Fade>
  );
};
