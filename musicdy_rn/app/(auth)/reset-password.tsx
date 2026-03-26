import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { apiClient } from '@/src/api/client';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';

export default function ResetPasswordScreen() {
    const { token: tokenParam } = useLocalSearchParams();
    const [token, setToken] = useState(typeof tokenParam === 'string' ? tokenParam : '');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (typeof tokenParam === 'string' && tokenParam) {
            setToken(tokenParam);
        }
    }, [tokenParam]);

    const handleReset = async () => {
        if (!token || !newPassword) {
            Alert.alert("Error", "Por favor ingresa el código y la nueva contraseña.");
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert("Error", "La contraseña debe tener al menos 8 caracteres.");
            return;
        }

        setLoading(true);
        try {
            await apiClient.post('login/reset-password', { 
                token: token.trim(),
                new_password: newPassword
            });
            Alert.alert(
                "¡Éxito!", 
                "Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión.",
                [{ text: "Entendido", onPress: () => router.push('/(auth)/login') }]
            );
        } catch (error: any) {
            Alert.alert(
                "Error",
                error.response?.data?.detail || "Código inválido o expirado."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>MUSICDY</Text>
            <Text style={styles.subtitle}>Restablecer contraseña</Text>

            <View style={styles.form}>
                <Text style={styles.instruction}>
                    Ingresa el código que recibiste por correo y tu nueva contraseña.
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Código de recuperación (Token)"
                    placeholderTextColor="#64748B"
                    value={token}
                    onChangeText={setToken}
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Nueva Contraseña"
                    placeholderTextColor="#64748B"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleReset}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.buttonText}>Actualizar Contraseña</Text>
                    )}
                </TouchableOpacity>

                <Link href="/(auth)/login" asChild>
                    <TouchableOpacity style={{ alignItems: 'center', marginTop: 24 }}>
                        <Text style={{ color: '#FFD700', fontSize: 14 }}>Volver al inicio de sesión</Text>
                    </TouchableOpacity>
                </Link>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        fontSize: 48,
        fontWeight: '900',
        color: '#FFD700',
        textAlign: 'center',
        letterSpacing: -2,
    },
    subtitle: {
        fontSize: 16,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 16,
        fontWeight: 'bold',
    },
    instruction: {
        color: '#aaa',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    form: {
        gap: 16,
    },
    input: {
        height: 56,
        backgroundColor: '#0F0F0F',
        borderRadius: 16,
        color: '#fff',
        paddingHorizontal: 16,
        fontSize: 16,
    },
    button: {
        height: 56,
        backgroundColor: '#FFD700',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
