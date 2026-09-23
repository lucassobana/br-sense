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
  VStack,
  useToast,
  HStack
} from '@chakra-ui/react';
import { updateManualIrrigation } from '../../services/api';
import type { ManualIrrigationRecord } from '../../types';

interface EditIrrigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ManualIrrigationRecord | null;
  onUpdated: () => void;
}

export const EditIrrigationModal: React.FC<EditIrrigationModalProps> = ({
  isOpen,
  onClose,
  record,
  onUpdated,
}) => {
  const [irrigationMm, setIrrigationMm] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (record && isOpen) {
      setIrrigationMm(String(record.irrigation_value_mm));
      const d = new Date(record.date);
      // Format YYYY-MM-DD
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
      
      // Format HH:mm
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      setTime(`${hh}:${min}`);
    }
  }, [record, isOpen]);

  if (!record) return null;

  const handleSave = async () => {
    if (!irrigationMm || !date || !time) {
      toast({
        title: 'Preencha todos os campos',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const isoDate = new Date(`${date}T${time}:00`).toISOString();
      await updateManualIrrigation(record.id, {
        irrigation_value_mm: parseFloat(irrigationMm.replace(',', '.')),
        date: isoDate,
      });

      toast({
        title: 'Sucesso',
        description: 'Irrigação atualizada.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onUpdated();
      onClose();
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a irrigação.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm">
      <ModalOverlay />
      <ModalContent bg="gray.800" color="white">
        <ModalHeader>Editar Irrigação</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>Volume (mm)</FormLabel>
              <Input
                type="number"
                step="0.1"
                value={irrigationMm}
                onChange={(e) => setIrrigationMm(e.target.value)}
                bg="gray.700"
                border="none"
                _focus={{ ring: 2, ringColor: "blue.400" }}
              />
            </FormControl>

            <HStack spacing={4}>
              <FormControl>
                <FormLabel>Data</FormLabel>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  bg="gray.700"
                  border="none"
                  _focus={{ ring: 2, ringColor: "blue.400" }}
                  css={{ '::-webkit-calendar-picker-indicator': { filter: 'invert(1)' } }}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Hora</FormLabel>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  bg="gray.700"
                  border="none"
                  _focus={{ ring: 2, ringColor: "blue.400" }}
                  css={{ '::-webkit-calendar-picker-indicator': { filter: 'invert(1)' } }}
                />
              </FormControl>
            </HStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="red" variant="ghost" mr={3} onClick={onClose}>
            Cancelar
          </Button>
          <Button colorScheme="blue" onClick={handleSave} isLoading={isSubmitting}>
            Salvar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
