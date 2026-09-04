import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Box,
    Flex,
    Heading,
    Text,
    Spinner,
    Container,
    Button,
    Icon,
    useDisclosure,
    useToast
} from "@chakra-ui/react";
import { FaTint } from "react-icons/fa";
import { BatchManualIrrigationModal } from "../components/BatchManualIrrigationModal/BatchManualIrrigationModal";
import { getProbes, getFarms, getManualProbes } from '../services/api'; 
import { COLORS } from '../colors/colors';
import type { Probe, Farm, ManualProbe, ManualIrrigationRecord } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DeviceTable, type TableRowData, type SortKey } from '../components/DeviceTable/DeviceTable';
import { isUserAdmin } from '../services/auth';
import { ExportPdfButton } from '../components/ExportPdfButton/ExportPdfButton';

// Formatadores de data isolados para os cards
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
});

const formatLastCommunication = (value?: string) => {
    if (!value) return "-";
    const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
    const parsed = new Date(normalizedValue);
    if (Number.isNaN(parsed.getTime())) return "-";

    const parts = dateTimeFormatter.formatToParts(parsed);
    const day = parts.find((p) => p.type === "day")?.value ?? "--";
    const month = parts.find((p) => p.type === "month")?.value ?? "--";
    const year = parts.find((p) => p.type === "year")?.value ?? "--";
    const hour = parts.find((p) => p.type === "hour")?.value ?? "--";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "--";

    return `${day}/${month}/${year} - ${hour}:${minute}`;
};

const getLastCommunicationTimestamp = (probe: Probe) => {
    const parseToUTC = (dateStr: string) => {
        const normalized = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
        const utcStr = normalized.endsWith("Z") ? normalized : normalized + "Z";
        return new Date(utcStr).getTime();
    };
    const latestReadingTimestamp = probe.readings
        ?.map((reading) => parseToUTC(reading.timestamp))
        .filter((ts) => !Number.isNaN(ts))
        .sort((a, b) => b - a)[0];

    const probeLastCommunication = probe.last_communication ? parseToUTC(probe.last_communication) : NaN;
    if (!Number.isNaN(probeLastCommunication)) return probeLastCommunication;
    if (latestReadingTimestamp !== undefined) return latestReadingTimestamp;
    return 0;
};

