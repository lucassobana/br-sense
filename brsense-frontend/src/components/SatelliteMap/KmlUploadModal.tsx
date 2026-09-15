import React, { useRef, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  Text,
  Box,
  Input,
  Icon,
  HStack,
  Progress,
} from "@chakra-ui/react";
import { FaFileUpload, FaCheckCircle } from "react-icons/fa";
import { MdInsertDriveFile } from "react-icons/md";

interface KmlUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, name?: string) => Promise<void>;
}

export const KmlUploadModal: React.FC<KmlUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedFile = (f: File) => {
    const lower = f.name.toLowerCase();
    return lower.endsWith(".kml") || lower.endsWith(".kmz");
  };

  const handleFileSelect = (f: File) => {
    if (!acceptedFile(f)) return;
    setFile(f);
    setUploadDone(false);
    // Auto-fill name from filename (without extension)
    if (!name) {
      const baseName = f.name.replace(/\.(kml|kmz)$/i, "");
      setName(baseName);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      await onUpload(file, name.trim() || undefined);
      setUploadDone(true);
      setTimeout(() => {
        handleClose();
      }, 800);
    } catch {
      // error handled by parent
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setName("");
    setUploadDone(false);
    setIsLoading(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(4px)" bg="blackAlpha.600" />
      <ModalContent
        bg="gray.900"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="2xl"
        color="white"
      >
        <ModalHeader fontSize="lg" fontWeight="semibold">
          Importar Camada KML / KMZ
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Drag & Drop Zone */}
            <Box
              border="2px dashed"
              borderColor={isDragging ? "blue.400" : file ? "green.400" : "whiteAlpha.300"}
              borderRadius="xl"
              p={6}
              textAlign="center"
              cursor="pointer"
              transition="all 0.2s"
              bg={isDragging ? "blue.900" : file ? "green.900" : "whiteAlpha.50"}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              _hover={{ borderColor: "blue.400", bg: "blue.900" }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".kml,.kmz"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />

              {file ? (
                <VStack spacing={2}>
                  <Icon as={MdInsertDriveFile} boxSize={10} color="green.300" />
                  <Text fontWeight="semibold" color="green.300" fontSize="sm">
                    {file.name}
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.600">
                    {(file.size / 1024).toFixed(1)} KB — clique para trocar
                  </Text>
                </VStack>
              ) : (
                <VStack spacing={2}>
                  <Icon as={FaFileUpload} boxSize={10} color="whiteAlpha.500" />
                  <Text fontWeight="medium" color="whiteAlpha.800">
                    Arraste um arquivo aqui
                  </Text>
                  <Text fontSize="sm" color="whiteAlpha.500">
                    ou clique para selecionar
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.400" mt={1}>
                    Formatos suportados: .kml, .kmz (máx. 10 MB)
                  </Text>
                </VStack>
              )}
            </Box>

            {/* Layer name */}
            <Box>
              <Text fontSize="sm" color="whiteAlpha.700" mb={1}>
                Nome da camada (opcional)
              </Text>
              <Input
                placeholder="Ex: Talhões 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
                bg="whiteAlpha.100"
                border="1px solid"
                borderColor="whiteAlpha.200"
                color="white"
                _placeholder={{ color: "whiteAlpha.400" }}
                _focus={{ borderColor: "blue.400", boxShadow: "none" }}
                borderRadius="lg"
              />
            </Box>

            {isLoading && <Progress size="xs" isIndeterminate colorScheme="blue" borderRadius="full" />}

            {uploadDone && (
              <HStack justify="center" color="green.300" spacing={2}>
                <Icon as={FaCheckCircle} />
                <Text fontSize="sm">Camada importada com sucesso!</Text>
              </HStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter gap={3}>
          <Button variant="ghost" colorScheme="whiteAlpha" onClick={handleClose} isDisabled={isLoading}>
            Cancelar
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isDisabled={!file || isLoading || uploadDone}
            isLoading={isLoading}
            loadingText="Importando..."
            borderRadius="lg"
          >
            Importar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
