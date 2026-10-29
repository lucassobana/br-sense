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
  Select,
  Text,
  Grid,
  Box,
  Divider,
  HStack,
} from '@chakra-ui/react';
import { updateManualProbe, deleteManualProbe, getUserFarms } from '../../services/api';
import type { ManualProbe, Farm } from '../../types';
import type { SoilSettings } from '../../modules/soil/types';

const CROP_OPTIONS = [
  'Soja',
  'Milho',
  'Feijão',
  'Algodão',
  'Trigo',
  'Café',
  'Pastagem',
  'Sorgo',
  'Tomate',
  'Batata',
  'Cenoura',
  'Alho',
  'Aveia',
  'Mamona',
  'Beterraba',
  'Outra',
];

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
  const [selectedCrop, setSelectedCrop] = useState('Soja');
  const [customCrop, setCustomCrop] = useState('');
  const [dataPlantio, setDataPlantio] = useState('');
  const [efficiencyPct, setEfficiencyPct] = useState<number>(90);
  const [rootDepthM, setRootDepthM] = useState<string>('');
  const [soilProtocol, setSoilProtocol] = useState<'10kPa' | '33kPa'>('10kPa');
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
      console.error('Erro ao buscar fazendas', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadFarms();
    }
    if (probe) {
      setName(probe.name || '');
      setSelectedFarmId(probe.farm_id ? String(probe.farm_id) : '');
      setLat(probe.latitude ? String(probe.latitude) : '');
      setLng(probe.longitude ? String(probe.longitude) : '');
      setIrrigationMm(probe.irrigation_value_mm ?? 0);
      setDataPlantio(probe.data_plantio ? probe.data_plantio.split('T')[0] : '');
      setPotenciaCv(probe.potencia_cv ?? '');

      // Cultura
      const existingCrop = probe.cultura?.trim() || '';
      if (existingCrop) {
        const normalize = (s: string) =>
          s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const found = CROP_OPTIONS.find(
          (c) => normalize(c) === normalize(existingCrop)
        );
        if (found && found !== 'Outra') {
          setSelectedCrop(found);
          setCustomCrop('');
        } else {
          setSelectedCrop('Outra');
          setCustomCrop(existingCrop);
        }
      } else {
        setSelectedCrop('Soja');
        setCustomCrop('');
      }

      // Carrega parâmetros de solo persistidos localmente
      const savedSettings = localStorage.getItem(`brsense_soil_settings_${probe.id}`);
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.fieldCapacityReference) {
            setSoilProtocol(parsed.fieldCapacityReference);
          }
          if (parsed.effectiveRootDepthM != null) {
            setRootDepthM(String(parsed.effectiveRootDepthM));
          } else {
            setRootDepthM('');
          }
          if (parsed.irrigationEfficiency != null) {
            setEfficiencyPct(Math.round(parsed.irrigationEfficiency * 100));
          }
        } catch {
          // Ignora
        }
      } else {
        setSoilProtocol('10kPa');
        setRootDepthM('');
        setEfficiencyPct(90);
      }
    }
  }, [probe, isOpen, loadFarms]);

  if (!probe) return null;

  const finalCultura = selectedCrop === 'Outra' ? customCrop : selectedCrop;

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira um nome para o pin.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const parsedLat = lat ? parseFloat(lat.replace(',', '.')) : probe.latitude;
      const parsedLng = lng ? parseFloat(lng.replace(',', '.')) : probe.longitude;

      await updateManualProbe(probe.id, {
        name: name.trim(),
        farm_id: selectedFarmId ? Number(selectedFarmId) : undefined,
        latitude: parsedLat,
        longitude: parsedLng,
        irrigation_value_mm: irrigationMm,
        cultura: finalCultura.trim() || undefined,
        data_plantio: dataPlantio || undefined,
        potencia_cv: potenciaCv !== '' ? Number(potenciaCv) : undefined,
      });

      // Atualiza as configurações de balanço hídrico salvas
      const key = `brsense_soil_settings_${probe.id}`;
      let existingSettings: Partial<SoilSettings> = {};
      try {
        const stored = localStorage.getItem(key);
        if (stored) existingSettings = JSON.parse(stored) as Partial<SoilSettings>;
      } catch {
        // Ignora
      }

      const updatedSettings: SoilSettings = {
        overrides: existingSettings.overrides || {},
        ...existingSettings,
        coordinateKey: `${parsedLat},${parsedLng}`,
        fieldCapacityReference: soilProtocol,
        effectiveRootDepthM: rootDepthM ? Number(rootDepthM) : null,
        irrigationEfficiency: (efficiencyPct || 90) / 100,
      };
      localStorage.setItem(key, JSON.stringify(updatedSettings));

      toast({
        title: 'Sucesso',
        description: 'Pin manual atualizado com sucesso.',
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
    if (!window.confirm(`Tem certeza que deseja excluir o pin "${probe.name}"?`)) return;

    try {
      setIsDeleting(true);
      await deleteManualProbe(probe.id);
      localStorage.removeItem(`brsense_soil_settings_${probe.id}`);

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
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg="gray.800" color="white" borderRadius="xl" border="1px solid" borderColor="gray.700">
        <ModalHeader borderBottom="1px solid" borderColor="gray.700">
          Editar Pin Manual
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6} pt={4}>
          {farms.length > 0 && (
            <FormControl mb={4}>
              <FormLabel fontSize="sm">Fazenda</FormLabel>
              <Select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                bg="gray.700"
                border="none"
                _focus={{ ring: 2, ringColor: "blue.400" }}
                size="sm"
                borderRadius="md"
              >
                <option value="" style={{ background: '#2D3748', color: 'white' }}>
                  Sem Fazenda
                </option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id} style={{ background: '#2D3748', color: 'white' }}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl isRequired mb={4}>
            <FormLabel fontSize="sm">Nome do Pin</FormLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              bg="gray.700"
              border="none"
              _focus={{ ring: 2, ringColor: "blue.400" }}
              size="sm"
              borderRadius="md"
            />
          </FormControl>

          {/* Dados Agronômicos para o Balanço Hídrico */}
          <Box mb={4} p={3.5} bg="gray.900" borderRadius="lg" border="1px solid" borderColor="gray.700">
            <Text fontSize="xs" fontWeight="bold" color="blue.300" textTransform="uppercase" letterSpacing="wider" mb={3}>
              Parâmetros de Balanço Hídrico (FAO-56)
            </Text>

            <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)' }} gap={3} mb={3}>
              <FormControl isRequired>
                <FormLabel fontSize="xs">Cultura</FormLabel>
                <Select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  bg="gray.700"
                  border="none"
                  _focus={{ ring: 2, ringColor: "blue.400" }}
                  size="sm"
                  borderRadius="md"
                >
                  {CROP_OPTIONS.map((c) => (
                    <option key={c} value={c} style={{ background: '#2D3748', color: 'white' }}>
                      {c}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs">Data de Plantio (DAP)</FormLabel>
                <Input
                  type="date"
                  value={dataPlantio}
                  onChange={(e) => setDataPlantio(e.target.value)}
                  bg="gray.700"
                  border="none"
                  _focus={{ ring: 2, ringColor: "blue.400" }}
                  size="sm"
                  borderRadius="md"
                  css={{ '::-webkit-calendar-picker-indicator': { filter: 'invert(1)' } }}
                />
              </FormControl>
            </Grid>

            {selectedCrop === 'Outra' && (
              <FormControl mb={3}>
                <FormLabel fontSize="xs">Nome da Cultura Personalizada</FormLabel>
                <Input
                  placeholder="Digite o nome da cultura"
                  value={customCrop}
                  onChange={(e) => setCustomCrop(e.target.value)}
                  bg="gray.700"
                  border="none"
                  _focus={{ ring: 2, ringColor: "blue.400" }}
                  size="sm"
                  borderRadius="md"
                />
              </FormControl>
            )}

            <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)' }} gap={3}>
              <FormControl>
                <FormLabel fontSize="xs">Eficiência do Sistema (%)</FormLabel>
                <Input
                  type="number"
                  min="50"
                  max="100"
                  value={efficiencyPct}
                  onChange={(e) => setEfficiencyPct(Number(e.target.value))}
                  bg="gray.700"
                  border="none"
                  _focus={{ ring: 2, ringColor: "blue.400" }}
                  size="sm"
                  borderRadius="md"
                />
                <Text fontSize="10px" color="gray.400" mt={1}>
                  Padrão 90% (Pivô Central: 85-92%, Gotejamento: 95%)
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs">Profundidade das Raízes (m)</FormLabel>
                <Input
                  type="number"
                  step="0.05"
                  min="0.10"
                  max="2.00"
                  placeholder="Automático pela FAO"
                  value={rootDepthM}
                  onChange={(e) => setRootDepthM(e.target.value)}
                  bg="gray.700"
                  border="none"
                  _focus={{ ring: 2, ringColor: "blue.400" }}
                  size="sm"
                  borderRadius="md"
                />
                <Text fontSize="10px" color="gray.400" mt={1}>
                  Vazio = crescimento automático da cultura
                </Text>
              </FormControl>
            </Grid>

            <FormControl mt={3}>
              <FormLabel fontSize="xs">Protocolo de Capacidade de Campo (CC)</FormLabel>
              <Select
                value={soilProtocol}
                onChange={(e) => setSoilProtocol(e.target.value as '10kPa' | '33kPa')}
                bg="gray.700"
                border="none"
                _focus={{ ring: 2, ringColor: "blue.400" }}
                size="sm"
                borderRadius="md"
              >
                <option value="10kPa" style={{ background: '#2D3748', color: 'white' }}>
                  10 kPa (Padrão para solos arenosos e texturas médias)
                </option>
                <option value="33kPa" style={{ background: '#2D3748', color: 'white' }}>
                  33 kPa (Solos muito argilosos)
                </option>
              </Select>
            </FormControl>
          </Box>

          {/* Dados Adicionais */}
          <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)' }} gap={3} mb={3}>
            <FormControl>
              <FormLabel fontSize="xs">Potência do Pivô (CV)</FormLabel>
              <Input
                type="number"
                placeholder="Ex: 50"
                value={potenciaCv}
                onChange={(e) => setPotenciaCv(e.target.value ? Number(e.target.value) : '')}
                bg="gray.700"
                border="none"
                _focus={{ ring: 2, ringColor: "blue.400" }}
                size="sm"
                borderRadius="md"
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="xs">Irrigação Acumulada Total (mm)</FormLabel>
              <Input
                type="number"
                step="0.1"
                value={irrigationMm}
                onChange={(e) => setIrrigationMm(Number(e.target.value))}
                bg="gray.700"
                border="none"
                _focus={{ ring: 2, ringColor: "blue.400" }}
                size="sm"
                borderRadius="md"
              />
            </FormControl>
          </Grid>

          {/* Coordenadas */}
          <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)' }} gap={3}>
            <FormControl>
              <FormLabel fontSize="xs">Latitude</FormLabel>
              <Input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                bg="gray.700"
                border="none"
                _focus={{ ring: 2, ringColor: "blue.400" }}
                size="sm"
                borderRadius="md"
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs">Longitude</FormLabel>
              <Input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                bg="gray.700"
                border="none"
                _focus={{ ring: 2, ringColor: "blue.400" }}
                size="sm"
                borderRadius="md"
              />
            </FormControl>
          </Grid>
        </ModalBody>

        <Divider borderColor="gray.700" />

        <ModalFooter display="flex" justifyContent="space-between">
          <Button colorScheme="red" variant="ghost" onClick={handleDelete} isLoading={isDeleting} size="sm">
            Excluir Pin
          </Button>
          <HStack spacing={2}>
            <Button onClick={onClose} variant="ghost" colorScheme="red" size="sm">
              Cancelar
            </Button>
            <Button colorScheme="blue" onClick={handleSave} isLoading={isSubmitting} size="sm">
              Salvar Alterações
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

