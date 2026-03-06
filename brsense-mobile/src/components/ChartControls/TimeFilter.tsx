import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../../constants/colors';

type TimeRange = '24h' | '7d' | '15d' | '30d' | 'all';

interface TimeFilterProps {
    selectedRange: TimeRange;
    onSelectRange: (range: TimeRange) => void;
}

export function TimeFilter({ selectedRange, onSelectRange }: TimeFilterProps) {
    const ranges: { label: string; value: TimeRange }[] = [
        { label: '24h', value: '24h' },
        { label: '7 Dias', value: '7d' },
        { label: '15 Dias', value: '15d' },
        { label: '30 Dias', value: '30d' },
        { label: 'Tudo', value: 'all' },
    ];

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {ranges.map((range) => (
                    <TouchableOpacity
                        key={range.value}
                        style={[
                            styles.button,
                            selectedRange === range.value && styles.buttonActive
                        ]}
                        onPress={() => onSelectRange(range.value)}
                    >
                        <Text style={[
                            styles.text,
                            selectedRange === range.value && styles.textActive
                        ]}>
                            {range.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    button: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        marginRight: 8,
    },
    buttonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primaryHover,
    },
    text: {
        color: COLORS.textPlaceholder,
        fontSize: 14,
        fontWeight: '600',
    },
    textActive: {
        color: '#FFF',
    }
});