import {
    Box,
    VStack,
    Text,
    Flex,
    Icon,
    HStack,
    Badge
} from '@chakra-ui/react';
import { MdSensors, MdSignalCellularAlt } from 'react-icons/md';
import type { Probe } from '../../types';
import { COLORS } from '../../colors/colors'; 

interface ProbeListProps {
    probes: Probe[];
    onSelect?: (probe: Probe) => void;
}

const getStatusLabel = (code?: string) => {
    switch (code) {
        case 'status_critical': return 'Crítico';
        case 'status_ok': return 'Ideal';
        case 'status_saturated': return 'Saturado';
        case 'status_alert': return 'Atenção';
        default: return 'Offline';
    }
};

const getStatusColor = (code?: string) => {
    switch (code) {
        case 'status_critical': return 'red.400';
        case 'status_ok': return 'green.400';
        case 'status_saturated': return 'cyan.400';
        case 'status_alert': return 'yellow.400';
        default: return 'gray.400';
    }
};

const getStatusPriority = (code?: string) => {
    switch (code) {
        case 'status_critical': return 1;
        case 'status_alert': return 2;
        case 'status_ok': return 3;
        case 'status_saturated': return 4;
        default: return 5;
    }
};

const calculateProbeStatus = (probe: Probe) => {
    if (!probe.readings || probe.readings.length === 0) return 'status_offline';

    const validReading = [...probe.readings]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .find(r => r.moisture_pct !== null && r.moisture_pct !== undefined);

    if (!validReading) return 'status_offline';

    const val = Number(validReading.moisture_pct);
    const v1 = probe.config_moisture_v1 ?? 30;
    const v2 = probe.config_moisture_v2 ?? 45;
    const v3 = probe.config_moisture_v3 ?? 60;

    if (val < v1) return 'status_critical';
    if (val < v2) return 'status_alert';
    if (val <= v3) return 'status_ok';
    return 'status_saturated';
};

export function ProbeList({ probes, onSelect }: ProbeListProps) {

    if (probes.length === 0) {
        return (
            <Flex direction="column" align="center" justify="center" p={8} bg={COLORS.surface} borderRadius="md" border="1px dashed" borderColor="gray.700">
                <Icon as={MdSensors} boxSize={10} color={COLORS.textSecondary} mb={2} />
                <Text color={COLORS.textSecondary}>Nenhuma sonda encontrada.</Text>
            </Flex>
        );
    }

    const sortedProbes = [...probes].sort((a, b) => {
        const statusA = calculateProbeStatus(a);
        const statusB = calculateProbeStatus(b);
        return getStatusPriority(statusA) - getStatusPriority(statusB);
    });

    return (
        <VStack align="stretch" spacing={3}>
            {sortedProbes.map((probe) => {
                const realStatus = calculateProbeStatus(probe);
                
                const statusColor = getStatusColor(realStatus);
                const statusLabel = getStatusLabel(realStatus);
                const colorScheme = statusColor.split('.')[0];

                return (
                    <Box
                        key={probe.id}
                        p={4}
                        bg={COLORS.surface}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="rgba(255,255,255,0.05)"
                        cursor={onSelect ? "pointer" : "default"}
                        transition="all 0.2s"
                        _hover={onSelect ? { borderColor: COLORS.primary, bg: "rgba(255,255,255,0.03)" } : {}}
                        onClick={() => onSelect && onSelect(probe)}
                    >
                        <Flex justify="space-between" align="center">
                            <Flex align="center" gap={3}>
                                <Box position="relative">
                                    <Flex
                                        align="center"
                                        justify="center"
                                        w="40px"
                                        h="40px"
                                        borderRadius="full"
                                        bg="rgba(14, 107, 59, 0.2)"
                                    >
                                        <Icon as={MdSensors} color={COLORS.primary} boxSize={5} />
                                    </Flex>
                                    <Box
                                        position="absolute"
                                        bottom="0"
                                        right="0"
                                        w="10px"
                                        h="10px"
                                        borderRadius="full"
                                        bg={statusColor}
                                        border="2px solid"
                                        borderColor={COLORS.surface}
                                    />
                                </Box>

                                <Box>
                                    <Text fontWeight="bold" fontSize="md" color={COLORS.textPrimary}>
                                        {probe.name || `Sonda ${probe.esn}`}
                                    </Text>
                                    <HStack spacing={3} mt={1}>
                                        <Text fontSize="xs" color={COLORS.textSecondary} fontFamily="mono">
                                            ESN: {probe.esn}
                                        </Text>
                                    </HStack>
                                </Box>
                            </Flex>

                            <Flex direction="column" align="flex-end" gap={1}>
                                <Badge
                                    colorScheme={colorScheme}
                                    fontSize="0.6em"
                                    variant="solid"
                                    borderRadius="full"
                                    px={2}
                                >
                                    {statusLabel}
                                </Badge>
                                <Flex align="center" title="Última comunicação">
                                    <Icon as={MdSignalCellularAlt} color="gray.600" boxSize={3} mr={1} />
                                    <Text fontSize="xs" color="gray.500">
                                        {probe.last_communication
                                            ? new Date(probe.last_communication).toLocaleDateString()
                                            : '-'}
                                    </Text>
                                </Flex>
                            </Flex>
                        </Flex>
                    </Box>
                );
            })}
        </VStack>
    );
}