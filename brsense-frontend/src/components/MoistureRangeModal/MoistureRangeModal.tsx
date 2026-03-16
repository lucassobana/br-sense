import React, { useState, useEffect, useRef } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalBody, Box, Flex, Text, Button, Icon, HStack, VStack, Grid, GridItem
} from '@chakra-ui/react';
import { MdWaterDrop, MdSettings, MdRestartAlt } from 'react-icons/md';
import { COLORS } from '../../colors/colors';

export interface RangeSettings {
    v1: number;
    v2: number;
    v3: number;
    intensity: number;
}

export interface InitialRangeSettings {
    min?: number;
    max?: number;
    v1?: number;
    v2?: number;
    v3?: number;
    intensity?: number;
}

interface MoistureRangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialRanges: InitialRangeSettings;
    onSave: (ranges: RangeSettings) => void;
}

export const MoistureRangeModal: React.FC<MoistureRangeModalProps> = ({
    isOpen, onClose, initialRanges, onSave
}) => {
    const redColor = "red.500";
    const yellowColor = "yellow.500";
    const greenColor = "green.500";
    const blueColor = "blue.500";
    const bgDark = "gray.900";
    const cardDark = "gray.800";

    const [val1, setVal1] = useState(() => initialRanges.v1 ?? (initialRanges.min ? initialRanges.min - 10 : 30));
    const [val2, setVal2] = useState(() => initialRanges.v2 ?? (initialRanges.min || 45));
    const [val3, setVal3] = useState(() => initialRanges.v3 ?? (initialRanges.max || 60));
    const [intensity, setIntensity] = useState(() => initialRanges.intensity ?? 50);

    const [isDragging, setIsDragging] = useState<'val1' | 'val2' | 'val3' | 'intensity' | null>(null);

    const rangeTrackRef = useRef<HTMLDivElement>(null);
    const intensityTrackRef = useRef<HTMLDivElement>(null);
    const valuesRef = useRef({ val1, val2, val3, intensity });

    useEffect(() => {
        valuesRef.current = { val1, val2, val3, intensity };
    }, [val1, val2, val3, intensity]);

    const handleStartDrag = (thumb: 'val1' | 'val2' | 'val3' | 'intensity') => {
        setIsDragging(thumb);
    };

    useEffect(() => {
        if (!isDragging) return;

        const getClientX = (e: MouseEvent | TouchEvent) => {
            if ('touches' in e) return e.touches[0].clientX;
            return (e as MouseEvent).clientX;
        };

        const onMove = (e: MouseEvent | TouchEvent) => {
            const activeTrack = isDragging === 'intensity' ? intensityTrackRef.current : rangeTrackRef.current;
            if (!activeTrack) return;

            const clientX = getClientX(e);
            const rect = activeTrack.getBoundingClientRect();
            const offsetX = clientX - rect.left;
            let percent = (offsetX / rect.width) * 100;
            percent = Math.max(0, Math.min(100, percent));

            const newVal = Math.round(percent);
            const margin = 4;
            const { val1: v1, val2: v2, val3: v3 } = valuesRef.current;

            if (isDragging === 'val1') {
                if (newVal <= v2 - margin) setVal1(newVal);
            } else if (isDragging === 'val2') {
                if (newVal >= v1 + margin && newVal <= v3 - margin) setVal2(newVal);
            } else if (isDragging === 'val3') {
                if (newVal >= v2 + margin) setVal3(newVal);
            } else if (isDragging === 'intensity') {
                setIntensity(newVal);
            }
        };

        const onUp = () => setIsDragging(null);

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
        };
    }, [isDragging]);

    const handleSave = () => {
        onSave({ v1: val1, v2: val2, v3: val3, intensity });
        onClose();
    };

    const handleReset = () => {
        setVal1(30);
        setVal2(45);
        setVal3(60);
        setIntensity(50);
    };

    const renderThumb = (id: 'val1' | 'val2' | 'val3' | 'intensity', value: number, label: string) => (
        <Box
            position="absolute" top="50%" left={`${value}%`} transform="translate(-50%, -50%)"
            zIndex={2} cursor="grab"
            onMouseDown={() => handleStartDrag(id)} onTouchStart={() => handleStartDrag(id)}
            _active={{ transform: "translate(-50%, -50%) scale(1.1)", cursor: 'grabbing' }}
            transition="transform 0.1s" p={3} m={-3}
        >
            <Box w="24px" h="24px" bg="white" borderRadius="full" border="2px solid" borderColor="gray.500" boxShadow="lg" />
            <Box position="absolute" top="-25px" left="50%" transform="translateX(-50%)" bg="gray.700" px={2} py={1} borderRadius="md" boxShadow="md" pointerEvents="none">
                <Text fontSize="xs" fontWeight="bold" color="white">{label}</Text>
                <Box position="absolute" bottom="-4px" left="50%" transform="translateX(-50%)" w={0} h={0} borderLeft="4px solid transparent" borderRight="4px solid transparent" borderTop="4px solid" borderTopColor="gray.700" />
            </Box>
        </Box>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} size={{ base: "full", md: "xl" }} isCentered motionPreset="slideInBottom">
            <ModalOverlay backdropFilter="blur(8px)" bg="blackAlpha.700" />
            <ModalContent bg={cardDark} color="white" borderRadius={{ base: 0, md: "2xl" }} border={{ base: "none", md: "1px solid" }} borderColor="whiteAlpha.200" boxShadow="2xl" overflow="hidden">
                <Flex px={{ base: 4, md: 8 }} py={{ base: 4, md: 6 }} borderBottom="1px solid" borderColor="whiteAlpha.100" justify="space-between" align="center">
                    <Box>
                        <HStack spacing={2} mb={1}>
                            <Icon as={MdWaterDrop} color={COLORS.status} boxSize={6} />
                            <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold">Configuração de Zonas</Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.400">Ajuste os limites e transições do gráfico</Text>
                    </Box>
                    <Box p={2} borderRadius="lg" _hover={{ bg: "whiteAlpha.100" }} transition="all 0.2s">
                        <Icon as={MdSettings} color="gray.400" boxSize={5} />
                    </Box>
                </Flex>

                <ModalBody p={{ base: 4, md: 8 }}>
                    <Grid templateColumns={{ base: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }} gap={3} mb={8}>
                        <GridItem>
                            <VStack align={{ base: "center", sm: "flex-start" }} spacing={2}>
                                <HStack spacing={1.5}><Box w={2} h={2} borderRadius="full" bg={redColor} /><Text fontSize="10px" fontWeight="bold" color={redColor} textTransform="uppercase">Crítico</Text></HStack>
                                <Box w="full" bg={bgDark} px={2} py={2} borderRadius="lg" border="1px solid" borderColor="whiteAlpha.200" textAlign="center">
                                    <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold">0 <Text as="span" mx={1} color="gray.600">—</Text> {val1}<Text as="span" fontSize="xs" color="gray.500">%</Text></Text>
                                </Box>
                            </VStack>
                        </GridItem>
                        <GridItem>
                            <VStack align={{ base: "center", sm: "flex-start" }} spacing={2}>
                                <HStack spacing={1.5}><Box w={2} h={2} borderRadius="full" bg={yellowColor} /><Text fontSize="10px" fontWeight="bold" color={yellowColor} textTransform="uppercase">Alerta</Text></HStack>
                                <Box w="full" bg={bgDark} px={2} py={2} borderRadius="lg" border="1px solid" borderColor="whiteAlpha.200" textAlign="center">
                                    <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold">{val1} <Text as="span" mx={1} color="gray.600">—</Text> {val2}<Text as="span" fontSize="xs" color="gray.500">%</Text></Text>
                                </Box>
                            </VStack>
                        </GridItem>
                        <GridItem>
                            <VStack align={{ base: "center", sm: "flex-start" }} spacing={2}>
                                <HStack spacing={1.5}><Box w={2} h={2} borderRadius="full" bg={greenColor} /><Text fontSize="10px" fontWeight="bold" color={greenColor} textTransform="uppercase">Ideal</Text></HStack>
                                <Box w="full" bg={bgDark} px={2} py={2} borderRadius="lg" border="1px solid" borderColor="whiteAlpha.200" textAlign="center">
                                    <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold">{val2} <Text as="span" mx={1} color="gray.600">—</Text> {val3}<Text as="span" fontSize="xs" color="gray.500">%</Text></Text>
                                </Box>
                            </VStack>
                        </GridItem>
                        <GridItem>
                            <VStack align={{ base: "center", sm: "flex-start" }} spacing={2}>
                                <HStack spacing={1.5}><Box w={2} h={2} borderRadius="full" bg={blueColor} /><Text fontSize="10px" fontWeight="bold" color={blueColor} textTransform="uppercase">Saturado</Text></HStack>
                                <Box w="full" bg={bgDark} px={2} py={2} borderRadius="lg" border="1px solid" borderColor="whiteAlpha.200" textAlign="center">
                                    <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold">{val3} <Text as="span" mx={1} color="gray.600">—</Text> 100<Text as="span" fontSize="xs" color="gray.500">%</Text></Text>
                                </Box>
                            </VStack>
                        </GridItem>
                    </Grid>

                    <Box mb={8}>
                        <Text mb={6} fontSize="sm" fontWeight="medium" color="gray.300">Limites das Cores</Text>
                        <Box position="relative" pb={6} px={2} userSelect="none" sx={{ touchAction: 'none' }}>
                            <Box ref={rangeTrackRef} h="12px" w="100%" bg="gray.900" borderRadius="full" position="relative" boxShadow="inner">
                                <Box position="absolute" top={0} bottom={0} left={0} width={`${val1}%`} bg={redColor} opacity={0.8} borderLeftRadius="full" />
                                <Box position="absolute" top={0} bottom={0} left={`${val1}%`} width={`${val2 - val1}%`} bg={yellowColor} opacity={0.8} />
                                <Box position="absolute" top={0} bottom={0} left={`${val2}%`} width={`${val3 - val2}%`} bg={greenColor} opacity={0.8} />
                                <Box position="absolute" top={0} bottom={0} left={`${val3}%`} right={0} bg={blueColor} opacity={0.8} borderRightRadius="full" />
                            </Box>
                            {renderThumb('val1', val1, `${val1}%`)}
                            {renderThumb('val2', val2, `${val2}%`)}
                            {renderThumb('val3', val3, `${val3}%`)}
                            <Flex justify="space-between" mt={4} px={1}>
                                {[0, 25, 50, 75, 100].map(val => (<Text key={val} fontSize="xs" fontWeight="bold" color="gray.500">{val}%</Text>))}
                            </Flex>
                        </Box>
                    </Box>

                    <Box>
                        <Flex justify="space-between" mb={6}><Text fontSize="sm" fontWeight="medium" color="gray.300">Intensidade da Transição</Text></Flex>
                        <Box position="relative" pb={2} px={2} userSelect="none" sx={{ touchAction: 'none' }}>
                            <Box ref={intensityTrackRef} h="12px" w="100%" bg="gray.900" borderRadius="full" position="relative" boxShadow="inner">
                                <Box position="absolute" top={0} bottom={0} left={0} width={`${intensity}%`} bg="whiteAlpha.400" borderLeftRadius="full" borderRightRadius={intensity === 100 ? "full" : "none"} />
                            </Box>
                            {renderThumb('intensity', intensity, intensity < 30 ? 'Suave' : intensity > 70 ? 'Forte' : 'Média')}
                            <Flex justify="space-between" mt={4} px={1}>
                                <Text fontSize="xs" fontWeight="bold" color="gray.500">Gradiente Suave</Text>
                                <Text fontSize="xs" fontWeight="bold" color="gray.500">Cores Sólidas</Text>
                            </Flex>
                        </Box>
                    </Box>
                </ModalBody>

                <Flex px={{ base: 4, md: 8 }} py={5} bg="whiteAlpha.50" direction={{ base: "column-reverse", sm: "row" }} justify="space-between" align="center" borderTop="1px solid" borderColor="whiteAlpha.100" gap={3}>
                    <Button variant="ghost" size="sm" w={{ base: "100%", sm: "auto" }} color="gray.400" _hover={{ color: "white", bg: "whiteAlpha.100" }} leftIcon={<Icon as={MdRestartAlt} />} onClick={handleReset}>
                        Restaurar Padrões
                    </Button>
                    <HStack spacing={3} w={{ base: "100%", sm: "auto" }} justify="flex-end">
                        <Button variant="ghost" size="sm" flex={{ base: 1, sm: "none" }} color="gray.300" onClick={onClose} _hover={{ bg: "whiteAlpha.100" }}>Cancelar</Button>
                        <Button colorScheme="blue" size="sm" flex={{ base: 1, sm: "none" }} px={6} onClick={handleSave} boxShadow="lg" _active={{ transform: "scale(0.95)" }}>Aplicar Configurações</Button>
                    </HStack>
                </Flex>
            </ModalContent>
        </Modal>
    );
};