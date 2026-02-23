import { useState, useMemo } from 'react';
import {
    Box,
    Text,
    Button,
    VStack,
    HStack,
    Progress,
    CloseButton,
    Grid,
    GridItem,
    Icon,
    Divider,
    Badge,
    Flex
} from '@chakra-ui/react';
import {
    MdShowChart,
    MdWaterDrop,
    MdArrowBack,
    MdAccessTime
} from 'react-icons/md';
import type { MapPoint } from '../SatelliteMap/SatelliteMap';
import type { Measurement } from '../../types';
import { calculateRainStats } from '../../utils/rainUtils';

interface ProbeCardProps {
    point: MapPoint | null; // Permitir null para evitar erros de tipagem na checagem
    onViewGraph: (id: number) => void;
    onClose: () => void;
}

export function ProbeCard({ point, onViewGraph, onClose }: ProbeCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);

    // --- Helpers de Cor e Texto ---
    const getStatusLabel = (code: string) => {
        switch (code) {
            case 'status_critical': return 'Crítico';
            case 'status_ok': return 'Ideal';
            case 'status_saturated': return 'Saturado';
            default: return 'Offline';
        }
    };

    const getStatusColor = (code: string) => {
        switch (code) {
            case 'status_critical': return 'red.400';
            case 'status_ok': return 'green.400';
            case 'status_saturated': return 'cyan.400';
            default: return 'gray.400';
        }
    };

    const getProgressColor = (value: number, min: number = 45, max: number = 55) => {
        if (value < min) return 'red';
        if (value > max) return 'cyan';
        return 'green';
    };

    // --- Dados da Sonda (Frente) ---
    // Hook chamado INCONDICIONALMENTE (antes de qualquer return)
    const profileData = useMemo(() => {
        if (!point || !point.readings) return [];
        const uniqueDepths = new Map<number, Measurement>();
        const sorted = [...point.readings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        sorted.forEach(reading => {
            if (reading.moisture_pct !== null && !uniqueDepths.has(reading.depth_cm)) {
                uniqueDepths.set(reading.depth_cm, reading);
            }
        });
        return Array.from(uniqueDepths.values()).sort((a, b) => a.depth_cm - b.depth_cm);
    }, [point]); // Dependência segura

    // --- Dados de Chuva (Verso) ---
    // Hook chamado INCONDICIONALMENTE
    // const rainStats = useMemo(() => {
    //     const stats = { '1h': 0, '24h': 0, '7d': 0, '15d': 0, '30d': 0 };
    //     if (point && point.readings && point.readings.length > 0) {
    //         const now = new Date();
    //         const time1h = new Date(now.getTime() - 60 * 60 * 1000);
    //         const time24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    //         const time7d = new Date(); time7d.setDate(now.getDate() - 7);
    //         const time15d = new Date(); time15d.setDate(now.getDate() - 15);
    //         const time30d = new Date(); time30d.setDate(now.getDate() - 30);

    //         point.readings.forEach(r => {
    //             if (r.rain_cm && r.timestamp) {
    //                 const rDate = new Date(r.timestamp);
    //                 const val = Number(r.rain_cm);
    //                 if (rDate >= time1h) stats['1h'] += val;
    //                 if (rDate >= time24h) stats['24h'] += val;
    //                 if (rDate >= time7d) stats['7d'] += val;
    //                 if (rDate >= time15d) stats['15d'] += val;
    //                 if (rDate >= time30d) stats['30d'] += val;
    //             }
    //         });
    //     }
    //     return stats;
    // }, [point]); // Dependência segura

    const rainStats = useMemo(() => {
        return point?.readings ? calculateRainStats(point.readings) : {
            '1h': 0, '24h': 0, '7d': 0, '15d': 0, '30d': 0
        };
    }, [point]);

    // --- Proteção contra renderização sem dados ---
    // Agora o return null acontece DEPOIS de todos os hooks
    if (!point) return null;

    return (
        <Box
            w="280px"
            h="auto"
            minH="260px"
            sx={{ perspective: '1000px' }}
        >
            <Box
                position="relative"
                w="100%"
                h="100%"
                transition="transform 0.6s"
                sx={{ transformStyle: 'preserve-3d' }}
                transform={isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}
            >
                {/* === FRENTE DO CARD (Sonda) === */}
                <CardFace>
                    <Header
                        title={`Sonda - ${point.esn}`}
                        statusColor={getStatusColor(point.statusCode)}
                        statusLabel={getStatusLabel(point.statusCode)}
                        onClose={onClose}
                    />

                    <VStack align="stretch" spacing={2} my={2} flex="1">
                        {profileData.length > 0 ? profileData.map((r) => (
                            <HStack key={r.depth_cm} spacing={2}>
                                <Text fontSize="xs" color="gray.400" w="35px" fontWeight="medium">
                                    {r.depth_cm}cm
                                </Text>
                                <Box flex="1">
                                    <Progress
                                        value={r.moisture_pct || 0}
                                        size="xs"
                                        borderRadius="full"
                                        colorScheme={getProgressColor(r.moisture_pct || 0, point.config_min, point.config_max)}
                                        bg="whiteAlpha.200"
                                    />
                                </Box>
                                <Text fontSize="xs" color="gray.300" w="30px" textAlign="right">
                                    {r.moisture_pct?.toFixed(0)}%
                                </Text>
                            </HStack>
                        )) : (
                            <Flex flex="1" align="center" justify="center">
                                <Text color="gray.500" fontSize="sm">Sem leituras recentes.</Text>
                            </Flex>
                        )}
                    </VStack>

                    <HStack mt="auto" spacing={2} pt={2}>
                        <Button
                            size="xs"
                            variant="outline"
                            colorScheme="cyan"
                            leftIcon={<MdWaterDrop />}
                            onClick={() => setIsFlipped(true)}
                            flex={1}
                        >
                            CHUVA
                        </Button>
                        <Button
                            size="xs"
                            colorScheme="blue"
                            rightIcon={<MdShowChart />}
                            onClick={() => onViewGraph(point.id)}
                            flex={1}
                        >
                            GRÁFICO
                        </Button>
                    </HStack>
                </CardFace>

                {/* === VERSO DO CARD (Chuva) === */}
                <CardFace isBack>
                    <HStack justify="space-between" mb={2}>
                        <HStack color="cyan.300">
                            <Icon as={MdWaterDrop} />
                            <Text fontWeight="bold" fontSize="md">Pluviometria</Text>
                        </HStack>
                        <Button
                            size="xs"
                            variant="ghost"
                            colorScheme="whiteAlpha"
                            onClick={() => setIsFlipped(false)}
                            leftIcon={<MdArrowBack />}
                        >
                            Voltar
                        </Button>
                    </HStack>

                    <Divider borderColor="whiteAlpha.300" mb={3} />

                    <Grid templateColumns="repeat(2, 1fr)" gap={2} mb={3}>
                        <RainBox label="1 Hora" value={rainStats['1h']} />
                        <RainBox label="24 Horas" value={rainStats['24h']} isHighlight />
                        <RainBox label="7 Dias" value={rainStats['7d']} />
                        <RainBox label="15 Dias" value={rainStats['15d']} />
                        <GridItem colSpan={2}>
                            <RainBox label="30 Dias" value={rainStats['30d']} />
                        </GridItem>
                    </Grid>

                    <HStack justify="center" mt="auto" color="gray.500" spacing={1}>
                        <Icon as={MdAccessTime} boxSize={3} />
                        <Text fontSize="2xs">Calculado das leituras da sonda</Text>
                    </HStack>
                </CardFace>
            </Box>
        </Box>
    );
}

