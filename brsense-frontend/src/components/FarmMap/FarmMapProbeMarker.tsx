import React from 'react';
import { Box } from '@chakra-ui/react';
import { COLORS } from '../../colors/colors';

interface FarmMapProbeMarkerProps {
    top: string;
    left: string;
    status: string; // 'ativo', 'atenção', etc.
    name: string;
    onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

export const FarmMapProbeMarker: React.FC<FarmMapProbeMarkerProps> = ({
    top, left, status, name, onClick
}) => {
    // Define cores baseado no status (usando sua paleta ou fallback)
    const getColor = (s: string) => {
        const lower = s?.toLowerCase() || '';
        if (lower.includes('ativo') || lower.includes('ideal')) return COLORS.status?.ok || '#2ECC71';
        if (lower.includes('atenção') || lower.includes('alert')) return COLORS.status?.attention || '#F1C40F';
        return COLORS.status?.offline || '#E74C3C'; // Deficit/Offline
    };

    const bg = getColor(status);

    return (
        <Box
            position="absolute"
            top={top}
            left={left}
            transform="translate(-50%, -50%)"
            cursor="pointer"
            onClick={onClick}
            role="group"
            zIndex={2}
        >
            {/* Círculo Pulsante */}
            <Box
                w="24px"
                h="24px"
                borderRadius="full"
                bg={bg}
                boxShadow={`0 0 0 4px ${bg}40`}
                transition="all 0.3s"
                _groupHover={{ transform: 'scale(1.2)', boxShadow: `0 0 0 8px ${bg}60` }}
                display="flex"
                alignItems="center"
                justifyContent="center"
            >
                <Box w="8px" h="8px" bg="white" borderRadius="full" />
            </Box>

            {/* Label flutuante ao passar o mouse */}
            <Box
                position="absolute"
                top="-30px"
                left="50%"
                transform="translateX(-50%)"
                bg="rgba(0,0,0,0.8)"
                color="white"
                px={2}
                py={1}
                borderRadius="md"
                fontSize="xs"
                opacity={0}
                whiteSpace="nowrap"
                pointerEvents="none"
                transition="opacity 0.2s"
                _groupHover={{ opacity: 1 }}
            >
                {name}
            </Box>
        </Box >
    );
};