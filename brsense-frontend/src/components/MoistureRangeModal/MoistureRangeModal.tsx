import React, { useState } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Box, Flex, Text, Button, Icon, HStack, VStack,
    NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
    Slider, SliderTrack, SliderFilledTrack, SliderThumb
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
    const bgDark = "gray.900";
    const cardDark = "gray.800";

    const [val1, setVal1] = useState(() => initialRanges.v1 ?? (initialRanges.min ? initialRanges.min - 10 : 30));
    const [val2, setVal2] = useState(() => initialRanges.v2 ?? (initialRanges.min || 45));
    const [val3, setVal3] = useState(() => initialRanges.v3 ?? (initialRanges.max || 60));
    const [intensity, setIntensity] = useState(() => initialRanges.intensity ?? 50);

    // Guarda o estado anterior para sabermos quando o Modal acabou de ser aberto
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

    // Atualiza o estado durante a renderização (Padrão Oficial do React para evitar useEffect)
    if (isOpen && !prevIsOpen) {
        setPrevIsOpen(true);
        setVal1(initialRanges.v1 ?? (initialRanges.min ? initialRanges.min - 10 : 30));
        setVal2(initialRanges.v2 ?? (initialRanges.min || 45));
        setVal3(initialRanges.v3 ?? (initialRanges.max || 60));
        setIntensity(initialRanges.intensity ?? 50);
    } else if (!isOpen && prevIsOpen) {
        setPrevIsOpen(false);
    }

    const handleSave = (e?: React.FormEvent) => {
        if (e) e.preventDefault(); // Impede o recarregamento da tela (comportamento de formulário)
        
        // Remove o foco do input atual para forçar o fechamento do teclado no mobile
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        onSave({ v1: val1, v2: val2, v3: val3, intensity });
        onClose();
    };

    const handleReset = () => {
        setVal1(30);
        setVal2(45);
        setVal3(60);
        setIntensity(50);
    };

    const renderInputCard = (label: string, color: string, value: number, onChange: (val: number) => void, min: number, max: number) => (
        <VStack bg={bgDark} p={4} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200" align="start" flex={1}>
            <HStack spacing={2} mb={2}>
                <Box w={3} h={3} borderRadius="full" bg={color} />
                <Text fontSize="sm" fontWeight="bold" color={color} textTransform="uppercase">{label}</Text>
            </HStack>
            <NumberInput
                value={value}
                // Prevenção extra para o mobile: Se o usuário apagar tudo e retornar NaN, assume 0 temporariamente
                onChange={(_, valNumber) => onChange(isNaN(valNumber) ? 0 : valNumber)}
                min={min}
                max={max}
                step={1}
                precision={1}
                w="100%"
                focusBorderColor={color}
            >
                <NumberInputField bg="gray.800" color="white" borderColor="gray.600" />
                <NumberInputStepper>
                    <NumberIncrementStepper color="gray.400" _active={{ bg: "whiteAlpha.200" }} />
                    <NumberDecrementStepper color="gray.400" _active={{ bg: "whiteAlpha.200" }} />
                </NumberInputStepper>
            </NumberInput>
        </VStack>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} size={{ base: "full", md: "2xl" }} isCentered motionPreset="slideInBottom">
            <ModalOverlay backdropFilter="blur(8px)" bg="blackAlpha.700" />
            
            {/* O ModalContent agora é um 'form' para suportar o 'Enter/Ir' do teclado mobile */}
            <ModalContent 
                as="form" 
                onSubmit={handleSave}
                bg={cardDark} 
                color="white" 
                borderRadius={{ base: 0, md: "2xl" }} 
                border={{ base: "none", md: "1px solid" }} 
                borderColor="whiteAlpha.200" 
                boxShadow="2xl"
            >
                {/* Header Nativo do Chakra (Evita quebrar o scroll) */}
                <ModalHeader px={6} py={5} borderBottom="1px solid" borderColor="whiteAlpha.100" display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <HStack spacing={2} mb={1}>
                            <Icon as={MdWaterDrop} color={COLORS.status} boxSize={6} />
                            <Text fontSize="lg" fontWeight="bold">Configuração de Zonas (Alta Precisão)</Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.400" fontWeight="normal">Defina os limites em % e a suavidade das cores do gráfico</Text>
                    </Box>
                    <Icon as={MdSettings} color="gray.400" boxSize={5} />
                </ModalHeader>

                {/* Body Nativo (Garante o Scroll no Celular) */}
                <ModalBody p={6} overflowY="auto">
                    <Flex direction={{ base: "column", md: "row" }} gap={4} mb={6}>
                        {renderInputCard("Crítico (Máx)", redColor, val1, setVal1, 0, val2)}
                        {renderInputCard("Alerta (Máx)", yellowColor, val2, setVal2, val1, val3)}
                        {renderInputCard("Ideal (Máx)", greenColor, val3, setVal3, val2, 100)}
                    </Flex>

                    {/* Controle de Intensidade / Gradiente */}
                    <Box mt={6} mb={4} p={4} bg={bgDark} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200">
                        <Text mb={3} fontSize="sm" fontWeight="bold" color="gray.300">Intensidade do Gradiente</Text>
                        <NumberInput
                            value={intensity}
                            onChange={(_, val) => setIntensity(Number.isFinite(val) ? val : 0)}
                            min={0}
                            max={100}
                            step={1}
                            precision={0}
                            maxW="140px"
                            mb={3}
                            focusBorderColor="blue.500"
                        >
                            <NumberInputField bg="gray.800" color="white" borderColor="gray.600" />
                            <NumberInputStepper>
                                <NumberIncrementStepper color="gray.400" _active={{ bg: "whiteAlpha.200" }} />
                                <NumberDecrementStepper color="gray.400" _active={{ bg: "whiteAlpha.200" }} />
                            </NumberInputStepper>
                        </NumberInput>
                        <Slider value={intensity} onChange={(val) => setIntensity(val)} min={0} max={100} step={1}>
                            <SliderTrack bg="gray.700" h="6px" borderRadius="full">
                                <SliderFilledTrack bg="blue.500" />
                            </SliderTrack>
                            <SliderThumb boxSize={5} bg="white" border="2px solid" borderColor="blue.500" />
                        </Slider>
                        <Flex justify="space-between" mt={2}>
                            <Text fontSize="xs" color="gray.500">Mais Suave (0)</Text>
                            <Text fontSize="xs" color="gray.500">Cores Sólidas (100)</Text>
                        </Flex>
                    </Box>
                </ModalBody>

                {/* Footer Nativo (Respeita "Safe Areas" do iPhone e barra de navegação Android) */}
                <ModalFooter px={6} py={5} bg="whiteAlpha.50" justifyContent="space-between" alignItems="center" borderTop="1px solid" borderColor="whiteAlpha.100">
                    <Button type="button" variant="ghost" size="sm" color="gray.400" _hover={{ color: "white", bg: "whiteAlpha.100" }} leftIcon={<Icon as={MdRestartAlt} />} onClick={handleReset}>
                        Restaurar
                    </Button>
                    <HStack spacing={3}>
                        <Button type="button" variant="ghost" size="sm" color="gray.300" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" colorScheme="blue" size="sm" px={6}>Aplicar Valores</Button>
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};