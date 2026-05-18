import React, { useState } from 'react';
import {
    Box,
    Text,
    VStack,
    HStack,
    Icon,
    Flex,
    Spinner,
    useBreakpointValue,
    IconButton
} from '@chakra-ui/react';
import { MdCloud, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { useWeatherForecast } from '../../hooks/useWeatherForecast';

const getTempColor = (temp: number) => {
    if (temp <= 15) return "blue.300";
    if (temp <= 22) return "green.300";
    if (temp <= 28) return "orange.300";
    return "red.400";
};

const getTempGradientStop = (temp: number) => {
    if (temp <= 12) return "blue.500";
    if (temp <= 17) return "cyan.400";
    if (temp <= 22) return "green.400";
    if (temp <= 27) return "orange.400";
    if (temp <= 32) return "red.500";
    return "red.600";
};

interface ForecastTabProps {
    lat?: number;
    lng?: number;
}

export const ForecastTab: React.FC<ForecastTabProps> = ({ lat, lng }) => {
    const { forecast, loading, error } = useWeatherForecast(lat, lng);
    
    const [page, setPage] = useState(0);
    const isDesktop = useBreakpointValue({ base: false, md: true });
    
    const itemsPerPage = 4; 
    const totalPages = Math.ceil((forecast?.length || 0) / itemsPerPage);

    if (loading) {
        return (
            <Flex flex="1" align="center" justify="center" direction="column" gap={3}>
                <Spinner size="md" color="blue.400" />
                <Text color="gray.400" fontSize="sm">Buscando previsão...</Text>
            </Flex>
        );
    }

    if (error || !forecast?.length) {
        return (
            <Flex flex="1" align="center" justify="center">
                <Text color="red.400" fontSize="sm">{error || "Previsão indisponível."}</Text>
            </Flex>
        );
    }

    const displayDays = isDesktop 
        ? forecast.slice(page * itemsPerPage, (page + 1) * itemsPerPage) 
        : forecast;

    return (
        <Flex direction="column" flex="1" h="100%" justify="center">
            
            {isDesktop && (
                <HStack justify="space-between" mb={2} px={1}>
                    <Text fontSize="xs" color="gray.400" fontWeight="bold">
                        DIAS {page * itemsPerPage + 1} A {Math.min((page + 1) * itemsPerPage, forecast.length)}
                    </Text>
                    <HStack spacing={1}>
                        <IconButton
                            aria-label="Voltar"
                            icon={<MdChevronLeft size={20} />}
                            size="xs"
                            variant="outline"
                            colorScheme="whiteAlpha"
                            isDisabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                        />
                        <IconButton
                            aria-label="Avançar"
                            icon={<MdChevronRight size={20} />}
                            size="xs"
                            variant="outline"
                            colorScheme="whiteAlpha"
                            isDisabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                        />
                    </HStack>
                </HStack>
            )}

            <HStack 
                align="stretch" 
                spacing={3} 
                overflowX={isDesktop ? "hidden" : "auto"}
                pb={isDesktop ? 0 : 4} 
                pt={1}
                sx={{
                    '&::-webkit-scrollbar': { height: '6px' },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { background: 'whiteAlpha.300', borderRadius: '4px' },
                }}
            >
                {displayDays.map((day, idx) => {
                    const dateObj = new Date(day.date + 'T12:00:00Z');
                    const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                    const dayNumber = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                    return (
                        <VStack 
                            key={idx} 
                            bg="whiteAlpha.100" 
                            border="1px solid"
                            borderColor="whiteAlpha.50"
                            p={3} 
                            borderRadius="xl" 
                            minW={isDesktop ? "0" : "105px"} 
                            flex={isDesktop ? 1 : "none"} 
                            minH="210px"
                            spacing={3} 
                            justify="space-between"
                            boxShadow="md"
                        >
                            <VStack spacing={0}>
                                <Text fontSize="md" fontWeight="bold" textTransform="capitalize" color="gray.300" lineHeight="1.2">
                                    {dayName}
                                </Text>
                                <Text fontSize="xs" color="gray.400" fontWeight="medium" lineHeight="1">
                                    {dayNumber}
                                </Text>
                            </VStack>

                            <VStack spacing={1}>
                                <Icon as={MdCloud} boxSize={6} color="cyan.400" />
                                <Text fontSize="xs" fontWeight="bold" color="cyan.200" lineHeight="1">
                                    {day.precipProb}%
                                </Text>
                                <Text fontSize="10px" color="cyan.100" lineHeight="1">
                                    {Math.round(day.precipSum)} mm
                                </Text>
                            </VStack>

                            <VStack spacing={1.5} w="100%" align="center">
                                <Text fontSize="sm" color={getTempColor(day.tempMax)} fontWeight="bold" lineHeight="1">
                                    {Math.round(day.tempMax)}°
                                </Text>
                                
                                <Box 
                                    w="4px" 
                                    h="35px"
                                    borderRadius="full" 
                                    bgGradient={`linear(to-b, ${getTempGradientStop(day.tempMax)}, ${getTempGradientStop(day.tempMin)})`} 
                                />
                                
                                <Text fontSize="sm" color={getTempColor(day.tempMin)} fontWeight="bold" lineHeight="1">
                                    {Math.round(day.tempMin)}°
                                </Text>
                            </VStack>
                        </VStack>
                    );
                })}
            </HStack>
        </Flex>
    );
};