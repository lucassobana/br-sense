import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { TimeFilter } from '../ChartControls/TimeFilter';
import { DepthLegend, DEPTH_COLORS } from '../ChartControls/DepthLegend';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');

interface Reading {
    timestamp: string;
    depth_cm: number;
    moisture_pct: number;
}

interface SoilMoistureChartProps {
    data: Reading[];
    configMin?: number;
    configMax?: number;
    title?: string;
    suffix?: string;
}

export function SoilMoistureChart({
    data,
    configMin = 45,
    configMax = 55,
    title = "Umidade do Solo (%)",
    suffix }
    : SoilMoistureChartProps) {
    const [selectedRange, setSelectedRange] = useState<'24h' | '7d' | '15d' | '30d' | 'all'>('all');

    // Controle de quais linhas estão visíveis
    const [visibleDepths, setVisibleDepths] = useState<Record<number, boolean>>({
        10: true, 20: true, 30: true, 40: true, 50: true, 60: true
    });

    const toggleDepth = (depth: number) => {
        setVisibleDepths(prev => ({ ...prev, [depth]: !prev[depth] }));
    };

    // 1. Filtrar e formatar dados baseado no Range de Tempo
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const now = new Date().getTime();
        let timeLimit = 0;

        switch (selectedRange) {
            case '24h': timeLimit = now - 24 * 60 * 60 * 1000; break;
            case '7d': timeLimit = now - 7 * 24 * 60 * 60 * 1000; break;
            case '15d': timeLimit = now - 15 * 24 * 60 * 60 * 1000; break;
            case '30d': timeLimit = now - 30 * 24 * 60 * 60 * 1000; break;
            default: timeLimit = 0; // all
        }

        const filtered = data.filter(d => new Date(d.timestamp).getTime() >= timeLimit);

        // Agrupar por profundidade para o GiftedCharts (ele espera um array de pontos para cada linha)
        const linesData: any[] = [];
        [10, 20, 30, 40, 50, 60].forEach(depth => {
            if (visibleDepths[depth]) {
                const depthData = filtered
                    .filter(d => d.depth_cm === depth && d.moisture_pct != null)
                    .map(d => ({
                        value: Number(d.moisture_pct),
                        label: new Date(d.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                        dataPointText: `${d.moisture_pct}%`,
                    }));

                if (depthData.length > 0) {
                    linesData.push({
                        data: depthData,
                        color: DEPTH_COLORS[depth],
                        thickness: 2,
                        dataPointsColor: DEPTH_COLORS[depth],
                    });
                }
            }
        });

        return linesData;
    }, [data, selectedRange, visibleDepths]);

    return (
        <View style={styles.container}>
            <TimeFilter selectedRange={selectedRange} onSelectRange={setSelectedRange} />
            <DepthLegend visibleDepths={visibleDepths} onToggleDepth={toggleDepth} />

            <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>{title}</Text>

                {chartData.length > 0 ? (
                    <LineChart
                        data={chartData[0]?.data || []} // Linha Principal
                        data2={chartData[1]?.data}      // Múltiplas linhas dinâmicas
                        data3={chartData[2]?.data}
                        data4={chartData[3]?.data}
                        data5={chartData[4]?.data}

                        width={width - 80}
                        height={250}

                        // Estilo do Eixo
                        yAxisTextStyle={{ color: COLORS.textPlaceholder, fontSize: 10 }}
                        xAxisLabelTextStyle={{ color: COLORS.textPlaceholder, fontSize: 10, rotation: 45 }}
                        yAxisLabelSuffix={suffix}
                        yAxisColor={COLORS.inputBorder}
                        xAxisColor={COLORS.inputBorder}

                        // Animação (O scroll horizontal já é ativado automaticamente pelo tamanho dos dados)
                        isAnimated

                        // Zonas de Cores (Saturado, Ideal, Crítico)
                        showReferenceLine1
                        referenceLine1Position={configMax}
                        referenceLine1Config={{ color: COLORS.status.saturated, type: 'dashed' }}

                        showReferenceLine2
                        referenceLine2Position={configMin}
                        referenceLine2Config={{ color: COLORS.status.critical, type: 'dashed' }}

                        // Fundo
                        rulesColor={COLORS.inputBorder}
                        rulesType="dashed"
                        backgroundColor={COLORS.surface}
                    />
                ) : (
                    <Text style={styles.noDataText}>Sem dados para este período.</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
    },
    chartCard: {
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
    },
    chartTitle: {
        color: COLORS.textMain,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    noDataText: {
        color: COLORS.textPlaceholder,
        textAlign: 'center',
        paddingVertical: 40,
    }
});