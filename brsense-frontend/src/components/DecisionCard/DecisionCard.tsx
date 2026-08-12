import React, { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Text,
  Badge,
  SimpleGrid,
  Skeleton,
  Stack,
  Icon,
} from "@chakra-ui/react";
import { getDeviceAnalysis, type DecisionCardData } from "../../services/api";

interface DecisionCardProps {
  esn: string;
}

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "caindo") {
    return (
      <Icon
        viewBox="0 0 24 24"
        color="red.400"
        boxSize={4}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </Icon>
    );
  }
  if (trend === "subindo") {
    return (
      <Icon
        viewBox="0 0 24 24"
        color="green.400"
        boxSize={4}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </Icon>
    );
  }
  return (
    <Icon
      viewBox="0 0 24 24"
      color="gray.400"
      boxSize={4}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
    </Icon>
  );
};

export const DecisionCard: React.FC<DecisionCardProps> = ({ esn }) => {
  const [data, setData] = useState<DecisionCardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!esn) return;

    let isMounted = true;

    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await getDeviceAnalysis(esn);
        if (isMounted) {
          setData(res);
        }
      } catch (err) {
        console.error("Erro ao carregar o motor agronômico:", err);
        if (isMounted) {
          setError(
            "Não foi possível processar a análise agronômica deste talhão.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAnalysis();

    return () => {
      isMounted = false;
    };
  }, [esn]);

  if (loading) {
    return (
      <Box
        w="full"
        bg="gray.800"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        p={6}
      >
        <Skeleton
          startColor="gray.700"
          endColor="gray.600"
          height="24px"
          width="40%"
          mb={4}
          borderRadius="md"
        />
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Skeleton
            startColor="gray.700"
            endColor="gray.600"
            height="16px"
            width="80%"
            borderRadius="md"
          />
          <Skeleton
            startColor="gray.700"
            endColor="gray.600"
            height="16px"
            width="60%"
            borderRadius="md"
          />
          <Skeleton
            startColor="gray.700"
            endColor="gray.600"
            height="16px"
            width="70%"
            borderRadius="md"
          />
        </SimpleGrid>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box
        w="full"
        bg="red.900"
        borderWidth="1px"
        borderColor="red.500"
        borderRadius="xl"
        p={4}
      >
        <Text color="red.100" fontSize="sm">
          {error || "Dados insuficientes para gerar a análise."}
        </Text>
      </Box>
    );
  }

  const statusColorScheme: Record<string, string> = {
    Normal: "green",
    Atenção: "yellow",
    Crítico: "red",
  };

  const riskColorMap: Record<string, string> = {
    baixo: "green.400",
    moderado: "yellow.400",
    alto: "red.400",
  };

  return (
    <Box
      w="full"
      bg="gray.800"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="blue.500"
      overflow="hidden"
      boxShadow="0 4px 14px 0 rgba(128, 90, 213, 0.2)"
    >
      {/* Cabeçalho */}
      <Flex
        px={5}
        py={4}
        bg="whiteAlpha.50"
        borderBottomWidth="1px"
        borderColor="whiteAlpha.100"
        justify="space-between"
        align="center"
      >
        <Box>
          <Text
            fontWeight="bold"
            color="white"
            fontSize="md"
            letterSpacing="tight"
          >
            Análise Inteligente
          </Text>
          <Text
            fontSize="2xs"
            color="gray.400"
            mt={0.5}
            textTransform="uppercase"
            letterSpacing="wider"
          >
            {data.talhao_info}
          </Text>
        </Box>
        <Badge
          colorScheme={statusColorScheme[data.status] || "gray"}
          px={2}
          py={1}
          borderRadius="md"
          fontSize="xs"
        >
          {data.status}
        </Badge>
      </Flex>

      {/* Grid de Métricas */}
      <SimpleGrid
        columns={{ base: 2 }}
        spacing={4}
        p={5}
        borderBottomWidth="1px"
        borderColor="whiteAlpha.100"
      >
        <Flex direction="column">
          <Text fontSize="xs" color="gray.500" fontWeight="medium">
            Zona Ativa da Raiz
          </Text>
          <Text fontSize="sm" fontWeight="semibold" color="gray.200" mt={1}>
            {data.zona_ativa_raiz}
          </Text>
        </Flex>

        <Flex direction="column">
          <Text fontSize="xs" color="gray.500" fontWeight="medium">
            Tendência Umidade
          </Text>
          <Flex align="center" gap={1.5} mt={1}>
            <Text
              fontSize="sm"
              fontWeight="semibold"
              color="gray.200"
              textTransform="capitalize"
            >
              {data.tendencia_umidade}
            </Text>
            <TrendIcon trend={data.tendencia_umidade} />
          </Flex>
        </Flex>

        <Flex direction="column">
          <Text fontSize="xs" color="gray.500" fontWeight="medium">
            Última Chuva/Irrigação
          </Text>
          <Text fontSize="sm" fontWeight="semibold" color="gray.200" mt={1}>
            {data.ultima_irrigacao_chuva}
          </Text>
        </Flex>

        <Flex direction="column">
          <Text fontSize="xs" color="gray.500" fontWeight="medium">
            Risco de Estresse
          </Text>
          <Text
            fontSize="sm"
            fontWeight="bold"
            mt={1}
            textTransform="capitalize"
            color={riskColorMap[data.risco_estresse] || "gray.400"}
          >
            {data.risco_estresse}
          </Text>
        </Flex>
      </SimpleGrid>

      {/* Sugestão e Observação */}
      <Stack spacing={4} p={5} bg="whiteAlpha.50">
        <Box>
          <Text
            fontSize="xs"
            fontWeight="bold"
            color="blue.300"
            textTransform="uppercase"
            letterSpacing="wider"
            mb={2}
          >
            Ação Recomendada
          </Text>
          <Box
            bg="blue.900"
            borderWidth="1px"
            borderColor="blue.700"
            borderRadius="md"
            p={3}
          >
            <Text fontSize="sm" fontWeight="medium" color="blue.100">
              {data.sugestao}
            </Text>
          </Box>
        </Box>

        <Box>
          <Text
            fontSize="xs"
            fontWeight="bold"
            color="gray.500"
            textTransform="uppercase"
            letterSpacing="wider"
            mb={1}
          >
            Observação Técnica
          </Text>
          <Text
            fontSize="xs"
            color="gray.400"
            fontStyle="italic"
            lineHeight="relaxed"
          >
            {data.observacao}
          </Text>
        </Box>
      </Stack>
    </Box>
  );
};
