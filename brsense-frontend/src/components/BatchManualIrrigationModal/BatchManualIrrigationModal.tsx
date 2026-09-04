import { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  Checkbox,
  Box,
  useToast,
  Flex,
  Icon
} from "@chakra-ui/react";
import { FaTint } from "react-icons/fa";
import { addManualIrrigation } from "../../services/api";
import type { ManualProbe } from "../../types";

interface BatchManualIrrigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  manualProbes: ManualProbe[];
  onSuccess: () => void;
}

export function BatchManualIrrigationModal({
  isOpen,
  onClose,
  manualProbes,
  onSuccess,
}: BatchManualIrrigationModalProps) {
  const [selectedProbes, setSelectedProbes] = useState<number[]>([]);
  const [valueMm, setValueMm] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      // Formata data e hora local
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setDate(now.toISOString().slice(0, 16));
      setValueMm("");
      // Reset selected probes when opening
      setSelectedProbes([]);
    }
  }, [isOpen]);

  const toggleProbe = (id: number) => {
    setSelectedProbes((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedProbes.length === manualProbes.length) {
      setSelectedProbes([]);
    } else {
      setSelectedProbes(manualProbes.map((p) => p.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedProbes.length === 0) {
      toast({
        title: "Seleção inválida",
        description: "Selecione pelo menos uma sonda manual.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const mmValue = parseFloat(valueMm);
    if (isNaN(mmValue) || mmValue <= 0) {
      toast({
        title: "Valor inválido",
        description: "Insira um valor válido de lâmina d'água (mm).",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!date) {
      toast({
        title: "Data inválida",
        description: "Insira a data e hora da irrigação.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDate = new Date(date).toISOString();
      await Promise.all(
        selectedProbes.map((probeId) =>
          addManualIrrigation(probeId, {
            irrigation_value_mm: mmValue,
            date: formattedDate,
          })
        )
      );

      toast({
        title: "Sucesso!",
        description: `Irrigação adicionada a ${selectedProbes.length} sonda(s).`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar as sondas.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const allSelected = manualProbes.length > 0 && selectedProbes.length === manualProbes.length;
  const isIndeterminate = selectedProbes.length > 0 && selectedProbes.length < manualProbes.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg="gray.800" border="1px solid" borderColor="gray.700" color="white">
        <ModalHeader borderBottom="1px solid" borderColor="gray.700">
          <Flex align="center" gap={3}>
            <Flex
              w={10}
              h={10}
              borderRadius="lg"
              bg="blue.500"
              align="center"
              justify="center"
            >
              <Icon as={FaTint} color="white" boxSize={5} />
            </Flex>
            <Box>
              <Text fontSize="lg" fontWeight="bold">
                Irrigação em Massa
              </Text>
              <Text fontSize="sm" color="gray.400" fontWeight="normal">
                Atualize múltiplas sondas manuais
              </Text>
            </Box>
          </Flex>
        </ModalHeader>
        <ModalCloseButton mt={3} />

        <ModalBody py={6}>
          <VStack spacing={6} align="stretch">
            {/* Input Fields */}
            <HStack spacing={4}>
              <Box flex="1">
                <Text fontSize="sm" color="gray.400" mb={1} fontWeight="medium">
                  Lâmina d'água (mm)
                </Text>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={valueMm}
                  onChange={(e) => setValueMm(e.target.value)}
                  bg="gray.900"
                  border="1px solid"
                  borderColor="gray.700"
                  _hover={{ borderColor: "blue.500" }}
                  _focus={{ borderColor: "blue.400", boxShadow: "none" }}
                  color="white"
                />
              </Box>
              <Box flex="1">
                <Text fontSize="sm" color="gray.400" mb={1} fontWeight="medium">
                  Data e Hora
                </Text>
                <Input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  bg="gray.900"
                  border="1px solid"
                  borderColor="gray.700"
                  _hover={{ borderColor: "blue.500" }}
                  _focus={{ borderColor: "blue.400", boxShadow: "none" }}
                  color="white"
                  css={{
                    "&::-webkit-calendar-picker-indicator": {
                      filter: "invert(1)",
                      cursor: "pointer",
                    },
                  }}
                />
              </Box>
            </HStack>

            <Box>
              <Flex justify="space-between" align="center" mb={3}>
                <Text fontSize="sm" fontWeight="bold" color="gray.300">
                  Selecionar Sondas ({selectedProbes.length}/{manualProbes.length})
                </Text>
                <Checkbox
                  isChecked={allSelected}
                  isIndeterminate={isIndeterminate}
                  onChange={toggleAll}
                  colorScheme="blue"
                  size="sm"
                >
                  Selecionar todas
                </Checkbox>
              </Flex>

              <Box
                maxH="240px"
                overflowY="auto"
                border="1px solid"
                borderColor="gray.700"
                borderRadius="md"
                bg="blackAlpha.300"
                css={{
                  "&::-webkit-scrollbar": { width: "6px" },
                  "&::-webkit-scrollbar-track": { background: "transparent" },
                  "&::-webkit-scrollbar-thumb": { background: "#4A5568", borderRadius: "3px" },
                }}
              >
                {manualProbes.length === 0 ? (
                  <Text p={4} color="gray.500" textAlign="center" fontSize="sm">
                    Nenhuma sonda manual encontrada na fazenda.
                  </Text>
                ) : (
                  manualProbes.map((probe) => (
                    <Flex
                      key={probe.id}
                      p={3}
                      borderBottom="1px solid"
                      borderColor="gray.700"
                      _last={{ borderBottom: "none" }}
                      _hover={{ bg: "gray.700" }}
                      align="center"
                      cursor="pointer"
                      onClick={() => toggleProbe(probe.id)}
                      transition="background 0.2s"
                    >
                      <Checkbox
                        isChecked={selectedProbes.includes(probe.id)}
                        onChange={() => toggleProbe(probe.id)}
                        colorScheme="blue"
                        mr={3}
                        pointerEvents="none" // let the Flex handle the click
                      />
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" color="white">
                          {probe.name}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          ID: {probe.id}
                        </Text>
                      </Box>
                    </Flex>
                  ))
                )}
              </Box>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter borderTop="1px solid" borderColor="gray.700">
          <Button variant="ghost" mr={3} onClick={onClose} color="gray.400" _hover={{ bg: "gray.700", color: "white" }}>
            Cancelar
          </Button>
          <Button
            colorScheme="blue"
            bg="blue.500"
            _hover={{ bg: "blue.400" }}
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText="Adicionando..."
            leftIcon={<Icon as={FaTint} />}
          >
            Adicionar Irrigação
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
