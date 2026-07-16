import {
  Box,
  Flex,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Icon,
  HStack,
  SimpleGrid,
  Hide,
  Show,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  VStack,
  Badge,
  CloseButton,
} from "@chakra-ui/react";
import {
  MdArrowUpward,
  MdArrowDownward,
  MdSort,
  MdSensors,
  MdLocationOn,
  MdAutoAwesome,
} from "react-icons/md";
import type { Probe } from "../../types";
import { useEffect, useState } from "react";
import { getDeviceAnalysis } from "../../services/api";
import { useWeatherForecast } from "../../hooks/useWeatherForecast";
import { WiHot } from "react-icons/wi";
import { FaTint } from "react-icons/fa";

export interface TableRowData extends Probe {
  farmName: string;
  status: string;
  batteryLevel: number | undefined;
  batteryDate: string;
  lastCommunicationFormatted: string;
  lastCommunicationTimestamp: number;
  sugestao?: string;
  copiloto_acao?: string;
}

export type SortKey =
  | "esn"
  | "name"
  | "farmName"
  | "status"
  | "batteryLevel"
  | "lastCommunicationTimestamp"
  | "cultura";

interface DeviceTableProps {
  data: TableRowData[];
  onRowClick: (id: number) => void;
  sortConfig: { key: SortKey; direction: "asc" | "desc" };
  onSort: (key: SortKey) => void;
  isAdmin?: boolean;
}

const sortLabels: Record<SortKey, string> = {
  name: "Nome",
  status: "Status",
  cultura: "Cultura",
  lastCommunicationTimestamp: "Último envio",
  batteryLevel: "Bateria",
  esn: "ESN",
  farmName: "Fazenda",
};

