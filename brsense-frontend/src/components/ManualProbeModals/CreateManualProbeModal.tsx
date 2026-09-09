import React, { useState } from 'react';
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
  Select
} from '@chakra-ui/react';
import { createManualProbe } from '../../services/api';

interface CreateManualProbeModalProps {
  isOpen: boolean;
  onClose: () => void;
  farms: { id: number; name: string }[];
  latitude: number;
  longitude: number;
  onCreated: () => void;
}

export const CreateManualProbeModal: React.FC<CreateManualProbeModalProps> = ({
  isOpen,
  onClose,
  farms,
  latitude,
  longitude,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [irrigationMm, setIrrigationMm] = useState<number>(0);
  const [cultura, setCultura] = useState('');
  const [dataPlantio, setDataPlantio] = useState('');
  const [potenciaCv, setPotenciaCv] = useState<number | ''>('');
  const [selectedFarmId, setSelectedFarmId] = useState<number>(farms.length > 0 ? farms[0].id : 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira um nome para a sonda.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await createManualProbe({
        farm_id: selectedFarmId,
        name,
        latitude,
        longitude,
        irrigation_value_mm: irrigationMm,
      });

      toast({
        title: 'Sucesso',
        description: 'Pin manual criada com sucesso.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onCreated();
      onClose();
      // Reset form
      setName('');
      setIrrigationMm(0);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o pin manual.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent bg="gray.800" color="white">
        <ModalHeader>Adicionar Pin Manual</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {farms.length > 1 && (
            <FormControl mb={4}>
              <FormLabel>Fazenda</FormLabel>
              <Select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(Number(e.target.value))}
                bg="gray.700"
                border="none"
                _focus={{ ring: 2, ringColor: "blue.400" }}
              >
                {farms.map(f => (
                  <option key={f.id} value={f.id} style={{ background: '#2d3748', color: 'white' }}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl>
            <FormLabel>Nome do Pin</FormLabel>
            <Input
              placeholder="Ex: Talhão 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              bg="gray.700"
              border="none"
              _focus={{ ring: 2, ringColor: "blue.400" }}
            />
          </FormControl>

          <FormControl mt={4}>
            <FormLabel>Cultura</FormLabel>
            <Input
              placeholder="Ex: Soja"
              value={cultura}
              onChange={(e) => setCultura(e.target.value)}
              bg="gray.700"
              border="none"
              _focus={{ ring: 2, ringColor: "blue.400" }}
            />
          </FormControl>

          <FormControl mt={4}>
            <FormLabel>Data Plantio</FormLabel>
            <Input
              type="date"
              value={dataPlantio}
              onChange={(e) => setDataPlantio(e.target.value)}
              bg="gray.700"
              border="none"
              _focus={{ ring: 2, ringColor: "blue.400" }}
              css={{ '::-webkit-calendar-picker-indicator': { filter: 'invert(1)' } }}
            />
          </FormControl>

          <FormControl mt={4}>
            <FormLabel>CV do Pivô</FormLabel>
            <Input
              type="number"
              placeholder="Ex: 50"
              value={potenciaCv}
              onChange={(e) => setPotenciaCv(e.target.value ? Number(e.target.value) : '')}
              bg="gray.700"
              border="none"
              _focus={{ ring: 2, ringColor: "blue.400" }}
            />
          </FormControl>

          <FormControl mt={4}>
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
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={handleSave} isLoading={isSubmitting}>
            Salvar
          </Button>
          <Button onClick={onClose} variant="ghost" _hover={{ bg: "gray.700" }}>
            Cancelar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
