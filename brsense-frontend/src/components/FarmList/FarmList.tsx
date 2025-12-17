import {
    Box,
    VStack,
    Text,
    Flex,
    Icon,
    Badge
} from '@chakra-ui/react';
import { MdAgriculture, MdLocationOn } from 'react-icons/md';
import type { Farm } from '../../types'; // Certifique-se de ter a interface Farm no types.ts

interface FarmListProps {
    farms: Farm[];
    onSelect?: (farm: Farm) => void; // Opcional: callback ao clicar
}

export function FarmList({ farms, onSelect }: FarmListProps) {
    // Cores do seu tema (baseado no código anterior)
    const bgCard = "#1A1D21";
    const hoverBg = "rgba(14, 107, 59, 0.2)";
    const borderColor = "rgba(255,255,255,0.05)";
    const textColor = "#FFFFFF";
    const subTextColor = "#A0AEC0";

    if (farms.length === 0) {
        return (
            <Flex direction="column" align="center" justify="center" p={8} bg={bgCard} borderRadius="md">
                <Icon as={MdAgriculture} boxSize={10} color={subTextColor} mb={2} />
                <Text color={subTextColor}>Nenhuma fazenda cadastrada.</Text>
            </Flex>
        );
    }

    return (
        <VStack align="stretch" spacing={3}>
            {farms.map((farm) => (
                <Box
                    key={farm.id}
                    p={4}
                    bg={bgCard}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={borderColor}
                    cursor={onSelect ? "pointer" : "default"}
                    transition="all 0.2s"
                    _hover={onSelect ? { bg: hoverBg, borderColor: "#0E6B3B" } : {}}
                    onClick={() => onSelect && onSelect(farm)}
                >
                    <Flex justify="space-between" align="center">
                        <Flex align="center" gap={3}>
                            <Flex
                                align="center"
                                justify="center"
                                w="40px"
                                h="40px"
                                borderRadius="full"
                                bg="rgba(14, 107, 59, 0.2)"
                            >
                                <Icon as={MdAgriculture} color="#22C55E" boxSize={5} />
                            </Flex>
                            <Box>
                                <Text fontWeight="bold" fontSize="md" color={textColor}>
                                    {farm.name}
                                </Text>
                                <Flex align="center" mt={1}>
                                    <Icon as={MdLocationOn} color={subTextColor} boxSize={3} mr={1} />
                                    <Text fontSize="xs" color={subTextColor}>
                                        {farm.location || "Localização não informada"}
                                    </Text>
                                </Flex>
                            </Box>
                        </Flex>

                        {/* Exemplo de Badge ou Status se houver futuramente */}
                        <Badge colorScheme="green" variant="subtle" fontSize="0.6em">
                            ATIVO
                        </Badge>
                    </Flex>
                </Box>
            ))}
        </VStack>
    );
}