// --- Componentes Internos e Interfaces ---

interface CardFaceProps {
    children: React.ReactNode;
    isBack?: boolean;
}

const CardFace = ({ children, isBack = false }: CardFaceProps) => (
    <Flex
        direction="column"
        position="absolute"
        w="100%"
        h="100%"
        bg="gray.800"
        borderRadius="xl"
        boxShadow="2xl"
        p={4}
        borderColor="whiteAlpha.200"
        sx={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: isBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
            zIndex: isBack ? 0 : 1,
        }}
    >
        {children}
    </Flex>
);

interface HeaderProps {
    title: string;
    statusColor: string;
    statusLabel: string;
    onClose: () => void;
}

const Header = ({ title, statusColor, statusLabel, onClose }: HeaderProps) => (
    <HStack justify="space-between" align="start">
        <VStack align="start" spacing={0}>
            <Text fontWeight="bold" fontSize="md" color="white">{title}</Text>
            <Badge colorScheme={statusColor.split('.')[0]} fontSize="0.6em" variant="solid">
                {statusLabel}
            </Badge>
        </VStack>
        <CloseButton size="sm" color="gray.400" onClick={onClose} _hover={{ color: "white" }} />
    </HStack>
);

interface RainBoxProps {
    label: string;
    value: number;
    isHighlight?: boolean;
}

const RainBox = ({ label, value, isHighlight }: RainBoxProps) => (
    <Box
        bg={isHighlight ? "cyan.900" : "whiteAlpha.100"}
        p={2}
        borderRadius="md"
        textAlign="center"
        border="1px solid"
        borderColor={isHighlight ? "cyan.700" : "transparent"}
    >
        <Text fontSize="2xs" color="gray.400">{label}</Text>
        <Text fontWeight="bold" fontSize="md" color={isHighlight ? "cyan.200" : "white"}>
            {value?.toFixed(1) || '0.0'} <Text as="span" fontSize="xs" color="gray.500">mm</Text>
        </Text>
    </Box>
);