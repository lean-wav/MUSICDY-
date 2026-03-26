import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { useAuthStore } from '@/src/store/useAuthStore';
import { apiClient } from '@/src/api/client';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
    const { initialUsername } = useLocalSearchParams();
    const [username, setUsername] = useState(typeof initialUsername === 'string' ? initialUsername : '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Toast State
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('error');
    const toastOpacity = useState(new Animated.Value(0))[0];

    const showToast = (message: string, type: 'success' | 'error') => {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
        Animated.timing(toastOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setTimeout(() => {
                Animated.timing(toastOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => setToastVisible(false));
            }, 3000);
        });
    };

    const { login } = useAuthStore();
    const router = useRouter();

    const handleLogin = async () => {
        if (!username || !password) {
            showToast("Contraseña o nombre incorrecto", "error");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                username: username.trim(),
                password: password,
            };

            const resToken = await apiClient.post('login/access-token', payload, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            const token = resToken.data.access_token;

            const resMe = await apiClient.get('users/me', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            await login(token, resMe.data);
            showToast("Inicio correcto", "success");
            
            // Allow time for the toast
            setTimeout(() => {
                router.replace('/(tabs)/feed' as any);
            }, 1000);


        } catch (error: any) {
            console.error(error);
            const status = error.response?.status;
            const detail = error.response?.data?.detail || '';
            let errorMsg = "Contraseña o nombre incorrecto";

            if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
                errorMsg = "Problema de conexión. Intentá en unos segundos.";
            } else if (status === 429) {
                errorMsg = "Demasiados intentos, esperá unos minutos.";
            } else if (detail.toLowerCase().includes('pending') || detail.toLowerCase().includes('verif')) {
                // Unverified account — redirect to OTP screen
                const usernameOrEmail = username.trim();
                // We need the email to redirect, try fetching it or just use the input if it looks like an email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const emailForOtp = emailRegex.test(usernameOrEmail) ? usernameOrEmail : '';
                if (emailForOtp) {
                    showToast("Tu cuenta no está verificada. Revisá tu email.", "error");
                    setTimeout(() => router.push({ pathname: '/(auth)/verify-otp', params: { email: emailForOtp } }), 1500);
                } else {
                    errorMsg = "Cuenta pendiente de verificación. Iniciá sesión con tu email para verificarla.";
                    showToast(errorMsg, "error");
                }
                setLoading(false);
                return;
            } else if (status === 400 || status === 401) {
                errorMsg = "Contraseña o nombre incorrecto";
            }

            showToast(errorMsg, "error");

        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1, backgroundColor: '#050505' }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {toastVisible && (
                <Animated.View style={[styles.toastContainer, { backgroundColor: toastType === 'success' ? '#06d6a0' : '#EF476F', opacity: toastOpacity }]}>
                    <Text style={styles.toastText}>{toastMessage}</Text>
                </Animated.View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>MUSICDY</Text>
                    <Text style={styles.subtitle}>Tu nueva casa musical</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Username o Email"
                            placeholderTextColor="#64748B"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Contraseña"
                            placeholderTextColor="#64748B"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity 
                            style={styles.eyeIcon} 
                            onPress={() => setShowPassword(!showPassword)}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        >
                            <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.buttonText}>Entrar</Text>
                        )}
                    </TouchableOpacity>

                    <Link href="/(auth)/register" asChild>
                        <TouchableOpacity style={styles.registerLink}>
                            <Text style={styles.registerText}>¿No tienes cuenta? <Text style={styles.registerTextBold}>Regístrate aquí</Text></Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 12,
        zIndex: 1000,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    toastText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'center',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    title: {
        fontSize: 52,
        fontWeight: '900',
        color: '#FFD700',
        textAlign: 'center',
        letterSpacing: -2,
        textShadowColor: 'rgba(255, 215, 0, 0.3)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 15,
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginTop: 4,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    form: {
        gap: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#121212',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#222',
        paddingHorizontal: 16,
        height: 60,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        height: '100%',
    },
    eyeIcon: {
        padding: 4,
    },
    button: {
        height: 60,
        backgroundColor: '#FFD700',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
        shadowOpacity: 0,
        elevation: 0,
    },
    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    registerLink: {
        alignItems: 'center',
        marginTop: 24,
        padding: 8,
    },
    registerText: {
        color: '#aaa',
        fontSize: 15,
    },
    registerTextBold: {
        color: '#FFD700',
        fontWeight: 'bold',
    },
});
