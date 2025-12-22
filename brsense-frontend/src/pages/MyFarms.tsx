// brsense-frontend/src/pages/MyFarms.tsx
import { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Heading,
    Container,
    Spinner,
    useToast,
    Button,
    Flex,
    useDisclosure // 1. IMPORTANTE: Importar useDisclosure
} from '@chakra-ui/react';
import { MdAdd } from 'react-icons/md';
import { getUserFarms } from '../services/api';
import { FarmList } from '../components/FarmList/FarmList';
import { CreateFarmModal } from '../components/CreateFarmModal/CreateFarmModal'; // 2. Importar o Modal
import type { Farm } from '../types';
import { COLORS } from '../colors/colors';

export function MyFarms() {
    const [farms, setFarms] = useState<Farm[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();
    const toastId = 'farm-error-toast';

    // 3. ATIVAR O HOOK DO MODAL
    const { isOpen, onOpen, onClose } = useDisclosure();

    const loadFarms = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getUserFarms();
            setFarms(data);
        } catch (error) {
            console.error(error);
            // Verifica se o toast já não está ativo para não duplicar
            if (!toast.isActive(toastId)) {
                toast({
                    id: toastId, // Define o ID
                    title: 'Erro ao carregar fazendas',
                    description: 'Não foi possível buscar sua lista de fazendas.',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            }
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadFarms();
    }, [loadFarms]);

    const handleFarmSelect = (farm: Farm) => {
        console.log("Fazenda selecionada:", farm);
        // Futuro: navigate(`/farms/${farm.id}`);
    };

    return (
        <Box minH="100vh" bg={COLORS.background} p={8}>
            <Container maxW="container.lg">
                <Flex justify="space-between" align="center" mb={8}>
                    <Heading color={COLORS.textPrimary} size="lg">Minhas Fazendas</Heading>

                    <Button
                        leftIcon={<MdAdd />}
                        bg={COLORS.primary}
                        color="white"
                        _hover={{ bg: COLORS.primaryDark }}
                        onClick={onOpen}  // 4. ATIVAR O CLIQUE AQUI
                    >
                        Nova Fazenda
                    </Button>
                </Flex>

                {loading ? (
                    <Flex justify="center" align="center" h="200px">
                        <Spinner size="xl" color={COLORS.primary} />
                    </Flex>
                ) : (
                    <FarmList
                        farms={farms}
                        onSelect={handleFarmSelect}
                    />
                )}

                {/* 5. RENDERIZAR O MODAL AQUI */}
                <CreateFarmModal
                    isOpen={isOpen}
                    onClose={onClose}
                    onSuccess={loadFarms}
                />
            </Container>
        </Box>
    );
}