import React, { useMemo } from 'react';
import { Box, Text, Button, VStack, HStack, IconButton, Divider, Badge } from '@chakra-ui/react';
import { MdClose, MdShowChart, MdSensors, MdWaterDrop, MdThermostat } from 'react-icons/md';
import type { Measurement } from '../../types';

// Interface flexível para aceitar tanto Probe quanto MapPoint
interface PopupData {
    esn: string;
    name?: string;
    status?: string;     // Vindo da lista de probes
    statusCode?: string; // Vindo do mapa (MapPoint)
    last_communication?: string;
    readings?: Measurement[];
}

interface FarmMapPopupProps {
    point?: PopupData;
    probe?: PopupData;
    onClose: () => void;
    onViewGraph: () => void;
    position?: { x: number; y: number };
}

export const FarmMapPopup: React.FC<FarmMapPopupProps> = ({ point, probe, onClose, onViewGraph }) => {
    // Normaliza os dados
    const data = point || probe;

    const statusInfo = useMemo(() => {
        // CORES EXATAS DAS ZONAS DO GRÁFICO (Sem Amarelo)
        const chartColors = {
            red: 'rgb(241, 138, 138)',   // Zona Crítica/Seca
            green: 'rgb(149, 245, 152)', // Zona Ideal
            blue: 'rgb(138, 196, 235)',  // Zona Saturada
            gray: 'rgb(160, 174, 192)'   // Offline/Indefinido
        };

        const currentStatus = data?.statusCode || data?.status || 'status_offline';

        switch (currentStatus) {
            case 'status_critical': // Zona Seca
                return {
                    color: chartColors.red,
                    label: 'Crítico (Seco)',
                    bg: 'rgba(241, 138, 138, 0.15)',
                    iconColor: chartColors.red
                };
            case 'status_ok': // Zona Ideal
                return {
                    color: chartColors.green,
                    label: 'Ideal',
                    bg: 'rgba(149, 245, 152, 0.15)',
                    iconColor: chartColors.green
                };
            case 'status_saturated': // Zona Saturada
                return {
                    color: chartColors.blue,
                    label: 'Saturado (Úmido)',
                    bg: 'rgba(138, 196, 235, 0.15)',
                    iconColor: chartColors.blue
                };
            // Caso algum status antigo apareça, usamos cinza ou tratamos como exceção
            // O amarelo foi removido propositalmente da lógica visual
            case 'status_alert':
            default:
                return {
                    color: chartColors.gray,
                    label: 'Offline',
                    bg: 'rgba(160, 174, 192, 0.15)',
                    iconColor: chartColors.gray
                };
        }
    }, [data]);

    if (!data) return null;

    // Ordenação e seleção da última leitura
    const sortedReadings = data.readings ? [...data.readings].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ) : [];

    const lastMeasurement = sortedReadings.length > 0 ? sortedReadings[sortedReadings.length - 1] : null;

    const formattedDate = data.last_communication
        ? new Date(data.last_communication).toLocaleDateString() + ' ' + new Date(data.last_communication).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : (lastMeasurement ? new Date(lastMeasurement.timestamp).toLocaleDateString() : 'N/A');

    return (
        <Box
            position="absolute"
            bottom="20px"
            left="20px"
            w="280px"
            bg="rgba(26, 32, 44, 0.95)"
            backdropFilter="blur(8px)"
            color="white"
            borderRadius="xl"
            boxShadow="2xl"
            zIndex={1000}
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderTop="4px solid"
            borderTopColor={statusInfo.color}
            animation="slideUp 0.3s ease-out"
            overflow="hidden"
        >
            <Box p={4}>
                <HStack justify="space-between" mb={3} align="start">
                    <HStack align="start">
                        <Box mt={1}>
                            <MdSensors color={statusInfo.iconColor} size={20} />
                        </Box>
                        <VStack align="start" spacing={0}>
                            <Text fontWeight="bold" fontSize="md" lineHeight="1.2">
                                {data.name || `Sonda ${data.esn}`}
                            </Text>
                            <Text fontSize="xs" color="gray.400" fontFamily="mono">
                                {data.esn}
                            </Text>
                        </VStack>
                    </HStack>
                    <IconButton
                        aria-label="Close"
                        icon={<MdClose />}
                        size="xs"
                        variant="ghost"
                        color="gray.400"
                        _hover={{ bg: 'whiteAlpha.200', color: 'white' }}
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                    />
                </HStack>

                <Divider borderColor="whiteAlpha.200" mb={3} />

                <VStack align="stretch" spacing={3} mb={4}>
                    <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.400">Status:</Text>
                        <Badge
                            bg={statusInfo.bg}
                            color={statusInfo.color}
                            border="1px solid"
                            borderColor={statusInfo.color}
                            fontSize="xs"
                            px={2}
                            borderRadius="full"
                            textTransform="uppercase"
                        >
                            {statusInfo.label}
                        </Badge>
                    </HStack>

                    {lastMeasurement ? (
                        <>
                            <HStack justify="space-between">
                                <HStack spacing={1}>
                                    <MdWaterDrop color="#4299E1" size={14} />
                                    <Text fontSize="sm" color="gray.300">Umidade:</Text>
                                </HStack>
                                <Text fontSize="sm" fontWeight="bold" color="white">
                                    {lastMeasurement.moisture_pct?.toFixed(1)}%
                                </Text>
                            </HStack>

                            <HStack justify="space-between">
                                <HStack spacing={1}>
                                    <MdThermostat color="#F6E05E" size={14} />
                                    <Text fontSize="sm" color="gray.300">Temp:</Text>
                                </HStack>
                                <Text fontSize="sm" fontWeight="bold" color="white">
                                    {lastMeasurement.temperature_c ? `${lastMeasurement.temperature_c.toFixed(1)}°C` : '-'}
                                </Text>
                            </HStack>
                        </>
                    ) : (
                        <Text fontSize="xs" color="gray.500" fontStyle="italic">Sem leituras recentes</Text>
                    )}

                    <Text fontSize="xs" color="gray.500" textAlign="right">
                        Atualizado em: {formattedDate}
                    </Text>
                </VStack>

                <Button
                    w="full"
                    size="sm"
                    colorScheme="blue"
                    variant="solid"
                    bg="blue.600"
                    _hover={{ bg: 'blue.500' }}
                    leftIcon={<MdShowChart />}
                    onClick={(e) => { e.stopPropagation(); onViewGraph(); }}
                >
                    Ver Gráfico Detalhado
                </Button>
            </Box>
        </Box>
    );
};