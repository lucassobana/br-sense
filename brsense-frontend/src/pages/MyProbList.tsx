import { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Heading,
    Container,
    Spinner,
    useToast,
    Button,
    Flex,
    useDisclosure,
    Text
} from '@chakra-ui/react';
import { MdAdd } from 'react-icons/md';
import { getProbes, getFarms } from '../services/api'; // Import getFarms para o modal precisar
import { ProbeList } from '../components/ProbeList/ProbeList';
import { AddDeviceModal } from '../components/AddDeviceModal/AddDeviceModal';
import { COLORS } from '../colors/colors';
import type { Probe, Farm } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isUserAdmin } from '../services/auth';

export function MyProbes() {
    const navigate = useNavigate();
    const isAdmin = isUserAdmin();
    const [searchParams] = useSearchParams();
    const farmIdFilter = searchParams.get('farmId');

    const [probes, setProbes] = useState<Probe[]>([]);
    const [farms, setFarms] = useState<Farm[]>([]);
    const [loading, setLoading] = useState(true);

    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [probesData, farmsData] = await Promise.all([getProbes(), getFarms()]);
            
            let finalProbes = probesData;
            if (farmIdFilter) {
                finalProbes = probesData.filter(probe => probe.farm_id === Number(farmIdFilter));
            }

            setProbes(finalProbes);
            setFarms(farmsData);
        } catch (error) {
            console.error(error);
            toast({
                title: 'Erro ao carregar dados',
                description: 'Não foi possível buscar suas sondas.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast, farmIdFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleProbeSelect = (probe: Probe) => {
        navigate(`/?probeId=${probe.id}`); 
    };

    const defaultFarmId = farms.length > 0 ? farms[0].id : null;

    return (
        <Box minH="100vh" bg={COLORS.background} p={8}>
            <Container maxW="container.lg">
                <Flex justify="space-between" align="center" mb={8}>
                    <Box>
                        <Heading color={COLORS.textPrimary} size="lg">Minhas Sondas</Heading>
                        <Text color="gray.500" fontSize="sm" mt={1}>Gerenciamento de dispositivos</Text>
                    </Box>
                    {isAdmin && (
                        <Button
                        leftIcon={<MdAdd />}
                        bg={COLORS.primary}
                        color="white"
                        _hover={{ bg: COLORS.primaryDark }}
                        onClick={onOpen}
                        isDisabled={farms.length === 0} // Desabilita se não tiver fazenda para vincular
                        title={farms.length === 0 ? "Crie uma fazenda primeiro" : "Adicionar nova sonda"}
                    >
                        Nova Sonda
                        </Button>
                    )}
                    
                </Flex>

                {farms.length === 0 && !loading && (
                    <Box mb={4} p={3} bg="orange.900" borderRadius="md">
                        <Text color="orange.100" fontSize="sm">
                            Você precisa criar uma <b>Fazenda</b> antes de adicionar sondas.
                        </Text>
                    </Box>
                )}

                {loading ? (
                    <Flex justify="center" align="center" h="200px">
                        <Spinner size="xl" color={COLORS.primary} />
                    </Flex>
                ) : (
                    <ProbeList
                        probes={probes}
                        onSelect={handleProbeSelect}
                    />
                )}

                {/* Reutilizando o Modal existente */}
                {/* Nota: Idealmente, o modal deveria permitir escolher a fazenda se farmId for null. 
            Como o componente atual exige farmId, usaremos o da primeira fazenda ou teremos que refatorar o modal depois. */}
                <AddDeviceModal
                    isOpen={isOpen}
                    onClose={onClose}
                    farmId={defaultFarmId}
                    onSuccess={loadData}
                />
            </Container>
        </Box>
    );
}