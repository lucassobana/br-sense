import {
  Box,
  Flex,
  Grid,
  Select,
  FormControl,
  FormLabel,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Badge,
  HStack,
  Text,
  VStack,
  VisuallyHidden,
} from '@chakra-ui/react';
import { ChartNoAxesCombined } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AguaNoSoloProps } from './types';
import { analisarEvento, faixasValidas, instanteMs, limitarPeloProximoEvento } from './analise';
import { cores, corCamada, numero, tempoResposta, formatarDataHoraBr } from './visual';
import { GraficoResposta } from './GraficoResposta';

export function AguaNoSolo({
  eventos,
  faixas,
  eventoSelecionadoId,
  onSelecionarEvento,
  aumentoMinimoPp = 0,
  carregando = false,
  erro,
  fusoHorario = 'America/Sao_Paulo',
}: AguaNoSoloProps) {
  const [idLocal, setIdLocal] = useState<string>();
  const [profundidadeLocal, setProfundidadeLocal] = useState<number>();

  const validos = useMemo(() => {
    const filtrados = eventos.filter(
      (evento) =>
        Number.isFinite(instanteMs(evento.inicio)) &&
        Number.isFinite(evento.laminaMm) &&
        evento.laminaMm >= 0,
    );
    const limitados = limitarPeloProximoEvento(filtrados);
    // Garantir rigorosamente a ordenação do mais recente para o mais antigo
    return limitados.sort((a, b) => instanteMs(b.inicio) - instanteMs(a.inicio));
  }, [eventos]);

  const evento = validos.find((item) => item.id === (eventoSelecionadoId ?? idLocal)) ?? validos[0];
  const analise = useMemo(() => (evento ? analisarEvento(evento, aumentoMinimoPp) : null), [evento, aumentoMinimoPp]);
  const camadas = analise?.camadas ?? [];
  const selecionada = camadas.find((camada) => camada.profundidadeCm === profundidadeLocal) ?? camadas[0];
  const profundidadeSelecionada = selecionada?.profundidadeCm;

  if (carregando) return <Text color={cores.texto} role="status" p="4">Carregando resposta da água…</Text>;
  if (erro) return <Text color={cores.texto} role="alert" p="4">{erro}</Text>;
  if (!faixasValidas(faixas))
    return <Text color={cores.texto} role="alert" p="4">Os limites das faixas de umidade precisam estar em ordem crescente entre 0% e 100%.</Text>;
  if (!evento || !analise) return <Text color={cores.texto} p="4">Nenhuma irrigação registrada neste período.</Text>;

  return (
    <Box color={cores.texto} minW="0" fontSize="sm">
      <Flex justify="space-between" align="center" mb="3" gap="2">
        <Text color={cores.texto} fontSize="lg" fontWeight="600">
          Resposta da água
        </Text>
        <Text color={cores.secundario} fontSize="xs">
          {evento.demonstrativo ? 'Exemplo' : 'Histórico'}
        </Text>
      </Flex>

      <Grid templateColumns="minmax(0,1fr) auto" gap="4" alignItems="end" mb="3">
        <FormControl minW="0">
          <FormLabel color={cores.secundario} fontSize="xs" mb="1">
            Evento
          </FormLabel>
          <Select
            size="sm"
            w="full"
            aria-label="Selecionar irrigação"
            value={evento.id}
            onChange={(event) => {
              setIdLocal(event.target.value);
              onSelecionarEvento?.(event.target.value);
            }}
            color={cores.texto}
            bg={cores.elevado}
            borderColor={cores.divisor}
            borderRadius="md"
            fontSize="sm"
            _focus={{ borderColor: cores.azul }}
          >
            {validos.map((item) => {
              const dataFormatada = formatarDataHoraBr(item.inicio, { incluirAno: true, fusoHorario });
              let rotulo = 'Irrigação';
              if (item.demonstrativo) {
                rotulo = 'Exemplo · Irrigação';
              } else if (item.origemMedicao === 'infiltracao') {
                rotulo = `${dataFormatada} · Infiltração (sem pluviômetro)`;
              } else if (item.origemMedicao === 'manual') {
                rotulo = `${dataFormatada} · Manual (${numero(item.laminaMm)} mm)`;
              } else {
                rotulo = `${dataFormatada} · Pluviômetro (${numero(item.laminaMm)} mm)`;
              }

              return (
                <option
                  key={item.id}
                  value={item.id}
                  style={{ backgroundColor: cores.elevado, color: cores.texto }}
                >
                  {rotulo}
                </option>
              );
            })}
          </Select>
        </FormControl>

        <Box textAlign="right">
          <Text color={cores.secundario} fontSize="xs">
            {evento.origemMedicao === 'infiltracao' ? 'Origem' : 'Irrigação'}
          </Text>
          {evento.origemMedicao === 'infiltracao' ? (
            <VStack align="flex-end" spacing={0}>
              <Text color="yellow.400" fontSize="16px" fontWeight="600" lineHeight="1.2" whiteSpace="nowrap">
                Sem pluviômetro
              </Text>
              <Text color={cores.secundario} fontSize="11px">
                Detectada por umidade
              </Text>
            </VStack>
          ) : (
            <Text color={cores.azul} fontSize="28px" fontWeight="600" lineHeight="1.2" whiteSpace="nowrap">
              {numero(evento.laminaMm)}{' '}
              <Box as="span" fontSize="sm" color={cores.azul}>
                mm
              </Box>
            </Text>
          )}
        </Box>
      </Grid>

      {evento.demonstrativo && (
        <Text color={cores.secundario} fontSize="xs" mb="2">
          Dados ilustrativos de demonstração
        </Text>
      )}

      <Tabs variant="line" size="sm" colorScheme="blue" defaultIndex={0} isLazy lazyBehavior="unmount">
        <TabList borderColor={cores.divisor}>
          <Tab
            color={cores.secundario}
            _selected={{ color: cores.texto, borderColor: cores.azul, borderBottomWidth: '2px' }}
            gap="1.5"
            px="3"
            py="2"
          >
            <ChartNoAxesCombined size={15} aria-hidden="true" />
            No tempo
          </Tab>
          <Tab
            color={cores.secundario}
            _selected={{ color: cores.texto, borderColor: cores.azul, borderBottomWidth: '2px' }}
            px="3"
            py="2"
          >
            Por camada
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel pt="2" pb="0" px="0">
            <Flex justify="space-between" gap="2" color={cores.secundario} fontSize="xs">
              <Text>Resposta e queda observada</Text>
              <Text>
                {camadas.length} {camadas.length === 1 ? 'camada' : 'camadas'}
              </Text>
            </Flex>
            {camadas.length ? (
              <>
                <GraficoResposta
                  evento={evento}
                  camadas={camadas}
                  faixas={faixas}
                  profundidadeSelecionada={profundidadeSelecionada}
                  fusoHorario={fusoHorario}
                />
                <Flex
                  wrap="nowrap"
                  align="center"
                  justify={camadas.length >= 5 ? 'space-between' : 'flex-start'}
                  gap={camadas.length >= 5 ? '2px' : '6px'}
                  w="full"
                  aria-label="Camadas com aumento de umidade"
                  mt="1.5"
                >
                  {camadas.map((camada) => {
                    const ativa = camada.profundidadeCm === profundidadeSelecionada;
                    const cor = corCamada(camada.profundidadeCm);
                    return (
                      <Box
                        as="button"
                        key={camada.profundidadeCm}
                        type="button"
                        flex={camadas.length >= 5 ? '1 1 0%' : '0 0 auto'}
                        minW="0"
                        px={camadas.length >= 5 ? '3px' : '6px'}
                        py="4px"
                        minH="24px"
                        display="inline-flex"
                        alignItems="center"
                        justifyContent="center"
                        gap="3px"
                        whiteSpace="nowrap"
                        cursor="pointer"
                        color={ativa ? '#ffffff' : cores.secundario}
                        bg={ativa ? 'whiteAlpha.200' : 'transparent'}
                        aria-pressed={ativa}
                        aria-label={`Destacar camada de ${camada.profundidadeCm} cm`}
                        borderBottomWidth="2px"
                        borderBottomStyle="solid"
                        borderRadius="md"
                        borderBottomColor={ativa ? cor : 'transparent'}
                        onClick={() => setProfundidadeLocal(camada.profundidadeCm)}
                        _hover={{ bg: 'whiteAlpha.150' }}
                      >
                        <Box
                          as="span"
                          display="inline-block"
                          w={camadas.length >= 6 ? '6px' : '8px'}
                          h="3px"
                          flexShrink={0}
                          borderRadius="full"
                          bg={cor}
                          border={cor === '#000000' ? '1px solid rgba(255,255,255,0.5)' : undefined}
                          aria-hidden="true"
                        />
                        <Text
                          as="span"
                          fontWeight={ativa ? '600' : 'normal'}
                          fontSize={camadas.length >= 6 ? '10px' : '11px'}
                          lineHeight="1"
                          whiteSpace="nowrap"
                        >
                          {camada.profundidadeCm} cm
                        </Text>
                      </Box>
                    );
                  })}
                </Flex>

                {selecionada && (() => {
                  const corSelecionada = corCamada(selecionada.profundidadeCm);
                  const corClara = ['#ffffff', '#FDD835', '#40ff79', '#c1b5ff', '#f39797'].includes(corSelecionada);
                  return (
                    <Flex align="center" justify="space-between" wrap="wrap" gap="2" my="1.5" fontSize="xs">
                      <HStack spacing={2} wrap="wrap">
                        <Badge
                          bg={corSelecionada}
                          color={corClara ? '#0A1226' : '#ffffff'}
                          border={
                            corSelecionada === '#000000' || corSelecionada === '#522b0f'
                              ? '1px solid rgba(255,255,255,0.45)'
                              : undefined
                          }
                          px={1.5}
                          py={0.5}
                          borderRadius="sm"
                          fontSize="10px"
                          fontWeight="700"
                          textTransform="none"
                        >
                          {selecionada.profundidadeCm} cm
                        </Badge>
                        <Text color={cores.secundario} fontSize="xs">
                          Mín: <Text as="span" color="white" fontWeight="600">{numero(selecionada.antesPct)}%</Text>
                        </Text>
                        <Text color={cores.secundario} fontSize="xs">→</Text>
                        <Text color={cores.secundario} fontSize="xs">
                          Pico: <Text as="span" color="white" fontWeight="600">{numero(selecionada.picoPct)}%</Text>
                        </Text>
                      </HStack>
                      <Text color="gray.400" fontSize="11px">
                        Penetração: <Text as="span" color="white" fontWeight="600">{tempoResposta(selecionada.tempoRespostaMin)}</Text>
                      </Text>
                    </Flex>
                  );
                })()}

                <Box pt="2" pb="0" borderTopWidth="1px" borderColor={cores.divisor}>
                  <Text color={cores.secundario} fontSize="xs" mb="1.5">
                    Tempo de penetração (menor umidade até o pico)
                  </Text>
                  <Grid templateColumns="repeat(2,minmax(0,1fr))" rowGap="1.5" columnGap="4">
                    {camadas.map((camada) => {
                      const cor = corCamada(camada.profundidadeCm);
                      return (
                        <Flex key={camada.profundidadeCm} justify="space-between" align="center" wrap="wrap" gap="1" fontSize="xs">
                          <HStack spacing={1.5} align="center">
                            <Box
                              as="span"
                              display="inline-block"
                              w="8px"
                              h="3px"
                              flexShrink={0}
                              borderRadius="full"
                              bg={cor}
                              border={cor === '#000000' ? '1px solid rgba(255,255,255,0.5)' : undefined}
                              aria-hidden="true"
                            />
                            <Text color={cores.secundario}>{camada.profundidadeCm} cm</Text>
                          </HStack>
                          <Text color={cores.texto}>{tempoResposta(camada.tempoRespostaMin)}</Text>
                        </Flex>
                      );
                    })}
                  </Grid>
                </Box>
              </>
            ) : (
              <EstadoSemAumento semReferencia={analise.semReferenciaAnterior} />
            )}
          </TabPanel>

          <TabPanel pt="2" pb="0" px="0">
            {camadas.length ? (
              <>
                <Box as="table" width="full" style={{ borderCollapse: 'collapse' }} fontSize="xs" color={cores.texto}>
                  <Box as="thead">
                    <Box as="tr">
                      {['Camada', 'Menor umidade → Pico', 'Penetração', 'Δ (p.p.)'].map((titulo) => (
                        <Box
                          as="th"
                          key={titulo}
                          textAlign={titulo === 'Δ (p.p.)' ? 'right' : 'left'}
                          color={cores.texto}
                          pb="2"
                          fontWeight="500"
                        >
                          {titulo}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box as="tbody">
                    {camadas.map((camada) => (
                      <Box as="tr" key={camada.profundidadeCm}>
                        <Box
                          as="th"
                          scope="row"
                          color={cores.texto}
                          textAlign="left"
                          fontWeight="500"
                          py="2"
                          borderBottomWidth="1px"
                          borderColor={cores.divisor}
                        >
                          {camada.profundidadeCm} cm
                        </Box>
                        <Box
                          as="td"
                          color={cores.texto}
                          py="2"
                          borderBottomWidth="1px"
                          borderColor={cores.divisor}
                          whiteSpace="nowrap"
                        >
                          {numero(camada.antesPct)}% → {numero(camada.picoPct)}%
                        </Box>
                        <Box
                          as="td"
                          color={cores.texto}
                          py="2"
                          borderBottomWidth="1px"
                          borderColor={cores.divisor}
                          whiteSpace="nowrap"
                        >
                          {tempoResposta(camada.tempoRespostaMin)}
                        </Box>
                        <Box
                          as="td"
                          color={cores.texto}
                          textAlign="right"
                          py="2"
                          borderBottomWidth="1px"
                          borderColor={cores.divisor}
                        >
                          +{numero(camada.variacaoPp)}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Flex justify="space-between" gap="2" mt="2" fontSize="xs">
                  <Text color={cores.secundario}>Camada mais profunda com aumento</Text>
                  <Text color={cores.texto} whiteSpace="nowrap">
                    {camadas[camadas.length - 1]?.profundidadeCm} cm
                  </Text>
                </Flex>
                <Text color={cores.secundario} fontSize="xs" mt="1.5">
                  Tempo de penetração = intervalo entre a menor umidade medida antes da subida e o pico alcançado. p.p. = pontos percentuais.
                </Text>
              </>
            ) : (
              <EstadoSemAumento semReferencia={analise.semReferenciaAnterior} />
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
      <VisuallyHidden aria-live="polite">
        {camadas.length} camadas com aumento de umidade após a irrigação.
      </VisuallyHidden>
    </Box>
  );
}

function EstadoSemAumento({ semReferencia }: { semReferencia: readonly number[] }) {
  return (
    <Box py="5">
      <Text color={cores.texto}>Sem aumento de umidade observado nesta janela.</Text>
      {semReferencia.length > 0 && (
        <Text color={cores.secundario} fontSize="xs" mt="2">
          Falta leitura anterior à irrigação em: {semReferencia.join(', ')} cm.
        </Text>
      )}
    </Box>
  );
}
