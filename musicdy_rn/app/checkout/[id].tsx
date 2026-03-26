import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, StyleSheet,
    Image, ActivityIndicator, Alert, Dimensions, SafeAreaView, Linking
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiClient } from '@/src/api/client';
import { AppConfig } from '@/src/api/config';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useQuery } from '@tanstack/react-query';

const { width } = Dimensions.get('window');

// Stitch Design Tokens (Consistent with Studio and Profile)
const GOLD = '#FFD700';
const NEON_YELLOW = '#CCFF00';
const BG_DARK = '#000000';
const SURFACE = '#0F0F0F';
const INPUT_BG = '#1A1A1A';
const SLATE_400 = '#94A3B8';
const BORDER_SUBTLE = 'rgba(255,255,255,0.05)';

export default function CheckoutScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuthStore();
    const [selectedLicense, setSelectedLicense] = useState<string>('basic');
    const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'mercadopago' | 'wallet'>('stripe');
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch beat details
    const { data: beat, isLoading, error } = useQuery({
        queryKey: ['checkout-beat', id],
        queryFn: async () => {
            const res = await apiClient.get(`/posts/${id}`);
            return res.data;
        }
    });

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={NEON_YELLOW} />
            </View>
        );
    }

    if (error || !beat) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={{ color: '#fff' }}>No se pudo cargar el beat.</Text>
            </View>
        );
    }

    const licenses = Array.isArray(beat.licencias) ? beat.licencias : [];
    const activeLicenseData = licenses.find((l: any) => l.id === selectedLicense) || licenses[0];

    const handleConfirmPurchase = async () => {
        setIsProcessing(true);
        try {
            // Here we determine provider based on paymentMethod
            const provider = paymentMethod;
            
            if (provider === 'wallet') {
                // TODO: Implement direct wallet purchase endpoint
                Alert.alert("Billetera", "Aún no integrado. Seleccione Stripe o Mercado Pago.");
                setIsProcessing(false);
                return;
            }

            const res = await apiClient.post(`/payments/checkout/${beat.id}?provider=${provider}&license=${selectedLicense}`);
            
            if (res.data.url) {
                if (res.data.url.startsWith('http')) {
                    Linking.openURL(res.data.url);
                } else {
                    router.push(res.data.url as any);
                }
            } else {
                Alert.alert("Éxito", "Compra realizada con éxito (Demo)");
                router.replace('/(tabs)');
            }
        } catch (err: any) {
            console.error("Checkout Error:", err);
            Alert.alert("Error de Pago", err.response?.data?.detail || "No se pudo procesar la transacción.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: 'RESUMEN DE COMPRA', headerShown: false }} />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>RESUMEN DE COMPRA</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Beat Summary Card */}
                <View style={styles.beatCard}>
                    <Image 
                        source={{ uri: AppConfig.getFullMediaUrl(beat.cover_url) }} 
                        style={styles.coverImage} 
                    />
                    <View style={styles.beatInfo}>
                        <Text style={styles.title}>{beat.titulo}</Text>
                        <Text style={styles.artist}>@{beat.artista}</Text>
                        <View style={styles.bpmKeyRow}>
                            <Text style={styles.tag}>{beat.bpm} BPM</Text>
                            <Text style={styles.tag}>{beat.escala || 'Scale Unknown'}</Text>
                        </View>
                    </View>
                </View>

                {/* License Picker */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SELECCIONAR LICENCIA</Text>
                    {licenses.length > 0 ? (
                        licenses.map((l: { id: string, price_usd: string, price_ars: string }) => (
                            <TouchableOpacity 
                                key={l.id} 
                                style={[styles.optionCard, selectedLicense === l.id && styles.optionCardActive]}
                                onPress={() => setSelectedLicense(l.id)}
                            >
                                <View style={styles.optionHeader}>
                                    <View style={[styles.radio, selectedLicense === l.id && styles.radioActive]}>
                                        {selectedLicense === l.id && <View style={styles.radioInner} />}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.optionName, selectedLicense === l.id && { color: NEON_YELLOW }]}>
                                            {l.id.toUpperCase()} (WAV/MP3)
                                        </Text>
                                        <Text style={styles.optionDesc}>
                                            {l.id === 'basic' ? 'Uso no lucrativo, WAV/MP3' : 
                                             l.id === 'premium' ? 'Uso comercial limitado, Stems' :
                                             'Uso ilimitado y contrato exclusivo'}
                                        </Text>
                                    </View>
                                    <View style={styles.priceCol}>
                                        <Text style={styles.priceUsd}>USD ${l.price_usd}</Text>
                                        <Text style={styles.priceArs}>ARS ${l.price_ars}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.optionCard}>
                            <Text style={styles.optionName}>Licencia Única</Text>
                            <Text style={styles.priceUsd}>${beat.precio || '29.99'}</Text>
                        </View>
                    )}
                </View>

                {/* Payment Method */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>MÉTODO DE PAGO</Text>
                    
                    <TouchableOpacity 
                        style={[styles.payMethod, paymentMethod === 'stripe' && styles.payMethodActive]}
                        onPress={() => setPaymentMethod('stripe')}
                    >
                        <Ionicons name="card-outline" size={24} color={paymentMethod === 'stripe' ? NEON_YELLOW : SLATE_400} />
                        <Text style={[styles.payMethodText, paymentMethod === 'stripe' && { color: '#fff' }]}>Tarjeta / Stripe (USD)</Text>
                        {paymentMethod === 'stripe' && <Ionicons name="checkmark-circle" size={20} color={NEON_YELLOW} />}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.payMethod, paymentMethod === 'mercadopago' && styles.payMethodActive]}
                        onPress={() => setPaymentMethod('mercadopago')}
                    >
                        <MaterialCommunityIcons name="wallet-outline" size={24} color={paymentMethod === 'mercadopago' ? NEON_YELLOW : SLATE_400} />
                        <Text style={[styles.payMethodText, paymentMethod === 'mercadopago' && { color: '#fff' }]}>Mercado Pago (ARS)</Text>
                        {paymentMethod === 'mercadopago' && <Ionicons name="checkmark-circle" size={20} color={NEON_YELLOW} />}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.payMethod, paymentMethod === 'wallet' && styles.payMethodActive]}
                        onPress={() => setPaymentMethod('wallet')}
                    >
                        <Ionicons name="cash-outline" size={24} color={paymentMethod === 'wallet' ? NEON_YELLOW : SLATE_400} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.payMethodText, paymentMethod === 'wallet' && { color: '#fff' }]}>Mi Billetera</Text>
                            <Text style={styles.walletBalance}>Balance: ${user?.wallet_balance?.toFixed(2) || '0.00'}</Text>
                        </View>
                        {paymentMethod === 'wallet' && <Ionicons name="checkmark-circle" size={20} color={NEON_YELLOW} />}
                    </TouchableOpacity>
                </View>

                {/* Order Summary */}
                <View style={[styles.section, styles.summarySection]}>
                    <View style={styles.sumRow}>
                        <Text style={styles.sumLabel}>Precio Base</Text>
                        <Text style={styles.sumValue}>
                            {paymentMethod === 'mercadopago' 
                                ? `ARS $${activeLicenseData?.price_ars || beat.precio_ars || '---'}` 
                                : `USD $${activeLicenseData?.price_usd || beat.precio || '29.99'}`}
                        </Text>
                    </View>
                    <View style={styles.sumRow}>
                        <Text style={styles.sumLabel}>Comisión Plataforma</Text>
                        <Text style={styles.sumValue}>$0.00</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.sumRow}>
                        <Text style={styles.totalLabel}>TOTAL</Text>
                        <Text style={styles.totalValue}>
                            {paymentMethod === 'mercadopago' 
                                ? `ARS $${activeLicenseData?.price_ars || beat.precio_ars || '---'}` 
                                : `USD $${activeLicenseData?.price_usd || beat.precio || '29.99'}`}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.confirmBtn, isProcessing && { opacity: 0.7 }]}
                    onPress={handleConfirmPurchase}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.confirmBtnText}>CONFIRMAR COMPRA</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG_DARK },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: BORDER_SUBTLE
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { color: GOLD, fontSize: 16, fontWeight: '900', letterSpacing: 1 },

    beatCard: {
        flexDirection: 'row', backgroundColor: SURFACE, borderRadius: 20, padding: 16,
        borderWidth: 1, borderColor: BORDER_SUBTLE, marginBottom: 24,
    },
    coverImage: { width: 80, height: 80, borderRadius: 12 },
    beatInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
    title: { color: '#fff', fontSize: 18, fontWeight: '900' },
    artist: { color: NEON_YELLOW, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    bpmKeyRow: { flexDirection: 'row', gap: 8 },
    tag: { color: SLATE_400, fontSize: 10, fontWeight: '800', backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },

    section: { marginBottom: 32 },
    sectionTitle: { color: SLATE_400, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 16 },

    optionCard: {
        backgroundColor: INPUT_BG, borderRadius: 16, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: BORDER_SUBTLE,
    },
    optionCardActive: { borderColor: NEON_YELLOW, backgroundColor: 'rgba(204, 255, 0, 0.05)' },
    optionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: SLATE_400, justifyContent: 'center', alignItems: 'center' },
    radioActive: { borderColor: NEON_YELLOW },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: NEON_YELLOW },
    optionName: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
    optionDesc: { color: SLATE_400, fontSize: 11, marginTop: 2 },
    priceCol: { alignItems: 'flex-end' },
    priceUsd: { color: '#fff', fontSize: 14, fontWeight: '900' },
    priceArs: { color: NEON_YELLOW, fontSize: 10, fontWeight: '700' },

    payMethod: {
        flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: INPUT_BG,
        padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER_SUBTLE
    },
    payMethodActive: { borderColor: NEON_YELLOW, backgroundColor: 'rgba(204, 255, 0, 0.02)' },
    payMethodText: { flex: 1, color: SLATE_400, fontSize: 14, fontWeight: '800' },
    walletBalance: { color: SLATE_400, fontSize: 10 },

    summarySection: { 
        backgroundColor: SURFACE, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: BORDER_SUBTLE
    },
    sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    sumLabel: { color: SLATE_400, fontSize: 12, fontWeight: '600' },
    sumValue: { color: '#fff', fontSize: 12, fontWeight: '800' },
    divider: { height: 1, backgroundColor: BORDER_SUBTLE, marginVertical: 12 },
    totalLabel: { color: '#fff', fontSize: 14, fontWeight: '900' },
    totalValue: { color: NEON_YELLOW, fontSize: 20, fontWeight: '900' },

    confirmBtn: {
        backgroundColor: NEON_YELLOW, paddingVertical: 20, borderRadius: 20, 
        alignItems: 'center', marginBottom: 40, shadowColor: NEON_YELLOW, shadowRadius: 20, shadowOpacity: 0.3
    },
    confirmBtnText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 1 }
});
