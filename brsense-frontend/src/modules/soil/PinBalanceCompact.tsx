import { useEffect, useMemo, useState } from 'react';
import { Box, Flex, Grid, Spinner, Text, Badge, Button, Icon } from '@chakra-ui/react';
import { MdArrowForward } from 'react-icons/md';
import { CROP_PROFILES, SOYBEAN } from './crops.ts';
import { localDate } from './dates.ts';
import { balanceKcOnDate, rootDepthReference, rootsOnDate } from './roots.ts';
import { usePinWeather } from './weather-client.ts';
import { usePinSoil } from './usePinSoil.ts';
import { calculateSoilLimits, createSoilSettings, waterAvailability } from './calculations.ts';
import { estimateWaterBalance, weatherStartDate } from './automatic-balance.ts';
import { DEFAULT_IRRIGATION_EFFICIENCY } from './model-defaults.ts';
import type { CropProfile, SoilLimits } from './types.ts';
import type { CropRegistration, ManualWaterEvent } from './weather-types.ts';

const mm = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mm`;
const percent = (value: number) => `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export interface PinBalanceCompactProps {
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
  onOpenFullDetails?: () => void;
}

export function PinBalanceCompact({
  pin,
  cultura,
  dataPlantio,
  irrigationRecords = [],
  onOpenFullDetails,
}: PinBalanceCompactProps) {
  const timezone = 'America/Sao_Paulo';
  const today = localDate(timezone);

  // Mapeia a cultura para o catálogo FAO-56
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

  // Calcula DAP e data de referência
  const { dap, dapDate } = useMemo(() => {
    if (!dataPlantio) return { dap: 45, dapDate: today };
    const clean = dataPlantio.slice(0, 10);
    const diffDays = Math.max(0, Math.floor((new Date(today).getTime() - new Date(clean).getTime()) / (1000 * 60 * 60 * 24)));
    return { dap: diffDays, dapDate: today };
  }, [dataPlantio, today]);

  const registration: CropRegistration = useMemo(() => ({
    cropId: cropProfile.cropId,
    profileId: cropProfile.profileId,
    dap,
    dapDate,
  }), [cropProfile, dap, dapDate]);

  // Converte irrigações para o formato ManualWaterEvent
  const events: ManualWaterEvent[] = useMemo(() => {
    return irrigationRecords.map((r) => ({
      id: `irrigation-${r.id}`,
      date: r.date.slice(0, 10),
      type: 'irrigation' as const,
      mm: r.irrigation_value_mm,
    }));
  }, [irrigationRecords]);

  // Configurações do solo (inicia com padrão e permite overrides salvos no localStorage)
  const [settings, setSettings] = useState(() => {
    const key = `brsense_soil_settings_${pin.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Ignora
      }
    }
    return createSoilSettings(pin);
  });

  // Recarrega configurações sempre que o pin for alterado
  useEffect(() => {
    const key = `brsense_soil_settings_${pin.id}`;
    const saved = localStorage.getItem(key);
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

  // Clima: Inicia na data necessária para reconstrução histórica
  const startDate = useMemo(() => {
    return weatherStartDate(registration, today, null, 60, 120);
  }, [registration, today]);

  // Consulta Clima
  const weather = usePinWeather(pin, startDate, timezone);

  // Raízes e profundidade de consulta
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

  // Consulta Solo
  const soil = usePinSoil(pin, Math.round(soilQueryDepthM * 100));

  // Kc e ETo de hoje
  const todayWeather = useMemo(() => {
    if (!weather.data) return null;
    return weather.data.days.find((d) => d.date === today) ?? weather.data.days[weather.data.days.length - 1] ?? null;
  }, [weather.data, today]);

  const currentKc = useMemo(() => {
    if (!weather.data) return null;
    return balanceKcOnDate(registration, today, weather.data.days).kc;
  }, [registration, today, weather.data]);

  // Limites do solo calculados
  const limits: SoilLimits = useMemo(() => {
    if (!soil.profile) return { status: 'incomplete', issues: [], layers: [], summary: null };
    const etcMm = todayWeather?.etoMm != null && currentKc != null ? todayWeather.etoMm * currentKc : null;
    return calculateSoilLimits(
      soil.profile,
      activeSettings,
      cropProfile.pAtEtc5,
      etcMm
    );
  }, [soil.profile, activeSettings, todayWeather, currentKc, cropProfile.pAtEtc5]);

  // Balanço hídrico diário automático
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
    });
  }, [weather.loading, weather.data, registration, soil.profile, activeSettings, events, cropProfile.pAtEtc5, settings.irrigationEfficiency]);

  const current = balance?.current ?? null;
  const summary = limits.summary;

  // Cálculo da água disponível na zona radicular
  const available = useMemo(() => {
    if (!current) return null;
    return waterAvailability(limits, current.depletionMm.min);
  }, [limits, current]);

  const etc = todayWeather?.etoMm != null && currentKc != null ? todayWeather.etoMm * currentKc : null;

  const isLoading = soil.loading || weather.loading;

  if (isLoading && !soil.profile && !weather.data) {
    return (
      <Flex direction="column" align="center" justify="center" h="100%" minH="220px">
        <Spinner size="lg" color="blue.400" />
        <Text mt={2} fontSize="xs" color="gray.400">
          Carregando dados de solo e clima...
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" h="100%" justify="space-between" fontSize="xs" color="gray.200">
      <Box flex="1" overflowY="auto" pr={1}>
        {/* Cabeçalho do Status */}
        {current && (
          <Flex
            justify="space-between"
            align="center"
            px={2.5}
            py={1.5}
            bg={current.condition === 'irrigate' ? 'orange.950' : current.condition === 'check' ? 'yellow.950' : 'blue.950'}
            borderRadius="md"
            borderWidth="1px"
            borderColor={current.condition === 'irrigate' ? 'orange.600' : current.condition === 'check' ? 'yellow.600' : 'blue.600'}
            mb={2}
          >
            <Box>
              <Badge
                colorScheme={current.condition === 'irrigate' ? 'orange' : current.condition === 'check' ? 'yellow' : 'green'}
                fontSize="10px"
                px={1.5}
              >
                {current.condition === 'irrigate'
                  ? 'Irrigação Indicada'
                  : current.condition === 'check'
                    ? 'Conferir Manejo'
                    : 'Monitorar Solo'}
              </Badge>
              <Text fontSize="11px" fontWeight="semibold" color="white" mt={0.5}>
                {current.condition === 'irrigate'
                  ? `Reposição: ${mm(current.grossRefillToCcMm.min)}`
                  : current.condition === 'check'
                    ? 'Cenários divergentes'
                    : 'Saldo hídrico adequado'}
              </Text>
            </Box>

            <Box textAlign="right">
              <Text fontSize="10px" color="gray.400">Déficit estimado</Text>
              <Text fontSize="11px" fontWeight="bold" color="white">
                {mm(current.depletionMm.min)}
              </Text>
            </Box>
          </Flex>
        )}

        {/* Métricas de Solo: CC, PMP, Limite do Dia */}
        {summary && (
          <Grid templateColumns="repeat(3, 1fr)" gap={1.5} mb={2}>
            <Box bg="whiteAlpha.100" py={1.5} px={1} borderRadius="md" textAlign="center">
              <Text fontSize="10px" color="gray.400">CC Estimada</Text>
              <Text fontSize="12px" fontWeight="bold" color="blue.300">{percent(summary.cc)}</Text>
            </Box>
            <Box bg="whiteAlpha.100" py={1.5} px={1} borderRadius="md" textAlign="center">
              <Text fontSize="10px" color="gray.400">PMP Estimado</Text>
              <Text fontSize="12px" fontWeight="bold" color="gray.300">{percent(summary.pmp)}</Text>
            </Box>
            <Box bg="whiteAlpha.100" py={1.5} px={1} borderRadius="md" textAlign="center">
              <Text fontSize="10px" color="orange.300">Limite do Dia</Text>
              <Text fontSize="12px" fontWeight="bold" color="orange.400">{percent(summary.safetyTheta)}</Text>
            </Box>
          </Grid>
        )}

        {/* Água disponível na zona radicular (preenchido com chuva Open-Meteo e irrigações manuais) */}
        <Box bg="whiteAlpha.50" px={2.5} py={2} borderRadius="md" mb={2}>
          <Flex justify="space-between" align="center" mb={1}>
            <Text fontSize="11px" fontWeight="semibold" color="gray.300">
              Água disponível na zona radicular
            </Text>
            <Text fontSize="11px" fontWeight="bold" color={available && available.thresholdReached ? 'orange.300' : 'green.300'}>
              {summary && current
                ? `${mm(Math.max(0, summary.cadMm - current.depletionMm.min))} / ${mm(summary.cadMm)}`
                : summary
                  ? `Capacidade: ${mm(summary.cadMm)}`
                  : '—'}
            </Text>
          </Flex>

          {/* Barra Visual de Umidade Disponível */}
          <Box
            h="7px"
            bg="gray.700"
            borderRadius="full"
            overflow="hidden"
            mb={1}
          >
            {available && (
              <Box
                h="100%"
                w={`${Math.round(available.fractionRemaining * 100)}%`}
                bg={available.thresholdReached ? 'orange.400' : 'green.400'}
                transition="width 0.3s ease"
              />
            )}
          </Box>

          <Flex justify="space-between" fontSize="10px" color="gray.400">
            <Text>
              Raízes: <Text as="span" color="white" fontWeight="medium">{summary?.rootDepthM ? `${summary.rootDepthM.toLocaleString('pt-BR')} m` : `${activeRootDepthM.toFixed(2)} m`}</Text>
            </Text>
            <Text>
              Consumo permitido: <Text as="span" color="white" fontWeight="medium">{summary ? mm(summary.allowableDepletionMm) : '—'}</Text>
            </Text>
          </Flex>
        </Box>

        {/* Clima do Dia: ETo e ETc */}
        <Grid templateColumns="repeat(2, 1fr)" gap={1.5} mb={2}>
          <Box bg="whiteAlpha.100" py={1.5} px={2} borderRadius="md">
            <Text fontSize="10px" color="gray.400">ETo do Dia (Open-Meteo)</Text>
            <Text fontSize="12px" fontWeight="bold" color="white">
              {todayWeather?.etoMm != null ? mm(todayWeather.etoMm) : '—'}
            </Text>
          </Box>
          <Box bg="whiteAlpha.100" py={1.5} px={2} borderRadius="md">
            <Text fontSize="10px" color="gray.400">ETc Potencial (Kc: {currentKc?.toFixed(2) ?? '—'})</Text>
            <Text fontSize="12px" fontWeight="bold" color="blue.300">
              {etc != null ? mm(etc) : '—'}
            </Text>
          </Box>
        </Grid>
      </Box>

      {/* Botão de Mais Informações fixo e destacado */}
      {onOpenFullDetails && (
        <Box pt={2} borderTop="1px solid" borderColor="whiteAlpha.200" flexShrink={0}>
          <Button
            size="sm"
            colorScheme="blue"
            variant="solid"
            _hover={{ bg: "blue.500" }}
            rightIcon={<Icon as={MdArrowForward} />}
            onClick={onOpenFullDetails}
            w="100%"
            fontWeight="semibold"
            boxShadow="md"
            h="34px"
          >
            Mais informações
          </Button>
        </Box>
      )}
    </Flex>
  );
}
