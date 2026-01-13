// brsense-frontend/src/components/AddDeviceModal/AddDeviceModal.tsx
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    FormControl,
    FormLabel,
    Input,
    Select,
    VStack,
    HStack,
    useToast,
    Text
} from '@chakra-ui/react';
import { useState, useEffect, useCallback } from 'react'; // <--- 1. Importar useCallback
import { AxiosError } from 'axios';
import { createDevice, getUserFarms } from '../../services/api';
import type { Farm } from '../../types';
import { COLORS } from '../../colors/colors';

interface AddDeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    farmId?: number | null;
}

export function AddDeviceModal({ isOpen, onClose, onSuccess }: AddDeviceModalProps) {
    const toast = useToast();

    // Estados
    const [name, setName] = useState('');
    const [esn, setEsn] = useState('');
    const [selectedFarmId, setSelectedFarmId] = useState('');

    // Novos Estados para Geolocalização
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');

    const [farms, setFarms] = useState<Farm[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // 2. Envolver a função no useCallback para ela não ser recriada a cada render
    const loadFarms = useCallback(async () => {
        try {
            const data = await getUserFarms();
            setFarms(data);
            if (data.length === 1) {
                setSelectedFarmId(String(data[0].id));
            }
        } catch (error) {
            console.error("Erro ao buscar fazendas", error);
            toast({
                title: 'Erro ao carregar fazendas',
                status: 'error',
                duration: 3000
            });
        }
    }, [toast]); // Dependência: toast (o resto são setters estáveis ou imports)

    // 3. Adicionar loadFarms no array de dependências
    useEffect(() => {
        if (isOpen) {
            loadFarms();
            // Limpa campos ao abrir
            setName('');
            setEsn('');
            setLat('');
            setLng('');
            setSelectedFarmId('');
        }
    }, [isOpen, loadFarms]);

    const handleSubmit = async () => {
        if (!name || !esn || !selectedFarmId) {
            toast({
                title: 'Dados incompletos',
                description: 'Nome, ESN e Fazenda são obrigatórios.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
                position: 'top-right'
            });
            return;
        }

        try {
            setIsLoading(true);

            // Converte lat/lng se preenchidos
            const latitude = lat ? parseFloat(lat.replace(',', '.')) : undefined;
            const longitude = lng ? parseFloat(lng.replace(',', '.')) : undefined;

            await createDevice({
                name: name,
                esn: esn,
                farm_id: Number(selectedFarmId),
                latitude,
                longitude
            });

            toast({
                title: 'Sonda Vinculada!',
                description: 'A sonda agora está associada a esta fazenda e os dados históricos (se houver) serão exibidos.',
                status: 'success',
                duration: 5000,
                isClosable: true,
                position: 'top-right'
            });

            onSuccess();
            onClose();

        } catch (err) {
            const error = err as AxiosError<{ detail: string }>;
            const msg = error.response?.data?.detail || 'Ocorreu um erro ao vincular a sonda.';

            toast({
                title: 'Falha na operação',
                description: msg,
                status: 'error',
                duration: 5000,
                isClosable: true,
                position: 'top-right'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
            <ModalOverlay />
            <ModalContent
                bg={COLORS.surface}
                borderWidth="1px"
                borderColor="gray.700"
                color="white"
                boxShadow="xl"
            >
                <ModalHeader borderBottomWidth="1px" borderColor="gray.700">
                    Vincular Sonda (Admin)
                </ModalHeader>
                <ModalCloseButton />

                <ModalBody py={6}>
                    <VStack spacing={5} align="stretch">

                        <Text fontSize="sm" color="gray.400">
                            Insira o ESN da sonda física para associá-la a um cliente.
                        </Text>

                        {/* Select Fazenda */}
                        <FormControl isRequired>
                            <FormLabel color="gray.300" fontSize="sm">Fazenda do Cliente</FormLabel>
                            <Select
                                placeholder="Selecione a fazenda de destino"
                                value={selectedFarmId}
                                onChange={(e) => setSelectedFarmId(e.target.value)}
                                bg={COLORS.background}
                                borderColor="gray.600"
                                color="white"
                                _hover={{ borderColor: 'gray.500' }}
                                sx={{
                                    '> option': {
                                        background: '#222',
                                        color: 'white',
                                    },
                                }}
                            >
                                {farms.map(farm => (
                                    <option key={farm.id} value={farm.id}>
                                        {farm.name} (ID: {farm.id})
                                    </option>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Input ESN */}
                        <FormControl isRequired>
                            <FormLabel color="gray.300" fontSize="sm">ESN (Identificador Globalstar)</FormLabel>
                            <Input
                                placeholder="Ex: 0-123456"
                                value={esn}
                                onChange={(e) => setEsn(e.target.value)}
                                bg={COLORS.background}
                                borderColor="gray.600"
                                _placeholder={{ color: 'gray.500' }}
                            />
                        </FormControl>

                        {/* Input Nome */}
                        <FormControl isRequired>
                            <FormLabel color="gray.300" fontSize="sm">Nome Amigável (para o cliente)</FormLabel>
                            <Input
                                placeholder="Ex: Sonda Pivô 01"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                bg={COLORS.background}
                                borderColor="gray.600"
                                _placeholder={{ color: 'gray.500' }}
                            />
                        </FormControl>

                        {/* Lat / Long (Opcionais) */}
                        <HStack>
                            <FormControl>
                                <FormLabel color="gray.300" fontSize="sm">Latitude</FormLabel>
                                <Input
                                    placeholder="-22.1234"
                                    value={lat}
                                    onChange={(e) => setLat(e.target.value)}
                                    bg={COLORS.background}
                                    borderColor="gray.600"
                                    type="number"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel color="gray.300" fontSize="sm">Longitude</FormLabel>
                                <Input
                                    placeholder="-46.5678"
                                    value={lng}
                                    onChange={(e) => setLng(e.target.value)}
                                    bg={COLORS.background}
                                    borderColor="gray.600"
                                    type="number"
                                />
                            </FormControl>
                        </HStack>

                    </VStack>
                </ModalBody>

                <ModalFooter borderTopWidth="1px" borderColor="gray.700">
                    <Button variant="ghost" mr={3} onClick={onClose} color="gray.400" _hover={{ bg: "whiteAlpha.100", color: "white" }}>
                        Cancelar
                    </Button>
                    <Button
                        bg={COLORS.primary}
                        color="white"
                        _hover={{ bg: COLORS.primaryDark }}
                        onClick={handleSubmit}
                        isLoading={isLoading}
                        loadingText="Vinculando..."
                    >
                        Salvar e Vincular
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}