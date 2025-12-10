import { useEffect, useState } from 'react';
import {
  Box,
  SimpleGrid,
  GridItem,
  Text,
  Spinner,
  Flex
} from '@chakra-ui/react';
// Importamos a interface ReadingHistory do api.ts
import { getProbes, getDeviceHistory } from '../services/api';
import type { ReadingHistory } from '../services/api';
// Importamos a interface Probe do arquivo de tipos (conforme seu projeto)
import type { Probe } from '../types';
import { SoilMoistureChart } from '../components/SoilMoistureChart/SoilMoistureChart';

// Interface para os dados formatados do gráfico
interface ChartDataPoint {
  time: string;
  [key: string]: string | number;
}

// CORREÇÃO 1: Substituímos 'any[]' por 'ReadingHistory[]'
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
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // CORREÇÃO 2: Substituímos 'any[]' por 'Probe[]'
  const [probes, setProbes] = useState<Probe[]>([]);

  // CORREÇÃO 3: Removemos 'logs' e 'setLogs' pois não estavam sendo usados no render
  // Se futuramente você quiser exibir logs, descomente e use o tipo RequestLog[]

  const SELECTED_ESN = "0-1234567";

  const fetchData = async () => {
    try {
      // Removemos o getLogs() da chamada para evitar erro de variável não usada
      const probesData = await getProbes();
      setProbes(probesData);

      const history = await getDeviceHistory(SELECTED_ESN);
      const formattedChartData = processReadingsToChartData(history);

      setChartData(formattedChartData);

    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box p={4}>
      <SimpleGrid columns={{ base: 1, lg: 12 }} spacing={4}>

        {/* --- Card do Gráfico (Principal) --- */}
        <GridItem colSpan={{ base: 1, lg: 8 }}>
          {loading ? (
            <Flex justify="center" align="center" h="300px" bg="gray.800" borderRadius="xl">
              <Spinner color="blue.500" size="xl" />
            </Flex>
          ) : (
            <Box>
              {chartData.length === 0 ? (
                <Flex justify="center" align="center" h="300px" bg="gray.800" borderRadius="xl" border="1px solid" borderColor="gray.700">
                  <Text color="gray.400">Nenhum dado encontrado para o ESN: {SELECTED_ESN}</Text>
                </Flex>
              ) : (
                <SoilMoistureChart />
              )}
            </Box>
          )}
        </GridItem>

        {/* --- Coluna Lateral --- */}
        <GridItem colSpan={{ base: 1, lg: 4 }}>
          <Box
            bg="#1C2A3A"
            border="1px solid"
            borderColor="rgba(59, 71, 84, 0.5)"
            borderRadius="xl"
            h="100%"
            minH="300px"
            p={4}
          >
            <Text color="white" fontWeight="bold" mb={2}>Status do Sistema</Text>
            {/* Agora 'probes' é tipado corretamente */}
            <Text color="gray.300" fontSize="sm">Sondas Ativas: {probes.length}</Text>
            <Text color="gray.300" fontSize="sm">Última atualização: {new Date().toLocaleTimeString()}</Text>
          </Box>
        </GridItem>

      </SimpleGrid>
    </Box>
  );
}