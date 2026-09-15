import React, { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Switch,
  Divider,
  Icon,
  Tooltip,
  Button,
  Collapse,
} from "@chakra-ui/react";
import { FaLayerGroup, FaTrash, FaPlus } from "react-icons/fa";
import { MdClose } from "react-icons/md";
import type { MapLayer } from "../../types";

interface KmlLayersControlProps {
  layers: MapLayer[];
  visibleLayerIds: Set<number>;
  onToggleLayer: (id: number) => void;
  onDeleteLayer: (id: number) => void;
  onOpenUpload: () => void;
}

export const KmlLayersControl: React.FC<KmlLayersControlProps> = ({
  layers,
  visibleLayerIds,
  onToggleLayer,
  onDeleteLayer,
  onOpenUpload,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Box position="relative">
      {/* Toggle button */}
      <Tooltip label="Camadas KML/KMZ" placement="left">
        <Box
          as="button"
          onClick={() => setIsOpen((v) => !v)}
          w="36px"
          h="36px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg={isOpen ? "blue.600" : "gray.800"}
          border="1px solid"
          borderColor={isOpen ? "blue.400" : "whiteAlpha.300"}
          borderRadius="lg"
          color="white"
          cursor="pointer"
          transition="all 0.2s"
          _hover={{ bg: isOpen ? "blue.500" : "gray.700" }}
          title="Camadas KML/KMZ"
        >
          <Icon as={FaLayerGroup} boxSize={4} />
        </Box>
      </Tooltip>

      {/* Panel */}
      {isOpen && (
        <Box
          position="absolute"
          right="44px"
          top="0"
          w="240px"
          bg="gray.900"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="xl"
          boxShadow="0 8px 32px rgba(0,0,0,0.5)"
          overflow="hidden"
          zIndex={1000}
          style={{ backdropFilter: "blur(12px)" }}
        >
          {/* Header */}
          <HStack
            px={3}
            py={2}
            justify="space-between"
            borderBottom="1px solid"
            borderColor="whiteAlpha.100"
          >
            <HStack spacing={2}>
              <Icon as={FaLayerGroup} color="blue.300" boxSize={3.5} />
              <Text fontSize="xs" fontWeight="semibold" color="white" letterSpacing="wide">
                CAMADAS
              </Text>
            </HStack>
            <HStack spacing={1}>
              <Tooltip label="Importar KML/KMZ" placement="top">
                <IconButton
                  aria-label="Importar"
                  icon={<Icon as={FaPlus} />}
                  size="xs"
                  colorScheme="blue"
                  variant="ghost"
                  onClick={onOpenUpload}
                />
              </Tooltip>
              <IconButton
                aria-label="Fechar"
                icon={<Icon as={MdClose} />}
                size="xs"
                variant="ghost"
                color="whiteAlpha.600"
                onClick={() => setIsOpen(false)}
              />
            </HStack>
          </HStack>

          {/* Layer list */}
          <VStack spacing={0} align="stretch" maxH="240px" overflowY="auto">
            {layers.length === 0 ? (
              <Box px={3} py={4} textAlign="center">
                <Text fontSize="xs" color="whiteAlpha.500">
                  Nenhuma camada importada
                </Text>
                <Button
                  size="xs"
                  colorScheme="blue"
                  variant="ghost"
                  mt={2}
                  leftIcon={<Icon as={FaPlus} />}
                  onClick={onOpenUpload}
                >
                  Importar KML/KMZ
                </Button>
              </Box>
            ) : (
              layers.map((layer, idx) => (
                <Box key={layer.id}>
                  {idx > 0 && <Divider borderColor="whiteAlpha.100" />}
                  <HStack px={3} py={2} spacing={2} justify="space-between">
                    <Switch
                      size="sm"
                      colorScheme="blue"
                      isChecked={visibleLayerIds.has(layer.id)}
                      onChange={() => onToggleLayer(layer.id)}
                      flexShrink={0}
                    />
                    <Text
                      fontSize="xs"
                      color={visibleLayerIds.has(layer.id) ? "white" : "whiteAlpha.500"}
                      flex={1}
                      noOfLines={1}
                      transition="color 0.2s"
                    >
                      {layer.name}
                    </Text>
                    <Tooltip label="Excluir camada" placement="top">
                      <IconButton
                        aria-label="Excluir"
                        icon={<Icon as={FaTrash} />}
                        size="xs"
                        variant="ghost"
                        color="red.400"
                        _hover={{ bg: "red.900", color: "red.300" }}
                        onClick={() => onDeleteLayer(layer.id)}
                        flexShrink={0}
                      />
                    </Tooltip>
                  </HStack>
                </Box>
              ))
            )}
          </VStack>

          {/* Footer with import button when layers exist */}
          {layers.length > 0 && (
            <>
              <Divider borderColor="whiteAlpha.100" />
              <Box px={3} py={2}>
                <Button
                  size="xs"
                  colorScheme="blue"
                  variant="ghost"
                  w="full"
                  leftIcon={<Icon as={FaPlus} />}
                  onClick={onOpenUpload}
                >
                  Importar nova camada
                </Button>
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};
