import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Text,
  IconButton,
  Button,
  Flex,
  Spinner,
  useToast,
  useDisclosure,
  Badge,
  SimpleGrid,
  VStack,
  HStack,
  Icon,
} from "@chakra-ui/react";
import { MdAdd, MdEdit, MdLocationOn, MdSensors, MdAgriculture } from "react-icons/md";
import { COLORS } from "../colors/colors";
import { isUserAdmin } from "../services/auth";
import { Navigate } from "react-router-dom";
import { getFarms, getProbes, getUsers, type User } from "../services/api";
import type { Farm, Probe } from "../types";

import { CreateFarmModal } from "../components/CreateFarmModal/CreateFarmModal";
import { AddDeviceModal } from "../components/AddDeviceModal/AddDeviceModal";

export function Settings() {
  const isAdmin = isUserAdmin();
  const toast = useToast();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [probes, setProbes] = useState<Probe[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const farmModal = useDisclosure();
  const probeModal = useDisclosure();

  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [selectedProbe, setSelectedProbe] = useState<Probe | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [farmsData, probesData, usersData] = await Promise.all([
        getFarms(),
        getProbes(),
        getUsers(),
      ]);

      setFarms([...farmsData].sort((a, b) => a.id - b.id));
      setProbes(probesData);

      const userResponse = usersData as { users?: User[] };

      if (userResponse && Array.isArray(userResponse.users)) {
        setUsers(userResponse.users);
      } else if (Array.isArray(usersData)) {
        setUsers(usersData);
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao carregar dados", status: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin, loadData]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const handleEditFarm = (farm: Farm) => {
    setSelectedFarm(farm);
    farmModal.onOpen();
  };

  const handleEditProbe = (probe: Probe) => {
    setSelectedProbe(probe);
    probeModal.onOpen();
  };

  const handleCreateFarm = () => {
    setSelectedFarm(null);
    farmModal.onOpen();
  };

  const closeFarmModal = () => {
    setSelectedFarm(null);
    farmModal.onClose();
  };

  const closeProbeModal = () => {
    setSelectedProbe(null);
    probeModal.onClose();
  };

  const getUserName = (userId: number) => {
    const user = users.find((u) => u.id === userId);
    return user
      ? user.name || user.username || user.email || `ID: ${userId}`
      : `ID: ${userId}`;
  };

  const getFarmName = (farmId: number) => {
    const farm = farms.find((f) => f.id === farmId);
    return farm ? farm.name : "Sem Fazenda";
  };

  // --- Utilitários de Status da Sonda ---
  const getStatusLabel = (code?: string) => {
    switch (code) {
      case "status_critical":
        return "Crítico";
      case "status_ok":
        return "Ideal";
      case "status_saturated":
        return "Saturado";
      case "status_alert":
        return "Atenção";
      default:
        return "Offline";
    }
  };

  const getStatusColor = (code?: string) => {
    switch (code) {
      case "status_critical":
        return "red.400";
      case "status_ok":
        return "green.400";
      case "status_saturated":
        return "cyan.400";
      case "status_alert":
        return "yellow.400";
      default:
        return "gray.400";
    }
  };

  const calculateProbeStatus = (probe: Probe) => {
    if (!probe.readings || probe.readings.length === 0) return "status_offline";
    const validReading = [...probe.readings]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .find((r) => r.moisture_pct !== null && r.moisture_pct !== undefined);
    if (!validReading) return "status_offline";

    const val = Number(validReading.moisture_pct);
    const v1 = probe.config_moisture_v1 ?? 30;
    const v2 = probe.config_moisture_v2 ?? 45;
    const v3 = probe.config_moisture_v3 ?? 60;

    if (val < v1) return "status_critical";
    if (val < v2) return "status_alert";
    if (val <= v3) return "status_ok";
    return "status_saturated";
  };

  const getStatusPriority = (code?: string) => {
    switch (code) {
      case "status_critical":
        return 1;
      case "status_alert":
        return 2;
      case "status_saturated":
        return 3;
      case "status_ok":
        return 4;
      default:
        return 5;
    }
  };

  return (
    <Box minH="100vh" bg={COLORS.background} p={{ base: 4, md: 8 }}>
      <Container maxW="container.xl" p={0}>
        <Heading color={COLORS.textPrimary} size="lg" mb={2}>
          Configurações
        </Heading>
        <Text color="gray.500" mb={6} fontSize="sm">
          Gerenciamento administrativo de fazendas e sondas.
        </Text>

        {loading ? (
          <Flex justify="center" align="center" h="200px">
            <Spinner size="xl" color={COLORS.primary} />
          </Flex>
        ) : (
          <Tabs colorScheme="blue" variant="enclosed" isLazy>
            <TabList
              borderBottomColor="#2D2D2D"
              overflowX="auto"
              overflowY="hidden"
              gap={2}
            >
              <Tab
                color="white"
                background={COLORS.tabColor}
                _selected={{
                  color: "white",
                  bg: "#53a6ea",
                  borderColor: "#2D2D2D",
                }}
                whiteSpace="nowrap"
              >
                Fazendas
              </Tab>
              <Tab
                color="white"
                background={COLORS.tabColor}
                _selected={{
                  color: "white",
                  bg: "#53a6ea",
                  borderColor: "#2D2D2D",
                }}
                whiteSpace="nowrap"
              >
                Sondas
              </Tab>
            </TabList>

            <TabPanels
              bg={COLORS.surface}
              border="1px solid #2D2D2D"
              borderTop="none"
              borderRadius="0 0 md md"
              p={{ base: 3, md: 6 }}
            >
              {/* TAB FAZENDAS */}
              <TabPanel p={0}>
                <Flex justify="flex-end" mb={4}>
                  <Button
                    leftIcon={<MdAdd />}
                    bg={COLORS.primary}
                    color="white"
                    _hover={{ bg: COLORS.primaryDark }}
                    onClick={handleCreateFarm}
                  >
                    Nova fazenda
                  </Button>
                </Flex>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {farms.map((farm) => (
                    <Box
                      key={farm.id}
                      bg="rgba(255,255,255,0.02)"
                      p={5}
                      borderRadius="md"
                      border="1px solid"
                      borderColor="#2D2D2D"
                      position="relative"
                    >
                      <Flex justify="space-between" align="flex-start" mb={4}>
                        <HStack>
                          <Flex
                            w="32px"
                            h="32px"
                            borderRadius="md"
                            bg="blue.900"
                            align="center"
                            justify="center"
                          >
                            <Icon as={MdAgriculture} color="blue.300" />
                          </Flex>
                          <Box>
                            <Text
                              fontWeight="bold"
                              color="white"
                              lineHeight="1.2"
                            >
                              {farm.name}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              ID: {farm.id}
                            </Text>
                          </Box>
                        </HStack>
                        <IconButton
                          aria-label="Editar"
                          icon={<MdEdit />}
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                          onClick={() => handleEditFarm(farm)}
                        />
                      </Flex>

                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between">
                          <HStack spacing={1}>
                            <Icon
                              as={MdLocationOn}
                              color="gray.500"
                              fontSize="sm"
                            />
                            <Text fontSize="sm" color="gray.400">
                              Local
                            </Text>
                          </HStack>
                          <Text
                            fontSize="sm"
                            color="white"
                            textAlign="right"
                            noOfLines={1}
                          >
                            {farm.location || "-"}
                          </Text>
                        </HStack>

                        <Flex
                          justify="space-between"
                          align="center"
                          pt={2}
                          borderTop="1px solid"
                          borderColor="whiteAlpha.100"
                        >
                          <Text fontSize="sm" color="gray.400">
                            Proprietário
                          </Text>
                          <Badge
                            colorScheme="blue"
                            variant="subtle"
                            borderRadius="full"
                            px={2}
                            textTransform="none"
                          >
                            {getUserName(farm.user_id)}
                          </Badge>
                        </Flex>
                      </VStack>
                    </Box>
                  ))}
                  {farms.length === 0 && (
                    <Text color="gray.500" py={4}>
                      Nenhuma fazenda cadastrada.
                    </Text>
                  )}
                </SimpleGrid>
              </TabPanel>

              <TabPanel p={0}>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {[...probes]
                    .sort((a, b) => {
                      const statusA = calculateProbeStatus(a);
                      const statusB = calculateProbeStatus(b);
                      return (
                        getStatusPriority(statusA) - getStatusPriority(statusB)
                      );
                    })
                    .map((probe) => {
                      const realStatus = calculateProbeStatus(probe);
                      const statusColor =
                        getStatusColor(realStatus).split(".")[0];

                      return (
                        <Box
                          key={probe.esn}
                          bg="rgba(255,255,255,0.02)"
                          p={5}
                          borderRadius="md"
                          border="1px solid"
                          borderColor="#2D2D2D"
                        >
                          <Flex
                            justify="space-between"
                            align="flex-start"
                            mb={4}
                          >
                            <HStack>
                              <Flex
                                w="32px"
                                h="32px"
                                borderRadius="md"
                                bg="rgba(14, 107, 59, 0.2)"
                                align="center"
                                justify="center"
                              >
                                <Icon as={MdSensors} color={COLORS.primary} />
                              </Flex>
                              <Box>
                                <Text
                                  fontWeight="bold"
                                  color="white"
                                  lineHeight="1.2"
                                >
                                  {probe.name}
                                </Text>
                                <Text
                                  fontSize="xs"
                                  color="gray.500"
                                  fontFamily="monospace"
                                >
                                  ESN: {probe.esn}
                                </Text>
                              </Box>
                            </HStack>
                            <IconButton
                              aria-label="Editar"
                              icon={<MdEdit />}
                              size="sm"
                              colorScheme="blue"
                              variant="ghost"
                              onClick={() => handleEditProbe(probe)}
                            />
                          </Flex>

                          <VStack align="stretch" spacing={3}>
                            <HStack justify="space-between">
                              <HStack spacing={1}>
                                <Icon
                                  as={MdAgriculture}
                                  color="gray.500"
                                  fontSize="sm"
                                />
                                <Text fontSize="sm" color="gray.400">
                                  Fazenda
                                </Text>
                              </HStack>
                              {probe.farm_id ? (
                                <Text
                                  fontSize="sm"
                                  color="white"
                                  textAlign="right"
                                  noOfLines={1}
                                >
                                  {getFarmName(probe.farm_id)}
                                </Text>
                              ) : (
                                <Text fontSize="sm" color="gray.600">
                                  -
                                </Text>
                              )}
                            </HStack>

                            <Flex
                              justify="space-between"
                              align="center"
                              pt={2}
                              borderTop="1px solid"
                              borderColor="whiteAlpha.100"
                            >
                              <Text fontSize="sm" color="gray.400">
                                Status
                              </Text>
                              <Badge
                                colorScheme={statusColor}
                                variant="solid"
                                borderRadius="full"
                                px={3}
                              >
                                {getStatusLabel(realStatus)}
                              </Badge>
                            </Flex>
                          </VStack>
                        </Box>
                      );
                    })}
                  {probes.length === 0 && (
                    <Text color="gray.500" py={4}>
                      Nenhuma sonda cadastrada.
                    </Text>
                  )}
                </SimpleGrid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}

        <CreateFarmModal
          isOpen={farmModal.isOpen}
          onClose={closeFarmModal}
          onSuccess={loadData}
          initialData={selectedFarm}
        />
        <AddDeviceModal
          isOpen={probeModal.isOpen}
          onClose={closeProbeModal}
          onSuccess={loadData}
          initialData={selectedProbe}
        />
      </Container>
    </Box>
  );
}
