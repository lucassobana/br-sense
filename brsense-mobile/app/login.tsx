import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform, 
    Image,
    Pressable
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { loginKeycloak, parseJwt } from '../src/services/auth';
import logo from '../assets/images/BRSense_logo.png';

// Cores baseadas no tema Web (colors.ts e Login.tsx)
const COLORS = {
    backgroundDark: '#0A0A0A',
    cardBg: '#0A2540', // Equivalente ao COLORS.background da web
    primary: '#003d7a',
    primaryPressed: '#001a33', // Equivalente ao _active da web
    inputBorder: '#2D2D2D',
    textMain: '#F5F5F5',
    textPlaceholder: '#9aabbc',
    surface: '#111111'
};

export default function Login() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Estados para simular o hover/focus dos inputs
    const [emailFocus, setEmailFocus] = useState(false);
    const [passwordFocus, setPasswordFocus] = useState(false);

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

            const userPayload = parseJwt(data.access_token) as KeycloakToken | null;

            if (userPayload) {
                const nameToSave = userPayload.name || userPayload.given_name || userPayload.preferred_username || email;
                await SecureStore.setItemAsync('user_name', nameToSave);
            }

            // 4. Redireciona para o Dashboard
            router.replace('/');

        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro no Login', error.message || 'Erro ao conectar com o servidor');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <LinearGradient
                colors={['#0A2540', '#0A0A0A']}
                start={{ x: 0.5, y: 0.2 }}
                end={{ x: 0.5, y: 0.8 }}
                style={styles.container}
            >
                <View style={styles.card}>
                    
                    {/* Logo exatamente como na web: 200x200 fundo branco */}
                    <View style={styles.logoContainer}>
                        <Image source={logo} style={styles.logoImage} resizeMode="contain" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Login</Text>
                        <TextInput
                            style={[
                                styles.input, 
                                emailFocus && styles.inputFocused
                            ]}
                            placeholder="Entre com seu usuário ou email"
                            placeholderTextColor={COLORS.textPlaceholder}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            onFocus={() => setEmailFocus(true)}
                            onBlur={() => setEmailFocus(false)}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Senha</Text>
                        <View style={[
                            styles.passwordContainer,
                            passwordFocus && styles.inputFocused
                        ]}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Entre com sua senha"
                                placeholderTextColor={COLORS.textPlaceholder}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                onFocus={() => setPasswordFocus(true)}
                                onBlur={() => setPasswordFocus(false)}
                            />
                            <Pressable
                                style={styles.eyeIcon}
                                onPress={() => setShowPassword(!showPassword)}
                                hitSlop={10}
                            >
                                <Ionicons
                                    name={showPassword ? "eye-off" : "eye"}
                                    size={24}
                                    color={COLORS.textPlaceholder}
                                />
                            </Pressable>
                        </View>
                    </View>

                    <Pressable
                        style={({ pressed }) => [
                            styles.button,
                            pressed && styles.buttonPressed,
                            isLoading && styles.buttonDisabled
                        ]}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Login</Text>
                        )}
                    </Pressable>

                    <Text style={styles.footerText}>
                        Powered by BR Sense - Tecnologia Agrícola.
                    </Text>
                </View>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 16,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        padding: 32,
        borderRadius: 16, // Equivalente a 2xl
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
        width: '100%',
        maxWidth: 500, // Para ficar contido em tablets/telas grandes
        alignSelf: 'center'
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderRadius: 16, // 2xl
        width: 200,
        height: 200,
        alignSelf: 'center',
        marginBottom: 24, // mb={6}
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    logoImage: {
        width: 190,
        height: 190,
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
        backgroundColor: COLORS.backgroundDark,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: 8,
        color: COLORS.textMain,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    inputFocused: {
        borderColor: COLORS.primary,
        // No React Native não temos box-shadow nativo igual ao CSS para bordas brilhantes,
        // mas mudar a cor da borda já traz a fidelidade visual esperada.
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundDark,
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
        height: '100%',
    },
    eyeIcon: {
        padding: 10,
        marginRight: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    button: {
        height: 48,
        backgroundColor: COLORS.primary,
        borderRadius: 8, // lg
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    buttonPressed: {
        backgroundColor: COLORS.primaryPressed,
    },
    buttonDisabled: {
        opacity: 0.7,
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