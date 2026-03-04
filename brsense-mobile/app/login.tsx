// brsense-mobile/app/login.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform, 
    Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { loginKeycloak, parseJwt } from '../src/services/auth';
import logo from '../assets/images/BRSense_logo.png'; // Certifique-se de ter um logo.png na pasta assets


// Cores baseadas no seu tema Web
const COLORS = {
    background: '#0A0A0A',
    surface: '#111111',
    primary: '#003d7a',
    primaryHover: '#002a52',
    textMain: '#F5F5F5',
    textPlaceholder: '#9aabbc',
    inputBorder: '#2D2D2D'
};

export default function Login() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Atenção', 'Preencha todos os campos');
            return;
        }

        try {
            setIsLoading(true);

            // 1. Autentica no Keycloak
            const data = await loginKeycloak(email, password);

            // 2. Guarda os tokens de forma segura no telemóvel
            await SecureStore.setItemAsync('access_token', data.access_token);
            await SecureStore.setItemAsync('refresh_token', data.refresh_token);

            // 3. Extrai dados do utilizador
            interface KeycloakToken {
                name?: string;
                given_name?: string;
                preferred_username?: string;
            }

            // Usamos o 'as' para avisar o TypeScript que o payload tem esse formato
            const userPayload = parseJwt(data.access_token) as KeycloakToken | null;

            if (userPayload) {
                const nameToSave = userPayload.name || userPayload.given_name || userPayload.preferred_username || email;
                await SecureStore.setItemAsync('user_name', nameToSave);
            }

            // 4. Redireciona para o Dashboard (ecrã inicial)
            router.replace('/');

        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro no Login', error.message || 'Erro ao ligar ao servidor');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // KeyboardAvoidingView empurra o ecrã para cima quando o teclado do telemóvel abre
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.card}>

                {/* Logo Placeholder (Pode substituir pelo require da sua imagem depois) */}
                {/* <View style={styles.logoContainer}>
                    <Ionicons name="leaf" size={60} color={COLORS.primary} />
                    <Text style={styles.logoText}>BR Sense</Text>
                </View> */}
                <View style={styles.logoContainer}>
                    <Image source={logo} style={{ width: 100, height: 100 }} resizeMode="contain" />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Login</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Entre com o seu utilizador ou email"
                        placeholderTextColor={COLORS.textPlaceholder}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Senha</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Entre com a sua senha"
                            placeholderTextColor={COLORS.textPlaceholder}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Ionicons
                                name={showPassword ? "eye-off" : "eye"}
                                size={24}
                                color={COLORS.textPlaceholder}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Login</Text>
                    )}
                </TouchableOpacity>

                <Text style={styles.footerText}>
                    Powered by BR Sense - Tecnologia Agrícola.
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A2540', // Fundo azul escuro semelhante ao gradiente web
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: COLORS.surface,
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8, // Sombra para Android
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 32,
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 16,
        alignSelf: 'center',
        width: 140,
        height: 140,
        justifyContent: 'center'
    },
    logoText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginTop: 8
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: COLORS.textMain,
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        height: 56,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: 8,
        color: COLORS.textMain,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: 8,
        height: 56,
    },
    passwordInput: {
        flex: 1,
        color: COLORS.textMain,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    eyeIcon: {
        padding: 10,
        marginRight: 6,
    },
    button: {
        height: 56,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footerText: {
        color: COLORS.textPlaceholder,
        fontSize: 12,
        textAlign: 'center',
        marginTop: 24,
    }
});