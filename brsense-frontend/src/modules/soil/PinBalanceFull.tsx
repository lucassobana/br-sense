import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Grid,
  Input,
  Select,
  Spinner,
  Text,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Collapse,
  useToast,
} from '@chakra-ui/react';
import { CROP_PROFILES, SOYBEAN } from './crops.ts';
import { localDate } from './dates.ts';
import { balanceKcOnDate, rootDepthReference, rootsOnDate } from './roots.ts';
import { usePinWeather } from './weather-client.ts';
import { usePinSoil } from './usePinSoil.ts';
import {
  calculateSoilLimits,
  createSoilSettings,
  waterAvailability,
} from './calculations.ts';
import { estimateWaterBalance, weatherStartDate } from './automatic-balance.ts';
import { DEFAULT_IRRIGATION_EFFICIENCY } from './model-defaults.ts';
import type {
  CropProfile,
  FieldCapacityReference,
  SoilLimits,
  SoilSettings,
} from './types.ts';
import type { CropRegistration, ManualWaterEvent } from './weather-types.ts';

const mm = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mm`;
const percent = (value: number) => `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export interface PinBalanceFullProps {
  pin: {
    id: string | number;
    name: string;
    latitude: number;
    longitude: number;
  };
  cultura?: string | null;
  dataPlantio?: string | null;
  irrigationRecords?: Array<{
    id: number;
    date: string;
    irrigation_value_mm: number;
  }>;
}

