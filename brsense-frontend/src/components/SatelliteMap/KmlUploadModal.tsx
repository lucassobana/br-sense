import React, { useRef, useState, useEffect, useMemo } from "react";
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
  FormControl,
  FormLabel,
  Select,
  Badge,
} from "@chakra-ui/react";
import { FaFileUpload, FaCheckCircle, FaUser, FaTractor } from "react-icons/fa";
import { MdInsertDriveFile } from "react-icons/md";
import { getUsers, createFarm, type User } from "../../services/api";
import type { Farm } from "../../types";

interface KmlUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, name?: string, farmId?: number) => Promise<void>;
  farms?: Farm[];
  isAdmin?: boolean;
  onFarmCreated?: (newFarm: Farm) => void;
}

export const KmlUploadModal: React.FC<KmlUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  farms = [],
  isAdmin = false,
  onFarmCreated,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seleção de cliente e fazenda
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [newFarmName, setNewFarmName] = useState<string>("");

  // Carregar lista de usuários quando o modal abre (para admins ou seleção de cliente)
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setName("");
      setUploadDone(false);
      setIsLoading(false);
      setSelectedFarmId("");
      setNewFarmName("");

      if (isAdmin) {
        setIsLoadingUsers(true);
        getUsers()
          .then((data) => {
            const resp = data as { users?: User[] };
            const list = Array.isArray(resp?.users)
              ? resp.users
              : Array.isArray(data)
              ? (data as unknown as User[])
              : [];
            // Ordena alfabeticamente por nome ou login/username
            list.sort((a, b) => {
              const nameA = a.name || a.login || a.username || "";
              const nameB = b.name || b.login || b.username || "";
              return nameA.localeCompare(nameB);
            });
            setUsers(list);
          })
          .catch((err) => console.error("Erro ao carregar usuários:", err))
          .finally(() => setIsLoadingUsers(false));
      } else {
        // Se não for admin, auto-seleciona a fazenda do usuário se houver apenas uma
        if (farms.length === 1) {
          setSelectedFarmId(String(farms[0].id));
        }
      }
    }
  }, [isOpen, isAdmin, farms]);

  // Usuário selecionado
  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.id === Number(selectedUserId)) || null;
  }, [users, selectedUserId]);

  // Fazendas do usuário selecionado (ou todas as fazendas locais se não admin)
  const availableFarms = useMemo(() => {
    if (isAdmin) {
      if (!selectedUserId) return [];
      return farms.filter((f) => f.user_id === Number(selectedUserId));
    }
    return farms;
  }, [isAdmin, selectedUserId, farms]);

  // Atualizar fazenda ao trocar de usuário
  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedFarmId("");
    if (!userId) {
      setNewFarmName("");
      return;
    }

    const userFarms = farms.filter((f) => f.user_id === Number(userId));
    if (userFarms.length === 1) {
      setSelectedFarmId(String(userFarms[0].id));
      setNewFarmName("");
    } else if (userFarms.length === 0) {
      const u = users.find((usr) => usr.id === Number(userId));
      setNewFarmName(u?.name ? `Fazenda ${u.name}` : "Fazenda Principal");
    } else {
      setNewFarmName("");
    }
  };

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

  // Validação para habilitar o botão de envio
  const isFormValid = useMemo(() => {
    if (!file || isLoading || uploadDone) return false;

    if (isAdmin) {
      if (!selectedUserId) return false;
      if (availableFarms.length === 0) {
        return !!newFarmName.trim();
      }
      if (availableFarms.length === 1) return true;
      return !!selectedFarmId;
    } else {
      if (availableFarms.length === 0) {
        return !!newFarmName.trim();
      }
      if (availableFarms.length === 1) return true;
      return !!selectedFarmId;
    }
  }, [file, isLoading, uploadDone, isAdmin, selectedUserId, availableFarms, selectedFarmId, newFarmName]);

  const handleSubmit = async () => {
    if (!isFormValid || !file) return;
    setIsLoading(true);
    try {
      let targetFarmId: number | null = null;

      if (availableFarms.length === 0) {
        // Cria a fazenda automaticamente vinculada ao cliente selecionado
        const farmName = newFarmName.trim() || `Fazenda ${selectedUser?.name || "Cliente"}`;
        const created = await createFarm({
          name: farmName,
          location: "",
          user_id: isAdmin && selectedUserId ? Number(selectedUserId) : undefined,
        });
        if (onFarmCreated) onFarmCreated(created);
        targetFarmId = created.id;
      } else if (availableFarms.length === 1) {
        targetFarmId = availableFarms[0].id;
      } else {
        targetFarmId = Number(selectedFarmId);
      }

      await onUpload(file, name.trim() || undefined, targetFarmId || undefined);
      setUploadDone(true);
      setTimeout(() => {
        handleClose();
      }, 900);
    } catch {
      // erro tratado no componente pai
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setName("");
    setSelectedUserId("");
    setSelectedFarmId("");
    setNewFarmName("");
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
        <ModalHeader fontSize="lg" fontWeight="semibold" pb={2}>
          Importar Camada KML / KMZ
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* 1. Seleção de Cliente / Produtor */}
            {isAdmin && (
              <FormControl isRequired>
                <FormLabel fontSize="xs" fontWeight="semibold" color="whiteAlpha.800" mb={1.5}>
                  <HStack spacing={1.5}>
                    <Icon as={FaUser} color="blue.400" boxSize={3} />
                    <Text>Cliente / Produtor Vinculado</Text>
                  </HStack>
                </FormLabel>
                <Select
                  placeholder={isLoadingUsers ? "Carregando clientes..." : "Selecione o cliente..."}
                  value={selectedUserId}
                  onChange={(e) => handleUserChange(e.target.value)}
                  bg="whiteAlpha.100"
                  border="1px solid"
                  borderColor={selectedUserId ? "blue.400" : "whiteAlpha.200"}
                  color="white"
                  borderRadius="lg"
                  isDisabled={isLoadingUsers || isLoading || uploadDone}
                  _focus={{ borderColor: "blue.400" }}
                  size="sm"
                >
                  {users.map((u) => {
                    const handle = u.login || u.username;
                    const label = u.name
                      ? (handle ? `${u.name} (${handle})` : u.name)
                      : (handle || u.email || `Usuário #${u.id}`);
                    return (
                      <option key={u.id} value={u.id} style={{ color: "black" }}>
                        {label}
                      </option>
                    );
                  })}
                </Select>
              </FormControl>
            )}

            {/* 2. Seleção ou Criação de Fazenda */}
            {(isAdmin ? !!selectedUserId : true) && (
              <Box>
                {availableFarms.length > 1 && (
                  <FormControl isRequired>
                    <FormLabel fontSize="xs" fontWeight="semibold" color="whiteAlpha.800" mb={1.5}>
                      <HStack spacing={1.5}>
                        <Icon as={FaTractor} color="blue.400" boxSize={3} />
                        <Text>Fazenda do Cliente</Text>
                      </HStack>
                    </FormLabel>
                    <Select
                      placeholder="Selecione qual fazenda receberá o KML..."
                      value={selectedFarmId}
                      onChange={(e) => setSelectedFarmId(e.target.value)}
                      bg="whiteAlpha.100"
                      border="1px solid"
                      borderColor={selectedFarmId ? "blue.400" : "whiteAlpha.200"}
                      color="white"
                      borderRadius="lg"
                      isDisabled={isLoading || uploadDone}
                      _focus={{ borderColor: "blue.400" }}
                      size="sm"
                    >
                      {availableFarms.map((f) => (
                        <option key={f.id} value={f.id} style={{ color: "black" }}>
                          {f.name} {f.location ? `— ${f.location}` : ""}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {availableFarms.length === 1 && (
                  <Box
                    p={2.5}
                    borderRadius="lg"
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                  >
                    <Text fontSize="10px" textTransform="uppercase" color="whiteAlpha.500" fontWeight="bold">
                      Fazenda Vinculada
                    </Text>
                    <HStack justify="space-between" mt={1}>
                      <HStack spacing={2}>
                        <Icon as={FaTractor} color="blue.400" boxSize={3.5} />
                        <Text fontSize="sm" fontWeight="semibold" color="white">
                          {availableFarms[0].name}
                        </Text>
                      </HStack>
                      {availableFarms[0].location && (
                        <Badge colorScheme="blue" variant="subtle" fontSize="10px" borderRadius="md">
                          {availableFarms[0].location}
                        </Badge>
                      )}
                    </HStack>
                  </Box>
                )}

                {availableFarms.length === 0 && (
                  <Box
                    p={3}
                    borderRadius="lg"
                    bg="orange.900"
                    border="1px solid"
                    borderColor="orange.400"
                  >
                    <Text fontSize="xs" fontWeight="semibold" color="orange.200" mb={2}>
                      Este cliente ainda não possui fazenda cadastrada. Informe o nome da fazenda para criá-la:
                    </Text>
                    <Input
                      placeholder="Ex: Fazenda Santa Maria"
                      value={newFarmName}
                      onChange={(e) => setNewFarmName(e.target.value)}
                      bg="blackAlpha.400"
                      border="1px solid"
                      borderColor="whiteAlpha.300"
                      color="white"
                      borderRadius="lg"
                      _focus={{ borderColor: "orange.300" }}
                      size="sm"
                      isDisabled={isLoading || uploadDone}
                    />
                  </Box>
                )}
              </Box>
            )}

            {/* 3. Drag & Drop Zone */}
            <Box
              border="2px dashed"
              borderColor={isDragging ? "blue.400" : file ? "green.400" : "whiteAlpha.300"}
              borderRadius="xl"
              p={5}
              textAlign="center"
              cursor="pointer"
              transition="all 0.2s"
              bg={isDragging ? "blue.900" : file ? "green.900" : "whiteAlpha.50"}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
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
                  <Icon as={MdInsertDriveFile} boxSize={9} color="green.300" />
                  <Text fontWeight="semibold" color="green.300" fontSize="sm">
                    {file.name}
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.600">
                    {(file.size / 1024).toFixed(1)} KB — clique para trocar
                  </Text>
                </VStack>
              ) : (
                <VStack spacing={1.5}>
                  <Icon as={FaFileUpload} boxSize={8} color="whiteAlpha.500" />
                  <Text fontWeight="medium" color="whiteAlpha.800" fontSize="sm">
                    Arraste o arquivo KML / KMZ aqui
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.500">
                    ou clique para selecionar do computador
                  </Text>
                  <Text fontSize="10px" color="whiteAlpha.400" mt={1}>
                    Formatos suportados: .kml, .kmz (máx. 10 MB)
                  </Text>
                </VStack>
              )}
            </Box>

            {/* 4. Nome da camada */}
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="whiteAlpha.700" mb={1}>
                Nome da camada (opcional)
              </Text>
              <Input
                placeholder="Ex: Talhões Safra 24/25"
                value={name}
                onChange={(e) => setName(e.target.value)}
                bg="whiteAlpha.100"
                border="1px solid"
                borderColor="whiteAlpha.200"
                color="white"
                _placeholder={{ color: "whiteAlpha.400" }}
                _focus={{ borderColor: "blue.400", boxShadow: "none" }}
                borderRadius="lg"
                size="sm"
                isDisabled={isLoading || uploadDone}
              />
            </Box>

            {isLoading && <Progress size="xs" isIndeterminate colorScheme="blue" borderRadius="full" />}

            {uploadDone && (
              <HStack justify="center" color="green.300" spacing={2} py={1}>
                <Icon as={FaCheckCircle} />
                <Text fontSize="sm" fontWeight="medium">
                  Camada vinculada e importada com sucesso!
                </Text>
              </HStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter gap={3} pt={2}>
          <Button variant="ghost" colorScheme="whiteAlpha" onClick={handleClose} isDisabled={isLoading} size="sm">
            Cancelar
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isDisabled={!isFormValid}
            isLoading={isLoading}
            loadingText="Importando..."
            borderRadius="lg"
            size="sm"
          >
            Importar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
