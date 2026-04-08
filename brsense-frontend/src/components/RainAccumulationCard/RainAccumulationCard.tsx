import { useState, useMemo } from 'react';
import {
    Box,
    Flex,
    Text,
    HStack,
    VStack,
    Button,
    Icon,
    Skeleton,
    Tooltip
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdWaterDrop, MdCalendarToday, MdInfoOutline } from 'react-icons/md';
import { COLORS } from '../../colors/colors';

export type RainPeriod = '1h' | '24h' | '7d' | '15d' | '30d';

export interface RainReadingData {
    timestamp: string;
    rain_cm?: number | null;
}

interface RainAccumulationCardProps {
    readings: RainReadingData[];
    statusCode?: string;
    isLoading?: boolean;
    cardTitle?: string;
}

// COMPONENTE DE BOTÃO DE FILTRO
const FilterButton = ({
    label,
    value,
    currentPeriod,
    onSelect
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
        variant={currentPeriod === value ? 'solid' : 'ghost'}
        bg={currentPeriod === value ? COLORS.primaryDark : 'transparent'}
        color={currentPeriod === value ? 'white' : COLORS.primary}
        onClick={() => onSelect(value)}
        _hover={{ bg: currentPeriod === value ? COLORS.primaryDark : 'white' }}
        borderRadius="md"
        px={2}
    >
        {label}
    </Button>
);

export function RainAccumulationCard({
    readings = [],
    isLoading = false,
    cardTitle = "Chuva Acumulada"
}: RainAccumulationCardProps) {
    const [period, setPeriod] = useState<RainPeriod>('30d');

    const { totalRain, lastRainDate, lastRainVolume } = useMemo(() => {
        if (!readings || readings.length === 0) {
            return { totalRain: 0, lastRainDate: null, lastRainVolume: 0 };
        }

        const now = new Date().getTime();

        // 1. Mapeamos cada período para o seu respectivo valor em milissegundos
        const periodOffsets: Record<RainPeriod, number> = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '15d': 15 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
        };

        // 2. Calculamos o startTime pegando o desconto diretamente do objeto
        const startTime = now - periodOffsets[period];

        // 3. Fazemos o filtro uma única vez para todos os casos
        const filteredReadings = readings.filter(
            r => new Date(r.timestamp).getTime() >= startTime
        );

        let accRain = 0;
        let latestRainEvent: RainReadingData | null = null;
        let latestRainTime = 0;
        const processedTimestamps = new Set<string>();

        filteredReadings.forEach(reading => {
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
            lastRainDate: finalEvent?.timestamp ? new Date(finalEvent.timestamp) : null,
            lastRainVolume: finalEvent?.rain_cm ? Number(finalEvent.rain_cm) : 0
        };
    }, [readings, period]);

    return (
        <Box
            bg={COLORS.surface}
            borderRadius="xl"
            border="1px solid"
            borderColor="whiteAlpha.200"
            p={5}
            boxShadow="md"
            w="100%"
            mb="20px"
        >
            <Flex justify="space-between" align={{ base: "flex-start", lg: "center" }} direction={{ base: "column", lg: "row" }} mb={5} gap={4}>
                <HStack spacing={3}>
                    <Flex align="center" justify="center" w="38px" h="38px" bg="whiteAlpha.100" borderRadius="md">
                        <Icon as={MdWaterDrop} color={COLORS.primary} boxSize={5} />
                    </Flex>
                    <VStack align="start" spacing={0}>
                        <HStack>
                            <Text color="white" fontWeight="bold" fontSize="md" noOfLines={1}>
                                {cardTitle}
                            </Text>
                        </HStack>
                        <Text color="gray.400" fontSize="xs">Acumulado do período</Text>
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
                    sx={{
                        '&::-webkit-scrollbar': { display: 'none' },
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none'
                    }}
                >
                    <FilterButton label="1 Hora" value="1h" currentPeriod={period} onSelect={setPeriod} />
                    <FilterButton label="24 Horas" value="24h" currentPeriod={period} onSelect={setPeriod} />
                    <FilterButton label="7 Dias" value="7d" currentPeriod={period} onSelect={setPeriod} />
                    <FilterButton label="15 Dias" value="15d" currentPeriod={period} onSelect={setPeriod} />
                    <FilterButton label="30 Dias" value="30d" currentPeriod={period} onSelect={setPeriod} />
                </Flex>
            </Flex>

            <VStack align="start" spacing={1}>
                {isLoading ? (
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
                                <Text fontSize="4xl" fontWeight="black" color={COLORS.primary} lineHeight="1">
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
                    {isLoading ? (
                        <Skeleton height="16px" width="180px" startColor="gray.700" endColor="gray.600" mt={2} />
                    ) : lastRainDate ? (
                        <HStack spacing={1.5} color="gray.400">
                            <Icon as={MdCalendarToday} boxSize={3.5} />
                            <Text fontSize="xs">Última chuva:</Text>
                            <Tooltip label={`${lastRainVolume.toFixed(1)} mm registrados`} hasArrow placement="top" bg="gray.700">
                                <HStack cursor="help" spacing={1}>
                                    <Text fontSize="xs" color="white" fontWeight="medium">
                                        {lastRainDate.toLocaleDateString('pt-BR', {
                                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </Text>
                                    <Icon as={MdInfoOutline} boxSize={3.5} color={COLORS.primary} />
                                </HStack>
                            </Tooltip>
                        </HStack>
                    ) : (
                        <HStack spacing={1.5} color="gray.500">
                            <Icon as={MdCalendarToday} boxSize={3.5} />
                            <Text fontSize="xs">Sem registo de chuva</Text>
                        </HStack>
                    )}
                </Box>
            </VStack>
        </Box>
    );
}