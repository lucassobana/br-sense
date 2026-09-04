import { useState, useMemo, useEffect, useRef } from "react";
import {
  Box,
  Flex,
  Text,
  HStack,
  VStack,
  Button,
  Icon,
  Skeleton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  FormControl,
  FormLabel,
  Input,
  useDisclosure
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { MdWaterDrop, MdCalendarToday, MdDateRange } from "react-icons/md";
import { COLORS } from "../../colors/colors";
import { getDeviceHistory } from "../../services/api";

export type RainPeriod = "1h" | "24h" | "7d" | "15d" | "30d" | "Personalizado";

export interface RainReadingData {
  timestamp: string;
  rain_cm?: number | null;
}

interface RainAccumulationCardProps {
  readings?: RainReadingData[];
  statusCode?: string;
  isLoading?: boolean;
  cardTitle?: string;
  esn?: string;
}

const FilterButton = ({
  label,
  value,
  currentPeriod,
  onSelect,
}: {
  label: string;
  value: RainPeriod;
  currentPeriod: RainPeriod;
  onSelect: (val: RainPeriod) => void;
}) => (
  <Button
    size="xs"
    height="26px"
    fontSize="11px"
    variant={currentPeriod === value ? "solid" : "ghost"}
    bg={currentPeriod === value ? COLORS.primaryDark : "transparent"}
    color={currentPeriod === value ? "white" : COLORS.primary}
    onClick={() => onSelect(value)}
    _hover={{ bg: currentPeriod === value ? COLORS.primaryDark : "white" }}
    borderRadius="md"
    px={2}
    flexShrink={0}
  >
    {label}
  </Button>
);

export function RainAccumulationCard({
  readings: initialReadings = [],
  isLoading: externalIsLoading = false,
  cardTitle = "Chuva Acumulada",
  esn,
}: RainAccumulationCardProps) {
  const [period, setPeriod] = useState<RainPeriod>("30d");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const endDateRef = useRef<HTMLInputElement>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');

  const [fetchedReadings, setFetchedReadings] = useState<RainReadingData[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!esn) return;

    const fetchRainData = async () => {
      setIsFetching(true);
      try {
        let finalStart: string | undefined;
        let finalEnd: string | undefined;

        if (period === "Personalizado" && startDate && endDate) {
          const startObj = new Date(startDate);
          startObj.setHours(0, 0, 0, 0);
          finalStart = startObj.toISOString();

          const endObj = new Date(endDate);
          endObj.setHours(23, 59, 59, 999);
          finalEnd = endObj.toISOString();
        } else if (period !== "Personalizado") {
          const now = new Date();
          const target = new Date(now);
          switch (period) {
            case "1h": target.setHours(now.getHours() - 1); break;
            case "24h": target.setHours(now.getHours() - 24); break;
            case "7d": target.setDate(now.getDate() - 7); break;
            case "15d": target.setDate(now.getDate() - 15); break;
            case "30d": target.setDate(now.getDate() - 30); break;
          }
          finalStart = target.toISOString();
          finalEnd = now.toISOString();
        } else {
           setIsFetching(false);
           return;
        }

        const history = await getDeviceHistory(esn, {
          start_date: finalStart,
          end_date: finalEnd,
          limit: 500000,
        });

        setFetchedReadings(history.map(r => ({ timestamp: r.timestamp, rain_cm: r.rain_cm })));
      } catch (error) {
        console.error("Erro ao carregar dados de chuva", error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchRainData();
  }, [esn, period, startDate, endDate]);

  const activeReadings = esn ? fetchedReadings : initialReadings;
  const showLoading = esn ? isFetching : externalIsLoading;

  const handleApplyFilters = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setPeriod("Personalizado");
    onClose();
  };

  const { totalRain, lastRainDate } = useMemo(() => {
    if (!activeReadings || activeReadings.length === 0) {
      return { totalRain: 0, lastRainDate: null, lastRainVolume: 0 };
    }

    let filteredReadings = activeReadings;

    if (period === "Personalizado" && startDate && endDate) {
      const startObj = new Date(startDate);
      startObj.setHours(0, 0, 0, 0);

      const endObj = new Date(endDate);
      endObj.setHours(23, 59, 59, 999);

      const sTime = startObj.getTime();
      const eTime = endObj.getTime();

      filteredReadings = activeReadings.filter(r => {
        const t = new Date(r.timestamp).getTime();
        return t >= sTime && t <= eTime;
      });

    } else if (period !== "Personalizado") {
      const now = new Date().getTime();
      const periodOffsets: Record<Exclude<RainPeriod, "Personalizado">, number> = {
        "1h": 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "15d": 15 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
      };

      const startTime = now - periodOffsets[period as Exclude<RainPeriod, "Personalizado">];

      filteredReadings = activeReadings.filter(
        (r) => new Date(r.timestamp).getTime() >= startTime,
      );
    }

    let accRain = 0;
    let latestRainEvent: RainReadingData | null = null;
    let latestRainTime = 0;
    const processedTimestamps = new Set<string>();

    filteredReadings.forEach((reading) => {
      if (reading.rain_cm && reading.rain_cm > 0) {
        if (!processedTimestamps.has(reading.timestamp)) {
          accRain += Number(reading.rain_cm);
          processedTimestamps.add(reading.timestamp);
        }

        const tTime = new Date(reading.timestamp).getTime();
        if (tTime > latestRainTime) {
          latestRainTime = tTime;
          latestRainEvent = reading;
        }
      }
    });

    const finalEvent = latestRainEvent as RainReadingData | null;

    return {
      totalRain: accRain,
      lastRainDate: finalEvent?.timestamp
        ? new Date(finalEvent.timestamp)
        : null,
    };
  }, [activeReadings, period, startDate, endDate]);

  return (
    <Box
      bg={COLORS.surface}
      borderRadius="xl"
      border="1px solid"
      borderColor="whiteAlpha.200"
      p={{ base: 3, md: 5 }}
      boxShadow="md"
      w="100%"
      mb="20px"
    >
      <Flex
        justify="space-between"
        align={{ base: "flex-start", lg: "center" }}
        direction={{ base: "column", lg: "row" }}
        mb={5}
        gap={4}
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
            <Icon as={MdWaterDrop} color={COLORS.primary} boxSize={5} />
          </Flex>
          <VStack align="start" spacing={0}>
            <HStack>
              <Text color="white" fontWeight="bold" fontSize={{ base: "sm", md: "md" }} noOfLines={1}>
                {cardTitle}
              </Text>
            </HStack>
            <Text color="gray.400" fontSize="xs">
              {period === "Personalizado" && startDate && endDate 
                ? `${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`
                : "Acumulado do período"
              }
            </Text>
          </VStack>
        </HStack>

        <Flex
          bg={COLORS.background}
          p={1}
          borderRadius="md"
          gap={1}
          border="1px solid"
          borderColor="whiteAlpha.100"
          w={{ base: "100%", lg: "auto" }}
          overflowX="auto"
          align="center"
          sx={{
            "&::-webkit-scrollbar": { display: "none" },
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          <FilterButton label="1 Hora" value="1h" currentPeriod={period} onSelect={setPeriod} />
          <FilterButton label="24 Horas" value="24h" currentPeriod={period} onSelect={setPeriod} />
          <FilterButton label="7 Dias" value="7d" currentPeriod={period} onSelect={setPeriod} />
          <FilterButton label="15 Dias" value="15d" currentPeriod={period} onSelect={setPeriod} />
          <FilterButton label="30 Dias" value="30d" currentPeriod={period} onSelect={setPeriod} />

          <Popover placement="bottom-end" isLazy isOpen={isOpen} onOpen={onOpen} onClose={onClose} closeOnBlur={false}>
            <PopoverTrigger>
              <Button 
                size="xs" 
                height="26px"
                variant={period === "Personalizado" ? "solid" : "ghost"}
                colorScheme="blue"
                bg={period === "Personalizado" ? COLORS.primaryDark : "transparent"}
                color={period === "Personalizado" ? "white" : COLORS.primary}
                px={2}
                flexShrink={0}
                _hover={{ bg: period === "Personalizado" ? COLORS.primaryDark : "whiteAlpha.200" }}
              >
                <Icon as={MdDateRange} />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              bg="gray.800" 
              borderColor="gray.600" 
              p={3} 
              w={{ base: "280px", md: "auto" }}
              maxW="95vw"
              boxShadow="xl" 
              zIndex={2000}
            >
              <PopoverArrow bg="gray.800" />
              <PopoverBody>
                <VStack spacing={3} align="stretch">
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.400" mb={1}>Data Inicial</FormLabel>
                    <Input 
                        size="xs" 
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
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.400" mb={1}>Data Final</FormLabel>
                    <Input 
                        ref={endDateRef}
                        size="xs" 
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

      <VStack align="start" spacing={1}>
        {showLoading ? (
          <Skeleton height="40px" width="120px" startColor="gray.700" endColor="gray.600" />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${period}-${totalRain}`}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 5 }}
              transition={{ duration: 0.2 }}
            >
              <HStack align="baseline" spacing={1.5}>
                <Text fontSize={{ base: "3xl", md: "4xl" }} fontWeight="black" color={COLORS.primary} lineHeight="1">
                  {totalRain.toFixed(1)}
                </Text>
                <Text fontSize="md" fontWeight="bold" color={COLORS.primary}>
                  mm
                </Text>
              </HStack>
            </motion.div>
          </AnimatePresence>
        )}

        <Box mt={1}>
          {showLoading ? (
            <Skeleton height="16px" width="180px" startColor="gray.700" endColor="gray.600" mt={2} />
          ) : lastRainDate ? (
            <HStack spacing={1.5} color="gray.400">
              <Icon as={MdCalendarToday} boxSize={3.5} />
              <Text fontSize="xs">Última chuva:</Text>
              <HStack spacing={1}>
                <Text fontSize="xs" color="white" fontWeight="medium">
                  {new Date(
                    lastRainDate.getTime() - 3 * 60 * 60 * 1000,
                  ).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </HStack>
            </HStack>
          ) : (
            <HStack spacing={1.5} color="gray.500">
              <Icon as={MdCalendarToday} boxSize={3.5} />
              <Text fontSize="xs">Sem registo de chuva no período</Text>
            </HStack>
          )}
        </Box>
      </VStack>
    </Box>
  );
}