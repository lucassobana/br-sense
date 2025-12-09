import { useEffect, useState } from 'react';
import {
  Box, Grid, Heading, Container, Text,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Flex, Spinner
} from '@chakra-ui/react';
import { getProbes, getLogs } from '../services/api';
import type { Probe, RequestLog } from '../types';
import { ProbeCard } from '../components/ProbeCard/ProbeCard';

export function Dashboard() {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [probesData, logsData] = await Promise.all([getProbes(), getLogs()]);
      setProbes(probesData);
      setLogs(logsData);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Atualiza a cada 5 segundos
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header da Página */}
      <Box bg="blue.600" py={4} mb={8}>
        <Container maxW="container.xl">
          <Heading color="white">🛰️ BRSense - Monitoramento Satelital</Heading>
          <Text color="blue.100">Painel de Telemetria em Tempo Real</Text>
        </Container>
      </Box>

      <Container maxW="container.xl">
        {loading && probes.length === 0 ? (
          <Flex justify="center" align="center" h="200px"><Spinner size="xl" /></Flex>
        ) : (
          <>
            <Heading size="md" mb={4}>Sondas Ativas ({probes.length})</Heading>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6} mb={10}>
              {probes.map(probe => (
                <ProbeCard key={probe.id} probe={probe} />
              ))}
            </Grid>

            <Heading size="md" mb={4}>Histórico de Requisições (Logs do Satélite)</Heading>
            <Box overflowX="auto" bg="white" borderRadius="lg" boxShadow="sm" mb={10}>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>ID</Th>
                    <Th>Horário</Th>
                    <Th>Status</Th>
                    <Th>Mensagem</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {logs.map(log => (
                    <Tr key={log.id}>
                      <Td>#{log.id}</Td>
                      <Td>{new Date(log.timestamp).toLocaleTimeString()}</Td>
                      <Td>
                        <Badge
                          colorScheme={
                            log.status === 'SUCCESS' ? 'green' :
                              log.status === 'ERROR' ? 'red' : 'yellow'
                          }
                        >
                          {log.status}
                        </Badge>
                      </Td>
                      <Td maxW="400px" isTruncated>{log.log_message}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
}