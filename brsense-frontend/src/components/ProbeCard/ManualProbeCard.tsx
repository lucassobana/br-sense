import { useState, useEffect } from "react";
import {
  Box,
  Text,
  VStack,
  HStack,
  CloseButton,
  Icon,
  Divider,
  Flex,
  Input,
  Button,
  FormControl,
  FormLabel,
  useToast,
  IconButton,
  Spinner
} from "@chakra-ui/react";
import { MdWaterDrop, MdAdd, MdArrowBack } from "react-icons/md";
import { FaTint } from "react-icons/fa";
import { motion } from "framer-motion";
import type { MapPoint } from "../SatelliteMap/SatelliteMap";
import { addManualIrrigation, getManualIrrigations } from "../../services/api";
import type { ManualIrrigationRecord } from "../../types";

interface ManualProbeCardProps {
  point: MapPoint | null;
  onClose: () => void;
  onBatchUpdateClick?: () => void;
}

export function ManualProbeCard({ point, onClose, onBatchUpdateClick }: ManualProbeCardProps) {
  const toast = useToast();
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [records, setRecords] = useState<ManualIrrigationRecord[]>([]);

  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [mm, setMm] = useState<string>("");

  useEffect(() => {
    if (!point || !point.isManualProbe) return;

    const fetchHistory = async () => {
      try {
        setFetching(true);
        const data = await getManualIrrigations(point.id);
        setRecords(data.slice(0, 7));
      } catch (error) {
        console.error("Erro ao carregar irrigações", error);
      } finally {
        setFetching(false);
      }
    };

    fetchHistory();
  }, [point]);

  if (!point || !point.isManualProbe) return null;

  const handleSubmit = async () => {
    if (!date || !mm) return;

    try {
      setLoading(true);
      
      // Envia a data local diretamente, para não sofrer offset do fuso horário
      // O input datetime-local já fornece no formato YYYY-MM-DDThh:mm
      const newRecord = await addManualIrrigation(point.id, {
        irrigation_value_mm: parseFloat(mm),
        date: date
      });

      toast({
        title: "Sucesso",
        description: "Irrigação registrada com sucesso!",
        status: "success",
        duration: 3000,
      });

      setMm("");
      setRecords((prev) => [newRecord, ...prev].slice(0, 7));

      if (point) {
        point.irrigation_value_mm = parseFloat(mm);
      }

      setIsFlipped(false);
    } catch {
      toast({
        title: "Erro",
        description: "Falha ao registrar irrigação.",
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      w={{ base: "85vw", sm: "340px" }}
      maxW="400px"
      mx="auto"
      minH="350px"
      bg="gray.800"
      borderRadius="xl"
      boxShadow="2xl"
      p={4}
      borderColor="whiteAlpha.200"
      borderWidth="1px"
      display="flex"
      flexDirection="column"
    >
      <HStack justify="space-between" align="center">
        <VStack align="center" spacing={1.5} mb={1}>
          <HStack spacing={3}>
            <Text fontWeight="bold" fontSize="md" color="white" lineHeight="1">
              {point.name}
            </Text>
          </HStack>
        </VStack>
        <HStack>
          {onBatchUpdateClick && (
            <IconButton
              aria-label="Irrigação em Massa"
              icon={<Icon as={FaTint} />}
              size="sm"
              colorScheme="blue"
              variant="outline"
              color="blue.400"
              onClick={onBatchUpdateClick}
              _hover={{ bg: "blue.500", color: "white" }}
            />
          )}
          <IconButton
            aria-label={isFlipped ? "Voltar" : "Adicionar irrigação"}
            icon={isFlipped ? <MdArrowBack /> : <MdAdd />}
            size="sm"
            colorScheme={isFlipped ? "gray" : "blue"}
            variant={isFlipped ? "solid" : "solid"}
            color={isFlipped ? "gray.400" : "white"}
            bg={isFlipped ? "transparent" : "blue.500"}
            onClick={() => setIsFlipped(!isFlipped)}
            _hover={{ bg: isFlipped ? "whiteAlpha.200" : "blue.600" }}
          />
          <CloseButton size="sm" onClick={onClose} color="gray.400" _hover={{ color: "white" }} />
        </HStack>
      </HStack>

      <Divider borderColor="whiteAlpha.300" my={3} />

      <Box flex="1" position="relative" sx={{ perspective: "1000px" }}>
        <motion.div
          initial={false}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          style={{
            transformStyle: "preserve-3d",
            position: "absolute",
            width: "100%",
            height: "100%",
          }}
        >
          {/* FRONT OF CARD */}
          <Box
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            position="absolute"
            w="100%"
            h="100%"
            display="flex"
            flexDirection="column"
          >
            <Text fontSize="sm" fontWeight="bold" color="gray.300" mb={3}>
              Últimas Irrigações
            </Text>

            {fetching ? (
              <Flex flex="1" justify="center" align="center">
                <Spinner color="blue.500" />
              </Flex>
            ) : records.length === 0 ? (
              <Flex flex="1" justify="center" align="center">
                <Text color="gray.500" fontSize="sm">Nenhum registro encontrado.</Text>
              </Flex>
            ) : (
              <VStack align="stretch" spacing={2} flex="1" overflowY="auto" maxH="220px" pr={1}
                sx={{
                  "&::-webkit-scrollbar": { width: "4px" },
                  "&::-webkit-scrollbar-track": { width: "6px" },
                  "&::-webkit-scrollbar-thumb": {
                    background: "gray.600",
                    borderRadius: "24px",
                  },
                }}
              >
                {records.map((r) => (
                  <HStack key={r.id} justify="space-between" p={2} bg="whiteAlpha.50" borderRadius="md">
                    <VStack align="start" spacing={0}>
                      <Text color="white" fontSize="sm">
                        {new Date(r.date).toLocaleDateString("pt-BR")}
                      </Text>
                      <Text color="gray.400" fontSize="xs">
                        {new Date(r.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </VStack>
                    <HStack>
                      <Icon as={MdWaterDrop} color="blue.400" />
                      <Text color="blue.300" fontWeight="bold" fontSize="sm">
                        {r.irrigation_value_mm.toFixed(1)} mm
                      </Text>
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            )}
          </Box>

          {/* BACK OF CARD */}
          <Box
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            position="absolute"
            w="100%"
            h="100%"
            display="flex"
            flexDirection="column"
          >
            <Text fontSize="sm" fontWeight="bold" color="gray.300" mb={4}>
              Nova Irrigação
            </Text>

            <Flex flex="1" direction="column" justify="flex-start" gap={4}>
              <FormControl>
                <FormLabel color="gray.400" fontSize="xs">Data e Hora</FormLabel>
                <Input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  bg="whiteAlpha.100"
                  borderColor="whiteAlpha.300"
                  color="white"
                  size="sm"
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.400" fontSize="xs">Irrigação (mm)</FormLabel>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 10.5"
                  value={mm}
                  onChange={(e) => setMm(e.target.value)}
                  bg="whiteAlpha.100"
                  borderColor="whiteAlpha.300"
                  color="white"
                  size="sm"
                />
              </FormControl>

              <Button
                colorScheme="blue"
                size="sm"
                mt={2}
                onClick={handleSubmit}
                isLoading={loading}
                isDisabled={!date || !mm}
                leftIcon={<MdWaterDrop />}
              >
                Salvar Irrigação
              </Button>
            </Flex>
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
}
