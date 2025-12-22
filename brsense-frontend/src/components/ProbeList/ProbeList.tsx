import {
    Box,
    VStack,
    Text,
    Flex,
    Icon,
    HStack,
    Badge
} from '@chakra-ui/react';
import { MdSensors, MdLocationOn, MdSignalCellularAlt } from 'react-icons/md';
import type { Probe } from '../../types';
import { COLORS } from '../../colors/colors'; // Ajuste o caminho conforme sua estrutura

interface ProbeListProps {
    probes: Probe[];
    onSelect?: (probe: Probe) => void;
}

export function ProbeList({ probes, onSelect }: ProbeListProps) {

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'ativo': return COLORS.status.ok;
            case 'atenção': return COLORS.status.attention;
            case 'estresse': return COLORS.status.stress;
            default: return COLORS.status.offline;
        }
    };

    if (probes.length === 0) {
        return (
            <Flex direction="column" align="center" justify="center" p={8} bg={COLORS.surface} borderRadius="md" border="1px dashed" borderColor="gray.700">
                <Icon as={MdSensors} boxSize={10} color={COLORS.textSecondary} mb={2} />
                <Text color={COLORS.textSecondary}>Nenhuma sonda encontrada.</Text>
            </Flex>
        );
    }

    return (
        <VStack align="stretch" spacing={3}>
            {probes.map((probe) => {
                const statusColor = getStatusColor(probe.status);

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
                                {/* Ícone com indicador de status */}
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
                                        <Flex align="center">
                                            <Icon as={MdLocationOn} color={COLORS.textSecondary} boxSize={3} mr={1} />
                                            <Text fontSize="xs" color={COLORS.textSecondary}>
                                                {probe.location || "Sem local"}
                                            </Text>
                                        </Flex>
                                        <Text fontSize="xs" color="gray.600" fontFamily="mono">|</Text>
                                        <Text fontSize="xs" color={COLORS.textSecondary} fontFamily="mono">
                                            ESN: {probe.esn}
                                        </Text>
                                    </HStack>
                                </Box>
                            </Flex>

                            <Flex direction="column" align="flex-end" gap={1}>
                                <Badge
                                    bg={statusColor}
                                    color="black"
                                    fontSize="0.6em"
                                    variant="solid"
                                    borderRadius="full"
                                    px={2}
                                >
                                    {probe.status || 'OFFLINE'}
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