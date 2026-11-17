import {
  Badge,
  Box,
  Flex,
  HStack,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
} from "@chakra-ui/react";
import { Compass, Radio } from "lucide-react";
import type { ContourBuildResult } from "../shared/contours";
import type { NdviArea, NdviProbeOption } from "../shared/types";
import type { MapLayer } from "../../../types";
import { AreaMap, type MapBasemap } from "./AreaMap";
import type { DrawMode } from "./NdviContourTools";

export function ContourEditor({
  open,
  areas,
  selected,
  probes = [],
  mapLayers = [],
  selectedProbeId,
  onSelectProbeId,
  initialMode = "pivo",
  basemap,
  onClose,
  onComplete,
}: {
  open: boolean;
  areas: NdviArea[];
  selected?: NdviArea;
  probes?: NdviProbeOption[];
  mapLayers?: MapLayer[];
  selectedProbeId?: number;
  onSelectProbeId?: (id: number) => void;
  initialMode?: DrawMode;
  basemap?: MapBasemap;
  onClose: () => void;
  onComplete: (contour: ContourBuildResult) => void;
}) {
  if (!open) return null;

  const activeProbe =
    probes.find((p) => p.id === selectedProbeId) ?? probes[0];

  const focusCoords: [number, number] | undefined =
    activeProbe &&
    activeProbe.latitude != null &&
    activeProbe.longitude != null &&
    Number.isFinite(Number(activeProbe.latitude)) &&
    Number.isFinite(Number(activeProbe.longitude)) &&
    !(Number(activeProbe.latitude) === 0 && Number(activeProbe.longitude) === 0)
      ? [Number(activeProbe.latitude), Number(activeProbe.longitude)]
      : undefined;

  return (
    <Modal isOpen={open} onClose={onClose} size="6xl" isCentered>
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(6px)" />
      <ModalContent
        bg="#0b1d2c"
        color="#eef6fb"
        border={{ base: "none", md: "1px solid" }}
        borderColor="#234057"
        borderRadius={{ base: "none", md: "xl" }}
        overflow="hidden"
        maxW={{ base: "100vw", md: "94vw" }}
        h={{ base: "100dvh", md: "86vh" }}
        m={{ base: 0, md: "auto" }}
        display="flex"
        flexDirection="column"
      >
        <ModalHeader
          py={{ base: 2.5, md: 3 }}
          px={{ base: 3.5, md: 5 }}
          borderBottom="1px solid"
          borderColor="#1c3548"
          pr={10}
        >
          <Flex
            justify="space-between"
            align={{ base: "stretch", md: "center" }}
            direction={{ base: "column", md: "row" }}
            gap={{ base: 2, md: 3 }}
          >
            <HStack spacing={2.5}>
              <Flex
                w={{ base: "30px", md: "36px" }}
                h={{ base: "30px", md: "36px" }}
                borderRadius="lg"
                bg="rgba(43, 149, 234, 0.16)"
                color="#6bc2ff"
                align="center"
                justify="center"
                flexShrink={0}
              >
                <Compass size={17} />
              </Flex>
              <Box>
                <Heading size={{ base: "xs", md: "sm" }} color="#f3f9fd">
                  Desenhar área sobre o mapa de satélite
                </Heading>
                <Text
                  fontSize="xs"
                  color="#8fb0c7"
                  fontWeight="normal"
                  display={{ base: "none", sm: "block" }}
                >
                  Para pivô central, clique no centro e depois na borda. Para
                  talhão, marque os vértices do polígono.
                </Text>
              </Box>
            </HStack>

            {probes.length > 0 && (
              <HStack spacing={2} w={{ base: "100%", md: "auto" }}>
                <HStack
                  spacing={1.5}
                  color="#9ec6de"
                  fontSize="xs"
                  fontWeight="semibold"
                  flexShrink={0}
                >
                  <Radio size={13} />
                  <Text as="span" whiteSpace="nowrap">
                    Sonda:
                  </Text>
                </HStack>
                <Select
                  size={{ base: "xs", md: "sm" }}
                  flex="1"
                  w={{ base: "100%", md: "260px" }}
                  bg="#091a28"
                  borderColor="#29465b"
                  borderRadius="md"
                  color="#eef6fb"
                  value={activeProbe?.id ?? ""}
                  onChange={(e) => onSelectProbeId?.(Number(e.target.value))}
                >
                  {probes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.esn})
                    </option>
                  ))}
                </Select>
              </HStack>
            )}
          </Flex>
        </ModalHeader>
        <ModalCloseButton color="#9ec6de" top={2.5} right={2.5} />

        <ModalBody p={0} flex="1" position="relative" minH={{ base: "320px", md: "500px" }}>
          <Box position="absolute" inset={0} w="100%" h="100%">
            <AreaMap
              areas={areas}
              selected={selected}
              probes={probes}
              mapLayers={mapLayers}
              activeProbeId={activeProbe?.id}
              focusCenter={focusCoords}
              onSelect={() => {}}
              drawing
              initialDrawMode={initialMode}
              basemap={basemap}
              onFinishDrawing={onComplete}
              onCancelDrawing={onClose}
            />
          </Box>
        </ModalBody>

        <ModalFooter
          py={2.5}
          px={5}
          borderTop="1px solid"
          borderColor="#1c3548"
          justifyContent="space-between"
          bg="#081622"
        >
          <Text fontSize="xs" color="#9ab8ce">
            O contorno desenhado ficará vinculado à sonda{" "}
            <Text as="strong" color="#e8f4fc">
              {activeProbe
                ? `${activeProbe.name} (${activeProbe.esn})`
                : "selecionada"}
            </Text>{" "}
            e será salvo no banco de dados.
          </Text>
          <Badge colorScheme="blue" variant="outline" fontSize="10px">
            WGS84 · GeoJSON
          </Badge>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
