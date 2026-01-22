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

    // REF PATTERN: 
    // Guardamos os valores em refs para acessá-los dentro do event listener
    // sem precisar recriar a função handleMouseMove a cada renderização.
    const valuesRef = useRef({ val1, val2 });

    // Mantém as refs sincronizadas com o estado visual
    useEffect(() => {
        valuesRef.current = { val1, val2 };
    }, [val1, val2]);

    // Reseta os valores quando o modal abre (Correção do Erro 1)
    useEffect(() => {
        if (isOpen) {
            setVal1(initialRanges.min);
            setVal2(initialRanges.max);
        }
        // Removemos 'initialRanges' das deps para evitar reset se a prop mudar enquanto edita
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleMouseDown = (thumb: 'val1' | 'val2') => {
        setIsDragging(thumb);
    };

    // Effect separado para gerenciar os listeners globais (Correção do Erro 2)
    useEffect(() => {
        if (!isDragging) return;

        const onMove = (e: MouseEvent) => {
            if (!trackRef.current) return;

            const rect = trackRef.current.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            let percent = (offsetX / rect.width) * 100;
            percent = Math.max(0, Math.min(100, percent));
            const newVal = Math.round(percent);
            const margin = 5;

            // Lemos os valores atuais das refs para colisão
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

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isDragging]); // Depende apenas de isDragging iniciar ou parar

    const handleSave = () => {
        onSave({ min: val1, max: val2 });
        onClose();
    };

    const handleReset = () => {
        setVal1(45);
        setVal2(55);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered motionPreset="slideInBottom">
            <ModalOverlay backdropFilter="blur(8px)" bg="blackAlpha.700" />
            <ModalContent
                bg={cardDark}
                color="white"
                borderRadius="2xl"
                border="1px solid"
                borderColor="whiteAlpha.200"
                boxShadow="2xl"
                overflow="hidden"
            >
                <Flex
                    px={8} py={6}
                    borderBottom="1px solid"
                    borderColor="whiteAlpha.100"
                    justify="space-between"
                    align="center"
                >
                    <Box>
                        <HStack spacing={2} mb={1}>
                            <Icon as={MdWaterDrop} color={COLORS.status} boxSize={6} />
                            <Text fontSize="lg" fontWeight="bold">Configuração de Zonas</Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.400">Ajuste os limites arrastando os marcadores</Text>
                    </Box>
                    <Box p={2} borderRadius="lg" _hover={{ bg: "whiteAlpha.100" }} transition="all 0.2s">
                        <Icon as={MdSettings} color="gray.400" boxSize={5} />
                    </Box>
                </Flex>

                <ModalBody p={8}>
                    <Flex justify="space-between" align="flex-end" mb={12} gap={2}>
                        <VStack align="flex-start" spacing={2}>
                            <HStack spacing={1.5}>
                                <Box w={2} h={2} borderRadius="full" bg={redColor} />
                                <Text fontSize="xs" fontWeight="bold" color={redColor} letterSpacing="wider" textTransform="uppercase">Seco</Text>
                            </HStack>
                            <Box bg={bgDark} px={4} py={2} borderRadius="lg" border="1px solid" borderColor="whiteAlpha.200">
                                <Text fontSize="xl" fontWeight="bold">
                                    0<Text as="span" fontSize="sm" color="gray.500" ml={0.5}>%</Text>
                                    <Text as="span" mx={2} color="gray.600">—</Text>
                                    {val1}<Text as="span" fontSize="sm" color="gray.500" ml={0.5}>%</Text>
                                </Text>
                            </Box>
                        </VStack>

                        <VStack align="center" spacing={2}>
                            <HStack spacing={1.5}>
                                <Box w={2} h={2} borderRadius="full" bg={greenColor} />
                                <Text fontSize="xs" fontWeight="bold" color={greenColor} letterSpacing="wider" textTransform="uppercase">Ideal</Text>
                            </HStack>
                            <Box bg={bgDark} px={4} py={2} borderRadius="lg" border="1px solid" borderColor="whiteAlpha.200">
                                <Text fontSize="xl" fontWeight="bold">
                                    {val1}
                                    <Text as="span" mx={2} color="gray.600">—</Text>
                                    {val2}<Text as="span" fontSize="sm" color="gray.500" ml={0.5}>%</Text>
                                </Text>
                            </Box>
                        </VStack>

                        <VStack align="flex-end" spacing={2}>
                            <HStack spacing={1.5}>
                                <Box w={2} h={2} borderRadius="full" bg={blueColor} />
                                <Text fontSize="xs" fontWeight="bold" color={blueColor} letterSpacing="wider" textTransform="uppercase">Saturado</Text>
                            </HStack>
                            <Box bg={bgDark} px={4} py={2} borderRadius="lg" border="1px solid" borderColor="whiteAlpha.200">
                                <Text fontSize="xl" fontWeight="bold">
                                    {val2}
                                    <Text as="span" mx={2} color="gray.600">—</Text>
                                    100<Text as="span" fontSize="sm" color="gray.500" ml={0.5}>%</Text>
                                </Text>
                            </Box>
                        </VStack>
                    </Flex>

                    <Box position="relative" py={4} px={2} userSelect="none">
                        <Box
                            ref={trackRef}
                            h="12px"
                            w="100%"
                            bg="gray.900"
                            borderRadius="full"
                            position="relative"
                            boxShadow="inner"
                        >
                            <Box position="absolute" top={0} bottom={0} left={0} width={`${val1}%`} bg={redColor} opacity={0.8} borderLeftRadius="full" />
                            <Box position="absolute" top={0} bottom={0} left={`${val1}%`} width={`${val2 - val1}%`} bg={greenColor} opacity={0.8} />
                            <Box position="absolute" top={0} bottom={0} left={`${val2}%`} right={0} bg={blueColor} opacity={0.8} borderRightRadius="full" />
                        </Box>

                        <Box
                            position="absolute"
                            top="50%"
                            left={`${val1}%`}
                            transform="translate(-50%, -50%)"
                            zIndex={2}
                            cursor={isDragging === 'val1' ? 'grabbing' : 'grab'}
                            onMouseDown={() => handleMouseDown('val1')}
                            _active={{ transform: "translate(-50%, -50%) scale(1.1)" }}
                            transition="transform 0.1s"
                        >
                            <Box w="24px" h="24px" bg="white" borderRadius="full" border="2px solid" borderColor="gray.500" boxShadow="lg" />
                            <Box position="absolute" top="-40px" left="50%" transform="translateX(-50%)" bg="gray.700" px={2} py={1} borderRadius="md" boxShadow="md">
                                <Text fontSize="xs" fontWeight="bold" color="white">{val1}%</Text>
                                <Box position="absolute" bottom="-4px" left="50%" transform="translateX(-50%)" w={0} h={0} borderLeft="4px solid transparent" borderRight="4px solid transparent" borderTop="4px solid" borderTopColor="gray.700" />
                            </Box>
                        </Box>

                        <Box
                            position="absolute"
                            top="50%"
                            left={`${val2}%`}
                            transform="translate(-50%, -50%)"
                            zIndex={2}
                            cursor={isDragging === 'val2' ? 'grabbing' : 'grab'}
                            onMouseDown={() => handleMouseDown('val2')}
                            _active={{ transform: "translate(-50%, -50%) scale(1.1)" }}
                            transition="transform 0.1s"
                        >
                            <Box w="24px" h="24px" bg="white" borderRadius="full" border="2px solid" borderColor="gray.500" boxShadow="lg" />
                            <Box position="absolute" top="-40px" left="50%" transform="translateX(-50%)" bg="gray.700" px={2} py={1} borderRadius="md" boxShadow="md">
                                <Text fontSize="xs" fontWeight="bold" color="white">{val2}%</Text>
                                <Box position="absolute" bottom="-4px" left="50%" transform="translateX(-50%)" w={0} h={0} borderLeft="4px solid transparent" borderRight="4px solid transparent" borderTop="4px solid" borderTopColor="gray.700" />
                            </Box>
                        </Box>

                        <Flex justify="space-between" mt={4} px={1}>
                            {[0, 25, 50, 75, 100].map(val => (
                                <Text key={val} fontSize="xs" fontWeight="bold" color="gray.500">{val}%</Text>
                            ))}
                        </Flex>
                    </Box>
                </ModalBody>

                <Flex px={8} py={5} bg="whiteAlpha.50" justify="space-between" align="center" borderTop="1px solid" borderColor="whiteAlpha.100">
                    <Button
                        variant="ghost"
                        size="sm"
                        color="gray.400"
                        _hover={{ color: "white", bg: "whiteAlpha.100" }}
                        leftIcon={<Icon as={MdRestartAlt} />}
                        onClick={handleReset}
                    >
                        Restaurar Padrões
                    </Button>
                    <HStack spacing={3}>
                        <Button
                            variant="ghost"
                            size="sm"
                            color="gray.300"
                            onClick={onClose}
                            _hover={{ bg: "whiteAlpha.100" }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            colorScheme="blue"
                            size="sm"
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