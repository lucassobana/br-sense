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
  MdVerified,
} from "react-icons/md";
import type { Probe, ManualIrrigationRecord } from "../../types";
import { useEffect, useState } from "react";
import { getDeviceAnalysis } from "../../services/api";
import { useWeatherForecast } from "../../hooks/useWeatherForecast";
import { WiHot } from "react-icons/wi";
import { FaTint } from "react-icons/fa";
import { LuRadioTower, LuChartColumn } from "react-icons/lu";
import { HiOutlineCloud } from "react-icons/hi2";

export interface TableRowData extends Probe {
  farmName: string;
  status: string;
  batteryLevel: number | undefined;
  batteryDate: string;
  lastCommunicationFormatted: string;
  lastCommunicationTimestamp: number;
  sugestao?: string;
  copiloto_acao?: string;
  observacao?: string; // Novo campo adicionado
  isManualProbe?: boolean;
  irrigation_value_mm?: number;
  irrigation_records?: ManualIrrigationRecord[];
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
  onRowClick: (id: number | string) => void;
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

// COMPONENTE REFATORADO: Trata a Ação Recomendada e a Observação Técnica
const CopilotoText = ({
  esn,
  preloadedSugestao,
  preloadedObservacao,
  isDesktop,
}: {
  esn: string;
  preloadedSugestao?: string;
  preloadedObservacao?: string;
  isDesktop?: boolean;
}) => {
  const [fetchedData, setFetchedData] = useState<{
    sugestao: string;
    observacao: string;
  } | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(!preloadedSugestao && !esn.startsWith("manual_"));

  useEffect(() => {
    if (preloadedSugestao && preloadedObservacao) {
      return;
    }
    // ESNs de sondas manuais não têm endpoint de análise — ignora chamada
    if (esn.startsWith("manual_")) {
      return;
    }

    let isMounted = true;

    getDeviceAnalysis(esn)
      .then((res) => {
        if (isMounted) {
          setFetchedData({
            sugestao: res.sugestao || "Monitoramento padrão.",
            observacao:
              res.observacao || "Sem observações detalhadas disponíveis.",
          });
          setIsFetching(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFetchedData({
            sugestao: "Condições em monitoramento.",
            observacao: "Não foi possível carregar os detalhes técnicos.",
          });
          setIsFetching(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [esn, preloadedSugestao, preloadedObservacao]);

  const displaySugestao = preloadedSugestao || fetchedData?.sugestao || "";
  const displayObservacao =
    preloadedObservacao || fetchedData?.observacao || "";
  const isLoading = (!preloadedSugestao || !preloadedObservacao) && isFetching;

  if (isLoading) {
    return (
      <Text
        id={`decision-${isDesktop ? "desktop" : "mobile"}-${esn}`}
        fontSize={isDesktop ? "xs" : "sm"}
        color="gray.400"
        fontStyle="italic"
        whiteSpace="normal"
      >
        Analisando dados da sonda...
      </Text>
    );
  }

  // --- RENDERIZAÇÃO DESKTOP ---
  if (isDesktop) {
    return (
      <VStack align="start" spacing={1} w="full">
        <Text
          fontSize="sm"
          fontWeight="bold"
          color="blue.300"
          lineHeight="short"
          whiteSpace="normal"
        >
          {displaySugestao}
        </Text>

        <Box position="relative" w="full" role="group" cursor="default">
          {/* Texto Truncado (Visível por padrão) */}
          <Text
            noOfLines={2}
            fontSize="xs"
            color="gray.400"
            whiteSpace="normal"
            transition="opacity 0.2s ease-in-out"
            _groupHover={{ opacity: 0 }}
          >
            {displayObservacao}
          </Text>

          {/* Painel Expandido (Visível apenas no Hover) */}
          <Box
            position="absolute"
            top="-8px"
            left="-8px"
            w="calc(100% + 16px)"
            bg="gray.700"
            p={2}
            borderRadius="md"
            boxShadow="dark-lg"
            zIndex={10}
            opacity={0}
            visibility="hidden"
            transform="translateY(-4px)"
            transition="all 0.2s ease-in-out"
            _groupHover={{
              opacity: 1,
              visibility: "visible",
              transform: "translateY(0)",
            }}
          >
            <Text fontSize="xs" color="gray.200" whiteSpace="normal">
              {displayObservacao}
            </Text>
          </Box>
        </Box>
      </VStack>
    );
  }

  // --- RENDERIZAÇÃO MOBILE ---
  return (
    <VStack align="start" spacing={2} w="full">
      <Text
        fontSize="md"
        fontWeight="bold"
        color="blue.300"
        lineHeight="short"
        whiteSpace="normal"
      >
        {displaySugestao}
      </Text>
      <Text
        fontSize="sm"
        color="gray.300"
        whiteSpace="normal"
        lineHeight="tall"
      >
        {displayObservacao}
      </Text>
    </VStack>
  );
};

const ForecastCell = ({ lat, lng }: { lat?: number; lng?: number }) => {
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
      {next4Days.map((day) => {
        const rainValue = day.precipSum;

        return (
          <VStack key={day.date} spacing={1} align="center">
            <Text fontSize="10px" color="gray.500" textTransform="uppercase">
              {day.dayNumber}
            </Text>
            <VStack spacing={0} align="start">
              <HStack spacing={1}>
                <Flex w="16px" justify="center" align="center">
                  <Icon as={WiHot} boxSize={4} color="orange.400" />
                </Flex>
                <Text fontSize="sm" fontWeight="bold" color="orange.400">
                  {day.et0 != null ? day.et0.toFixed(1) : "-"}
                </Text>
              </HStack>
              <HStack spacing={1}>
                <Flex w="16px" justify="center" align="center">
                  <Icon as={FaTint} boxSize={3} color="blue.400" />
                </Flex>
                <Text fontSize="sm" fontWeight="bold" color="blue.400">
                  {rainValue != null ? Number(rainValue).toFixed(1) : "0.0"}
                </Text>
              </HStack>
            </VStack>
          </VStack>
        );
      })}
    </HStack>
  );
};

const MobileForecastCard = ({ lat, lng }: { lat?: number; lng?: number }) => {
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
      <HStack spacing={1} mb={2} align="center" justify="center">
        <Icon as={HiOutlineCloud} boxSize={4} color="orange.400" />
        <Text
          fontSize="10px"
          fontWeight="bold"
          color="gray.500"
          textTransform="uppercase"
        >
          Previsão
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
        <VStack align="stretch" spacing={2} justify="center" flex="1">
          {forecast.slice(0, 3).map((day) => {
            const rainValue = day.precipSum;

            return (
              <Flex key={day.date} justify="space-between" align="center">
                <Text fontSize="xs" color="gray.500">
                  {day.dayNumber}
                </Text>
                <HStack spacing={3}>
                  <HStack spacing={1}>
                    <Icon as={WiHot} boxSize={5} color="orange.400" />
                    <Text fontSize="sm" fontWeight="bold" color="orange.400">
                      {day.et0 != null ? day.et0.toFixed(1) : "-"}
                    </Text>
                  </HStack>
                  <HStack spacing={1}>
                    <Icon as={FaTint} boxSize={3} color="blue.400" />
                    <Text fontSize="sm" fontWeight="bold" color="blue.400">
                      {rainValue != null ? Number(rainValue).toFixed(1) : "0.0"}
                    </Text>
                  </HStack>
                </HStack>
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
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleFlip = (idOrEsn: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = String(idOrEsn);
    setFlippedCards((prev) => ({ ...prev, [key]: !prev[key] }));
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
                key={`mobile-card-${row.isManualProbe ? row.esn : row.id}`}
                sx={{ perspective: "1000px" }}
                cursor="pointer"
                onClick={() => onRowClick(row.isManualProbe ? row.esn : row.id)}
              >
                <Box
                  display="grid"
                  transition="transform 0.6s"
                  sx={{ transformStyle: "preserve-3d" }}
                  transform={
                    flippedCards[row.isManualProbe ? row.esn : String(row.id)] ? "rotateY(180deg)" : "rotateY(0deg)"
                  }
                >
                  {/* FACE DA FRENTE */}
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
                          {isAdmin && !row.isManualProbe && (
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
                        {!row.isManualProbe && row.name && (
                          <Text fontSize="xs" color="gray.400" noOfLines={1}>
                            ESN: {row.esn}
                          </Text>
                        )}
                      </Box>

                      <Flex align="center" gap={1}>
                        {!row.isManualProbe && (
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
                        )}
                      </Flex>
                    </Flex>

                    <SimpleGrid columns={row.isManualProbe ? 1 : 2} gap={2} pl={2} pr={2}>
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
                          mb={2}
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
                            {row.isManualProbe ? "Irrigação Manual" : "Pluviômetro"}
                          </Text>
                        </HStack>
                        <VStack
                          align="stretch"
                          spacing={1}
                          justify="center"
                          flex="1"
                        >
                          {row.isManualProbe ? (
                            <VStack spacing={2} justify="center" h="100%" pb={2}>
                              <Text color="blue.400" fontWeight="bold" fontSize="lg">
                                {row.irrigation_value_mm != null ? row.irrigation_value_mm.toFixed(1) : "-"} mm
                              </Text>
                              <VStack spacing={1} align="stretch" w="100%" px={2}>
                                {row.irrigation_records?.slice(0, 3).map(record => (
                                  <Flex key={record.id} justify="space-between" align="center" bg="blackAlpha.300" p={1} borderRadius="sm" border="1px solid" borderColor="whiteAlpha.100">
                                    <Text fontSize="10px" color="gray.500">{new Date(record.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} {new Date(record.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</Text>
                                    <Text fontSize="xs" color="blue.300" fontWeight="bold">+{record.irrigation_value_mm}mm</Text>
                                  </Flex>
                                ))}
                                {(!row.irrigation_records || row.irrigation_records.length === 0) && (
                                  <Text fontSize="10px" color="gray.500" textAlign="center">Nenhum registro</Text>
                                )}
                              </VStack>
                            </VStack>
                          ) : (
                            <>
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
                            </>
                          )}
                        </VStack>
                      </Box>
                      {!row.isManualProbe && (
                        <MobileForecastCard
                          lat={row.latitude}
                          lng={row.longitude}
                        />
                      )}
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
                          {!row.isManualProbe && (
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
                          )}
                        </Box>
                      </Flex>
                    </Box>
                  </Box>

                  {/* FACE DE TRÁS (COPILOTO AÇÃO + OBSERVAÇÃO) */}
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
                          Decisão do Copiloto
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
                      {/* Prop preloadedObservacao injetada aqui */}
                      <CopilotoText
                        esn={row.esn}
                        preloadedSugestao={row.sugestao || row.copiloto_acao}
                        preloadedObservacao={row.observacao}
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
                <Th
                  py={4}
                  px={4}
                  minW="260px"
                  cursor="pointer"
                  onClick={() => onSort("status")}
                  color="gray.400"
                >
                  <HStack spacing={2}>
                    <Icon as={LuRadioTower} boxSize={4} color="blue.400" />
                    <Text color="gray.400">Nome do Dispositivo</Text>
                    {renderSortIcon("status")}
                  </HStack>
                </Th>
                <Th
                  py={4}
                  px={4}
                  borderLeft="1px solid"
                  borderColor="whiteAlpha.100"
                  cursor="pointer"
                  onClick={() => onSort("cultura")}
                  color="gray.400"
                >
                  <HStack spacing={2}>
                    <Icon as={LuChartColumn} boxSize={4} color="blue.400" />
                    <Text color="gray.400">Dados</Text>
                    {renderSortIcon("cultura")}
                  </HStack>
                </Th>
                <Th
                  py={4}
                  px={4}
                  borderLeft="1px solid"
                  borderColor="whiteAlpha.100"
                  color="gray.400"
                >
                  <HStack spacing={2}>
                    <Icon as={MdVerified} boxSize={4} color="blue.400" />
                    <Text color="gray.400">Decisão</Text>
                  </HStack>
                </Th>
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
                        PLUVIÔMETRO (mm)
                      </Text>
                    </Box>
                  </HStack>
                </Th>
                <Th
                  py={4}
                  px={4}
                  textAlign="center"
                  borderLeft="1px solid"
                  borderColor="whiteAlpha.100"
                  textTransform="none"
                >
                  <HStack justify="center" spacing={2}>
                    <Icon as={HiOutlineCloud} boxSize={6} color="orange.400" />
                    <Text as="span" color="gray.400">
                      PREVISÃO (mm)
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
                    key={`desktop-row-${row.isManualProbe ? row.esn : row.id}`}
                    onClick={() => onRowClick(row.isManualProbe ? row.esn : row.id)}
                    role="group"
                    cursor="pointer"
                    _hover={{ bg: "whiteAlpha.50" }}
                    transition="colors 0.2s"
                    position="relative"
                  >
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
                          <HStack spacing={3} fontSize="11px" color="gray.400">
                            {!row.isManualProbe && <Text>ESN: {row.esn}</Text>}
                            <Text>
                              Último Envio: {row.lastCommunicationFormatted}
                            </Text>
                          </HStack>
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
                              {isAdmin && !row.isManualProbe && (
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
                              {isAdmin && !row.isManualProbe && (
                                <Text color="whiteAlpha.400" fontSize="xs">
                                  |
                                </Text>
                              )}
                              {!row.isManualProbe && (
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
                              )}
                            </HStack>
                          </HStack>
                        </VStack>
                      </Flex>
                    </Td>

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

                    {row.isManualProbe ? (
                      <Td
                        py={4}
                        px={4}
                        borderLeft="1px solid"
                        borderColor="whiteAlpha.100"
                        borderBottom="none"
                        colSpan={3}
                      >
                        <Flex justify="space-between" align="center" h="100%" bg="whiteAlpha.50" p={4} borderRadius="md" border="1px solid" borderColor="whiteAlpha.200">
                          <Flex align="center" gap={6}>
                            <Icon as={FaTint} boxSize={5} color="blue.400" />
                            <VStack align="start" spacing={0}>
                              <Text fontSize="sm" color="white" fontWeight="bold">Irrigação Manual</Text>
                              <Text fontSize="xs" color="gray.400">Acumulado (7 dias)</Text>
                            </VStack>
                            <VStack spacing={0} align="start">
                              <Text color="blue.400" fontWeight="bold" fontSize="xl">
                                {row.irrigation_value_mm != null ? row.irrigation_value_mm.toFixed(1) : "0.0"} <Text as="span" fontSize="sm" color="gray.500">mm</Text>
                              </Text>
                              {row.irrigation_records && row.irrigation_records.length > 0 && (
                                <Text fontSize="10px" color="gray.500">
                                  {row.irrigation_records.filter(r => new Date(r.date).getTime() >= Date.now() - 7*24*60*60*1000).length} registro(s)
                                </Text>
                              )}
                            </VStack>
                          </Flex>
                          <HStack spacing={4} overflowX="auto">
                             {row.irrigation_records?.slice(0, 5).map(record => (
                                <VStack key={record.id} spacing={0} bg="blackAlpha.300" p={2} borderRadius="md" border="1px solid" borderColor="whiteAlpha.100" minW="80px">
                                   <Text fontSize="10px" color="gray.500" whiteSpace="nowrap">{new Date(record.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} {new Date(record.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</Text>
                                   <Text fontSize="sm" color="blue.300" fontWeight="bold">+{record.irrigation_value_mm}mm</Text>
                                </VStack>
                             ))}
                             {(!row.irrigation_records || row.irrigation_records.length === 0) && (
                                <Text fontSize="xs" color="gray.500" fontStyle="italic">Nenhum registro</Text>
                             )}
                          </HStack>
                        </Flex>
                      </Td>
                    ) : (
                      <>
                        <Td
                          py={4}
                          px={4}
                          borderLeft="1px solid"
                          borderColor="whiteAlpha.100"
                          borderBottom="none"
                          maxW="300px"
                        >
                          <CopilotoText
                            esn={row.esn as string}
                            preloadedSugestao={row.sugestao || row.copiloto_acao}
                            preloadedObservacao={row.observacao}
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

                        <Td
                          py={4}
                          px={4}
                          borderLeft="1px solid"
                          borderColor="whiteAlpha.100"
                          borderBottom="none"
                          minW="200px"
                        >
                          <ForecastCell lat={row.latitude} lng={row.longitude} />
                        </Td>
                      </>
                    )}
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
