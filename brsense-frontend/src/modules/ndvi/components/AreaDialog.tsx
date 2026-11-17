import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Check, Compass, FolderPlus, Radio } from "lucide-react";
import type { ContourBuildResult } from "../shared/contours";
import type { AreaType, NdviArea, NdviProbeOption } from "../shared/types";
import { randomId } from "../lib/id";
import type { DrawMode } from "./NdviContourTools";

export function AreaDialog({
  open,
  farmName,
  city,
  probes = [],
  selectedProbeId,
  onSelectProbeId,
  drawnContour,
  onClose,
  onImport,
  onStartDrawing,
}: {
  open: boolean;
  farmName: string;
  city: string;
  probes?: NdviProbeOption[];
  selectedProbeId?: number;
  onSelectProbeId?: (id: number) => void;
  drawnContour?: ContourBuildResult | null;
  onClose: () => void;
  onImport: (areas: NdviArea[]) => Promise<void> | void;
  onStartDrawing: (mode: DrawMode) => void;
}) {
  const [drafts, setDrafts] = useState<NdviArea[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const activeProbe = useMemo(
    () => probes.find((p) => p.id === selectedProbeId) ?? probes[0],
    [probes, selectedProbeId],
  );

  const effectiveFarmName = activeProbe?.farmName || farmName;
  const effectiveCity = activeProbe?.city || city;

  useEffect(() => {
    if (!drawnContour) return;
    const isCircle = drawnContour.type === "pivo";
    const id = `desenho-${randomId()}`;
    const defaultName = activeProbe
      ? `${isCircle ? "Pivô" : "Talhão"} · ${activeProbe.name}`
      : isCircle
        ? "Pivô desenhado no mapa"
        : "Talhão desenhado no mapa";

    const nextDraft: NdviArea = {
      id,
      deviceId: activeProbe?.id,
      deviceEsn: activeProbe?.esn,
      deviceName: activeProbe?.name,
      farmId: activeProbe?.farmId,
      name: defaultName,
      farmName: effectiveFarmName,
      city: effectiveCity,
      type: drawnContour.type,
      crop: activeProbe?.crop || "Monitoramento Satelital",
      hectares: drawnContour.hectares,
      geometry: drawnContour.geometry,
      source: "desenho",
      circle:
        drawnContour.center && drawnContour.edge && drawnContour.radiusM
          ? {
              center: drawnContour.center,
              edge: drawnContour.edge,
              radiusM: drawnContour.radiusM,
            }
          : undefined,
    };
    Promise.resolve().then(() => {
      setError("");
      setDrafts([nextDraft]);
    });
  }, [activeProbe, drawnContour, effectiveCity, effectiveFarmName]);

  function handleProbeChange(newProbeId: number) {
    onSelectProbeId?.(newProbeId);
    const nextProbe = probes.find((p) => p.id === newProbeId);
    if (!nextProbe) return;
    setDrafts((list) =>
      list.map((d) => ({
        ...d,
        deviceId: nextProbe.id,
        deviceEsn: nextProbe.esn,
        deviceName: nextProbe.name,
        farmId: nextProbe.farmId,
        farmName: nextProbe.farmName || d.farmName,
        city: nextProbe.city || d.city,
        crop: nextProbe.crop || d.crop,
      })),
    );
  }

  function update(i: number, patch: Partial<NdviArea>) {
    setDrafts((list) =>
      list.map((a, idx) => (idx === i ? { ...a, ...patch } : a)),
    );
  }

  function reset() {
    setDrafts([]);
    setError("");
    setSaving(false);
    onClose();
  }

  async function handleSave() {
    if (!activeProbe) {
      setError("Selecione uma sonda para vincular a área NDVI.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const boundDrafts = drafts.map((d) => ({
        ...d,
        deviceId: d.deviceId ?? activeProbe.id,
        deviceEsn: d.deviceEsn ?? activeProbe.esn,
        deviceName: d.deviceName ?? activeProbe.name,
        farmId: d.farmId ?? activeProbe.farmId,
        farmName: activeProbe.farmName || d.farmName,
        city: activeProbe.city || d.city,
      }));
      await onImport(boundDrafts);
      reset();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Erro ao salvar área NDVI no banco de dados.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={open} onClose={reset} size="xl" isCentered>
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(6px)" />
      <ModalContent
        mx={{ base: 3, md: "auto" }}
        bg="#0b1d2c"
        color="#eef6fb"
        border="1px solid"
        borderColor="#234057"
        borderRadius="xl"
        boxShadow="dark-lg"
      >
        <ModalHeader pb={2}>
          <HStack spacing={3}>
            <Flex
              w="36px"
              h="36px"
              borderRadius="lg"
              bg="rgba(43, 149, 234, 0.16)"
              color="#6bc2ff"
              align="center"
              justify="center"
            >
              <FolderPlus size={18} />
            </Flex>
            <Box>
              <Heading size="md" color="#f3f9fd">
                Cadastrar área desenhada para NDVI
              </Heading>
              <Text fontSize="xs" color="#8fb0c7" fontWeight="normal" mt={0.5}>
                Vincule o contorno desenhado a uma sonda BR Sense e salve no
                banco de dados.
              </Text>
            </Box>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="#9ec6de" />

        <ModalBody py={4}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel
                fontSize="xs"
                fontWeight="semibold"
                color="#b7d3e8"
                mb={1.5}
              >
                <HStack spacing={1.5}>
                  <Radio size={14} />
                  <Text as="span">Sonda vinculada</Text>
                </HStack>
              </FormLabel>
              <Select
                size="sm"
                bg="#091a28"
                borderColor="#29465b"
                color="#eef6fb"
                value={activeProbe?.id ?? ""}
                onChange={(e) => handleProbeChange(Number(e.target.value))}
              >
                {probes.length === 0 ? (
                  <option value="">Nenhuma sonda disponível</option>
                ) : (
                  probes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.esn}){p.farmName ? ` · ${p.farmName}` : ""}
                    </option>
                  ))
                )}
              </Select>
            </FormControl>

            {error && (
              <Alert
                status="error"
                bg="rgba(229, 62, 62, 0.16)"
                color="#feb2b2"
                borderRadius="md"
                fontSize="sm"
              >
                <AlertIcon color="red.300" />
                {error}
              </Alert>
            )}

            {drafts.length > 0 && (
              <VStack
                spacing={3}
                align="stretch"
                bg="#081622"
                p={3.5}
                borderRadius="lg"
                border="1px solid"
                borderColor="#1f394e"
              >
                <Flex justify="space-between" align="center">
                  <HStack spacing={2} color="#68d391" fontSize="sm" fontWeight="semibold">
                    <Check size={15} />
                    <Text>
                      {drafts.length}{" "}
                      {drafts.length === 1
                        ? "contorno pronto"
                        : "contornos prontos"}
                    </Text>
                  </HStack>
                  <Badge colorScheme="blue" variant="subtle" px={2} py={0.5} borderRadius="md">
                    {drafts
                      .reduce((a, b) => a + b.hectares, 0)
                      .toFixed(1)
                      .replace(".", ",")}{" "}
                    ha
                  </Badge>
                </Flex>

                {drafts[0]?.circle && (
                  <Box
                    bg="#0c2233"
                    p={2.5}
                    borderRadius="md"
                    border="1px solid"
                    borderColor="#25455d"
                  >
                    <Text fontSize="xs" color="#8fb0c7">
                      Círculo calculado pelo centro + borda
                    </Text>
                    <Text fontSize="sm" fontWeight="bold" color="#e2f1fb">
                      Raio {drafts[0].circle.radiusM} m ·{" "}
                      {drafts[0].hectares.toFixed(1).replace(".", ",")} ha
                    </Text>
                    <Text fontSize="xs" color="#789bb3">
                      Centro {drafts[0].circle.center[1].toFixed(5)},{" "}
                      {drafts[0].circle.center[0].toFixed(5)}
                    </Text>
                  </Box>
                )}

                <VStack spacing={3} align="stretch">
                  {drafts.map((d, i) => (
                    <SimpleGrid
                      key={d.id}
                      columns={{ base: 1, md: 3 }}
                      spacing={3}
                      alignItems="end"
                    >
                      <FormControl>
                        <FormLabel fontSize="xs" color="#9ec6de" mb={1}>
                          Nome da área
                        </FormLabel>
                        <Input
                          size="sm"
                          bg="#091a28"
                          borderColor="#29465b"
                          color="#eef6fb"
                          value={d.name}
                          onChange={(e) => update(i, { name: e.target.value })}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="xs" color="#9ec6de" mb={1}>
                          Tipo
                        </FormLabel>
                        <Select
                          size="sm"
                          bg="#091a28"
                          borderColor="#29465b"
                          color="#eef6fb"
                          value={d.type}
                          onChange={(e) =>
                            update(i, { type: e.target.value as AreaType })
                          }
                        >
                          <option value="pivo">Pivô</option>
                          <option value="talhao">Talhão</option>
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="xs" color="#9ec6de" mb={1}>
                          Cultura / estádio
                        </FormLabel>
                        <Input
                          size="sm"
                          bg="#091a28"
                          borderColor="#29465b"
                          color="#eef6fb"
                          value={d.crop}
                          onChange={(e) => update(i, { crop: e.target.value })}
                        />
                      </FormControl>
                    </SimpleGrid>
                  ))}
                </VStack>
              </VStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter
          borderTop="1px solid"
          borderColor="#1c3548"
          justifyContent="space-between"
          gap={2}
        >
          <Button
            variant="outline"
            size="sm"
            borderColor="#35556c"
            color="#d8eaf6"
            _hover={{ bg: "whiteAlpha.100" }}
            leftIcon={<Compass size={14} />}
            isDisabled={!activeProbe}
            onClick={() => {
              reset();
              onStartDrawing("pivo");
            }}
          >
            Redesenhar no mapa
          </Button>
          <Button
            size="sm"
            colorScheme="blue"
            isLoading={saving}
            isDisabled={!drafts.length || !activeProbe}
            onClick={handleSave}
          >
            Salvar no banco e abrir no NDVI
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
