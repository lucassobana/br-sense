import React from 'react';
import { Box, Text, Button, VStack, HStack, IconButton, Divider } from '@chakra-ui/react';
import { MdClose, MdShowChart, MdSensors } from 'react-icons/md';
import type { Probe } from '../../types';
import { COLORS } from '../../colors/colors';

interface FarmMapPopupProps {
    probe: Probe;
    onClose: () => void;
    onViewGraph: () => void;
}

export const FarmMapPopup: React.FC<FarmMapPopupProps> = ({ probe, onClose, onViewGraph }) => {
    // Pega a última leitura se existir
    const lastMeasurement = probe.readings && probe.readings.length > 0
        ? probe.readings[probe.readings.length - 1]
        : null;

    return (
        <Box
            position="absolute"
            bottom="20px"
            right="20px" // Fixado no canto inferior direito ou perto do marcador se preferir
            w="300px"
            bg={COLORS.surface || '#1A202C'}
            color="white"
            borderRadius="xl"
            boxShadow="2xl"
            zIndex={10}
            border="1px solid rgba(255,255,255,0.1)"
            animation="slideUp 0.3s ease-out"
        >
            <Box p={4}>
                <HStack justify="space-between" mb={2}>
                    <HStack>
                        <MdSensors color={COLORS.primary} />
                        <Text fontWeight="bold" fontSize="md" isTruncated maxW="180px">
                            {probe.name || probe.esn}
                        </Text>
                    </HStack>
                    <IconButton
                        aria-label="Close"
                        icon={<MdClose />}
                        size="xs"
                        variant="ghost"
                        color="whiteAlpha.700"
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                    />
                </HStack>

                <Divider borderColor="whiteAlpha.200" mb={3} />

                <VStack align="start" spacing={1} mb={4}>
                    <Text fontSize="sm" color="gray.400">ESN: <Text as="span" color="white">{probe.esn}</Text></Text>
                    <Text fontSize="sm" color="gray.400">Status: <Text as="span" color="white">{probe.status}</Text></Text>
                    {lastMeasurement && (
                        <Text fontSize="sm" color="gray.400">
                            Umidade: <Text as="span" color="white" fontWeight="bold">{lastMeasurement.value}%</Text>
                        </Text>
                    )}
                    <Text fontSize="xs" color="gray.500" mt={1}>
                        Última com.: {new Date(probe.last_communication).toLocaleDateString()}
                    </Text>
                </VStack>

                <Button
                    w="full"
                    colorScheme="blue"
                    bg={COLORS.primary}
                    _hover={{ bg: COLORS.primaryDark }}
                    leftIcon={<MdShowChart />}
                    onClick={(e) => { e.stopPropagation(); onViewGraph(); }}
                    size="sm"
                >
                    Ver Gráfico Completo
                </Button>
            </Box>
        </Box>
    );
};