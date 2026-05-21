import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Heading,
  Container,
  Spinner,
  useToast,
  Button,
  Flex,
  useDisclosure, // 1. IMPORTANTE: Importar useDisclosure
} from "@chakra-ui/react";
import { MdAdd } from "react-icons/md";
import { getUserFarms } from "../services/api";
import { FarmList } from "../components/FarmList/FarmList";
import { CreateFarmModal } from "../components/CreateFarmModal/CreateFarmModal"; // 2. Importar o Modal
import type { Farm } from "../types";
import { COLORS } from "../colors/colors";
import { useNavigate } from "react-router-dom";
import { isUserAdmin } from "../services/auth";

export function MyFarms() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const toastId = "farm-error-toast";
  const navigate = useNavigate();
  const isAdmin = isUserAdmin();

  const handleFarmSelect = (farm: Farm) => {
    // Redireciona para a tela de sondas passando o ID da fazenda via query params
    navigate(`/probes?farmId=${farm.id}`);
  };

  // 3. ATIVAR O HOOK DO MODAL
  const { isOpen, onOpen, onClose } = useDisclosure();

  const loadFarms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUserFarms();
      setFarms(data);
    } catch (error) {
      console.error(error);
      // Verifica se o toast já não está ativo para não duplicar
      if (!toast.isActive(toastId)) {
        toast({
          id: toastId, // Define o ID
          title: "Erro ao carregar fazendas",
          description: "Não foi possível buscar sua lista de fazendas.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadFarms();
  }, [loadFarms]);

  return (
    <Box minH="100vh" bg={COLORS.background} p={8}>
      <Container maxW="container.lg">
        <Flex justify="space-between" align="center" mb={8}>
          <Heading color={COLORS.textPrimary} size="lg">
            Minhas Fazendas
          </Heading>
          {isAdmin && ( 
            <Button
              leftIcon={<MdAdd />}
              bg={COLORS.primary}
              color="white"
              _hover={{ bg: COLORS.primaryDark }}
              onClick={onOpen}
            >
              Nova Fazenda
            </Button>
          )}
        </Flex>

        {loading ? (
          <Flex justify="center" align="center" h="200px">
            <Spinner size="xl" color={COLORS.primary} />
          </Flex>
        ) : (
          <FarmList farms={farms} onSelect={handleFarmSelect} />
        )}

        <CreateFarmModal
          isOpen={isOpen}
          onClose={onClose}
          onSuccess={loadFarms}
        />
      </Container>
    </Box>
  );
}
