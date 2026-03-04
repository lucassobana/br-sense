// brsense-mobile/app/probe/[id].tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
    ScrollView,
    TouchableOpacity
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { getDeviceHistory } from '../../src/services/api';

const screenWidth = Dimensions.get('window').width;

// --- PALETA DE CORES EXATA DA WEB ---
const COLORS = {
    background: "#0A2540",
    surface: "#1A1D21",
    primary: "#3084c9",
    primaryDark: "#0B5FA5",
    textPrimary: "#FFFFFF",
    textSecondary: "#A0AEC0",
    inputBorder: "rgba(59, 71, 84, 0.5)",
    tooltipBg: "rgba(30, 41, 59, 0.9)", // Levemente mais opaco para leitura no mobile
    gridLine: "#3179c7",
    axisText: "#6b7280"
};

const DEPTH_COLORS: Record<number, string> = {
    10: "#ffffff",
    20: "#FDD835",
    30: "#40ff79",
    40: "#6498f8",
    50: "#522b0f",
    60: "#000000",
};

interface Snapshot {
    timeStr: string;
    dateObj: Date;
    values: Record<number, number | null>;
}

export default function ProbeDetails() {
    const router = useRouter();
    const { esn, name } = useLocalSearchParams<{ esn: string, name: string }>();

    const [isLoading, setIsLoading] = useState(true);
    const [metric, setMetric] = useState<'moisture' | 'temperature'>('moisture');
    const [historyData, setHistoryData] = useState<any[]>([]);

    // Controlo de visibilidade das linhas (Legenda interativa)
    const [visibleLines, setVisibleLines] = useState<Record<number, boolean>>({
        10: true, 20: true, 30: true, 40: true, 50: true, 60: true
    });

    // Estado do Tooltip Interativo
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getDeviceHistory(esn, { limit: 200 });
                setHistoryData(history);
            } catch (error) {
                console.error("Erro ao carregar histórico:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (esn) fetchHistory();
    }, [esn]);

    // --- PROCESSAMENTO IDÊNTICO À WEB ---
    const { chartData, snapshots } = useMemo(() => {
        if (!historyData || historyData.length === 0) return { chartData: null, snapshots: [] };

        const validHistory = historyData.filter(r =>
            metric === 'moisture' ? r.moisture_pct !== null : r.temperature_c !== null
        );

        // Agrupa os últimos 7 horários únicos para caber bem no ecrã mobile
        const uniqueTimestamps = Array.from(new Set(validHistory.map(r => r.timestamp)))
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .slice(0, 7)
            .reverse();

        if (uniqueTimestamps.length === 0) return { chartData: null, snapshots: [] };

        const labels: string[] = [];
        const generatedSnapshots: Snapshot[] = [];

        uniqueTimestamps.forEach(ts => {
            const date = new Date(ts);
            const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            labels.push(timeStr);

            const values: Record<number, number | null> = {};
            [10, 20, 30, 40, 50, 60].forEach(depth => {
                const reading = validHistory.find(r => r.timestamp === ts && r.depth_cm === depth);
                if (reading) {
                    values[depth] = metric === 'moisture' ? Number(reading.moisture_pct) : Number(reading.temperature_c);
                } else {
                    values[depth] = null;
                }
            });

            generatedSnapshots.push({ timeStr, dateObj: date, values });
        });

        const datasets: any[] = [];

        [10, 20, 30, 40, 50, 60].forEach(depth => {
            if (!visibleLines[depth]) return; // Oculta a linha se estiver desativada

            // Preenche nulls com o valor anterior para não quebrar a linha (igual ao connectNulls da Web)
            const dataPoints = generatedSnapshots.map(snap => snap.values[depth]);
            const safeDataPoints = dataPoints.map((val, idx) => val !== null ? val : (dataPoints[idx - 1] || 0));

            // Só adiciona o dataset se houver pelo menos um dado válido maior que 0
            if (safeDataPoints.some(v => v > 0)) {
                datasets.push({
                    data: safeDataPoints,
                    color: (opacity = 1) => {
                        // Converte HEX para RGB no ChartKit
                        const hex = DEPTH_COLORS[depth].replace('#', '');
                        const r = parseInt(hex.substring(0, 2), 16);
                        const g = parseInt(hex.substring(2, 4), 16);
                        const b = parseInt(hex.substring(4, 6), 16);
                        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                    },
                    strokeWidth: 2.5 // Mesma espessura da Web
                });
            }
        });

        // Se ocultou todas as linhas, envia dataset vazio
        if (datasets.length === 0) {
            datasets.push({ data: labels.map(() => 0), color: () => 'transparent', strokeWidth: 0 });
        }

        return {
            chartData: { labels, datasets },
            snapshots: generatedSnapshots
        };
    }, [historyData, metric, visibleLines]);

    const toggleLine = (depth: number) => {
        setVisibleLines(prev => ({ ...prev, [depth]: !prev[depth] }));
        setActiveIndex(null); // Reseta o tooltip ao alterar as linhas
    };

    // --- RENDERIZAÇÃO DO TOOLTIP FLUTUANTE ---
    const activeSnapshot = activeIndex !== null ? snapshots[activeIndex] : null;

    return (
        <View style={styles.container}>
            {/* --- HEADER --- */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{name || esn}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* --- TÍTULO E SUBTÍTULO (Igual à Web) --- */}
                <View style={styles.chartHeader}>
                    <Text style={styles.chartTitle}>
                        Perfil de {metric === 'moisture' ? 'Umidade (%)' : 'Temperatura (°C)'}
                    </Text>
                    <Text style={styles.chartSubtitle}>
                        {snapshots.length > 0
                            ? `${snapshots[0].dateObj.toLocaleDateString('pt-BR')} - ${snapshots[snapshots.length - 1].dateObj.toLocaleDateString('pt-BR')}`
                            : 'Aguardando dados...'
                        }
                    </Text>
                </View>

                {/* --- BOTÕES DE MÉTRICA --- */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, metric === 'moisture' && styles.toggleBtnActive]}
                        onPress={() => { setMetric('moisture'); setActiveIndex(null); }}
                    >
                        <Text style={[styles.toggleText, metric === 'moisture' && styles.toggleTextActive]}>
                            Umidade
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, metric === 'temperature' && styles.toggleBtnActive]}
                        onPress={() => { setMetric('temperature'); setActiveIndex(null); }}
                    >
                        <Text style={[styles.toggleText, metric === 'temperature' && styles.toggleTextActive]}>
                            Temperatura
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* --- CAIXA PRINCIPAL DO GRÁFICO (Bordas e Fundo Idênticos) --- */}
                <View style={styles.chartBox}>

                    {/* PAINEL DE TOOLTIP (Simulando o Hover da Web) */}
                    <View style={[styles.tooltipContainer, { opacity: activeSnapshot ? 1 : 0 }]}>
                        {activeSnapshot && (
                            <View style={styles.tooltipInner}>
                                <View style={styles.tooltipTimeRow}>
                                    <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
                                    <Text style={styles.tooltipTimeText}>{activeSnapshot.timeStr}</Text>
                                </View>

                                <View style={styles.tooltipValuesRow}>
                                    {[10, 20, 30, 40, 50, 60].map(depth => {
                                        const val = activeSnapshot.values[depth];
                                        if (!visibleLines[depth] || val === null || val === undefined) return null;

                                        return (
                                            <View key={depth} style={styles.tooltipItem}>
                                                <View style={[styles.tooltipDot, { backgroundColor: DEPTH_COLORS[depth] }]} />
                                                <Text style={styles.tooltipLabel}>{depth}cm</Text>
                                                <Text style={styles.tooltipValue}>
                                                    {val.toFixed(1)}{metric === 'moisture' ? '%' : '°C'}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </View>

                    {isLoading ? (
                        <View style={styles.emptyBox}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    ) : chartData ? (
                        <LineChart
                            data={chartData}
                            width={screenWidth - 44} // Ajuste exato das margens
                            height={260}
                            yAxisSuffix={metric === 'moisture' ? '%' : '°C'}
                            yAxisInterval={1}
                            onDataPointClick={(data) => setActiveIndex(data.index)}
                            chartConfig={{
                                backgroundColor: COLORS.surface,
                                backgroundGradientFrom: COLORS.surface,
                                backgroundGradientTo: COLORS.surface,
                                decimalPlaces: 0,
                                // Grid tracejada azulada igual à web
                                propsForBackgroundLines: {
                                    strokeDasharray: "3 3",
                                    stroke: COLORS.gridLine,
                                    strokeOpacity: 0.3,
                                    strokeWidth: 1
                                },
                                // Eixos X e Y text
                                color: () => COLORS.gridLine,
                                labelColor: () => COLORS.axisText,
                                style: { borderRadius: 16 },
                                propsForDots: { r: "3", strokeWidth: "0" }, // Pontos mais subtis no mobile
                                propsForLabels: { fontSize: 10 }
                            }}
                            bezier
                            style={{ marginVertical: 8, marginLeft: -10 }} // Ajuste de margem interna
                            withInnerLines={true}
                            withOuterLines={false}
                            withShadow={false}
                        />
                    ) : (
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyText}>Sem dados de {metric === 'moisture' ? 'umidade' : 'temperatura'} disponíveis.</Text>
                        </View>
                    )}
                </View>

                {/* --- LEGENDAS (Interativas e com Checkbox Design) --- */}
                <View style={styles.legendContainer}>
                    {[10, 20, 30, 40, 50, 60].map(depth => (
                        <TouchableOpacity
                            key={depth}
                            style={styles.legendItem}
                            onPress={() => toggleLine(depth)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.legendCheckbox}>
                                <View style={[
                                    styles.legendDot,
                                    {
                                        backgroundColor: DEPTH_COLORS[depth],
                                        opacity: visibleLines[depth] ? 1 : 0.3
                                    }
                                ]} />
                            </View>
                            <Text style={[
                                styles.legendText,
                                { color: visibleLines[depth] ? COLORS.textPrimary : COLORS.textSecondary }
                            ]}>
                                {depth}cm
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.inputBorder,
    },
    backButton: { padding: 4 },
    headerTitle: {
        color: COLORS.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    chartHeader: {
        marginBottom: 16,
    },
    chartTitle: {
        color: COLORS.textPrimary,
        fontSize: 18,
        fontWeight: '600',
    },
    chartSubtitle: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    toggleContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 12,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.primaryDark,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    toggleBtnActive: {
        backgroundColor: COLORS.primaryDark,
    },
    toggleText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    toggleTextActive: {
        color: COLORS.textPrimary,
    },
    // --- ESTILO EXATO DA CAIXA DO GRÁFICO (Web: Box bg=surface, border=rgba, borderRadius=xl)
    chartBox: {
        backgroundColor: COLORS.surface,
        borderColor: COLORS.inputBorder,
        borderWidth: 1,
        borderRadius: 16,
        padding: 8,
        paddingTop: 16,
        position: 'relative',
        overflow: 'hidden',
    },
    // --- ESTILO EXATO DO TOOLTIP FLUTUANTE (Web: bg=rgba, borderRight, etc)
    tooltipContainer: {
        position: 'absolute',
        top: 8,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
        minHeight: 36, // Evita salto na interface
    },
    tooltipInner: {
        backgroundColor: COLORS.tooltipBg,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '90%',
    },
    tooltipTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRightWidth: 1,
        borderColor: COLORS.inputBorder,
        paddingRight: 10,
        marginRight: 10,
        gap: 6,
    },
    tooltipTimeText: {
        color: COLORS.textPrimary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    tooltipValuesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
    },
    tooltipItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tooltipDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    tooltipLabel: {
        color: COLORS.textSecondary,
        fontSize: 10,
    },
    tooltipValue: {
        color: COLORS.textPrimary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    // --- LEGENDAS ---
    legendContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginTop: 20,
        justifyContent: 'center',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendCheckbox: {
        width: 14,
        height: 14,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        justifyContent: 'center',
        alignItems: 'center',
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 12,
        fontWeight: '500',
    },
    emptyBox: {
        height: 260,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    }
});