export function MyProbes() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const farmIdFilter = searchParams.get('farmId');

    const [probes, setProbes] = useState<Probe[]>([]);
    const [manualProbes, setManualProbes] = useState<ManualProbe[]>([]);
    const { isOpen: isBatchOpen, onOpen: onBatchOpen, onClose: onBatchClose } = useDisclosure();
    const [farms, setFarms] = useState<Farm[]>([]);
    const [loading, setLoading] = useState(true);

    const toast = useToast();
    const userIsAdmin = isUserAdmin();

    const [sortConfig, setSortConfig] = useState<{
        key: SortKey;
        direction: "asc" | "desc";
    }>({
        key: "status",
        direction: "asc",
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [probesData, farmsData] = await Promise.all([getProbes(), getFarms()]);
            
            const manualProbesArrays = await Promise.all(
                farmsData.map(f => getManualProbes(f.id).catch(() => [] as ManualProbe[]))
            );
            let allManualProbes = manualProbesArrays.flat();
            
            let finalProbes = probesData;
            if (farmIdFilter) {
                finalProbes = probesData.filter(probe => probe.farm_id === Number(farmIdFilter));
                allManualProbes = allManualProbes.filter(probe => probe.farm_id === Number(farmIdFilter));
            }

            setProbes(finalProbes);
            setManualProbes(allManualProbes);
            setFarms(farmsData);
        } catch (error) {
            console.error(error);
            toast({
                title: 'Erro ao carregar dados',
                description: 'Não foi possível buscar suas sondas.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast, farmIdFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const processedTableData = useMemo(() => {
        const mapped: TableRowData[] = probes.map((probe) => {
            const v1 = probe.config_moisture_v1 ?? 30;
            const v2 = probe.config_moisture_v2 ?? 45;
            const v3 = probe.config_moisture_v3 ?? 60;
            
            let currentStatusCode = "status_offline";
            const readings = probe.readings || [];
            
            const validReading = [...readings]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .find((r) => r.moisture_pct !== null && r.moisture_pct !== undefined);

            if (validReading) {
                const val = Number(validReading.moisture_pct);
                if (val < v1) currentStatusCode = "status_critical";
                else if (val < v2) currentStatusCode = "status_alert";
                else if (val <= v3) currentStatusCode = "status_ok";
                else currentStatusCode = "status_saturated";
            }

            const farmName = farms.find(f => f.id === probe.farm_id)?.name ?? "-";

            const batteryReading = probe.readings
                ?.filter((r) => r.battery_status !== null && r.battery_status !== undefined)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            const lastCommunicationTimestamp = getLastCommunicationTimestamp(probe);

            return {
                ...probe,
                farmName,
                status: currentStatusCode,
                batteryLevel: batteryReading?.battery_status ?? undefined,
                batteryDate: batteryReading ? new Date(batteryReading.timestamp).toLocaleDateString() : "",
                lastCommunicationFormatted: lastCommunicationTimestamp
                    ? formatLastCommunication(new Date(lastCommunicationTimestamp).toISOString())
                    : "-",
                lastCommunicationTimestamp,
            };
        });

        const mappedManuals = manualProbes.map((mp) => {
            const farmName = farms.find(f => f.id === mp.farm_id)?.name ?? "-";
            
            let lastTimestamp = 0;
            let lastDateString = "-";
            let sortedRecords: ManualIrrigationRecord[] = [];
            let sum7d = 0;

            if (mp.irrigation_records && mp.irrigation_records.length > 0) {
              sortedRecords = [...mp.irrigation_records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const dateObj = new Date(sortedRecords[0].date);
              lastTimestamp = dateObj.getTime();
              lastDateString = formatLastCommunication(dateObj.toISOString());
              
              const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
              sum7d = mp.irrigation_records
                .filter(r => new Date(r.date).getTime() >= sevenDaysAgo)
                .reduce((acc, r) => acc + r.irrigation_value_mm, 0);
            }

            return {
                id: mp.id,
                esn: `manual_${mp.id}`,
                name: mp.name,
                farm_id: mp.farm_id,
                farmName,
                latitude: mp.latitude,
                longitude: mp.longitude,
                status: "Manual",
                isManualProbe: true,
                irrigation_value_mm: sum7d,
                readings: [],
                created_at: mp.created_at,
                updated_at: mp.updated_at,
                lastCommunicationFormatted: lastDateString,
                lastCommunicationTimestamp: lastTimestamp,
                irrigation_records: sortedRecords
            } as unknown as TableRowData;
        });

        const combined = [...mapped, ...mappedManuals];

        const statusWeight: Record<string, number> = {
            status_critical: 1,
            status_alert: 2,
            status_ok: 3,
            status_saturated: 4,
            status_offline: 5,
        };

        return combined.sort((a, b) => {
            if (sortConfig.key === "status") {
                const weightA = statusWeight[a.status] || 99;
                const weightB = statusWeight[b.status] || 99;
                if (weightA < weightB) return sortConfig.direction === "asc" ? -1 : 1;
                if (weightA > weightB) return sortConfig.direction === "asc" ? 1 : -1;
                return 0;
            }

            const valA = a[sortConfig.key as keyof TableRowData];
            const valB = b[sortConfig.key as keyof TableRowData];

            if (valA === valB) return 0;
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;
            if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
            if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [probes, manualProbes, farms, sortConfig]);

    const handleSort = (key: SortKey) => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
        }));
    };

    const handleProbeSelect = (probeId: number | string) => {
        // Redireciona para o painel de gráficos do Dashboard
        navigate(`/dashboard?probeId=${probeId}`); 
    };

    return (
        <Box minH="100vh" bg={COLORS.background} p={{ base: 2, md: 8 }} pb={{ base: "100px", md: 8 }}>
            <Container maxW="full">
                <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={4}>
                    <Box>
                        <Heading color={COLORS.textPrimary} size={{ base: "md", md: "lg" }}>Monitoramento Detalhado</Heading>
                    </Box>
                    
                    <Flex align="center" gap={3}>
                        {manualProbes.length > 0 && (
                            <Button
                                size="sm"
                                colorScheme="blue"
                                leftIcon={<Icon as={FaTint} />}
                                onClick={onBatchOpen}
                            >
                                Irrigação em Massa
                            </Button>
                        )}
                        {processedTableData.length > 0 && (
                            <ExportPdfButton data={processedTableData} />
                        )}
                    </Flex>
                </Flex>

                <BatchManualIrrigationModal
                    isOpen={isBatchOpen}
                    onClose={onBatchClose}
                    manualProbes={manualProbes}
                    onSuccess={loadData}
                />

                {farms.length === 0 && !loading && (
                    <Box mb={4} p={3} bg="orange.900" borderRadius="md">
                        <Text color="orange.100" fontSize="sm">
                            Você precisa criar uma <b>Fazenda</b> antes de adicionar sondas.
                        </Text>
                    </Box>
                )}

                {loading ? (
                    <Flex justify="center" align="center" h="200px">
                        <Spinner size="xl" color={COLORS.primary} />
                    </Flex>
                ) : (
                    <DeviceTable
                        data={processedTableData}
                        onRowClick={handleProbeSelect}
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        isAdmin={userIsAdmin}
                    />
                )}
            </Container>
        </Box>
    );
}