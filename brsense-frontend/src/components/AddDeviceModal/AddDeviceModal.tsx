import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
    ModalBody, ModalCloseButton, Button, FormControl, FormLabel,
    Input, Select, VStack, Stack, useToast, Text
} from '@chakra-ui/react';
import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import { createDevice, getUserFarms, updateDeviceAdmin } from '../../services/api';
import type { Farm, Probe } from '../../types';
import { COLORS } from '../../colors/colors';

interface AddDeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    farmId?: number | null;
    initialData?: Probe | null;
}

export function AddDeviceModal({ isOpen, onClose, onSuccess, farmId, initialData }: AddDeviceModalProps) {
    const toast = useToast();
    const isEditMode = !!initialData;

    const [name, setName] = useState('');
    const [esn, setEsn] = useState('');
    const [selectedFarmId, setSelectedFarmId] = useState('');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [locationMode, setLocationMode] = useState<'latest' | 'manual'>('latest');
    const [cultura, setCultura] = useState('');
    const [dataPlantio, setDataPlantio] = useState('');

    const [farms, setFarms] = useState<Farm[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadFarms = useCallback(async () => {
        try {
            const data = await getUserFarms();
            setFarms(data);
        } catch (error) {
            console.error("Erro ao buscar fazendas", error);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadFarms();
            if (initialData) {
                setName(initialData.name || '');
                setEsn(initialData.esn || '');
                setSelectedFarmId(initialData.farm_id ? String(initialData.farm_id) : '');
                setLat(initialData.latitude ? String(initialData.latitude) : '');
                setLng(initialData.longitude ? String(initialData.longitude) : '');
                setLocationMode('manual');
                setCultura(initialData.cultura || '');
                setDataPlantio(initialData.data_plantio ? initialData.data_plantio.split('T')[0] : '');
            } else {
                setName('');
                setEsn('');
                setLat('');
                setLng('');
                setLocationMode('latest');
                setCultura('');
                setDataPlantio('');
                setSelectedFarmId(farmId ? String(farmId) : '');
            }
        }
    }, [isOpen, loadFarms, initialData, farmId]);

    const handleSubmit = async () => {
        if (!name || !esn) {
            toast({ title: 'Dados incompletos', status: 'warning' });
            return;
        }

        if (!selectedFarmId) {
            toast({ title: 'Selecione uma fazenda', status: 'warning' });
            return;
        }

        try {
            setIsLoading(true);
            const shouldUseManualLocation = isEditMode || locationMode === 'manual';
            const latitude = shouldUseManualLocation && lat ? parseFloat(lat.replace(',', '.')) : undefined;
            const longitude = shouldUseManualLocation && lng ? parseFloat(lng.replace(',', '.')) : undefined;

            if (shouldUseManualLocation && (latitude === undefined || longitude === undefined || Number.isNaN(latitude) || Number.isNaN(longitude))) {
                toast({ title: 'Informe latitude e longitude válidas', status: 'warning' });
                return;
            }

            if (isEditMode && initialData) {
                await updateDeviceAdmin(initialData.esn, {
                    name,
                    farm_id: selectedFarmId ? Number(selectedFarmId) : undefined,
                    cultura,
                    data_plantio: dataPlantio || undefined,
                    latitude,
                    longitude
                });
                toast({ title: 'Sonda atualizada!', status: 'success' });
            } else {
                await createDevice({
                    name, esn,
                    farm_id: Number(selectedFarmId),
                    latitude, longitude
                });
                toast({ title: 'Sonda Vinculada!', status: 'success' });
            }

            onSuccess();
            onClose();
        } catch (err) {
            const error = err as AxiosError<{ detail: string }>;
            toast({ title: 'Falha na operação', description: error.response?.data?.detail, status: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size={{ base: "sm", md: "md" }}>
            <ModalOverlay />
            <ModalContent bg={COLORS.surface} borderWidth="1px" borderColor="#2D2D2D" color="white" mx={4}>
                <ModalHeader borderBottomWidth="1px" borderColor="#2D2D2D">
                    {isEditMode ? `Editar Sonda (${initialData.esn})` : 'Vincular Sonda (Admin)'}
                </ModalHeader>
                <ModalCloseButton />

                <ModalBody py={{ base: 4, md: 6 }}>
                    <VStack spacing={4} align="stretch">
                        {!isEditMode && <Text fontSize="xs" color="gray.400">Insira o ESN da sonda física para associá-la a um cliente.</Text>}

                        <FormControl isRequired>
                            <FormLabel color="gray.300" fontSize="sm">ESN (Identificador Globalstar)</FormLabel>
                            <Input value={esn} onChange={(e) => setEsn(e.target.value)} isDisabled={isEditMode} bg={COLORS.background} border="none" />
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel color="gray.300" fontSize="sm">Nome Amigável</FormLabel>
                            <Input value={name} onChange={(e) => setName(e.target.value)} bg={COLORS.background} border="none" />
                        </FormControl>

                        <FormControl>
                            <FormLabel color="gray.300" fontSize="sm">Fazenda do Cliente</FormLabel>
                            <Select placeholder="Sem Fazenda" value={selectedFarmId} onChange={(e) => setSelectedFarmId(e.target.value)} bg={COLORS.background} border="none">
                                {farms.map(farm => <option key={farm.id} value={farm.id} style={{color: 'black'}}>{farm.name}</option>)}
                            </Select>
                        </FormControl>

                        {/* Alterado para Stack Responsivo */}
                        <Stack direction={{ base: "column", sm: "row" }} spacing={4}>
                            <FormControl>
                                <FormLabel color="gray.300" fontSize="sm">Cultura</FormLabel>
                                <Input placeholder="Ex: Soja" value={cultura} onChange={(e) => setCultura(e.target.value)} bg={COLORS.background} border="none" />
                            </FormControl>
                            <FormControl>
                                <FormLabel color="gray.300" fontSize="sm">Data Plantio</FormLabel>
                                <Input type="date" value={dataPlantio} onChange={(e) => setDataPlantio(e.target.value)} bg={COLORS.background} border="none" css={{ '::-webkit-calendar-picker-indicator': { filter: 'invert(1)' } }} />
                            </FormControl>
                        </Stack>

                        {(isEditMode || locationMode === 'manual') && (
                            <Stack direction={{ base: "column", sm: "row" }} spacing={4}>
                                <FormControl isRequired={!isEditMode && locationMode === 'manual'}>
                                    <FormLabel color="gray.300" fontSize="sm">Latitude</FormLabel>
                                    <Input value={lat} onChange={(e) => setLat(e.target.value)} bg={COLORS.background} border="none" type="number" step="any" />
                                </FormControl>
                                <FormControl isRequired={!isEditMode && locationMode === 'manual'}>
                                    <FormLabel color="gray.300" fontSize="sm">Longitude</FormLabel>
                                    <Input value={lng} onChange={(e) => setLng(e.target.value)} bg={COLORS.background} border="none" type="number" step="any" />
                                </FormControl>
                            </Stack>
                        )}
                    </VStack>
                </ModalBody>

                <ModalFooter borderTopWidth="1px" borderColor="#2D2D2D" gap={2}>
                    <Button variant="ghost" onClick={onClose} color="gray.400" _hover={{ bg: "whiteAlpha.100" }} flex={{ base: 1, md: "initial" }}>
                        Cancelar
                    </Button>
                    <Button bg={COLORS.primary} color="white" onClick={handleSubmit} isLoading={isLoading} flex={{ base: 1, md: "initial" }}>
                        {isEditMode ? 'Salvar' : 'Salvar e Vincular'}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