export function PinBalanceFull({
  pin,
  cultura,
  dataPlantio,
  irrigationRecords = [],
}: PinBalanceFullProps) {
  const timezone = 'America/Sao_Paulo';
  const today = localDate(timezone);
  const toast = useToast();

  const [showDetails, setShowDetails] = useState(false);
  const [showHypotheses, setShowHypotheses] = useState(false);
  const [useForecastRain, setUseForecastRain] = useState(false);

  // Mapeia cultura
  const cropProfile: CropProfile = useMemo(() => {
    if (!cultura) return SOYBEAN;
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const clean = normalize(cultura);
    const found = CROP_PROFILES.find(
      (p) =>
        normalize(p.name).includes(clean) ||
        clean.includes(normalize(p.name)) ||
        normalize(p.cropId) === clean
    );
    return found || SOYBEAN;
  }, [cultura]);

  // Calcula DAP
  const { dap, dapDate } = useMemo(() => {
    if (!dataPlantio) return { dap: 45, dapDate: today };
    const clean = dataPlantio.slice(0, 10);
    const diffDays = Math.max(
      0,
      Math.floor((new Date(today).getTime() - new Date(clean).getTime()) / (1000 * 60 * 60 * 24))
    );
    return { dap: diffDays, dapDate: today };
  }, [dataPlantio, today]);

  const registration: CropRegistration = useMemo(
    () => ({
      cropId: cropProfile.cropId,
      profileId: cropProfile.profileId,
      dap,
      dapDate,
    }),
    [cropProfile, dap, dapDate]
  );

  const events: ManualWaterEvent[] = useMemo(() => {
    return irrigationRecords.map((r) => ({
      id: `irrigation-${r.id}`,
      date: r.date.slice(0, 10),
      type: 'irrigation' as const,
      mm: r.irrigation_value_mm,
    }));
  }, [irrigationRecords]);

  // Settings de solo com persistência em localStorage
  const storageKey = `brsense_soil_settings_${pin.id}`;
  const [settings, setSettings] = useState<SoilSettings>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Ignora
      }
    }
    return createSoilSettings(pin);
  });

  // Atualiza configurações se o pin mudar
  useEffect(() => {
    const saved = localStorage.getItem(`brsense_soil_settings_${pin.id}`);
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
        return;
      } catch {
        // Ignora
      }
    }
    setSettings(createSoilSettings(pin));
  }, [pin.id, pin.latitude, pin.longitude]);

  const saveSettings = useCallback(
    (newSettings: SoilSettings) => {
      setSettings(newSettings);
      localStorage.setItem(storageKey, JSON.stringify(newSettings));
      toast({
        title: 'Ajustes de solo salvos',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    },
    [storageKey, toast]
  );

  // Consultas de Solo e Clima
  const startDate = useMemo(() => {
    return weatherStartDate(registration, today, null, 60, 120);
  }, [registration, today]);
  const weather = usePinWeather(pin, startDate, timezone);

  // Raízes
  const rootRef = useMemo(() => rootDepthReference(registration, settings), [registration, settings]);
  const estimatedRootDepthM = useMemo(() => {
    return rootsOnDate(registration, today, weather.data?.days ?? [], settings).depthM;
  }, [registration, today, weather.data, settings]);

  const activeRootDepthM = settings.effectiveRootDepthM ?? estimatedRootDepthM ?? 0.2;
  const soilQueryDepthM = Math.max(0.6, rootRef?.maximumDepthM ?? 0.6);

  // Configurações ativas com chave de coordenadas alinhada
  const activeSettings = useMemo(() => ({
    ...settings,
    coordinateKey: `${pin.latitude},${pin.longitude}`,
    effectiveRootDepthM: activeRootDepthM,
  }), [settings, pin.latitude, pin.longitude, activeRootDepthM]);

  const soil = usePinSoil(pin, Math.round(soilQueryDepthM * 100));

  const todayWeather = useMemo(() => {
    if (!weather.data) return null;
    return (
      weather.data.days.find((d) => d.date === today) ??
      weather.data.days[weather.data.days.length - 1] ??
      null
    );
  }, [weather.data, today]);

  const currentKc = useMemo(() => {
    if (!weather.data) return null;
    return balanceKcOnDate(registration, today, weather.data.days).kc;
  }, [registration, today, weather.data]);

  const limits: SoilLimits = useMemo(() => {
    if (!soil.profile) return { status: 'incomplete', issues: [], layers: [], summary: null };
    const etcMm =
      todayWeather?.etoMm != null && currentKc != null ? todayWeather.etoMm * currentKc : null;
    return calculateSoilLimits(
      soil.profile,
      activeSettings,
      cropProfile.pAtEtc5,
      etcMm
    );
  }, [soil.profile, activeSettings, todayWeather, currentKc, cropProfile.pAtEtc5]);

  const balance = useMemo(() => {
    if (weather.loading || !weather.data) return null;
    return estimateWaterBalance({
      weather: weather.data,
      registration,
      profile: soil.profile,
      settings: activeSettings,
      events,
      pAt5: cropProfile.pAtEtc5,
      initial: null,
      irrigationEfficiency: settings.irrigationEfficiency ?? DEFAULT_IRRIGATION_EFFICIENCY,
      considerForecastRain: useForecastRain,
    });
  }, [
    weather.loading,
    weather.data,
    registration,
    soil.profile,
    activeSettings,
    events,
    cropProfile.pAtEtc5,
    settings.irrigationEfficiency,
    useForecastRain,
  ]);

  const current = balance?.current ?? null;
  const summary = limits.summary;
  const available = useMemo(() => {
    if (!current) return null;
    return waterAvailability(limits, current.depletionMm.min);
  }, [limits, current]);

  const etc = todayWeather?.etoMm != null && currentKc != null ? todayWeather.etoMm * currentKc : null;
  const isLoading = soil.loading || weather.loading;

  return (
    <Box
      bg="gray.850"
      p={{ base: 4, md: 6 }}
      borderRadius="xl"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      boxShadow="xl"
    >
      {/* Título do Módulo */}
      <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
        <Box>
          <Flex align="center" gap={2}>
            <Text fontSize="lg" fontWeight="bold" color="white">
              Balanço Hídrico do Solo
            </Text>
            <Badge colorScheme="blue" fontSize="xs">
              FAO-56 Rev.1 + SoilGrids
            </Badge>
          </Flex>
          <Text fontSize="xs" color="gray.400">
            Coordenadas: {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)} · Cultura: {cropProfile.name} (DAP: {dap} dias)
          </Text>
        </Box>

        {isLoading && (
          <Flex align="center" gap={2}>
            <Spinner size="sm" color="blue.400" />
            <Text fontSize="xs" color="gray.400">Atualizando dados...</Text>
          </Flex>
        )}
      </Flex>

      {/* Condição Atual e Indicação */}
      {current && (
        <Flex
          justify="space-between"
          align="center"
          p={3.5}
          bg={current.condition === 'irrigate' ? 'orange.950' : current.condition === 'check' ? 'yellow.950' : 'blue.950'}
          borderRadius="lg"
          borderWidth="1px"
          borderColor={current.condition === 'irrigate' ? 'orange.600' : current.condition === 'check' ? 'yellow.600' : 'blue.600'}
          mb={4}
          wrap="wrap"
          gap={3}
        >
          <Box>
            <Badge
              colorScheme={current.condition === 'irrigate' ? 'orange' : current.condition === 'check' ? 'yellow' : 'green'}
              fontSize="xs"
              px={2}
              py={0.5}
            >
              {current.condition === 'irrigate'
                ? 'Irrigação Indicada'
                : current.condition === 'check'
                  ? 'Conferir Manejo'
                  : 'Monitorar Solo'}
            </Badge>
            <Text fontSize="sm" fontWeight="bold" color="white" mt={1}>
              {current.condition === 'irrigate'
                ? `Lâmina Bruta de Reposição Recomendada: ${mm(current.grossRefillToCcMm.min)}`
                : current.condition === 'check'
                  ? 'Cenários inicial e de murcha divergem. Avalie as condições de campo.'
                  : 'Solo dentro da faixa segura de disponibilidade hídrica.'}
            </Text>
          </Box>
          <Box textAlign={{ base: 'left', sm: 'right' }}>
            <Text fontSize="xs" color="gray.400">Déficit Atual Abaixo da CC</Text>
            <Text fontSize="lg" fontWeight="bold" color="white">
              {mm(current.depletionMm.min)}
            </Text>
          </Box>
        </Flex>
      )}

      {/* Grid de Métricas do Solo */}
      {summary && (
        <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3} mb={4}>
          <Box bg="whiteAlpha.50" p={3} borderRadius="lg" borderWidth="1px" borderColor="whiteAlpha.100">
            <Text fontSize="xs" color="gray.400">Capacidade de Campo (CC)</Text>
            <Text fontSize="lg" fontWeight="bold" color="blue.300">{percent(summary.cc)}</Text>
            <Text fontSize="10px" color="gray.500">Volumétrica ativa</Text>
          </Box>
          <Box bg="whiteAlpha.50" p={3} borderRadius="lg" borderWidth="1px" borderColor="whiteAlpha.100">
            <Text fontSize="xs" color="gray.400">Ponto de Murcha (PMP)</Text>
            <Text fontSize="lg" fontWeight="bold" color="gray.300">{percent(summary.pmp)}</Text>
            <Text fontSize="10px" color="gray.500">1.500 kPa</Text>
          </Box>
          <Box bg="whiteAlpha.50" p={3} borderRadius="lg" borderWidth="1px" borderColor="whiteAlpha.100">
            <Text fontSize="xs" color="orange.300">Limite de Segurança do Dia</Text>
            <Text fontSize="lg" fontWeight="bold" color="orange.400">{percent(summary.safetyTheta)}</Text>
            <Text fontSize="10px" color="gray.500">Ponto crítico de estresse</Text>
          </Box>
          <Box bg="whiteAlpha.50" p={3} borderRadius="lg" borderWidth="1px" borderColor="whiteAlpha.100">
            <Text fontSize="xs" color="gray.400">CAD Efetiva</Text>
            <Text fontSize="lg" fontWeight="bold" color="green.300">{mm(summary.cadMm)}</Text>
            <Text fontSize="10px" color="gray.500">Água disponível total</Text>
          </Box>
        </Grid>
      )}

      {/* Água Disponível na Zona Radicular (Chuva Open-Meteo + Irrigações do Pin) */}
      <Box bg="whiteAlpha.50" p={4} borderRadius="lg" borderWidth="1px" borderColor="whiteAlpha.100" mb={4}>
        <Flex justify="space-between" align="center" mb={2}>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="white">
              Água disponível na zona radicular
            </Text>
            <Text fontSize="xs" color="gray.400">
              Alimentado pela evapotranspiração e chuva da Open-Meteo combinadas com os lançamentos de irrigação do Pin
            </Text>
          </Box>
          <Text fontSize="sm" fontWeight="bold" color={available?.thresholdReached ? 'orange.300' : 'green.300'}>
            {summary && current
              ? `${mm(Math.max(0, summary.cadMm - current.depletionMm.min))} / ${mm(summary.cadMm)}`
              : '—'}
          </Text>
        </Flex>

        {/* Barra de Progresso */}
        <Box h="10px" bg="gray.700" borderRadius="full" overflow="hidden" mb={2}>
          {available && (
            <Box
              h="100%"
              w={`${Math.round(available.fractionRemaining * 100)}%`}
              bg={available.thresholdReached ? 'orange.400' : 'green.400'}
              transition="width 0.4s ease"
            />
          )}
        </Box>

        <Flex justify="space-between" fontSize="xs" color="gray.400" wrap="wrap" gap={2}>
          <Text>
            Profundidade radicular ativa: <Text as="span" color="white" fontWeight="semibold">{summary?.rootDepthM ? `${summary.rootDepthM.toLocaleString('pt-BR')} m` : `${activeRootDepthM != null ? activeRootDepthM.toFixed(2) : '—'} m`}</Text>
          </Text>
          <Text>
            Consumo máximo permitido sem estresse: <Text as="span" color="white" fontWeight="semibold">{summary ? mm(summary.allowableDepletionMm) : '—'}</Text>
          </Text>
        </Flex>
      </Box>

      {/* Métricas de Clima: ETo e ETc */}
      <Grid templateColumns={{ base: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' }} gap={3} mb={4}>
        <Box bg="whiteAlpha.50" p={3} borderRadius="lg">
          <Text fontSize="xs" color="gray.400">ETo do Dia (Open-Meteo)</Text>
          <Text fontSize="md" fontWeight="bold" color="white">
            {todayWeather?.etoMm != null ? mm(todayWeather.etoMm) : '—'}
          </Text>
        </Box>
        <Box bg="whiteAlpha.50" p={3} borderRadius="lg">
          <Text fontSize="xs" color="gray.400">Kc da Fase (Curva FAO-56)</Text>
          <Text fontSize="md" fontWeight="bold" color="blue.300">
            {currentKc != null ? currentKc.toFixed(2) : '—'}
          </Text>
        </Box>
        <Box bg="whiteAlpha.50" p={3} borderRadius="lg">
          <Text fontSize="xs" color="gray.400">ETc Potencial (Demanda)</Text>
          <Text fontSize="md" fontWeight="bold" color="green.300">
            {etc != null ? mm(etc) : '—'}
          </Text>
        </Box>
      </Grid>

      {/* Projeção dos Próximos Dias */}
      {weather.data && (
        <Box bg="whiteAlpha.50" p={4} borderRadius="lg" borderWidth="1px" borderColor="whiteAlpha.100" mb={4}>
          <Text fontSize="sm" fontWeight="semibold" color="white" mb={1}>
            Projeção para os Próximos Dias
          </Text>
          <Text fontSize="xs" color="gray.400" mb={3}>
            Previsão climática Open-Meteo e consumo diário estimado da cultura.
          </Text>

          <Grid templateColumns={{ base: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' }} gap={3}>
            {weather.data.days
              .filter((d) => d.date >= weather.data!.today)
              .slice(0, 3)
              .map((d) => {
                const projected = balance?.forecast.find((x) => x.date === d.date);
                return (
                  <Box key={d.date} bg="gray.800" p={3} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.100">
                    <Text fontSize="xs" fontWeight="bold" color="white">
                      {d.date.slice(8)}/{d.date.slice(5, 7)}
                    </Text>
                    <Text fontSize="xs" color="gray.300" mt={1}>
                      ETo: {d.etoMm != null ? mm(d.etoMm) : '—'}
                    </Text>
                    <Text fontSize="xs" color="blue.300">
                      Chuva prevista: {d.precipitationMm != null ? mm(d.precipitationMm) : '0 mm'}
                    </Text>
                    {projected && (
                      <Text
                        mt={1.5}
                        fontSize="xs"
                        fontWeight="semibold"
                        color={projected.condition === 'monitor' ? 'green.300' : 'orange.400'}
                      >
                        Déficit: {mm(projected.depletionMm.min)}
                      </Text>
                    )}
                  </Box>
                );
              })}
          </Grid>

          <Box mt={3}>
            <Checkbox
              size="sm"
              colorScheme="blue"
              isChecked={useForecastRain}
              onChange={(e) => setUseForecastRain(e.target.checked)}
            >
              <Text fontSize="xs" color="gray.400">
                Considerar chuva prevista somente no cenário futuro (conservador se desmarcado)
              </Text>
            </Checkbox>
          </Box>
        </Box>
      )}

      {/* Botão de Expansão: Detalhes e Ajuste do Solo */}
      <Button
        w="full"
        variant="outline"
        colorScheme="blue"
        size="sm"
        onClick={() => setShowDetails((prev) => !prev)}
        mb={4}
      >
        {showDetails ? 'Ocultar Detalhes e Ajustes do Solo' : 'Detalhes e Ajuste do Solo'}
      </Button>

      {/* Seção Completa de Detalhes e Ajustes */}
      <Collapse in={showDetails} animateOpacity>
        <Box
          p={4}
          bg="gray.800"
          borderRadius="lg"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          mb={4}
        >
          <Text fontSize="sm" fontWeight="bold" color="white" mb={3}>
            Parâmetros de Raízes e Camadas de Solo
          </Text>

          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4} mb={4}>
            {/* Ajuste de Raízes */}
            <Box>
              <Text fontSize="xs" color="gray.300" mb={1}>
                Profundidade Efetiva das Raízes (m)
              </Text>
              <Input
                size="sm"
                type="number"
                step="0.05"
                min="0.10"
                max="2.00"
                value={settings.effectiveRootDepthM ?? ''}
                placeholder={`Estimada (${estimatedRootDepthM != null ? estimatedRootDepthM.toFixed(2) : '0.20'} m)`}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  setSettings((prev) => ({ ...prev, effectiveRootDepthM: val }));
                }}
              />
              <Flex gap={2} mt={1.5} align="center">
                <Button
                  size="xs"
                  variant="link"
                  color="blue.400"
                  onClick={() => setSettings((prev) => ({ ...prev, effectiveRootDepthM: null }))}
                >
                  Usar estimativa automática da FAO
                </Button>
              </Flex>
            </Box>

            {/* Referência da Capacidade de Campo */}
            <Box>
              <Text fontSize="xs" color="gray.300" mb={1}>
                Protocolo de Referência da Capacidade de Campo
              </Text>
              <Select
                size="sm"
                value={settings.fieldCapacityReference}
                onChange={(e) => {
                  setSettings((prev) => ({
                    ...prev,
                    fieldCapacityReference: e.target.value as FieldCapacityReference,
                  }));
                }}
              >
                <option value="10kPa">10 kPa (Solos arenosos e médios)</option>
                <option value="33kPa">33 kPa (Solos muito argilosos)</option>
              </Select>
            </Box>
          </Grid>

          {/* Tabela de Camadas SoilGrids com Overrides */}
          {soil.profile && (
            <Box overflowX="auto" mb={4}>
              <Text fontSize="xs" fontWeight="semibold" color="gray.300" mb={2}>
                Camadas Físicas Identificadas na Coordenada (SoilGrids WCS)
              </Text>
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th color="gray.400">Camada</Th>
                    <Th color="gray.400">CC (10 kPa)</Th>
                    <Th color="gray.400">PMP (1.500 kPa)</Th>
                    <Th color="gray.400">Areia</Th>
                    <Th color="gray.400">Argila</Th>
                    <Th color="gray.400">Ajuste Manual CC</Th>
                    <Th color="gray.400">Ajuste Manual PMP</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {soil.profile.layers.map((layer) => {
                    const override = settings.overrides[layer.id];
                    return (
                      <Tr key={layer.id}>
                        <Td fontWeight="medium" color="white">{layer.id}</Td>
                        <Td>{layer.theta10.mean != null ? percent(layer.theta10.mean) : '—'}</Td>
                        <Td>{layer.theta1500.mean != null ? percent(layer.theta1500.mean) : '—'}</Td>
                        <Td>{layer.sandPercent != null ? `${layer.sandPercent.toFixed(1)}%` : '—'}</Td>
                        <Td>{layer.clayPercent != null ? `${layer.clayPercent.toFixed(1)}%` : '—'}</Td>
                        <Td>
                          <Input
                            size="xs"
                            w="70px"
                            type="number"
                            step="0.01"
                            placeholder={layer.theta10.mean ? String(layer.theta10.mean) : '0.35'}
                            value={override?.cc ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : Number(e.target.value);
                              setSettings((prev) => {
                                const newOverrides = { ...prev.overrides };
                                if (val === undefined) {
                                  delete newOverrides[layer.id];
                                } else {
                                  newOverrides[layer.id] = {
                                    cc: val,
                                    pmp: override?.pmp ?? layer.theta1500.mean ?? 0.15,
                                    updatedAt: new Date().toISOString(),
                                    note: 'Ajuste manual',
                                  };
                                }
                                return { ...prev, overrides: newOverrides };
                              });
                            }}
                          />
                        </Td>
                        <Td>
                          <Input
                            size="xs"
                            w="70px"
                            type="number"
                            step="0.01"
                            placeholder={layer.theta1500.mean ? String(layer.theta1500.mean) : '0.18'}
                            value={override?.pmp ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : Number(e.target.value);
                              setSettings((prev) => {
                                const newOverrides = { ...prev.overrides };
                                if (val === undefined) {
                                  delete newOverrides[layer.id];
                                } else {
                                  newOverrides[layer.id] = {
                                    cc: override?.cc ?? layer.theta10.mean ?? 0.35,
                                    pmp: val,
                                    updatedAt: new Date().toISOString(),
                                    note: 'Ajuste manual',
                                  };
                                }
                                return { ...prev, overrides: newOverrides };
                              });
                            }}
                          />
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          )}

          <Flex justify="flex-end" gap={2}>
            <Button
              size="sm"
              colorScheme="blue"
              onClick={() => saveSettings(settings)}
            >
              Salvar Parâmetros do Pin
            </Button>
          </Flex>
        </Box>
      </Collapse>

      {/* Fontes e Hipóteses do Balanço */}
      <Box mt={2}>
        <Button
          variant="link"
          size="xs"
          color="gray.400"
          onClick={() => setShowHypotheses((prev) => !prev)}
        >
          {showHypotheses ? 'Ocultar fontes e notas metodológicas' : 'Ver fontes e hipóteses agronômicas'}
        </Button>
        <Collapse in={showHypotheses} animateOpacity>
          <Box p={3} mt={2} bg="blackAlpha.300" borderRadius="md" fontSize="11px" color="gray.400">
            <Text mb={1}>• <strong>ETo</strong>: FAO-56 Penman-Monteith calculado pela Open-Meteo com base em temperatura, radiação solar e vento.</Text>
            <Text mb={1}>• <strong>Chuva</strong>: Prioridade absoluta aos registros manuais do usuário. Dias sem registro utilizam precipitação modelada.</Text>
            <Text mb={1}>• <strong>Solo</strong>: Modelo ISRIC SoilGrids v2.0 WCS na coordenada, resolução 250 m. CC inicial a 10 kPa e PMP a 1.500 kPa.</Text>
            <Text>• <strong>Raízes e Fenologia</strong>: Crescimento térmico cumulativo conforme catálogo FAO-56 Rev.1 (2025).</Text>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
