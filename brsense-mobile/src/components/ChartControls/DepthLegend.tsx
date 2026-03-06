import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

interface DepthLegendProps {
    visibleDepths: Record<number, boolean>;
    onToggleDepth: (depth: number) => void;
}

// Cores baseadas no seu DEPTH_COLORS da web
export const DEPTH_COLORS: Record<number, string> = {
    10: "#ffffff",
    20: "#FDD835",
    30: "#40ff79",
    40: "#6498f8",
    50: "#522b0f",
    60: "#000000",
};

export function DepthLegend({ visibleDepths, onToggleDepth }: DepthLegendProps) {
    const depths = [10, 20, 30, 40, 50, 60];

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {depths.map((depth) => {
                    const isVisible = visibleDepths[depth];
                    return (
                        <TouchableOpacity
                            key={depth}
                            style={[styles.legendItem, !isVisible && styles.legendItemDisabled]}
                            onPress={() => onToggleDepth(depth)}
                        >
                            <View style={[styles.colorBox, { backgroundColor: DEPTH_COLORS[depth] }]} />
                            <Text style={[styles.text, !isVisible && styles.textDisabled]}>
                                {depth}cm
                            </Text>
                            {!isVisible && (
                                <Ionicons name="eye-off-outline" size={14} color={COLORS.textPlaceholder} style={{ marginLeft: 4 }} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    scrollContent: {
        paddingVertical: 4,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginRight: 8,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
    },
    legendItemDisabled: {
        opacity: 0.5,
    },
    colorBox: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 6,
    },
    text: {
        color: COLORS.textMain,
        fontSize: 12,
        fontWeight: 'bold',
    },
    textDisabled: {
        color: COLORS.textPlaceholder,
        textDecorationLine: 'line-through',
    }
});