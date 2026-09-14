import React, { useState, useEffect, useCallback } from 'react';
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
  useToast,
  VStack,
  HStack,
  Box
} from '@chakra-ui/react';
import { updateManualProbe, deleteManualProbe, getUserFarms } from '../../services/api';
import type { ManualProbe, Farm } from '../../types';

interface ManualProbeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  probe: ManualProbe | null;
  onUpdated: () => void;
}

export const ManualProbeDetailsModal: React.FC<ManualProbeDetailsModalProps> = ({
  isOpen,
  onClose,
  probe,
  onUpdated,
}) => {
  const [name, setName] = useState('');
  const [irrigationMm, setIrrigationMm] = useState<number>(0);
  const [cultura, setCultura] = useState('');
  const [dataPlantio, setDataPlantio] = useState('');
  const [potenciaCv, setPotenciaCv] = useState<number | ''>('');
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [farms, setFarms] = useState<Farm[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

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
    }
    if (probe) {
      setName(probe.name);
      setSelectedFarmId(probe.farm_id ? String(probe.farm_id) : '');
      setLat(probe.latitude ? String(probe.latitude) : '');
      setLng(probe.longitude ? String(probe.longitude) : '');
      setIrrigationMm(probe.irrigation_value_mm);
      setCultura(probe.cultura || '');
      setDataPlantio(probe.data_plantio ? probe.data_plantio.split('T')[0] : '');
      setPotenciaCv(probe.potencia_cv ?? '');
    }
  }, [probe, isOpen, loadFarms]);

  if (!probe) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await updateManualProbe(probe.id, {
        name,
        farm_id: selectedFarmId ? Number(selectedFarmId) : undefined,
        latitude: lat ? parseFloat(lat.replace(',', '.')) : undefined,
        longitude: lng ? parseFloat(lng.replace(',', '.')) : undefined,
        irrigation_value_mm: irrigationMm,
        cultura,
        data_plantio: dataPlantio || undefined,
        potencia_cv: potenciaCv !== '' ? Number(potenciaCv) : undefined,
      });

      toast({
        title: 'Sucesso',
        description: 'Pin manual atualizado.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onUpdated();
      onClose();
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o pin manual.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir a sonda "${probe.name}"?`)) return;

    try {
      setIsDeleting(true);
      await deleteManualProbe(probe.id);

      toast({
        title: 'Excluído',
        description: 'Pin manual removido.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      onUpdated();
      onClose();
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o pin manual.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent bg="gray.800" color="white">
        <ModalHeader display="flex" justifyContent="space-between" alignItems="center">
          Editar Pin Manual
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Nome do Pin</FormLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  bg="gray.700"
                  border="none"
                  _focus={{ ring: 2, ringColor: "blue.400" }}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Fazenda do Cliente</FormLabel>
                <Box as="select"
                  value={selectedFarmId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedFarmId(e.target.value)}
                  w="100%" h="40px" borderRadius="md" px={4} bg="gray.700" color="white"
                  border="none" outline="none" _focus={{ ring: 2, ringColor: "blue.400" }}
                >
                  <option value="" style={{ background: '#2d3748', color: 'white' }}>Sem Fazenda</option>
                  {farms.map(f => (
                    <option key={f.id} value={f.id} style={{ background: '#2d3748', color: 'white' }}>
                      {f.name}
                    </option>
                  ))}
                </Box>
              </FormControl>

              <HStack spacing={4}>
                <FormControl>
                  <FormLabel>Cultura</FormLabel>
                  <Input placeholder="Ex: Soja" value={cultura} onChange={(e) => setCultura(e.target.value)} bg="gray.700" border="none" _focus={{ ring: 2, ringColor: "blue.400" }} />
                </FormControl>
                <FormControl>
                  <FormLabel>Data Plantio</FormLabel>
                  <Input type="date" value={dataPlantio} onChange={(e) => setDataPlantio(e.target.value)} bg="gray.700" border="none" _focus={{ ring: 2, ringColor: "blue.400" }} css={{ '::-webkit-calendar-picker-indicator': { filter: 'invert(1)' } }} />
                </FormControl>
                <FormControl>
                  <FormLabel>CV do Pivô</FormLabel>
                  <Input type="number" placeholder="Ex: 50" value={potenciaCv} onChange={(e) => setPotenciaCv(e.target.value ? Number(e.target.value) : '')} bg="gray.700" border="none" _focus={{ ring: 2, ringColor: "blue.400" }} />
                </FormControl>
              </HStack>

              <HStack spacing={4}>
                <FormControl>
                  <FormLabel>Latitude</FormLabel>
                  <Input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} bg="gray.700" border="none" _focus={{ ring: 2, ringColor: "blue.400" }} />
                </FormControl>
                <FormControl>
                  <FormLabel>Longitude</FormLabel>
                  <Input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} bg="gray.700" border="none" _focus={{ ring: 2, ringColor: "blue.400" }} />
                </FormControl>
              </HStack>
            </VStack>
        </ModalBody>

        <ModalFooter display="flex" justifyContent="space-between">
          <Button colorScheme="red" variant="ghost" onClick={handleDelete} isLoading={isDeleting}>
            Excluir
          </Button>
          <HStack>
            <Button variant="ghost" _hover={{ bg: "gray.700" }} onClick={onClose}>
              Cancelar
            </Button>
            <Button colorScheme="blue" onClick={handleSave} isLoading={isSubmitting}>
              Salvar
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
