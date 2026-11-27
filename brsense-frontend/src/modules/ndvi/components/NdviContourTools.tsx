import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Check, CircleDot, Pentagon, RotateCcw, Trash2 } from "lucide-react";
import type { ContourBuildResult, LngLat } from "../shared/contours";

export type DrawMode = "pivo" | "talhao";

export interface ContourDrawState {
  mode: DrawMode;
  points: LngLat[];
  preview: ContourBuildResult | null;
  confirmed: ContourBuildResult | null;
  error: string;
  setMode: (mode: DrawMode) => void;
  undo: () => void;
  clear: () => void;
  setPoint?: (index: number, pt: LngLat) => void;
  movePivotCenter?: (newCenter: LngLat) => void;
  isDraggingRef?: React.MutableRefObject<boolean>;
}

const nFmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function NdviContourTools({
  state,
  onConfirm,
  onCancel,
}: {
  state: ContourDrawState;
  onConfirm: (result: ContourBuildResult) => void;
  onCancel: () => void;
}) {
  const { mode, points, preview, confirmed, error } = state;
  const active = confirmed ?? preview;
  const step = mode === "pivo" ? Math.min(2, points.length + 1) : points.length;

  return (
    <Box
      as="aside"
      className="contour-tools"
      aria-label="Desenho de contorno para NDVI"
      position="absolute"
      top={{ base: "auto", md: "16px" }}
      bottom={{ base: "10px", md: "auto" }}
      left={{ base: "10px", md: "auto" }}
      right={{ base: "10px", md: "16px" }}
      w={{ base: "auto", md: "285px" }}
      maxH={{ base: "48vh", md: "none" }}
      overflowY="auto"
      zIndex={750}
      bg="rgba(8, 22, 34, 0.94)"
      backdropFilter="blur(8px)"
      border="1px solid"
      borderColor="#264760"
      borderRadius="xl"
      p={{ base: 2.5, md: 3.5 }}
      color="#eef6fb"
      boxShadow="dark-lg"
    >
      <VStack spacing={{ base: 2, md: 3 }} align="stretch">
        <HStack spacing={2.5} display={{ base: "none", md: "flex" }}>
          <Flex
            w="32px"
            h="32px"
            borderRadius="md"
            bg="rgba(43, 149, 234, 0.18)"
            color="#6bc2ff"
            align="center"
            justify="center"
          >
            {mode === "pivo" ? <CircleDot size={17} /> : <Pentagon size={17} />}
          </Flex>
          <Box>
            <Text fontSize="sm" fontWeight="bold" lineHeight="1.2">
              Desenhar contorno
            </Text>
            <Text fontSize="xs" color="#8fb0c7">
              Use o mapa de satélite da propriedade
            </Text>
          </Box>
        </HStack>

        <SimpleGrid columns={2} spacing={2} role="tablist" aria-label="Formato do contorno">
          <Button
            size="sm"
            h="auto"
            py={2}
            variant={mode === "pivo" ? "solid" : "outline"}
            colorScheme={mode === "pivo" ? "blue" : "gray"}
            borderColor="#2c4e66"
            color={mode === "pivo" ? "white" : "#cfe3f1"}
            onClick={() => state.setMode("pivo")}
            justifyContent="flex-start"
          >
            <HStack spacing={2} align="center">
              <CircleDot size={14} />
              <Box textAlign="left">
                <Text fontSize="xs" fontWeight="bold" lineHeight="1.1">
                  Círculo / Pivô
                </Text>
                <Text fontSize="10px" opacity={0.8}>
                  Centro + borda
                </Text>
              </Box>
            </HStack>
          </Button>

          <Button
            size="sm"
            h="auto"
            py={2}
            variant={mode === "talhao" ? "solid" : "outline"}
            colorScheme={mode === "talhao" ? "blue" : "gray"}
            borderColor="#2c4e66"
            color={mode === "talhao" ? "white" : "#cfe3f1"}
            onClick={() => state.setMode("talhao")}
            justifyContent="flex-start"
          >
            <HStack spacing={2} align="center">
              <Pentagon size={14} />
              <Box textAlign="left">
                <Text fontSize="xs" fontWeight="bold" lineHeight="1.1">
                  Polígono
                </Text>
                <Text fontSize="10px" opacity={0.8}>
                  Vértices livres
                </Text>
              </Box>
            </HStack>
          </Button>
        </SimpleGrid>

        {mode === "pivo" ? (
          <VStack spacing={1.5} align="stretch">
            <HStack
              spacing={2}
              p={2}
              borderRadius="md"
              bg={points.length >= 1 ? "rgba(48, 132, 201, 0.22)" : "rgba(48, 132, 201, 0.08)"}
              border="1px solid"
              borderColor={points.length >= 1 ? "#3084C9" : "rgba(48, 132, 201, 0.3)"}
            >
              <Badge colorScheme="blue" borderRadius="full">
                1
              </Badge>
              <Text fontSize="xs">
                {points.length >= 1
                  ? "Centro marcado (arraste para alinhar)"
                  : "Clique no centro do pivô"}
              </Text>
            </HStack>
            <HStack
              spacing={2}
              p={2}
              borderRadius="md"
              bg={
                points.length >= 2
                  ? "rgba(48, 132, 201, 0.22)"
                  : points.length === 1
                    ? "rgba(48, 132, 201, 0.08)"
                    : "whiteAlpha.50"
              }
              border="1px solid"
              borderColor={
                points.length >= 2
                  ? "#3084C9"
                  : points.length === 1
                    ? "#3084C9"
                    : "whiteAlpha.200"
              }
            >
              <Badge
                colorScheme={points.length >= 2 ? "blue" : points.length === 1 ? "blue" : "gray"}
                borderRadius="full"
              >
                2
              </Badge>
              <Text fontSize="xs">
                {points.length >= 2
                  ? "Raio definido (arraste a borda para ajustar)"
                  : "Clique em um ponto na borda"}
              </Text>
            </HStack>
            {points.length >= 1 && (
              <Text fontSize="10px" color="#90CDF4" px={0.5} lineHeight="1.3">
                💡 Arraste o cursor sobre o <strong>Centro</strong> para posicionar no equipamento ou sobre a <strong>Borda</strong> para calibrar o raio.
              </Text>
            )}
          </VStack>
        ) : (
          <HStack
            spacing={2.5}
            p={2.5}
            borderRadius="md"
            bg="whiteAlpha.100"
            border="1px solid"
            borderColor="#264760"
          >
            <Pentagon size={15} />
            <Box fontSize="xs">
              <Text>Clique nos cantos do talhão para fechar a área.</Text>
              <Text color="#90cdf4" fontWeight="semibold">
                {step} {step === 1 ? "vértice marcado" : "vértices marcados"} ·
                mínimo de 3
              </Text>
            </Box>
          </HStack>
        )}

        <SimpleGrid columns={2} spacing={2}>
          <Box bg="#0c1829" p={2} borderRadius="md" border="1px solid" borderColor="#1e3a5f">
            <Text fontSize="11px" color="#8fb0c7">
              Área estimada
            </Text>
            <Text fontSize="md" fontWeight="bold">
              {active ? nFmt.format(active.hectares) : "—"}{" "}
              <Text as="span" fontSize="xs" fontWeight="normal" color="#9ec6de">
                ha
              </Text>
            </Text>
          </Box>
          <Box bg="#0c1829" p={2} borderRadius="md" border="1px solid" borderColor="#1e3a5f">
            <Text fontSize="11px" color="#8fb0c7">
              {mode === "pivo" ? "Raio" : "Vértices"}
            </Text>
            <Text fontSize="md" fontWeight="bold">
              {mode === "pivo" ? (active?.radiusM ?? "—") : points.length}{" "}
              <Text as="span" fontSize="xs" fontWeight="normal" color="#9ec6de">
                {mode === "pivo" ? "m" : "pts"}
              </Text>
            </Text>
          </Box>
        </SimpleGrid>

        <Text
          fontSize="xs"
          color={error && points.length >= 2 ? "red.300" : "#9ec6de"}
        >
          {error && points.length >= 2
            ? error
            : confirmed
              ? "Contorno pronto para salvar e calcular o NDVI."
              : mode === "pivo"
                ? "Com o centro e um ponto da borda, o sistema calcula o raio e fecha o círculo."
                : "Evite linhas que se cruzem para manter o recorte fiel ao talhão."}
        </Text>

        <SimpleGrid columns={2} spacing={2}>
          <Button
            size="xs"
            variant="outline"
            borderColor="#32536c"
            color="#cfe3f1"
            leftIcon={<RotateCcw size={13} />}
            isDisabled={!points.length}
            onClick={state.undo}
          >
            Desfazer ponto
          </Button>
          <Button
            size="xs"
            variant="outline"
            borderColor="#32536c"
            color="#cfe3f1"
            leftIcon={<Trash2 size={13} />}
            isDisabled={!points.length}
            onClick={state.clear}
          >
            Limpar
          </Button>
        </SimpleGrid>

        <Button
          size="sm"
          colorScheme="blue"
          leftIcon={<Check size={14} />}
          isDisabled={!confirmed}
          onClick={() => confirmed && onConfirm(confirmed)}
        >
          Usar este contorno
        </Button>
        <Button
          size="xs"
          variant="ghost"
          color="#9ab8ce"
          onClick={onCancel}
        >
          Cancelar e voltar
        </Button>
      </VStack>
    </Box>
  );
}
