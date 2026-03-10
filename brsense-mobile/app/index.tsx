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
    ScrollView,
    Animated,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { COLORS } from '../src/constants/colors';
import { getProbes } from '../src/services/api';
import { calculateRainStats, RainPeriod } from '../src/utils/rainUtils'; // <-- Função de cálculo pelas leituras da sonda

const { width, height } = Dimensions.get('window');

// Tipagem com rain_cm para o cálculo local
export interface RawReading {
    timestamp: string;
    depth_cm: number;
    moisture_pct?: number | null;
    battery_status?: number | null;
    rain_cm?: number | null;
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

// --- COMPONENTE AUXILIAR: Filtros no Mapa ---
const MapFilterControls = ({
    showRain,
    selectedDepth,
    onSelectDepth,
    rainPeriod,
    onSelectRainPeriod
}: {
    showRain: boolean;
    selectedDepth: number;
    onSelectDepth: (depth: number) => void;
    rainPeriod: RainPeriod;
    onSelectRainPeriod: (period: RainPeriod) => void;
}) => {
    const DEPTHS = [10, 20, 30, 40, 50, 60];
    const RAIN_PERIODS: { label: string, value: RainPeriod }[] = [
        { label: '1h', value: '1h' },
        { label: '24h', value: '24h' },
        { label: '7d', value: '7d' },
        { label: '15d', value: '15d' },
        { label: '30d', value: '30d' },
    ];

    return (
        <View style={styles.filtersContainer}>
            {/* Profundidades (Sempre Visíveis) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
                {DEPTHS.map(depth => (
                    <TouchableOpacity
                        key={depth}
                        style={[styles.filterBadge, selectedDepth === depth && styles.filterBadgeActive]}
                        onPress={() => onSelectDepth(depth)}
                    >
                        <Text style={[styles.filterText, selectedDepth === depth && styles.filterTextActive]}>
                            {depth}cm
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Filtros de Chuva (Aparecem embaixo das profundidades) */}
            {showRain && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filtersScroll, { marginTop: 8 }]}>
                    {RAIN_PERIODS.map(period => (
                        <TouchableOpacity
                            key={period.value}
                            style={[styles.filterBadge, rainPeriod === period.value && styles.filterBadgeActive]}
                            onPress={() => onSelectRainPeriod(period.value)}
                        >
                            <Ionicons name="water" size={12} color={rainPeriod === period.value ? COLORS.textMain : COLORS.textPlaceholder} style={{ marginRight: 4 }} />
                            <Text style={[styles.filterText, rainPeriod === period.value && styles.filterTextActive]}>
                                {period.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );
};

export default function Dashboard() {
    const router = useRouter();
    const mapRef = useRef<MapView>(null);

    const [userName, setUserName] = useState<string>('');
    const [rawProbes, setRawProbes] = useState<RawProbe[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

    // Estados dos Filtros
    const [selectedDepth, setSelectedDepth] = useState<number>(20);
    const [showRain, setShowRain] = useState<boolean>(false);
    const [rainPeriod, setRainPeriod] = useState<RainPeriod>('24h');

    // Estados para Animação
    const [selectedProbe, setSelectedProbe] = useState<RawProbe | null>(null);
    const slideAnim = useRef(new Animated.Value(height)).current;

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const name = await SecureStore.getItemAsync('user_name');
            setUserName(name || 'Usuário');

            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                let location = await Location.getCurrentPositionAsync({});
                setUserLocation(location);
            }

            const data = await getProbes();
            setRawProbes(data);

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
        } finally {
            setLoading(false);
        }
    };

    const probes = useMemo(() => {
        return rawProbes.map(probe => {
            const min = probe.config_moisture_min ?? 45;
            const max = probe.config_moisture_max ?? 55;
            let currentStatus: 'ok' | 'critical' | 'attention' | 'saturated' | 'offline' = 'offline';

            const readings = probe.readings || [];

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

            const batteryReading = [...readings]
                .filter(r => r.battery_status !== null && r.battery_status !== undefined)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            // <-- Cálculo da chuva utilizando os dados locais da sonda (readings) -->
            const rainStats = calculateRainStats(readings);

            return {
                id: String(probe.id),
                name: probe.name || `Sonda ${probe.esn}`,
                esn: probe.esn,
                batteryLevel: batteryReading?.battery_status ?? null,
                status: currentStatus,
                lat: probe.latitude ? Number(probe.latitude) : -15.793889,
                lng: probe.longitude ? Number(probe.longitude) : -47.882778,
                rainStats // <- Injeta as estatísticas calculadas pelas readings
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
            case 'attention': return '#f6ad55';
            default: return COLORS.status.offline;
        }
    };

    const openProbeDetails = (probeId: string) => {
        const raw = rawProbes.find(p => String(p.id) === probeId);
        if (raw) {
            setSelectedProbe(raw);

            if (raw.latitude && raw.longitude && mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: Number(raw.latitude) - 0.002,
                    longitude: Number(raw.longitude),
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                }, 800);
            }

            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                friction: 8,
                tension: 40,
            }).start();
        }
    };

    const closeProbeDetails = () => {
        Animated.spring(slideAnim, {
            toValue: height,
            useNativeDriver: true,
            friction: 8,
        }).start(() => setSelectedProbe(null));
    };

    const selectedProbeProfile = useMemo(() => {
        if (!selectedProbe || !selectedProbe.readings) return [];
        const uniqueDepths = new Map<number, RawReading>();
        const sorted = [...selectedProbe.readings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        sorted.forEach(reading => {
            if (reading.moisture_pct !== null && !uniqueDepths.has(reading.depth_cm)) {
                uniqueDepths.set(reading.depth_cm, reading);
            }
        });

        return Array.from(uniqueDepths.values()).sort((a, b) => a.depth_cm - b.depth_cm);
    }, [selectedProbe]);

    const getProgressColor = (value: number, min: number = 45, max: number = 55) => {
        if (value < min) return COLORS.status.critical;
        if (value > max) return COLORS.status.saturated;
        return COLORS.status.ok;
    };

    const renderProbeCard = ({ item }: { item: typeof probes[0] }) => {
        const batteryPct = item.batteryLevel !== null ? Math.round((item.batteryLevel / 7) * 100) : null;
        const isBatteryLow = batteryPct !== null && batteryPct < 30;

        return (
            <TouchableOpacity
                style={styles.probeCard}
                // --- ALTERAÇÃO AQUI ---
                // Navega direto para a tela do gráfico em vez de abrir o painel (Bottom Sheet)
                onPress={() => {
                    router.push({
                        pathname: '/probe/[id]',
                        params: { id: item.id, esn: item.esn, name: item.name }
                    });
                }}
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
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Olá,</Text>
                    <Text style={styles.userName}>{userName}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={24} color={COLORS.textMain} />
                </TouchableOpacity>
            </View>

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
                            onPress={() => openProbeDetails(probe.id)}
                        >
                            <View style={styles.markerWrapper}>
                                {showRain && (
                                    <View style={styles.rainBadgeWrapper}>
                                        <View style={styles.rainBadge}>
                                            <Text style={styles.rainBadgeText}>
                                                {probe.rainStats[rainPeriod].toFixed(1)} mm
                                            </Text>
                                        </View>
                                        <View style={styles.rainBadgeTriangle} />
                                    </View>
                                )}
                                <View style={[styles.markerBody, { borderColor: getStatusColor(probe.status) }]}>
                                    <MaterialCommunityIcons name="access-point" size={14} color={getStatusColor(probe.status)} />
                                </View>
                            </View>
                        </Marker>
                    ))}
                </MapView>

                {/* Filtros Livres no Topo */}
                <View style={styles.mapOverlay}>
                    <MapFilterControls
                        showRain={showRain}
                        selectedDepth={selectedDepth}
                        onSelectDepth={setSelectedDepth}
                        rainPeriod={rainPeriod}
                        onSelectRainPeriod={setRainPeriod}
                    />
                </View>

                {/* Botões Flutuantes no Canto Inferior Direito */}
                <View style={styles.actionButtonsCol}>
                    <TouchableOpacity
                        style={[styles.actionBtn, showRain && styles.actionBtnActive]}
                        onPress={() => setShowRain(!showRain)}
                    >
                        <Ionicons
                            name="water"
                            size={20}
                            color={showRain ? COLORS.textMain : COLORS.textPlaceholder}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={centerMapOnUser}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={20} color={COLORS.textPlaceholder} />
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

            <Animated.View style={[styles.detailsPanel, { transform: [{ translateY: slideAnim }] }]}>
                {selectedProbe && (
                    <View style={styles.detailsContent}>
                        <View style={styles.detailsHeader}>
                            <View>
                                <Text style={styles.detailsTitle}>{selectedProbe.name || `Sonda ${selectedProbe.esn}`}</Text>
                                <Text style={styles.detailsEsn}>ESN: {selectedProbe.esn}</Text>
                            </View>
                            <TouchableOpacity onPress={closeProbeDetails} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={COLORS.textMain} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.profileTitle}>Perfil de Umidade</Text>

                        {selectedProbeProfile.length > 0 ? (
                            <ScrollView style={styles.profileScroll} showsVerticalScrollIndicator={false}>
                                {selectedProbeProfile.map((reading) => {
                                    const moisture = reading.moisture_pct || 0;
                                    const min = selectedProbe.config_moisture_min ?? 45;
                                    const max = selectedProbe.config_moisture_max ?? 55;
                                    const barColor = getProgressColor(moisture, min, max);

                                    return (
                                        <View key={reading.depth_cm} style={styles.profileRow}>
                                            <Text style={styles.depthLabel}>{reading.depth_cm}cm</Text>
                                            <View style={styles.progressBarContainer}>
                                                <View
                                                    style={[
                                                        styles.progressBarFill,
                                                        { width: `${Math.min(moisture, 100)}%`, backgroundColor: barColor }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.moistureValue}>{moisture.toFixed(1)}%</Text>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        ) : (
                            <View style={styles.noDataContainer}>
                                <Text style={styles.noDataText}>Sem leituras recentes.</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.fullDetailsBtn}
                            onPress={() => {
                                closeProbeDetails();
                                router.push({
                                    pathname: '/probe/[id]',
                                    params: { id: selectedProbe.id, esn: selectedProbe.esn, name: selectedProbe.name }
                                });
                            }}
                        >
                            <Text style={styles.fullDetailsBtnText}>VER GRÁFICO COMPLETO</Text>
                            <Ionicons name="chevron-forward" size={18} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                )}
            </Animated.View>
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
        height: height * 0.60,
        position: 'relative',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },

    // FILTROS NO TOPO (MÚLTIPLAS LINHAS)
    mapOverlay: {
        position: 'absolute',
        top: 16,
        left: 0,
        right: 0,
        flexDirection: 'column',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
    },
    filtersContainer: {
        width: '100%',
    },
    filtersScroll: {
        alignItems: 'center',
    },
    filterBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(17, 17, 17, 0.85)',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    filterBadgeActive: {
        backgroundColor: '#3182CE',
        borderColor: '#2B6CB0',
    },
    filterText: {
        color: COLORS.textPlaceholder,
        fontWeight: 'bold',
        fontSize: 12,
    },
    filterTextActive: {
        color: COLORS.textMain,
    },

    // BOTÕES NO CANTO INFERIOR DIREITO
    actionButtonsCol: {
        position: 'absolute',
        bottom: 24,
        right: 16,
        flexDirection: 'column',
        gap: 12,
        alignItems: 'center',
        zIndex: 10,
    },
    actionBtn: {
        backgroundColor: 'rgba(17, 17, 17, 0.85)',
        padding: 12,
        borderRadius: 50,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    actionBtnActive: {
        backgroundColor: '#3182CE',
        borderColor: '#2B6CB0',
    },

    // MARCADOR E BADGE DE CHUVA
    markerWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
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
        marginTop: 2,
    },
    rainBadgeWrapper: {
        alignItems: 'center',
        marginBottom: 2,
    },
    rainBadge: {
        backgroundColor: '#3182CE',
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.4,
        shadowRadius: 2,
        elevation: 3,
    },
    rainBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    rainBadgeTriangle: {
        width: 0,
        height: 0,
        borderLeftWidth: 4,
        borderRightWidth: 4,
        borderTopWidth: 4,
        borderStyle: 'solid',
        backgroundColor: 'transparent',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#3182CE',
        marginTop: -1,
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
    },
    detailsPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
        borderTopWidth: 1,
        borderColor: COLORS.inputBorder,
        maxHeight: height * 0.5,
        zIndex: 100,
    },
    detailsContent: {
        flexDirection: 'column',
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailsTitle: {
        color: COLORS.textMain,
        fontSize: 20,
        fontWeight: 'bold',
    },
    detailsEsn: {
        color: COLORS.textPlaceholder,
        fontSize: 14,
        marginTop: 2,
    },
    closeBtn: {
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
    },
    profileTitle: {
        color: COLORS.textMain,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    profileScroll: {
        maxHeight: 200,
        marginBottom: 16,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 10,
        borderRadius: 8,
    },
    depthLabel: {
        color: COLORS.textPlaceholder,
        fontSize: 14,
        width: 45,
        fontWeight: 'bold',
    },
    progressBarContainer: {
        flex: 1,
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 4,
        marginHorizontal: 12,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    moistureValue: {
        color: COLORS.textMain,
        fontSize: 14,
        width: 45,
        textAlign: 'right',
        fontWeight: '600',
    },
    noDataContainer: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    noDataText: {
        color: COLORS.textPlaceholder,
        fontSize: 14,
    },
    fullDetailsBtn: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    fullDetailsBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
        marginRight: 8,
    }
});