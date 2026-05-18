import { useState } from 'react';
import type { ElementType } from 'react';
import {
    Box, Text, Button, VStack, HStack, Progress, CloseButton,
    Grid, GridItem, Icon, Divider, Badge, Flex
} from '@chakra-ui/react';
import {
    MdShowChart, MdWaterDrop, MdAccessTime, MdCloud
} from 'react-icons/md';
import { GiGroundSprout } from "react-icons/gi";
import type { MapPoint } from '../SatelliteMap/SatelliteMap';
import { COLORS } from '../../colors/colors';
import { useProbeStats } from '../../hooks/useProbeStats';
import { ForecastTab } from '../ForecastTab/ForecastTab';

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

interface ProbeCardProps {
    point: MapPoint | null;
    onViewGraph: (id: number) => void;
    onClose: () => void;
    selectedDepthRef?: number | null;
    onSelectDepthRef?: (depth: number | null) => void;
}

export function ProbeCard({ point, onViewGraph, onClose, selectedDepthRef, onSelectDepthRef }: ProbeCardProps) {
    const [activeTab, setActiveTab] = useState<'grafico' | 'pluviometria' | 'previsao'>('grafico');
    const [rotation, setRotation] = useState(0);
    const [frontContent, setFrontContent] = useState<'grafico' | 'pluviometria' | 'previsao'>('grafico');
    const [backContent, setBackContent] = useState<'grafico' | 'pluviometria' | 'previsao'>('pluviometria');

    const { profileData, lastCommunicationDate, rainStats } = useProbeStats(point);

    const handleTabChange = (tab: 'grafico' | 'pluviometria' | 'previsao') => {
        if (tab === activeTab) return;

        const isFrontVisible = rotation % 360 === 0;

        if (isFrontVisible) {
            setBackContent(tab);
        } else {
            setFrontContent(tab);
        }

        setRotation(prev => prev + 180);
        setActiveTab(tab);
    };

    const renderTabContent = (tab: 'grafico' | 'pluviometria' | 'previsao') => {
        if (!point) return null;

        if (tab === 'grafico') {
            return (
                <VStack align="stretch" spacing={2} flex="1" overflowY="auto">
                    {profileData.length > 0 ? profileData.map((r) => {
                        const isSelected = selectedDepthRef === r.depth_cm;
                        return (
                            <Box
                                key={r.depth_cm}
                                onClick={() => onSelectDepthRef && onSelectDepthRef(isSelected ? null : r.depth_cm)}
                                cursor="pointer"
                                bg={isSelected ? "blue.700" : "transparent"}
                                p={1.5}
                                borderRadius="md"
                                border={isSelected ? "1px solid" : "1px solid transparent"}
                                borderColor={isSelected ? "blue.400" : "transparent"}
                                transition="all 0.2s"
                                _hover={{ bg: isSelected ? "blue.600" : "whiteAlpha.200" }}
                            >
                                <HStack spacing={2}>
                                    <Text fontSize="xs" color={isSelected ? "blue.100" : "gray.400"} w="35px" fontWeight="medium">
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

                    <Button
                        size="sm"
                        color={COLORS.primaryDark}
                        variant="ghost"
                        rightIcon={<MdShowChart />}
                        onClick={() => onViewGraph(point.id)}
                    >
                        Ver Gráfico Completo
                    </Button>
                </VStack>
            );
        }

        if (tab === 'pluviometria') {
            return (
                <Flex direction="column" h="100%" mt="25px">
                    <Grid templateColumns="repeat(2, 1fr)" gap={3} flex="1" alignContent="start">
                        <RainBox label="1 Hora" value={rainStats['1h']} />
                        <RainBox label="24 Horas" value={rainStats['24h']} isHighlight />
                        <RainBox label="7 Dias" value={rainStats['7d']} />
                        <RainBox label="15 Dias" value={rainStats['15d']} />
                        <GridItem colSpan={2}>
                            <RainBox label="30 Dias" value={rainStats['30d']} />
                        </GridItem>
                    </Grid>
                </Flex>
            );
        }

        if (tab === 'previsao') {
            return <ForecastTab lat={point.lat} lng={point.lng} />
            //return <Text color="gray.500" fontSize="sm">Sem previsão ainda</Text>;
        }

        return null;
    };

    if (!point) return null;

    return (
        <Box
            w={{ base: "85vw", sm: "340px" }}
            maxW="400px"
            mx="auto"
            minH="420px"
            bg="gray.800"
            borderRadius="xl"
            boxShadow="2xl"
            p={4}
            borderColor="whiteAlpha.200"
            borderWidth="1px"
            display="flex"
            flexDirection="column"
        >
            <Header
                title={`${point.name}`}
                statusColor={getStatusColor(point.statusCode)}
                statusLabel={getStatusLabel(point.statusCode)}
                lastCommunication={lastCommunicationDate}
                onClose={onClose}
            />

            <Divider borderColor="whiteAlpha.300" my={3} />

            <Box flex="1" position="relative" sx={{ perspective: '1000px' }}>
                <Box
                    position="absolute"
                    w="100%"
                    h="100%"
                    transition="transform 0.6s"
                    sx={{ transformStyle: 'preserve-3d' }}
                    transform={`rotateY(${rotation}deg)`}
                >
                    <Box
                        position="absolute"
                        w="100%"
                        h="100%"
                        sx={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                        display="flex"
                        flexDirection="column"
                    >
                        {renderTabContent(frontContent)}
                    </Box>

                    <Box
                        position="absolute"
                        w="100%"
                        h="100%"
                        sx={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)'
                        }}
                        display="flex"
                        flexDirection="column"
                    >
                        {renderTabContent(backContent)}
                    </Box>
                </Box>
            </Box>

            <HStack mt={3} pt={3} borderTop="1px solid" borderColor="whiteAlpha.200" spacing={2} w="100%">
                <TabButton
                    label="Umidade"
                    icon={GiGroundSprout}
                    isActive={activeTab === 'grafico'}
                    onClick={() => handleTabChange('grafico')}
                />
                <TabButton
                    label="Pluviometria"
                    icon={MdWaterDrop}
                    isActive={activeTab === 'pluviometria'}
                    onClick={() => handleTabChange('pluviometria')}
                />
                <TabButton
                    label="Previsão"
                    icon={MdCloud}
                    isActive={activeTab === 'previsao'}
                    onClick={() => handleTabChange('previsao')}
                />
            </HStack>
        </Box>
    );
}

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

interface TabButtonProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
    icon?: ElementType;
}

const TabButton = ({ label, isActive, onClick, icon }: TabButtonProps) => (
    <Button
        size="xs"
        flex={1}
        color="gray.300"
        bg={isActive ? COLORS.primaryDark : 'transparent'}
        borderColor={isActive ? 'transparent' : 'whiteAlpha.400'}
        variant={isActive ? 'solid' : 'outline'}
        _hover={{ bg: isActive ? COLORS.primaryDark : 'whiteAlpha.200' }}
        onClick={onClick}
        leftIcon={icon ? <Icon as={icon} boxSize={3.5} /> : undefined}
        px={1}
        fontSize={{ base: "10px", sm: "11px" }}
    >
        {label}
    </Button>
);

interface RainBoxProps {
    label: string;
    value: number;
    isHighlight?: boolean;
}

const RainBox = ({ label, value, isHighlight }: RainBoxProps) => (
    <Box
        h="100%"
        minH="65px"
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
        <Text fontSize={{ base: "xs" }} color="gray.400">{label}</Text>
        <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }} color={isHighlight ? "cyan.200" : "gray.200"}>
            {value?.toFixed(1) || '0.0'} <Text as="span" fontSize="xs" color="gray.500">mm</Text>
        </Text>
    </Box>
);