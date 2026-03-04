// brsense-mobile/app/index.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getProbes, getFarms } from '../src/services/api';
import type { Probe, Farm } from '../src/types';
import { COLORS } from '../src/constants/colors';

export default function Dashboard() {
    const router = useRouter();
    const [userName, setUserName] = useState<string>('Fazendeiro');
    const [probes, setProbes] = useState<Probe[]>([]);
    const [farms, setFarms] = useState<Farm[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const token = await SecureStore.getItemAsync('access_token');
                if (!token) {
                    router.replace('/login');
                    return;
                }

                const name = await SecureStore.getItemAsync('user_name');
                if (name) setUserName(name);

                // Vai buscar os dados protegidos à API!
                const [fetchedProbes, fetchedFarms] = await Promise.all([
                    getProbes(),
                    getFarms()
                ]);

                setProbes(fetchedProbes);
                setFarms(fetchedFarms);

            } catch (error) {
                console.error("Erro ao carregar dados:", error);
                Alert.alert("Erro", "Não foi possível carregar as sondas.");
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, [router]);

    const handleLogout = async () => {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        router.replace('/login');
    };

    const getFarmName = (farmId?: number) => {
        const farm = farms.find(f => f.id === farmId);
        return farm ? farm.name : 'Desconhecida';
    };

    // Este é o "Card" que será renderizado para cada Sonda na lista
    const renderProbeCard = ({ item }: { item: Probe }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({
                pathname: '/probe/[id]',
                params: { id: item.id, esn: item.esn, name: item.name || '' }
            })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                    <Ionicons name="hardware-chip-outline" size={24} color={COLORS.primary} />
                    <Text style={styles.cardTitle}>{item.name || item.esn}</Text>
                </View>
                {/* Futuramente podemos colocar o Status real (Ideal, Crítico) aqui */}
                <View style={[styles.statusBadge, { backgroundColor: COLORS.status.ok }]}>
                    <Text style={styles.statusText}>Online</Text>
                </View>
            </View>

            <View style={styles.cardBody}>
                <Text style={styles.cardInfo}>
                    <Text style={styles.bold}>ESN: </Text>{item.esn}
                </Text>
                <Text style={styles.cardInfo}>
                    <Text style={styles.bold}>Fazenda: </Text>{getFarmName(item.farm_id)}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ color: COLORS.textPlaceholder, marginTop: 10 }}>A carregar telemetria...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Cabeçalho */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Olá, {userName}</Text>
                    <Text style={styles.subtitle}>Suas Sondas</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Ionicons name="log-out-outline" size={24} color={COLORS.status.critical} />
                </TouchableOpacity>
            </View>

            {/* Lista de Sondas */}
            {probes.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="leaf-outline" size={60} color={COLORS.inputBorder} />
                    <Text style={styles.emptyText}>Nenhuma sonda encontrada.</Text>
                </View>
            ) : (
                <FlatList
                    data={probes}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderProbeCard}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centerContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60, // Dá espaço para a barra de status do telemóvel (bateria, hora)
        paddingBottom: 20,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.inputBorder,
    },
    greeting: {
        color: COLORS.textPlaceholder,
        fontSize: 14,
    },
    subtitle: {
        color: COLORS.textMain,
        fontSize: 24,
        fontWeight: 'bold',
    },
    logoutButton: {
        padding: 8,
        backgroundColor: 'rgba(252, 129, 129, 0.1)',
        borderRadius: 8,
    },
    listContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8, // Espaço entre o ícone e o texto
    },
    cardTitle: {
        color: COLORS.textMain,
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: COLORS.surface,
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardBody: {
        marginTop: 4,
    },
    cardInfo: {
        color: COLORS.textPlaceholder,
        fontSize: 14,
        marginBottom: 4,
    },
    bold: {
        fontWeight: 'bold',
        color: COLORS.textMain,
    },
    emptyText: {
        color: COLORS.textPlaceholder,
        marginTop: 16,
        fontSize: 16,
    }
});