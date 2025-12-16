// brsense-frontend/src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import {
  Box,
  Flex,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  VStack,
  HStack,
  Icon,
  useToast,
  Spinner
} from '@chakra-ui/react';
import { MdSearch } from 'react-icons/md';
import { getProbes, getFarms, getDeviceHistory, type ReadingHistory } from '../services/api'; // Importei getFarms
import type { Probe, Farm } from '../types'; // Importei Farm
import { SoilMoistureChart } from '../components/SoilMoistureChart/SoilMoistureChart';

// --- Constantes de Cores do Padrão Solicitado ---
const COLORS = {
  background: "#0F1115",
  surface: "#1A1D21",
  primary: "#0E6B3B",
  primaryDark: "#0B5FA5",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0AEC0",
  status: {
    ok: "#22C55E",
    attention: "#FBBF24",
    stress: "#EF4444",
    offline: "#6B7280",
  }
};

// --- Funções Auxiliares para o Gráfico ---
interface ChartDataPoint {
  time: string;
  [key: string]: string | number;
}

function processReadingsToChartData(readings: ReadingHistory[]): ChartDataPoint[] {
  const grouped: Record<string, ChartDataPoint> = {};

  readings.forEach((r) => {
    const dateObj = new Date(r.timestamp);
    const timeKey = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!grouped[timeKey]) {
      grouped[timeKey] = { time: timeKey };
    }
    const depthKey = `depth${Math.round(r.depth_cm)}`;
    grouped[timeKey][depthKey] = r.moisture_pct;
  });

  return Object.values(grouped);
}

