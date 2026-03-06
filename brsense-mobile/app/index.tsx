// brsense-mobile/app/index.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    Dimensions,
    Platform,
    ScrollView
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { COLORS } from '../src/constants/colors';
import { getProbes } from '../src/services/api';

const { width, height } = Dimensions.get('window');

// Tipagem refletindo o retorno real da API
interface RawReading {
    timestamp: string;
    depth_cm: number;
    moisture_pct?: number | null;
    battery_status?: number | null;
}

interface RawProbe {
    id: number;
    name?: string;
    esn: string;
    latitude?: number | null;
    longitude?: number | null;
    config_moisture_min?: number;
    config_moisture_max?: number;
    readings?: RawReading[];
}

export default function Dashboard() {
    const router = useRouter();
    const mapRef = useRef<MapView>(null);

    const [userName, setUserName] = useState<string>('');
    const [rawProbes, setRawProbes] = useState<RawProbe[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDepth, setSelectedDepth] = useState<number>(20); // Web usa 20 como padrão
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

    const DEPTHS = [10, 20, 30, 40, 50, 60];

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const name = await SecureStore.getItemAsync('user_name');
            setUserName(name || 'Usuário');

            // 1. Solicita permissão de localização do celular
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                let location = await Location.getCurrentPositionAsync({});
                setUserLocation(location);
            }

            // 2. Busca dados REAIS da API
            const data = await getProbes();
            setRawProbes(data);

            // 3. Centraliza o mapa na primeira sonda com coordenadas válidas
            const firstValid = data.find(p => p.latitude !== null && p.longitude !== null);
            if (firstValid && mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: Number(firstValid.latitude),
                    longitude: Number(firstValid.longitude),
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }, 1000);
            }
        } catch (error) {
            console.error('Erro ao carregar sondas:', error);
            // Dependendo de como você lida com erros na API, pode exibir um Alert aqui
        } finally {
            setLoading(false);
        }
    };

    // Processa os dados brutos da API para o formato de exibição (recalcula ao trocar a profundidade)
    const probes = useMemo(() => {
        return rawProbes.map(probe => {
            const min = probe.config_moisture_min ?? 45;
            const max = probe.config_moisture_max ?? 55;
            let currentStatus: 'ok' | 'critical' | 'attention' | 'saturated' | 'offline' = 'offline';

            const readings = probe.readings || [];

            // LÓGICA DA WEB: Status de umidade com base na profundidade selecionada
            const validReading = [...readings]
                .filter(r => r.depth_cm === selectedDepth)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .find(r => r.moisture_pct !== null && r.moisture_pct !== undefined);

            if (validReading && validReading.moisture_pct !== null && validReading.moisture_pct !== undefined) {
                const val = Number(validReading.moisture_pct);
                if (val < min) {
                    currentStatus = 'critical';
                } else if (val > max) {
                    currentStatus = 'saturated';
                } else {
                    currentStatus = 'ok';
                }
            }

            // LÓGICA DA WEB: Pega a última leitura válida de bateria (independente da profundidade)
            const batteryReading = [...readings]
                .filter(r => r.battery_status !== null && r.battery_status !== undefined)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            const batteryLevel = batteryReading?.battery_status ?? null;

            return {
                id: String(probe.id),
                name: probe.name || `Sonda ${probe.esn}`,
                esn: probe.esn,
                batteryLevel, // Nível de 0 a 7
                status: currentStatus,
                lat: probe.latitude ? Number(probe.latitude) : -15.793889, // Default Brasília se não tiver
                lng: probe.longitude ? Number(probe.longitude) : -47.882778,
            };
        });
    }, [rawProbes, selectedDepth]);

    const handleLogout = async () => {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user_name');
        router.replace('/login');
    };

    const centerMapOnUser = () => {
        if (userLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'critical': return COLORS.status.critical;
            case 'ok': return COLORS.status.ok;
            case 'saturated': return COLORS.status.saturated;
            case 'attention': return '#f6ad55'; // Laranja/Atenção
            default: return COLORS.status.offline;
        }
    };

    const renderProbeCard = ({ item }: { item: typeof probes[0] }) => {
        // Converte o nível da bateria (0 a 7) para porcentagem para exibição amigável
        const batteryPct = item.batteryLevel !== null ? Math.round((item.batteryLevel / 7) * 100) : null;
        const isBatteryLow = batteryPct !== null && batteryPct < 30;

        return (
            <TouchableOpacity
                style={styles.probeCard}
                onPress={() => router.push({
                    pathname: '/probe/[id]',
                    params: { id: item.id, esn: item.esn, name: item.name }
                })}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                </View>
                <Text style={styles.cardEsn}>ESN: {item.esn}</Text>

                <View style={styles.cardFooter}>
                    <Ionicons
                        name={isBatteryLow ? "battery-dead" : "battery-full"}
                        size={16}
                        color={batteryPct === null ? COLORS.status.offline : isBatteryLow ? COLORS.status.critical : COLORS.status.ok}
                    />
                    <Text style={[styles.batteryText, batteryPct === null && { color: COLORS.status.offline }]}>
                        {batteryPct !== null ? `${batteryPct}%` : 'S/ Dados'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
        <View>
            {/* Topbar */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Olá,</Text>
                    <Text style={styles.userName}>{userName}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={24} color={COLORS.textMain} />
                </TouchableOpacity>
            </View>

            {/* Mapa de Satélite */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    mapType="hybrid"
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                >
                    {probes.map(probe => (
                        <Marker
                            key={probe.id}
                            coordinate={{ latitude: probe.lat, longitude: probe.lng }}
                            title={probe.name}
                            description={`Status: ${probe.status} | Profundidade: ${selectedDepth}cm`}
                        >
                            <View style={[styles.markerBody, { borderColor: getStatusColor(probe.status) }]}>
                                <Ionicons name="leaf" size={14} color={getStatusColor(probe.status)} />
                            </View>
                        </Marker>
                    ))}
                </MapView>

                {/* Controles Flutuantes do Mapa */}
                <View style={styles.mapOverlay}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.depthScroll}>
                        {DEPTHS.map(depth => (
                            <TouchableOpacity
                                key={depth}
                                style={[styles.depthBadge, selectedDepth === depth && styles.depthBadgeActive]}
                                onPress={() => setSelectedDepth(depth)}
                            >
                                <Text style={[styles.depthText, selectedDepth === depth && styles.depthTextActive]}>
                                    {depth}cm
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={styles.locationBtn} onPress={centerMapOnUser}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={24} color={COLORS.textMain} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>Minhas Sondas</Text>
                <Text style={styles.itemCount}>{probes.length} equipamentos</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Sincronizando dados...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={probes}
                keyExtractor={(item) => item.id}
                numColumns={2}
                renderItem={renderProbeCard}
                ListHeaderComponent={renderHeader}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundGradientStart,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: COLORS.backgroundGradientStart,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: COLORS.textPlaceholder,
        marginTop: 12,
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
    },
    greeting: {
        color: COLORS.textPlaceholder,
        fontSize: 14,
    },
    userName: {
        color: COLORS.textMain,
        fontSize: 20,
        fontWeight: 'bold',
    },
    logoutBtn: {
        padding: 8,
        backgroundColor: COLORS.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
    },
    mapContainer: {
        width: '100%',
        height: height * 0.45,
        position: 'relative',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    markerBody: {
        backgroundColor: COLORS.surface,
        padding: 6,
        borderRadius: 20,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
        elevation: 5,
    },
    mapOverlay: {
        position: 'absolute',
        top: 16,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
    },
    depthScroll: {
        flexGrow: 0,
    },
    depthBadge: {
        backgroundColor: 'rgba(17, 17, 17, 0.8)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
    },
    depthBadgeActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primaryHover,
    },
    depthText: {
        color: COLORS.textPlaceholder,
        fontWeight: 'bold',
        fontSize: 12,
    },
    depthTextActive: {
        color: COLORS.textMain,
    },
    locationBtn: {
        backgroundColor: 'rgba(17, 17, 17, 0.8)',
        padding: 10,
        borderRadius: 50,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        marginLeft: 8,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 16,
    },
    sectionTitle: {
        color: COLORS.textMain,
        fontSize: 18,
        fontWeight: 'bold',
    },
    itemCount: {
        color: COLORS.textPlaceholder,
        fontSize: 14,
    },
    listContent: {
        paddingBottom: 40,
    },
    row: {
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    probeCard: {
        backgroundColor: COLORS.surface,
        width: (width - 48) / 2,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        color: COLORS.textMain,
        fontWeight: 'bold',
        fontSize: 14,
        flex: 1,
        marginRight: 8,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    cardEsn: {
        color: COLORS.textPlaceholder,
        fontSize: 12,
        marginBottom: 16,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    batteryText: {
        color: COLORS.textMain,
        fontSize: 12,
        marginLeft: 6,
        fontWeight: '500',
    }
});