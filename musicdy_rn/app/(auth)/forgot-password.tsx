import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { apiClient } from '@/src/api/client';
import { useRouter, Link } from 'expo-router';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRecover = async () => {
        if (!email) {
            Alert.alert("Error", "Por favor ingresa tu correo electrónico.");
            return;
        }

        setLoading(true);
        try {
            await apiClient.post('login/password-recovery', { email: email.trim().toLowerCase() });
            Alert.alert(
                "Correo enviado", 
                "Si el correo está registrado, recibirás un enlace y código de recuperación en unos minutos.",
                [{ text: "Ingresar código manual", onPress: () => router.push('/(auth)/reset-password') }]
            );
        } catch (error: any) {
            Alert.alert(
                "Error",
                error.response?.data?.detail || "Ocurrió un error al procesar tu solicitud."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>MUSICDY</Text>
            <Text style={styles.subtitle}>Recuperación de contraseña</Text>

            <View style={styles.form}>
                <Text style={styles.instruction}>
                    Ingresa el correo electrónico asociado a tu cuenta y te enviaremos instrucciones para restablecer tu contraseña.
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Correo Electrónico"
                    placeholderTextColor="#64748B"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleRecover}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.buttonText}>Enviar Enlace</Text>
                    )}
                </TouchableOpacity>

                <Link href="/(auth)/login" asChild>
                    <TouchableOpacity style={{ alignItems: 'center', marginTop: 16 }}>
                        <Text style={{ color: '#FFD700', fontSize: 14 }}>Volver al inicio de sesión</Text>
                    </TouchableOpacity>
                </Link>

                <Link href="/(auth)/reset-password" asChild>
                    <TouchableOpacity style={{ alignItems: 'center', marginTop: 16 }}>
                        <Text style={{ color: '#aaa', fontSize: 14 }}>¿Ya tienes un código? Ingresa aquí</Text>
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
