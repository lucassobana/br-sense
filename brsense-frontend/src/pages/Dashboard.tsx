import { useEffect, useState } from 'react';
import {
  Box,
  SimpleGrid,
  GridItem,
  Text,
  Spinner,
  Flex,
  Select // Componente de seleção do Chakra UI
} from '@chakra-ui/react';
import { getProbes, getDeviceHistory } from '../services/api';
import type { ReadingHistory } from '../services/api';
import type { Probe } from '../types';
import { SoilMoistureChart } from '../components/SoilMoistureChart/SoilMoistureChart';

// Interface para os dados formatados do gráfico
interface ChartDataPoint {
  time: string;
  [key: string]: string | number;
}

// Função auxiliar para processar dados brutos da API para o formato do Recharts
function processReadingsToChartData(readings: ReadingHistory[]): ChartDataPoint[] {
  const grouped: Record<string, ChartDataPoint> = {};

  readings.forEach((r) => {
    const dateObj = new Date(r.timestamp);
    // Formata a data (Ex: 15/12 14:00)
    const timeKey = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!grouped[timeKey]) {
      grouped[timeKey] = { time: timeKey };
    }

    // Cria chaves como "depth10", "depth30" baseadas na profundidade
    const depthKey = `depth${Math.round(r.depth_cm)}`;
    grouped[timeKey][depthKey] = r.moisture_pct;
  });

  return Object.values(grouped);
}

export function Dashboard() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [probes, setProbes] = useState<Probe[]>([]);
  
  // Estado para armazenar qual sonda o usuário está visualizando
  const [selectedEsn, setSelectedEsn] = useState<string>("");

  // --- EFEITO 1: Busca Inicial de Dispositivos (Executa apenas 1 vez) ---
  useEffect(() => {
    const fetchProbes = async () => {
      try {
        const probesData = await getProbes();
        setProbes(probesData);

        // Lógica de seleção automática inicial
        if (probesData.length > 0) {
           // Tenta encontrar a sonda de teste com dados, senão pega a primeira
           const preferred = probesData.find(p => p.esn === "TEST-GRAPH-01");
           setSelectedEsn(preferred ? preferred.esn : probesData[0].esn);
        }
      } catch (error) {
        console.error("Erro ao buscar lista de dispositivos:", error);
      }
    };

    fetchProbes();
  }, []); // Array vazio garante execução única na montagem

  // --- EFEITO 2: Busca de Histórico (Executa ao mudar a sonda ou a cada 10s) ---
  useEffect(() => {
    // Se não tiver sonda selecionada, não faz nada
    if (!selectedEsn) return;

    const fetchHistory = async () => {
      // Opcional: setLoading(true) se quiser mostrar loading a cada atualização
      try {
        const history = await getDeviceHistory(selectedEsn);
        const formattedChartData = processReadingsToChartData(history);
        setChartData(formattedChartData);
      } catch (error) {
        console.error(`Erro ao buscar histórico para ${selectedEsn}:`, error);
        setChartData([]); // Limpa o gráfico em caso de erro
      } finally {
        setLoading(false); // Remove o estado de carregamento inicial
      }
    };

    // 1. Chama imediatamente ao selecionar
    fetchHistory();

    // 2. Configura o intervalo de atualização (apenas para o histórico)
    const interval = setInterval(fetchHistory, 10000); // 10 segundos

    // Limpa o intervalo se o componente desmontar ou se mudar a sonda
    return () => clearInterval(interval);

  }, [selectedEsn]); // Dependência: recria o efeito se selectedEsn mudar

  return (
    <Box p={4}>
      {/* --- Cabeçalho com Título e Seletor --- */}
      <Flex 
        direction={{ base: 'column', md: 'row' }} 
        justify="space-between" 
        align={{ base: 'start', md: 'center' }} 
        mb={6} 
        gap={4}
      >
        <Text fontSize="2xl" fontWeight="bold" color="white">
          Monitoramento de Solo
        </Text>
        
        <Box w={{ base: "100%", md: "300px" }}>
            <Select 
                bg="gray.700" 
                color="white" 
                borderColor="gray.600"
                value={selectedEsn}
                onChange={(e) => {
                    setLoading(true); // Mostra loading ao trocar manualmente
                    setSelectedEsn(e.target.value);
                }}
                _hover={{ borderColor: "blue.400" }}
            >
                {probes.map((probe) => (
                    // O style color: black é necessário porque o option herda o branco do select
                    <option key={probe.id} value={probe.esn} style={{ color: 'black' }}>
                        {probe.name || `Sonda ${probe.esn}`}
                    </option>
                ))}
            </Select>
        </Box>
      </Flex>

      <SimpleGrid columns={{ base: 1, lg: 12 }} spacing={4}>

        {/* --- Card do Gráfico (Principal) --- */}
        <GridItem colSpan={{ base: 1, lg: 8 }}>
          {loading && chartData.length === 0 ? (
            // Estado de Carregamento
            <Flex justify="center" align="center" h="300px" bg="gray.800" borderRadius="xl">
              <Spinner color="blue.500" size="xl" thickness="4px" />
            </Flex>
          ) : (
            // Área do Gráfico
            <Box>
              {chartData.length === 0 ? (
                <Flex justify="center" align="center" h="300px" bg="gray.800" borderRadius="xl" border="1px solid" borderColor="gray.700">
                  <Text color="gray.400">Nenhum dado encontrado para a sonda: {selectedEsn}</Text>
                </Flex>
              ) : (
                // Passamos os dados reais para o componente do gráfico
                <SoilMoistureChart />
              )}
            </Box>
          )}
        </GridItem>

        {/* --- Coluna Lateral de Status --- */}
        <GridItem colSpan={{ base: 1, lg: 4 }}>
          <Box
            bg="#1C2A3A"
            border="1px solid"
            borderColor="rgba(59, 71, 84, 0.5)"
            borderRadius="xl"
            h="100%"
            minH="300px"
            p={6}
          >
            <Text color="white" fontWeight="bold" fontSize="lg" mb={4}>Status do Sistema</Text>
            
            <Flex direction="column" gap={3}>
                <Box>
                    <Text color="gray.400" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Sonda Ativa</Text>
                    <Text color="white" fontSize="md" fontWeight="medium">{selectedEsn || "-"}</Text>
                </Box>
                
                <Box>
                    <Text color="gray.400" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Localização</Text>
                    <Text color="white" fontSize="md">
                        {probes.find(p => p.esn === selectedEsn)?.location || "Não definida"}
                    </Text>
                </Box>

                <Box pt={4} borderTop="1px solid" borderColor="gray.700">
                    <Text color="gray.400" fontSize="sm">Total de Sondas: {probes.length}</Text>
                    <Text color="gray.400" fontSize="sm">Última atualização: {new Date().toLocaleTimeString()}</Text>
                </Box>
            </Flex>
          </Box>
        </GridItem>

      </SimpleGrid>
    </Box>
  );
}