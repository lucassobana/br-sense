import React, { useState, useEffect } from 'react';
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
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
  Text,
  VStack,
  HStack,
  IconButton,
  Box
} from '@chakra-ui/react';
import { MdEdit, MdDelete } from 'react-icons/md';
import { updateManualProbe, deleteManualProbe } from '../../services/api';
import type { ManualProbe } from '../../types';

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
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [irrigationMm, setIrrigationMm] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (probe) {
      setName(probe.name);
      setIrrigationMm(probe.irrigation_value_mm);
      setIsEditing(false);
    }
  }, [probe]);

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
        irrigation_value_mm: irrigationMm,
      });

      toast({
        title: 'Sucesso',
        description: 'Sonda manual atualizada.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onUpdated();
      setIsEditing(false);
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a sonda manual.',
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
        title: 'Excluída',
        description: 'Sonda manual removida.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      onUpdated();
      onClose();
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a sonda.',
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
          {isEditing ? 'Editar Sonda Manual' : 'Detalhes da Sonda Manual'}
          {!isEditing && (
            <HStack mr={8}>
              <IconButton
                aria-label="Editar"
                icon={<MdEdit />}
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
              />
              <IconButton
                aria-label="Excluir"
                icon={<MdDelete />}
                size="sm"
                colorScheme="red"
                variant="ghost"
                isLoading={isDeleting}
                onClick={handleDelete}
              />
            </HStack>
          )}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {isEditing ? (
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Nome da Sonda</FormLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  bg="gray.700"
                  border="none"
                  _focus={{ ring: 2, ringColor: "blue.400" }}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Valor de Irrigação (mm)</FormLabel>
                <NumberInput
                  value={irrigationMm}
                  onChange={(_, valueAsNumber) => setIrrigationMm(isNaN(valueAsNumber) ? 0 : valueAsNumber)}
                  min={0}
                  step={1}
                >
                  <NumberInputField 
                    bg="gray.700" 
                    border="none"
                    _focus={{ ring: 2, ringColor: "blue.400" }}
                  />
                  <NumberInputStepper>
                    <NumberIncrementStepper color="white" />
                    <NumberDecrementStepper color="white" />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
            </VStack>
          ) : (
            <VStack spacing={6} align="stretch" py={4}>
              <Box>
                <Text color="gray.400" fontSize="sm">Nome</Text>
                <Text fontSize="lg" fontWeight="bold">{probe.name}</Text>
              </Box>
              <Box>
                <Text color="gray.400" fontSize="sm">Irrigação (mm)</Text>
                <Text fontSize="3xl" fontWeight="bold" color="blue.400">{probe.irrigation_value_mm} mm</Text>
              </Box>
              <Box>
                <Text color="gray.400" fontSize="sm">Coordenadas</Text>
                <Text fontSize="sm" color="gray.300">
                  Lat: {probe.latitude.toFixed(6)} | Lng: {probe.longitude.toFixed(6)}
                </Text>
              </Box>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          {isEditing ? (
            <>
              <Button colorScheme="blue" mr={3} onClick={handleSave} isLoading={isSubmitting}>
                Salvar
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="ghost" _hover={{ bg: "gray.700" }}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button onClick={onClose} colorScheme="blue">
              Fechar
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
