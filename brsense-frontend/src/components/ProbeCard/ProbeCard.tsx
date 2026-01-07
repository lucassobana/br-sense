import { Box, Flex, Text, Badge, Icon, VStack, Stat, StatLabel, StatNumber, StatHelpText } from '@chakra-ui/react';
import { FaSatelliteDish, FaMapMarkerAlt } from 'react-icons/fa';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TelemetryChart } from '../TelemetryChart/TelemetryChart';
import type { Probe } from '../../types';

interface ProbeCardProps {
    probe: Probe;
}

export function ProbeCard({ probe }: ProbeCardProps) {
    // Define a cor do status
    const isOnline = probe.status.toLowerCase().includes('online');
    const statusColor = isOnline ? 'green' : (probe.status.includes('Novo') ? 'blue' : 'red');

    return (
        <Box borderWidth="1px" borderRadius="lg" overflow="hidden" p={6} bg="white" boxShadow="md">
            {/* Cabeçalho do Card */}
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Flex alignItems="center" gap={2}>
                    <Icon as={FaSatelliteDish} w={6} h={6} color="blue.500" />
                    <VStack align="start" spacing={0}>
                        <Text fontWeight="bold" fontSize="lg">{probe.name}</Text>
                        <Text fontSize="xs" color="gray.500">ESN: {probe.esn}</Text>
                    </VStack>
                </Flex>
                <Badge colorScheme={statusColor} fontSize="0.8em" p={1} borderRadius="md">
                    {probe.status}
                </Badge>
            </Flex>

            {/* Estatísticas Rápidas */}
            <Flex gap={4} mb={4}>
                <Stat>
                    <StatLabel display="flex" alignItems="center">
                        <Icon as={FaMapMarkerAlt} mr={1} /> Localização
                    </StatLabel>
                    <StatNumber fontSize="md">{probe.location}</StatNumber>
                </Stat>
                <Stat>
                    <StatLabel>Última Comunicação</StatLabel>
                    <StatHelpText>
                        {probe.last_communication
                            ? formatDistanceToNow(parseISO(probe.last_communication), { addSuffix: true, locale: ptBR })
                            : 'Nunca'}
                    </StatHelpText>
                </Stat>
            </Flex>

            {probe.measurements && probe.measurements.length > 0 ? (
                <TelemetryChart data={probe.measurements} />
            ) : (
                <Text fontSize="sm" color="gray.400" mt={4} textAlign="center">
                    Aguardando dados de telemetria...
                </Text>
            )}
        </Box>
    );
}