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

interface ProbeCardProps {
    point: MapPoint | null;
    onViewGraph: (id: number) => void;
    onClose: () => void;
    selectedDepthRef?: number | null;
    onSelectDepthRef?: (depth: number | null) => void;
}

export function ProbeCard({ point, onViewGraph, onClose, selectedDepthRef, onSelectDepthRef }: ProbeCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);

    // --- Helpers de Cor e Texto ---
    const getStatusLabel = (code: string) => {
        switch (code) {
            case 'status_critical': return 'Crítico';
            case 'status_ok': return 'Ideal';
            case 'status_saturated': return 'Saturado';
            case 'status_alert': return 'Atenção';
            default: return 'Offline';
        }
    };

    const getStatusColor = (code: string) => {
        switch (code) {
            case 'status_critical': return 'red.400';
            case 'status_ok': return 'green.400';
            case 'status_saturated': return 'cyan.400';
            case 'status_alert': return 'yellow.400';
            default: return 'gray.400';
        }
    };

    const getProgressColor = (value: number, point: MapPoint) => {
        const v1 = point.config_moisture_v1 ?? (point.config_min ? point.config_min - 10 : 30);
        const v2 = point.config_moisture_v2 ?? (point.config_min ?? 45);
        const v3 = point.config_moisture_v3 ?? (point.config_max ?? 60);

        if (value < v1) return 'red';
        if (value < v2) return 'yellow';
        if (value <= v3) return 'green';
        return 'blue';
    };

    // --- Dados da Sonda (Frente) ---
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
    }, [point]); 

    // --- Cálculo do Último Envio ---
    const lastCommunicationDate = useMemo(() => {
        if (!point || !point.readings || point.readings.length === 0) return null;
        
        // Pega a leitura mais recente
        const latestReading = [...point.readings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        
        if (!latestReading || !latestReading.timestamp) return null;

        const date = new Date(latestReading.timestamp);
        
        // Formata para o padrão ex: 14/05 14:22
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }, [point]);

    // --- Dados de Chuva com lógica interna (já que o arquivo foi deletado) ---
    const rainStats = useMemo(() => {
        const stats = { '1h': 0, '24h': 0, '7d': 0, '15d': 0, '30d': 0 };
        if (point && point.readings && point.readings.length > 0) {
            const now = new Date();
            const time1h = new Date(now.getTime() - 60 * 60 * 1000);
            const time24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const time7d = new Date(); time7d.setDate(now.getDate() - 7);
            const time15d = new Date(); time15d.setDate(now.getDate() - 15);
            const time30d = new Date(); time30d.setDate(now.getDate() - 30);

            point.readings.forEach(r => {
                if (r.rain_cm && r.timestamp) {
                    const rDate = new Date(r.timestamp);
                    const val = Number(r.rain_cm);
                    if (rDate >= time1h) stats['1h'] += val;
                    if (rDate >= time24h) stats['24h'] += val;
                    if (rDate >= time7d) stats['7d'] += val;
                    if (rDate >= time15d) stats['15d'] += val;
                    if (rDate >= time30d) stats['30d'] += val;
                }
            });
        }
        return stats;
    }, [point]);

    // --- Proteção contra renderização sem dados ---
    if (!point) return null;

    return (
        <Box
            w="290px"
            h="350px"
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
                        title={`${point.name}`}
                        statusColor={getStatusColor(point.statusCode)}
                        statusLabel={getStatusLabel(point.statusCode)}
                        lastCommunication={lastCommunicationDate}
                        onClose={onClose}
                    />

                    <VStack align="stretch" spacing={2} my={2} flex="1">
                        {profileData.length > 0 ? profileData.map((r) => {
                            const isSelected = selectedDepthRef === r.depth_cm;

                            return (
                                <Box
                                    key={r.depth_cm}
                                    onClick={() => onSelectDepthRef && onSelectDepthRef(isSelected ? null : r.depth_cm)}
                                    cursor="pointer"
                                    bg={isSelected ? "whiteAlpha.300" : "transparent"}
                                    p={1.5}
                                    borderRadius="md"
                                    border={isSelected ? "1px solid" : "1px solid transparent"}
                                    borderColor="blue.400"
                                    transition="all 0.2s"
                                    _hover={{ bg: "whiteAlpha.200" }}
                                >
                                    <HStack spacing={2}>
                                        <Text fontSize="xs" color={isSelected ? "blue.200" : "gray.400"} w="35px" fontWeight="medium">
                                            {r.depth_cm}cm
                                        </Text>
                                        <Box flex="1">
                                            <Progress
                                                value={r.moisture_pct || 0}
                                                size="xs"
                                                borderRadius="full"
                                                colorScheme={getProgressColor(r.moisture_pct || 0, point)}
                                                bg="whiteAlpha.200"
                                            />
                                        </Box>
                                        <Text fontSize="xs" color={isSelected ? "white" : "gray.300"} textAlign="right">
                                            {r.moisture_pct?.toFixed(1)}%
                                        </Text>
                                    </HStack>
                                </Box>
                            );
                        }) : (
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

                    <Grid templateColumns="repeat(2, 1fr)" gap={4} flex="1" alignContent="start">
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
    lastCommunication?: string | null;
    onClose: () => void;
}

const Header = ({ title, statusColor, statusLabel, lastCommunication, onClose }: HeaderProps) => (
    <HStack justify="space-between" align="start">
        <VStack align="start" spacing={1.5} mb={1}>
            <Text fontWeight="bold" fontSize="md" color="white" lineHeight="1">{title}</Text>
            
            <HStack spacing={2} align="center">
                <Badge colorScheme={statusColor.split('.')[0]} fontSize="0.6em" variant="solid">
                    {statusLabel}
                </Badge>
                
                {lastCommunication && (
                    <HStack spacing={1} color="gray.400">
                        <Icon as={MdAccessTime} boxSize={3.5} />
                        <Text fontSize="xs" fontWeight="medium">{lastCommunication}</Text>
                    </HStack>
                )}
            </HStack>
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
        h="100%"
        minH="70px"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        bg={isHighlight ? "cyan.900" : "whiteAlpha.100"}
        p={2}
        borderRadius="md"
        textAlign="center"
        border="1px solid"
        borderColor={isHighlight ? "cyan.700" : "transparent"}
    >
        <Text fontSize={{ base: "sm" }} color="gray.400">{label}</Text>
        <Text fontWeight="bold" fontSize={{ base: "sm", md: "lg" }} color={isHighlight ? "cyan.200" : "white"}>
            {value?.toFixed(1) || '0.0'} <Text as="span" fontSize="xs" color="gray.500">mm</Text>
        </Text>
    </Box>
);