const CopilotoText = ({
  esn,
  preloadedData,
  isDesktop,
}: {
  esn: string;
  preloadedData?: string;
  isDesktop?: boolean;
}) => {
  const [fetchedSugestao, setFetchedSugestao] = useState<string>("");
  const [isFetching, setIsFetching] = useState<boolean>(!preloadedData);

  useEffect(() => {
    if (preloadedData) {
      return;
    }

    let isMounted = true;

    getDeviceAnalysis(esn)
      .then((res) => {
        if (isMounted) {
          setFetchedSugestao(res.sugestao || "Monitoramento padrão.");
          setIsFetching(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFetchedSugestao("Condições em monitoramento padrão.");
          setIsFetching(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [esn, preloadedData]);

  const displaySugestao = preloadedData || fetchedSugestao;
  const isLoading = !preloadedData && isFetching;

  if (isLoading) {
    return (
      <Text
        id={`decision-${isDesktop ? "desktop" : "mobile"}-${esn}`}
        fontSize={isDesktop ? "xs" : "sm"}
        color="gray.400"
        fontStyle="italic"
        whiteSpace="normal"
      >
        Buscando recomendação...
      </Text>
    );
  }

  return (
    <Text
      fontSize={isDesktop ? "sm" : "lg"}
      color={isDesktop ? "blue.300" : "blue.200"}
      lineHeight="tall"
      whiteSpace="normal"
    >
      {displaySugestao}
    </Text>
  );
};

const EvapotranspirationCell = ({
  lat,
  lng,
}: {
  lat?: number;
  lng?: number;
}) => {
  const { forecast, loading } = useWeatherForecast(lat, lng);

  if (loading) {
    return (
      <Text
        fontSize="xs"
        color="gray.500"
        fontStyle="italic"
        textAlign="center"
      >
        Buscando...
      </Text>
    );
  }

  if (!forecast || forecast.length === 0) {
    return (
      <Text fontSize="xs" color="gray.500" textAlign="center">
        -
      </Text>
    );
  }

  const next4Days = forecast.slice(0, 4);

  return (
    <HStack spacing={4} justify="center" whiteSpace="nowrap">
      {next4Days.map((day, index) => (
        <VStack key={day.date} spacing={0}>
          <Text fontSize="10px" color="gray.500" textTransform="uppercase">
            {index === 0
              ? `Hoje, ${day.dayNumber}`
              : `${day.dayName.substring(0, 3)}, ${day.dayNumber}`}
          </Text>
          <Text fontSize="sm" fontWeight="bold" color="orange.400">
            {day.et0 != null ? day.et0.toFixed(1) : "-"}
          </Text>
        </VStack>
      ))}
    </HStack>
  );
};

const MobileEvapotranspirationCard = ({
  lat,
  lng,
}: {
  lat?: number;
  lng?: number;
}) => {
  const { forecast, loading } = useWeatherForecast(lat, lng);

  return (
    <Box
      bg="gray.900"
      borderRadius="md"
      p={2}
      border="1px solid"
      borderColor="gray.700"
      display="flex"
      flexDirection="column"
    >
      <HStack spacing={1} mb={1} align="center" justify="center">
        <Icon as={WiHot} boxSize={4} color="orange.400" />
        <Text
          fontSize="10px"
          fontWeight="bold"
          color="gray.500"
          textTransform="uppercase"
        >
          Evapotranspiração
        </Text>
      </HStack>
      {loading ? (
        <Flex flex="1" align="center" justify="center">
          <Text fontSize="xs" color="gray.500" fontStyle="italic">
            Buscando...
          </Text>
        </Flex>
      ) : !forecast || forecast.length === 0 ? (
        <Flex flex="1" align="center" justify="center">
          <Text fontSize="xs" color="gray.500">
            -
          </Text>
        </Flex>
      ) : (
        <VStack align="stretch" spacing={1} justify="center" flex="1">
          {forecast.slice(0, 3).map((day, index) => {
            const label =
              index === 0
                ? `Hoje, ${day.dayNumber}`
                : `${day.dayName.substring(0, 3)}, ${day.dayNumber}`;

            return (
              <Flex key={day.date} justify="space-between" align="center">
                <Text fontSize="xs" color="gray.500">
                  {label}
                </Text>
                <Text fontSize="sm" fontWeight="bold" color="orange.400">
                  {day.et0 != null ? day.et0.toFixed(1) : "-"}{" "}
                  <Text
                    as="span"
                    fontSize="10px"
                    color="gray.500"
                    fontWeight="normal"
                  >
                    mm
                  </Text>
                </Text>
              </Flex>
            );
          })}
        </VStack>
      )}
    </Box>
  );
};

export function DeviceTable({
  data,
  onRowClick,
  sortConfig,
  onSort,
  isAdmin,
}: DeviceTableProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleFlip = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const checkIsOffline = (timestamp: number) => {
    const oneHourMs = 60 * 60 * 1000;
    return currentTime - timestamp > oneHourMs;
  };

  const formatRain = (val?: number) => {
    if (val === undefined || val === null) return "-";
    return `${val.toFixed(1)}`;
  };

  const calcularDAP = (dataPlantio?: string | null) => {
    if (!dataPlantio) return "-";
    const hoje = new Date();
    const dataInicial = new Date(dataPlantio);
    const diffInMs = hoje.getTime() - dataInicial.getTime();
    const dias = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    return dias < 0 ? 0 : dias;
  };

  const formatarPotencia = (cv?: number | null) => {
    if (cv === null || cv === undefined) return "-";
    const kw = Math.ceil(cv * 0.7355);
    return `${Math.ceil(cv)}cv/${kw}kw`;
  };

  const getStatusColor = (status: string, version: string) => {
    if (version === "desktop") {
      if (status.includes("status_critical")) return "red";
      if (status.includes("status_alert")) return "yellow";
      if (status.includes("status_ok")) return "green";
      if (status.includes("status_saturated")) return "blue";
    } else {
      if (status.includes("status_critical")) return "red.400";
      if (status.includes("status_alert")) return "yellow.400";
      if (status.includes("status_ok")) return "green.400";
      if (status.includes("status_saturated")) return "blue.400";
    }
    return "gray.400";
  };

  const getStatusLabel = (status: string) => {
    if (status.includes("status_critical")) return "Crítico";
    if (status.includes("status_alert")) return "Atenção";
    if (status.includes("status_ok")) return "Ideal";
    if (status.includes("status_saturated")) return "Saturado";
    return "Offline";
  };

  const renderSortIcon = (column: SortKey) => {
    if (sortConfig.key !== column) return null;
    return (
      <Icon
        as={sortConfig.direction === "asc" ? MdArrowUpward : MdArrowDownward}
        ml={1}
      />
    );
  };

  if (data.length === 0) {
    return (
      <Text color="gray.500" fontStyle="italic">
        Nenhuma sonda encontrada.
      </Text>
    );
  }

  return (
    <>
      {/* VISÃO MOBILE */}
      <Hide above="md">
        <Flex justify="space-between" align="center" mb={4} px={1}>
          <Menu>
            <MenuButton
              as={Button}
              size="sm"
              variant="outline"
              colorScheme="blue"
              color="white"
              borderColor="gray.600"
              bg="gray.800"
              leftIcon={<Icon as={MdSort} />}
              rightIcon={
                <Icon
                  as={
                    sortConfig.direction === "asc"
                      ? MdArrowUpward
                      : MdArrowDownward
                  }
                />
              }
              _hover={{ bg: "gray.700" }}
              _active={{ bg: "gray.600" }}
            >
              {sortLabels[sortConfig.key]}
            </MenuButton>
            <MenuList
              bg="gray.800"
              borderColor="gray.600"
              zIndex={10}
              shadow="xl"
            >
              {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                <MenuItem
                  key={key}
                  bg="gray.800"
                  _hover={{ bg: "gray.700" }}
                  onClick={() => onSort(key)}
                  display="flex"
                  justifyContent="space-between"
                  color="white"
                >
                  <Text>{sortLabels[key]}</Text>
                  {sortConfig.key === key && (
                    <Icon
                      as={
                        sortConfig.direction === "asc"
                          ? MdArrowUpward
                          : MdArrowDownward
                      }
                      color="blue.400"
                    />
                  )}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </Flex>

        <SimpleGrid gridTemplateColumns="1fr" gap={4} w="100%">
          {data.map((row) => {
            const isOffline = checkIsOffline(row.lastCommunicationTimestamp);

            return (
              <Box
                key={`mobile-card-${row.id}`}
                sx={{ perspective: "1000px" }}
                cursor="pointer"
                onClick={() => onRowClick(row.id)}
              >
                <Box
                  display="grid"
                  transition="transform 0.6s"
                  sx={{ transformStyle: "preserve-3d" }}
                  transform={
                    flippedCards[row.id] ? "rotateY(180deg)" : "rotateY(0deg)"
                  }
                >
                  {/* FACE DA FRENTE (DADOS DA SONDA) */}
                  <Box
                    gridArea="1 / 1 / 2 / 2"
                    sx={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                    }}
                    bg="gray.800"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="gray.700"
                    p={4}
                    overflow="hidden"
                    boxShadow="lg"
                    _hover={{ bg: "whiteAlpha.100", borderColor: "blue.500" }}
                    _before={{
                      content: '""',
                      position: "absolute",
                      top: "8px",
                      bottom: "8px",
                      left: "0",
                      width: "5px",
                      borderRadius: "0 6px 6px 0",
                      bg: getStatusColor(row.status, "mobile"),
                    }}
                  >
                    <Flex
                      justify="space-between"
                      align="center"
                      gap={2}
                      mb={3}
                      pl={2}
                    >
                      <Box flex="1" minW={0}>
                        <HStack>
                          <Text
                            fontSize="lg"
                            fontWeight="bold"
                            color="white"
                            noOfLines={1}
                          >
                            {row.name || row.esn}
                          </Text>
                          {isAdmin && (
                            <Badge
                              bg={isOffline ? "gray" : "green"}
                              variant="subtle"
                              borderRadius="full"
                              px={1.5}
                              py={1.5}
                              whiteSpace="nowrap"
                            />
                          )}
                        </HStack>
                        {row.name && (
                          <Text fontSize="xs" color="gray.400" noOfLines={1}>
                            ESN: {row.esn}
                          </Text>
                        )}
                      </Box>

                      <Flex align="center" gap={1}>
                        <Badge
                          backgroundColor={getStatusColor(row.status, "mobile")}
                          variant="subtle"
                          borderRadius="full"
                          px={2}
                          py={1}
                          whiteSpace="nowrap"
                        >
                          {getStatusLabel(row.status)}
                        </Badge>
                      </Flex>
                    </Flex>

                    <SimpleGrid columns={2} gap={2} pl={2} pr={2}>
                      <Box
                        bg="gray.900"
                        borderRadius="md"
                        p={2}
                        border="1px solid"
                        borderColor="gray.700"
                        display="flex"
                        flexDirection="column"
                      >
                        <HStack
                          spacing={1.5}
                          mb={1}
                          align="center"
                          justify="center"
                        >
                          <Icon as={FaTint} boxSize={3} color="blue.400" />
                          <Text
                            fontSize="10px"
                            fontWeight="bold"
                            color="gray.500"
                            textTransform="uppercase"
                          >
                            Precipitação
                          </Text>
                        </HStack>
                        <VStack
                          align="stretch"
                          spacing={1}
                          justify="center"
                          flex="1"
                        >
                          <Flex justify="space-between" align="center">
                            <Text fontSize="xs" color="gray.500">
                              1h
                            </Text>
                            <Text
                              fontSize="sm"
                              fontWeight="bold"
                              color="blue.200"
                            >
                              {formatRain(row.rain_1h)}{" "}
                              <Text
                                as="span"
                                fontSize="10px"
                                color="gray.500"
                                fontWeight="normal"
                              >
                                mm
                              </Text>
                            </Text>
                          </Flex>
                          <Flex justify="space-between" align="center">
                            <Text fontSize="xs" color="gray.500">
                              24h
                            </Text>
                            <Text
                              fontSize="sm"
                              fontWeight="bold"
                              color="blue.300"
                            >
                              {formatRain(row.rain_24h)}{" "}
                              <Text
                                as="span"
                                fontSize="10px"
                                color="gray.500"
                                fontWeight="normal"
                              >
                                mm
                              </Text>
                            </Text>
                          </Flex>
                          <Flex justify="space-between" align="center">
                            <Text fontSize="xs" color="gray.500">
                              7d
                            </Text>
                            <Text
                              fontSize="sm"
                              fontWeight="bold"
                              color="blue.400"
                            >
                              {formatRain(row.rain_7d)}{" "}
                              <Text
                                as="span"
                                fontSize="10px"
                                color="gray.500"
                                fontWeight="normal"
                              >
                                mm
                              </Text>
                            </Text>
                          </Flex>
                        </VStack>
                      </Box>

                      <MobileEvapotranspirationCard
                        lat={row.latitude}
                        lng={row.longitude}
                      />
                    </SimpleGrid>

                    <Box
                      pt={4}
                      mt={4}
                      borderTop="1px"
                      borderColor="gray.600"
                      pl={2}
                    >
                      <SimpleGrid columns={3} gap={2} mb={4}>
                        <Box textAlign="center">
                          <Text fontSize="xs" color="gray.500" mb={0.5}>
                            Cultura
                          </Text>
                          <Text
                            fontSize="sm"
                            fontWeight="medium"
                            color="gray.200"
                            noOfLines={1}
                          >
                            {row.cultura || "-"}
                          </Text>
                        </Box>
                        <Box textAlign="center">
                          <Text fontSize="xs" color="gray.500" mb={0.5}>
                            DAP
                          </Text>
                          <Text
                            fontSize="sm"
                            fontWeight="medium"
                            color="gray.200"
                          >
                            {row.data_plantio
                              ? `${calcularDAP(row.data_plantio)} d`
                              : "-"}
                          </Text>
                        </Box>
                        <Box textAlign="center">
                          <Text fontSize="xs" color="gray.500" mb={0.5}>
                            Potência
                          </Text>
                          <Text
                            fontSize="xs"
                            fontWeight="medium"
                            color="gray.200"
                          >
                            {formatarPotencia(row.potencia_cv)}
                          </Text>
                        </Box>
                      </SimpleGrid>

                      <Flex
                        justify="space-between"
                        align="center"
                        bg="blackAlpha.400"
                        p={3}
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.700"
                      >
                        <Box minW={0}>
                          <Text
                            color="gray.400"
                            fontSize="xs"
                            noOfLines={1}
                            mb={1}
                          >
                            Fazenda:{" "}
                            <Text as="span" color="white" fontWeight="medium">
                              {row.farmName}
                            </Text>
                          </Text>
                          <Text color="gray.400" fontSize="xs" noOfLines={1}>
                            Envio:{" "}
                            <Text as="span" color="white" fontWeight="medium">
                              {row.lastCommunicationFormatted}
                            </Text>
                          </Text>
                        </Box>
                        <Box textAlign="right" pl={2}>
                          <Button
                            size="sm"
                            colorScheme="blue"
                            bg="blue.500"
                            color="white"
                            variant="solid"
                            _hover={{ bg: "blue.600" }}
                            onClick={(e) => toggleFlip(row.id, e)}
                            leftIcon={<Icon as={MdAutoAwesome} />}
                            borderRadius="full"
                            px={3}
                          >
                            Copiloto
                          </Button>
                        </Box>
                      </Flex>
                    </Box>
                  </Box>

                  {/* FACE DE TRÁS (COPILOTO AÇÃO RECOMENDADA) */}
                  <Box
                    gridArea="1 / 1 / 2 / 2"
                    sx={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                    bg="gray.800"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="blue.500"
                    p={5}
                    display="flex"
                    flexDirection="column"
                    boxShadow="lg"
                  >
                    <Flex justify="space-between" align="center" mb={4}>
                      <HStack>
                        <Icon as={MdAutoAwesome} color="blue.400" boxSize={5} />
                        <Text fontWeight="bold" color="white" fontSize="md">
                          Ação Recomendada
                        </Text>
                      </HStack>
                      <CloseButton
                        size="sm"
                        color="gray.400"
                        onClick={(e) => toggleFlip(row.id, e)}
                      />
                    </Flex>

                    <Box
                      flex="1"
                      bg="blackAlpha.400"
                      p={4}
                      borderRadius="md"
                      overflowY="auto"
                    >
                      <CopilotoText
                        esn={row.esn}
                        preloadedData={row.sugestao || row.copiloto_acao}
                        isDesktop={false}
                      />
                    </Box>

                    <Button
                      mt={6}
                      size="sm"
                      variant="outline"
                      colorScheme="blue"
                      onClick={(e) => toggleFlip(row.id, e)}
                      w="full"
                    >
                      Voltar para Detalhes
                    </Button>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </SimpleGrid>
      </Hide>

      {/* VISÃO DESKTOP */}
      <Show above="md">
        <Box
          bg="gray.800"
          borderRadius="2rem"
          overflow="hidden"
          boxShadow="2xl"
        >
          <Table
            variant="unstyled"
            w="full"
            textAlign="left"
            sx={{ borderCollapse: "collapse" }}
          >
            <Thead bg="whiteAlpha.50">
              <Tr
                color="gray.400"
                fontSize="10px"
                textTransform="uppercase"
                letterSpacing="0.2em"
                fontWeight="bold"
              >
                {/* 1. Nome do Dispositivo */}
                <Th
                  py={4}
                  px={4}
                  minW="260px"
                  cursor="pointer"
                  onClick={() => onSort("status")}
                  color="gray.400"
                >
                  <HStack spacing={1}>
                    <Text>Nome do Dispositivo</Text>
                    {renderSortIcon("status")}
                  </HStack>
                </Th>

                {/* 2. Dados */}
                <Th
                  py={4}
                  px={4}
                  borderLeft="1px solid"
                  borderColor="whiteAlpha.100"
                  cursor="pointer"
                  onClick={() => onSort("cultura")}
                  color="gray.400"
                >
                  <HStack spacing={1}>
                    <Text>Dados</Text>
                    {renderSortIcon("cultura")}
                  </HStack>
                </Th>

                {/* 3. Decisão */}
                <Th
                  py={4}
                  px={4}
                  borderLeft="1px solid"
                  borderColor="whiteAlpha.100"
                  color="gray.400"
                >
                  <Text>Decisão</Text>
                </Th>

                {/* 4. Precipitação */}
                <Th
                  py={4}
                  px={4}
                  textAlign="center"
                  borderLeft="1px solid"
                  borderColor="whiteAlpha.100"
                  textTransform="none"
                >
                  <HStack justify="center" align="center" spacing={2}>
                    <Icon as={FaTint} boxSize={4} color="blue.400" />

                    <Box>
                      <Text as="span" color="gray.400">
                        PRECIPITAÇÃO (mm)
                      </Text>
                    </Box>
                  </HStack>
                </Th>

                {/* 5. Evapotranspiração */}
                <Th
                  py={4}
                  px={4}
                  textAlign="center"
                  borderLeft="1px solid"
                  borderColor="whiteAlpha.100"
                  textTransform="none"
                >
                  <HStack justify="center" spacing={2}>
                    <Icon as={WiHot} boxSize={6} color="orange.400" />
                    <Text as="span" color="gray.400">
                      EVAPOTRANSPIRAÇÃO (mm)
                    </Text>
                  </HStack>
                </Th>
              </Tr>
            </Thead>

            <Tbody
              sx={{
                "& tr": {
                  borderBottom: "1px solid",
                  borderColor: "rgba(255, 255, 255, 0.05)",
                },
              }}
            >
              {data.map((row) => {
                const isOffline = checkIsOffline(
                  row.lastCommunicationTimestamp,
                );
                const rawStatusColor = getStatusColor(row.status, "desktop");
                const accentColor =
                  rawStatusColor === "gray.400"
                    ? "gray.500"
                    : `${rawStatusColor}.500`;

                let badgeBg, badgeColor, badgeDot;
                if (rawStatusColor.includes("green")) {
                  badgeBg = "green.900";
                  badgeColor = "green.300";
                  badgeDot = "green.400";
                } else if (rawStatusColor.includes("red")) {
                  badgeBg = "red.900";
                  badgeColor = "red.300";
                  badgeDot = "red.400";
                } else if (rawStatusColor.includes("blue")) {
                  badgeBg = "blue.900";
                  badgeColor = "blue.300";
                  badgeDot = "blue.400";
                } else if (rawStatusColor.includes("yellow")) {
                  badgeBg = "yellow.900";
                  badgeColor = "yellow.300";
                  badgeDot = "yellow.400";
                } else {
                  badgeBg = "whiteAlpha.200";
                  badgeColor = "gray.300";
                  badgeDot = "gray.400";
                }

                return (
                  <Tr
                    key={`desktop-row-${row.id}`}
                    onClick={() => onRowClick(row.id)}
                    role="group"
                    cursor="pointer"
                    _hover={{ bg: "whiteAlpha.50" }}
                    transition="colors 0.2s"
                    position="relative"
                  >
                    {/* 1. Nome do Dispositivo, ESN, Fazenda, Último Envio, Status e Online/Offline */}
                    <Td py={4} px={4} position="relative" borderBottom="none">
                      <Box
                        position="absolute"
                        left={0}
                        top={0}
                        bottom={0}
                        w="4px"
                        bg={accentColor}
                      />

                      <Flex align="center" gap={3} ml={2}>
                        <Flex
                          h={8}
                          w={8}
                          minW={8}
                          rounded="xl"
                          bg="blue.900"
                          color="blue.300"
                          align="center"
                          justify="center"
                        >
                          <Icon as={MdSensors} boxSize={4} />
                        </Flex>
                        <VStack align="start" spacing={1.5}>
                          {/* Nome */}
                          <Text
                            fontFamily="heading"
                            fontWeight="bold"
                            fontSize="md"
                            color="white"
                            lineHeight="short"
                            noOfLines={1}
                          >
                            {row.name || row.esn}
                          </Text>

                          {/* ESN e Último Envio Integrados */}
                          <HStack spacing={3} fontSize="11px" color="gray.400">
                            <Text>ESN: {row.esn}</Text>
                            <Text>
                              Último Envio: {row.lastCommunicationFormatted}
                            </Text>
                          </HStack>

                          {/* Fazenda e Badges (Online e Status) */}
                          <HStack spacing={3} mt={1}>
                            <HStack
                              spacing={1}
                              fontSize="11px"
                              color="gray.400"
                            >
                              <Icon as={MdLocationOn} boxSize={3} />
                              <Text noOfLines={1}>
                                {row.farmName || "Sem fazenda"}
                              </Text>
                            </HStack>

                            <HStack spacing={2} ml={2}>
                              {isAdmin && (
                                <Flex
                                  align="center"
                                  px={2}
                                  py={0.5}
                                  rounded="full"
                                  bg={
                                    isOffline ? "whiteAlpha.200" : "green.900"
                                  }
                                  color={isOffline ? "gray.300" : "green.300"}
                                  fontSize="10px"
                                  fontWeight="bold"
                                  letterSpacing="wider"
                                  textTransform="uppercase"
                                >
                                  <Box
                                    h={1.5}
                                    w={1.5}
                                    rounded="full"
                                    bg={isOffline ? "gray.400" : "green.400"}
                                    mr={1}
                                  />
                                  {isOffline ? "Offline" : "Online"}
                                </Flex>
                              )}

                              {/* Divisor Visual */}
                              {isAdmin && (
                                <Text color="whiteAlpha.400" fontSize="xs">
                                  |
                                </Text>
                              )}

                              <Flex
                                align="center"
                                px={2}
                                py={0.5}
                                rounded="full"
                                bg={badgeBg}
                                color={badgeColor}
                                fontSize="10px"
                                fontWeight="bold"
                                letterSpacing="wider"
                                textTransform="uppercase"
                              >
                                <Box
                                  h={1.5}
                                  w={1.5}
                                  rounded="full"
                                  bg={badgeDot}
                                  mr={1}
                                />
                                {getStatusLabel(row.status)}
                              </Flex>
                            </HStack>
                          </HStack>
                        </VStack>
                      </Flex>
                    </Td>

                    {/* 2. Dados */}
                    <Td
                      py={4}
                      px={4}
                      borderLeft="1px solid"
                      borderColor="whiteAlpha.100"
                      borderBottom="none"
                    >
                      <Flex gap={4} align="center">
                        <Flex
                          direction="column"
                          gap={0.5}
                          fontSize="xs"
                          minW="80px"
                        >
                          <HStack spacing={1}>
                            <Text color="gray.400">Cultura:</Text>
                            <Text fontWeight="semibold" color="white">
                              {row.cultura || "-"}
                            </Text>
                          </HStack>
                          <HStack spacing={1}>
                            <Text color="gray.400">DAP:</Text>
                            <Text fontWeight="semibold" color="white">
                              {row.data_plantio
                                ? calcularDAP(row.data_plantio)
                                : "-"}
                              <Text
                                as="span"
                                fontSize="10px"
                                fontWeight="normal"
                                color="whiteAlpha.600"
                              >
                                {" "}
                                dias
                              </Text>
                            </Text>
                          </HStack>
                        </Flex>

                        <Box w="1px" h="35px" bg="whiteAlpha.200" />

                        <VStack
                          align="start"
                          spacing={0}
                          fontSize="sm"
                          minW="50px"
                        >
                          <Text fontWeight="bold" color="white">
                            {row.potencia_cv ? Math.ceil(row.potencia_cv) : "-"}{" "}
                            <Text
                              as="span"
                              fontSize="10px"
                              fontWeight="normal"
                              color="whiteAlpha.600"
                            >
                              cv
                            </Text>
                          </Text>
                          <Text fontWeight="bold" color="white">
                            {row.potencia_cv
                              ? Math.ceil(row.potencia_cv * 0.7355)
                              : "-"}{" "}
                            <Text
                              as="span"
                              fontSize="10px"
                              fontWeight="normal"
                              color="whiteAlpha.600"
                            >
                              kW
                            </Text>
                          </Text>
                        </VStack>
                      </Flex>
                    </Td>

                    {/* 3. Decisão (Copiloto) */}
                    <Td
                      py={4}
                      px={4}
                      borderLeft="1px solid"
                      borderColor="whiteAlpha.100"
                      borderBottom="none"
                      maxW="300px"
                    >
                      <CopilotoText
                        esn={row.esn}
                        preloadedData={row.sugestao || row.copiloto_acao}
                        isDesktop={true}
                      />
                    </Td>

                    <Td
                      py={4}
                      px={4}
                      textAlign="center"
                      borderLeft="1px solid"
                      borderColor="whiteAlpha.100"
                      borderBottom="none"
                    >
                      <HStack spacing={4} justify="center" whiteSpace="nowrap">
                        <VStack spacing={0}>
                          <Text
                            fontSize="10px"
                            color="gray.500"
                            textTransform="uppercase"
                          >
                            1h
                          </Text>
                          <Text
                            color="blue.400"
                            fontWeight="bold"
                            fontSize="md"
                          >
                            {formatRain(row.rain_1h)}
                          </Text>
                        </VStack>

                        <Box w="1px" h="20px" bg="whiteAlpha.200" />

                        <VStack spacing={0}>
                          <Text
                            fontSize="10px"
                            color="gray.500"
                            textTransform="uppercase"
                          >
                            24h
                          </Text>
                          <Text
                            color="blue.400"
                            fontWeight="bold"
                            fontSize="md"
                          >
                            {formatRain(row.rain_24h)}
                          </Text>
                        </VStack>

                        <Box w="1px" h="20px" bg="whiteAlpha.200" />

                        <VStack spacing={0}>
                          <Text
                            fontSize="10px"
                            color="gray.500"
                            textTransform="uppercase"
                          >
                            7d
                          </Text>
                          <Text
                            color="blue.400"
                            fontWeight="bold"
                            fontSize="md"
                          >
                            {formatRain(row.rain_7d)}
                          </Text>
                        </VStack>
                      </HStack>
                    </Td>

                    {/* 5. Evapotranspiração */}
                    <Td
                      py={4}
                      px={4}
                      borderLeft="1px solid"
                      borderColor="whiteAlpha.100"
                      borderBottom="none"
                      minW="200px"
                    >
                      <EvapotranspirationCell
                        lat={row.latitude}
                        lng={row.longitude}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      </Show>
    </>
  );
}
