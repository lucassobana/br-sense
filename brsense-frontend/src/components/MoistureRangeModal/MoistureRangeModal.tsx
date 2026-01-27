import React, { useState, useEffect, useRef } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalBody,
    Box,
    Flex,
    Text,
    Button,
    Icon,
    HStack,
    VStack,
} from '@chakra-ui/react';
import { MdWaterDrop, MdSettings, MdRestartAlt } from 'react-icons/md';
import { COLORS } from '../../colors/colors';

interface MoistureRangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialRanges: { min: number; max: number };
    onSave: (ranges: { min: number; max: number }) => void;
}

export const MoistureRangeModal: React.FC<MoistureRangeModalProps> = ({
    isOpen,
    onClose,
    initialRanges,
    onSave
}) => {
    // Cores do Tema
    const redColor = "red.500";
    const greenColor = "green.500";
    const blueColor = "blue.500";
    const bgDark = "gray.900";
    const cardDark = "gray.800";

    const [val1, setVal1] = useState(initialRanges.min);
    const [val2, setVal2] = useState(initialRanges.max);

    const [isDragging, setIsDragging] = useState<'val1' | 'val2' | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    // Refs para acesso dentro dos event listeners
    const valuesRef = useRef({ val1, val2 });

    useEffect(() => {
        valuesRef.current = { val1, val2 };
    }, [val1, val2]);

    useEffect(() => {
        if (isOpen) {
            setVal1(initialRanges.min);
            setVal2(initialRanges.max);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // --- LÓGICA DE EVENTOS HÍBRIDA (MOUSE + TOUCH) ---

    // 1. Iniciar o arraste (Funciona para MouseDown e TouchStart)
    const handleStartDrag = (thumb: 'val1' | 'val2') => {
        setIsDragging(thumb);
    };

    useEffect(() => {
        if (!isDragging) return;

        // 2. Helper para pegar a posição X independente do dispositivo
        const getClientX = (e: MouseEvent | TouchEvent) => {
            if ('touches' in e) {
                return e.touches[0].clientX;
            }
            return (e as MouseEvent).clientX;
        };

        const onMove = (e: MouseEvent | TouchEvent) => {
            // Previne scroll da tela enquanto arrasta no mobile
            if (e.type === 'touchmove') {
                // Não previne default se for mouse, pois pode travar seleções
                // Mas no touch é essencial
                // e.preventDefault(); // (Opcional, depende do comportamento desejado, mas ajuda)
            }

            if (!trackRef.current) return;

            const clientX = getClientX(e);
            const rect = trackRef.current.getBoundingClientRect();

            // Cálculo da posição relativa
            const offsetX = clientX - rect.left;
            let percent = (offsetX / rect.width) * 100;

            // Limites (0 a 100)
            percent = Math.max(0, Math.min(100, percent));
            const newVal = Math.round(percent);
            const margin = 5;

            const { val1: v1, val2: v2 } = valuesRef.current;

            if (isDragging === 'val1') {
                if (newVal <= v2 - margin) setVal1(newVal);
            } else {
                if (newVal >= v1 + margin) setVal2(newVal);
            }
        };

        const onUp = () => {
            setIsDragging(null);
        };

        // Adiciona listeners para AMBOS (Mouse e Touch)
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        // Listeners Mobile (passive: false permite usar preventDefault se necessário)
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
        onSave({ min: val1, max: val2 });
        onClose();
    };

    const handleReset = () => {
        setVal1(45);
        setVal2(55);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            // Responsividade: Fullscreen no mobile, XL no desktop
            size={{ base: "full", md: "xl" }}
            isCentered
            motionPreset="slideInBottom"
        >
            <ModalOverlay backdropFilter="blur(8px)" bg="blackAlpha.700" />
            <ModalContent
                bg={cardDark}
                color="white"
                borderRadius={{ base: 0, md: "2xl" }} // Sem borda arredondada no mobile (fullscreen)
                border={{ base: "none", md: "1px solid" }}
                borderColor="whiteAlpha.200"
                boxShadow="2xl"
                overflow="hidden"
            >
                {/* Header Responsivo */}
                <Flex
                    px={{ base: 4, md: 8 }}
                    py={{ base: 4, md: 6 }}
                    borderBottom="1px solid"
                    borderColor="whiteAlpha.100"
                    justify="space-between"
                    align="center"
                >
                    <Box>
                        <HStack spacing={2} mb={1}>
                            <Icon as={MdWaterDrop} color={COLORS.status} boxSize={6} />
                            <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold">Configuração de Zonas</Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.400">Ajuste os limites arrastando os marcadores</Text>
                    </Box>
                    <Box p={2} borderRadius="lg" _hover={{ bg: "whiteAlpha.100" }} transition="all 0.2s">
                        <Icon as={MdSettings} color="gray.400" boxSize={5} />
                    </Box>
                </Flex>

                <ModalBody p={{ base: 4, md: 8 }}>
                    {/* Visualização dos Valores - Stack vertical no mobile, Horizontal no PC */}
                    <Flex
                        direction={{ base: "column", sm: "row" }}
                        justify="space-between"
                        align={{ base: "stretch", sm: "flex-end" }}
                        mb={12}
                        gap={4}
                    >
                        {/* Box Seco */}
                        <VStack align={{ base: "center", sm: "flex-start" }} spacing={2} flex={1}>
                            <HStack spacing={1.5}>
                                <Box w={2} h={2} borderRadius="full" bg={redColor} />
                                <Text fontSize="xs" fontWeight="bold" color={redColor} letterSpacing="wider" textTransform="uppercase">Seco</Text>
                            </HStack>
                            <Box w="full" bg={bgDark} px={4} py={2} borderRadius="lg" border="1px solid" borderColor="whiteAlpha.200" textAlign="center">
                                <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold">
                                    0<Text as="span" fontSize="sm" color="gray.500" ml={0.5}>%</Text>
                                    <Text as="span" mx={2} color="gray.600">—</Text>
                                    {val1}<Text as="span" fontSize="sm" color="gray.500" ml={0.5}>%</Text>
                                </Text>
                            </Box>
                        </VStack>

                        {/* Box Ideal */}
                        <VStack align="center" spacing={2} flex={1}>
                            <HStack spacing={1.5}>
                                <Box w={2} h={2} borderRadius="full" bg={greenColor} />
                                <Text fontSize="xs" fontWeight="bold" color={greenColor} letterSpacing="wider" textTransform="uppercase">Ideal</Text>
                            </HStack>
                            <Box w="full" bg={bgDark} px={4} py={2} borderRadius="lg" border="1px solid" borderColor="whiteAlpha.200" textAlign="center">
                                <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold">
                                    {val1}
                                    <Text as="span" mx={2} color="gray.600">—</Text>
                                    {val2}<Text as="span" fontSize="sm" color="gray.500" ml={0.5}>%</Text>
                                </Text>
                            </Box>
                        </VStack>

                        {/* Box Saturado */}
                        <VStack align={{ base: "center", sm: "flex-end" }} spacing={2} flex={1}>
                            <HStack spacing={1.5}>
                                <Box w={2} h={2} borderRadius="full" bg={blueColor} />
                                <Text fontSize="xs" fontWeight="bold" color={blueColor} letterSpacing="wider" textTransform="uppercase">Saturado</Text>
                            </HStack>
                            <Box w="full" bg={bgDark} px={4} py={2} borderRadius="lg" border="1px solid" borderColor="whiteAlpha.200" textAlign="center">
                                <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold">
                                    {val2}
                                    <Text as="span" mx={2} color="gray.600">—</Text>
                                    100<Text as="span" fontSize="sm" color="gray.500" ml={0.5}>%</Text>
                                </Text>
                            </Box>
                        </VStack>
                    </Flex>

                    {/* SLIDER AREA */}
                    <Box position="relative" py={6} px={2} userSelect="none" sx={{ touchAction: 'none' }}>
                        <Box
                            ref={trackRef}
                            h="12px"
                            w="100%"
                            bg="gray.900"
                            borderRadius="full"
                            position="relative"
                            boxShadow="inner"
                        >
                            {/* Faixas coloridas */}
                            <Box position="absolute" top={0} bottom={0} left={0} width={`${val1}%`} bg={redColor} opacity={0.8} borderLeftRadius="full" />
                            <Box position="absolute" top={0} bottom={0} left={`${val1}%`} width={`${val2 - val1}%`} bg={greenColor} opacity={0.8} />
                            <Box position="absolute" top={0} bottom={0} left={`${val2}%`} right={0} bg={blueColor} opacity={0.8} borderRightRadius="full" />
                        </Box>

                        {/* Botão 1 (Esquerda) */}
                        <Box
                            position="absolute"
                            top="50%"
                            left={`${val1}%`}
                            transform="translate(-50%, -50%)"
                            zIndex={2}
                            cursor="grab"
                            // Suporte a Mouse e Touch
                            onMouseDown={() => handleStartDrag('val1')}
                            onTouchStart={() => handleStartDrag('val1')}
                            _active={{ transform: "translate(-50%, -50%) scale(1.1)", cursor: 'grabbing' }}
                            transition="transform 0.1s"
                            // Aumenta a área de toque invisível para facilitar no mobile
                            p={3}
                            m={-3}
                        >
                            {/* O Círculo visível */}
                            <Box w="24px" h="24px" bg="white" borderRadius="full" border="2px solid" borderColor="gray.500" boxShadow="lg" />

                            {/* Tooltip do valor */}
                            <Box position="absolute" top="-25px" left="50%" transform="translateX(-50%)" bg="gray.700" px={2} py={1} borderRadius="md" boxShadow="md" pointerEvents="none">
                                <Text fontSize="xs" fontWeight="bold" color="white">{val1}%</Text>
                                <Box position="absolute" bottom="-4px" left="50%" transform="translateX(-50%)" w={0} h={0} borderLeft="4px solid transparent" borderRight="4px solid transparent" borderTop="4px solid" borderTopColor="gray.700" />
                            </Box>
                        </Box>

                        {/* Botão 2 (Direita) */}
                        <Box
                            position="absolute"
                            top="50%"
                            left={`${val2}%`}
                            transform="translate(-50%, -50%)"
                            zIndex={2}
                            cursor="grab"
                            // Suporte a Mouse e Touch
                            onMouseDown={() => handleStartDrag('val2')}
                            onTouchStart={() => handleStartDrag('val2')}
                            _active={{ transform: "translate(-50%, -50%) scale(1.1)", cursor: 'grabbing' }}
                            transition="transform 0.1s"
                            // Aumenta a área de toque
                            p={3}
                            m={-3}
                        >
                            <Box w="24px" h="24px" bg="white" borderRadius="full" border="2px solid" borderColor="gray.500" boxShadow="lg" />
                            <Box position="absolute" top="-25px" left="50%" transform="translateX(-50%)" bg="gray.700" px={2} py={1} borderRadius="md" boxShadow="md" pointerEvents="none">
                                <Text fontSize="xs" fontWeight="bold" color="white">{val2}%</Text>
                                <Box position="absolute" bottom="-4px" left="50%" transform="translateX(-50%)" w={0} h={0} borderLeft="4px solid transparent" borderRight="4px solid transparent" borderTop="4px solid" borderTopColor="gray.700" />
                            </Box>
                        </Box>

                        {/* Régua de % */}
                        <Flex justify="space-between" mt={4} px={1}>
                            {[0, 25, 50, 75, 100].map(val => (
                                <Text key={val} fontSize="xs" fontWeight="bold" color="gray.500">{val}%</Text>
                            ))}
                        </Flex>
                    </Box>
                </ModalBody>

                {/* Footer Responsivo */}
                <Flex
                    px={{ base: 4, md: 8 }}
                    py={5}
                    bg="whiteAlpha.50"
                    direction={{ base: "column-reverse", sm: "row" }} // Botões empilhados no mobile
                    justify="space-between"
                    align="center"
                    borderTop="1px solid"
                    borderColor="whiteAlpha.100"
                    gap={3}
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        w={{ base: "100%", sm: "auto" }}
                        color="gray.400"
                        _hover={{ color: "white", bg: "whiteAlpha.100" }}
                        leftIcon={<Icon as={MdRestartAlt} />}
                        onClick={handleReset}
                    >
                        Restaurar Padrões
                    </Button>
                    <HStack spacing={3} w={{ base: "100%", sm: "auto" }} justify="flex-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            flex={{ base: 1, sm: "none" }}
                            color="gray.300"
                            onClick={onClose}
                            _hover={{ bg: "whiteAlpha.100" }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            colorScheme="blue"
                            size="sm"
                            flex={{ base: 1, sm: "none" }}
                            px={6}
                            onClick={handleSave}
                            boxShadow="lg"
                            _active={{ transform: "scale(0.95)" }}
                        >
                            Aplicar Zonas
                        </Button>
                    </HStack>
                </Flex>
            </ModalContent>
        </Modal>
    );
};