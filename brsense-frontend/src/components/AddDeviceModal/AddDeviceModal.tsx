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
    useToast
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { AxiosError } from 'axios'; // Importação necessária para tipagem de erro
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
    const [farms, setFarms] = useState<Farm[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Carrega fazendas ao abrir o modal
    useEffect(() => {
        if (isOpen) {
            loadFarms();
        }
    }, [isOpen]);

    const loadFarms = async () => {
        try {
            const data = await getUserFarms();
            setFarms(data);
            // UX: Se tiver só uma fazenda, já seleciona ela
            if (data.length === 1) {
                setSelectedFarmId(String(data[0].id));
            }
        } catch (error) {
            console.error("Erro ao buscar fazendas", error);
        }
    };

    const handleSubmit = async () => {
        if (!name || !esn || !selectedFarmId) {
            toast({
                title: 'Campos obrigatórios',
                description: 'Preencha todos os campos para continuar.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
                position: 'top-right'
            });
            return;
        }

        try {
            setIsLoading(true);

            await createDevice({
                name: name,
                esn: esn,
                farm_id: Number(selectedFarmId)
            });

            toast({
                title: 'Sucesso!',
                description: 'Nova sonda adicionada.',
                status: 'success',
                duration: 3000,
                isClosable: true,
                position: 'top-right'
            });

            // Limpa o form e atualiza a lista
            setName('');
            setEsn('');
            setSelectedFarmId('');
            onSuccess();
            onClose();

        } catch (err) {
            // CORREÇÃO DO ERRO DO ESLINT:
            // Tratamos o erro como desconhecido e fazemos o cast para AxiosError
            const error = err as AxiosError<{ detail: string }>;
            const msg = error.response?.data?.detail || 'Ocorreu um erro ao criar a sonda.';

            toast({
                title: 'Erro',
                description: msg,
                status: 'error',
                duration: 4000,
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
                color="white"
                boxShadow="xl"
            >
                <ModalHeader borderBottomWidth="1px">
                    Adicionar Nova Sonda
                </ModalHeader>
                <ModalCloseButton />

                <ModalBody py={6}>
                    <VStack spacing={5}>
                        {/* Input Nome */}
                        <FormControl isRequired>
                            <FormLabel color="gray.400" fontSize="sm">Nome de Identificação</FormLabel>
                            <Input
                                placeholder="Ex: Pivô Central 01"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                bg={COLORS.surface}
                                borderColor={COLORS.textPrimary}
                                _hover={{ borderColor: 'gray.600' }}
                                _placeholder={{ color: 'gray.600' }}
                            />
                        </FormControl>

                        {/* Input ESN */}
                        <FormControl isRequired>
                            <FormLabel color="gray.400" fontSize="sm">ESN (Número de Série)</FormLabel>
                            <Input
                                placeholder="Ex: 0-324512"
                                value={esn}
                                onChange={(e) => setEsn(e.target.value)}
                                bg={COLORS.surface}
                                borderColor={COLORS.textPrimary}
                                _hover={{ borderColor: 'gray.600' }}
                                _placeholder={{ color: 'gray.600' }}
                            />
                        </FormControl>

                        {/* Select Fazenda */}
                        <FormControl isRequired>
                            <FormLabel color="gray.400" fontSize="sm">Vincular à Fazenda</FormLabel>
                            <Select
                                placeholder="Selecione a fazenda"
                                value={selectedFarmId}
                                onChange={(e) => setSelectedFarmId(e.target.value)}
                                bg={COLORS.surface}
                                borderColor={COLORS.textPrimary}
                                color="white"
                                _hover={{ borderColor: 'gray.600' }}
                                sx={{
                                    '> option': {
                                        background: '#222',
                                        color: 'white',
                                    },
                                }}
                            >
                                {farms.map(farm => (
                                    <option key={farm.id} value={farm.id}>
                                        {farm.name}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>
                    </VStack>
                </ModalBody>

                <ModalFooter borderTopWidth="1px">
                    <Button variant="ghost" mr={3} onClick={onClose} color={COLORS.textSecondary} _hover={{ bg: "whiteAlpha.100" }}>
                        Cancelar
                    </Button>
                    <Button
                        bg={COLORS.primary}
                        color="white"
                        _hover={{ bg: COLORS.primaryDark }}
                        onClick={handleSubmit}
                        isLoading={isLoading}
                        loadingText="Salvando"
                    >
                        Salvar Sonda
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}