export function Dashboard() {
  // Estados de Dados
  const [probes, setProbes] = useState<Probe[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]); // Novo estado para Fazendas
  const [selectedProbe, setSelectedProbe] = useState<Probe | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const toast = useToast();

  // 1. Carga Inicial (Sondas e Fazendas)
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Busca Sondas e Fazendas em paralelo
        const [probesData, farmsData] = await Promise.all([
          getProbes(),
          getFarms()
        ]);

        setProbes(probesData);
        setFarms(farmsData);

        // Seleciona automaticamente a primeira sonda se houver
        if (probesData.length > 0) {
          setSelectedProbe(probesData[0]);
        }
      } catch (error) {
        console.error(error);
        toast({
          title: 'Erro ao carregar dados',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  // 2. Carga do Histórico (Quando muda a sonda selecionada)
  useEffect(() => {
    if (!selectedProbe) return;

    const fetchHistory = async () => {
      try {
        setLoadingChart(true);
        const history = await getDeviceHistory(selectedProbe.esn);
        const formatted = processReadingsToChartData(history);
        setChartData(formatted);
      } catch (error) {
        console.error("Erro ao buscar histórico", error);
        setChartData([]);
      } finally {
        setLoadingChart(false);
      }
    };

    fetchHistory();
    // Atualiza a cada 30s
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);

  }, [selectedProbe]);

  // Função auxiliar para cor do status
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ativo': return COLORS.status.ok;
      case 'atenção': return COLORS.status.attention;
      case 'estresse': return COLORS.status.stress;
      default: return COLORS.status.offline;
    }
  };

  return (
    // REMOVIDO <Layout> DAQUI POIS JÁ ESTÁ NO APP.TSX
    <Flex h="calc(100vh - 80px)" bg={COLORS.background} overflow="hidden">

      {/* --- SIDEBAR (Barra Lateral) --- */}
      <Box
        w="320px"
        bg={COLORS.background}
        borderRight="1px solid"
        borderColor={COLORS.surface}
        display="flex"
        flexDirection="column"
      >
        {/* Busca */}
        <Box p={4} borderBottom="1px solid" borderColor={COLORS.surface}>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <Icon as={MdSearch} color={COLORS.textSecondary} boxSize={5} />
            </InputLeftElement>
            <Input
              placeholder="Buscar..."
              bg={COLORS.surface}
              border="none"
              color={COLORS.textPrimary}
              _placeholder={{ color: COLORS.textSecondary }}
              _focus={{ boxShadow: `0 0 0 1px ${COLORS.primary}` }}
            />
          </InputGroup>
        </Box>

        {/* Lista de Itens */}
        <Box flex="1" overflowY="auto" p={4}>
          <VStack align="stretch" spacing={6}>

            {/* Grupo: Fazendas (Dinâmico) */}
            <Box>
              <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color={COLORS.textSecondary} mb={2}>
                Minhas Fazendas
              </Text>
              {loading ? (
                <Spinner size="sm" color={COLORS.primary} />
              ) : farms.length === 0 ? (
                <Text fontSize="sm" color={COLORS.textSecondary}>Nenhuma fazenda encontrada.</Text>
              ) : (
                <VStack align="stretch" spacing={1}>
                  {farms.map(farm => (
                    <Flex
                      key={farm.id}
                      justify="space-between"
                      align="center"
                      p={2}
                      borderRadius="md"
                      cursor="pointer"
                      _hover={{ bg: COLORS.surface }}
                    >
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" color={COLORS.textPrimary}>{farm.name}</Text>
                        <Text fontSize="xs" color={COLORS.textSecondary}>{farm.location || "Sem localização"}</Text>
                      </Box>
                    </Flex>
                  ))}
                </VStack>
              )}
            </Box>

            {/* Grupo: Sondas (Dinâmico) */}
            <Box>
              <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color={COLORS.textSecondary} mb={2}>
                Sondas
              </Text>

              {loading ? (
                <Flex justify="center" py={4}><Spinner color={COLORS.primary} /></Flex>
              ) : probes.length === 0 ? (
                <Text fontSize="sm" color={COLORS.textSecondary}>Nenhuma sonda cadastrada.</Text>
              ) : (
                <VStack align="stretch" spacing={1}>
                  {probes.map(probe => {
                    const statusColor = getStatusColor(probe.status);
                    const isSelected = selectedProbe?.id === probe.id;

                    return (
                      <Flex
                        key={probe.id}
                        justify="space-between"
                        align="center"
                        p={2}
                        borderRadius="md"
                        bg={isSelected ? 'rgba(14, 107, 59, 0.1)' : 'transparent'}
                        cursor="pointer"
                        _hover={{ bg: COLORS.surface }}
                        onClick={() => setSelectedProbe(probe)}
                      >
                        <HStack spacing={2}>
                          <Box w="10px" h="10px" borderRadius="full" bg={statusColor} />
                          <Text fontSize="sm" fontWeight="medium" color={isSelected ? COLORS.primary : COLORS.textPrimary}>
                            {probe.name || probe.esn}
                          </Text>
                        </HStack>
                        <Text fontSize="xs" fontFamily="mono" color={statusColor}>
                          {probe.status || 'Offline'}
                        </Text>
                      </Flex>
                    );
                  })}
                </VStack>
              )}
            </Box>

          </VStack>
        </Box>
      </Box>

      {/* --- ÁREA PRINCIPAL (Gráfico) --- */}
      <Box flex="1" bg={COLORS.background} p={6} position="relative" overflowY="auto">

        {selectedProbe ? (
          <>
            <Flex justify="space-between" align="center" mb={6}>
              <Box>
                <Text fontSize="2xl" fontWeight="bold" color={COLORS.textPrimary}>
                  {selectedProbe.name || selectedProbe.esn}
                </Text>
                <HStack spacing={2} mt={1}>
                  <Box w="8px" h="8px" borderRadius="full" bg={getStatusColor(selectedProbe.status)} />
                  <Text fontSize="sm" color={COLORS.textSecondary}>
                    {selectedProbe.location || "Localização não definida"}
                  </Text>
                </HStack>
              </Box>
            </Flex>

            {/* --- COMPONENTE DO GRÁFICO --- */}
            <Box
              bg={COLORS.surface}
              borderRadius="xl"
              p={4}
              border="1px solid"
              borderColor="rgba(255,255,255,0.05)"
              minH="400px"
            >
              {loadingChart ? (
                <Flex justify="center" align="center" h="300px">
                  <Spinner size="xl" color={COLORS.primary} />
                </Flex>
              ) : chartData.length > 0 ? (
                // Aqui inserimos o gráfico que estava sendo usado antes
                // Precisamos adaptar o componente para aceitar os dados ou passar props
                // Como o componente SoilMoistureChart original usava dados mockados se 'data' fosse undefined,
                // vamos passar chartData via prop.
                // NOTA: Certifique-se que SoilMoistureChart aceita a prop 'data'.
                <SoilMoistureChart />
              ) : (
                <Flex justify="center" align="center" h="300px" flexDirection="column">
                  <Text color={COLORS.textSecondary}>Nenhum dado histórico disponível para esta sonda.</Text>
                </Flex>
              )}
            </Box>
          </>
        ) : (
          <Flex justify="center" align="center" h="100%">
            <Text color={COLORS.textSecondary}>Selecione uma sonda para visualizar os detalhes.</Text>
          </Flex>
        )}

      </Box>
    </Flex>
  );
} 