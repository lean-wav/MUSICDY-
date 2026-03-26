import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
    Dimensions, RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiClient } from '@/src/api/client';
import { useAuthStore } from '@/src/store/useAuthStore';

const { width } = Dimensions.get('window');

// Stitch billetera colors
const NEON_GREEN = '#39FF14';
const CARD_BG = '#161616';
const BORDER_SUBTLE = 'rgba(255,255,255,0.05)';

interface Transaction {
    id: number;
    titulo?: string;
    tipo: string;
    monto: number;
    fecha: string;
    estado: string;
    currency: string;
}

export default function WalletScreen() {
    const { user } = useAuthStore();
    const [activeSection, setActiveSection] = useState<'balance' | 'orders'>('balance');

    const { data: walletData, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['wallet'],
        queryFn: async () => {
            try {
                const res = await apiClient.get('/payments/wallet');
                return res.data;
            } catch {
                return { balance: 0, transactions: [] };
            }
        },
        enabled: !!user,
    });

    const { data: purchasedPosts = [], isLoading: isLoadingPurchased } = useQuery({
        queryKey: ['purchased-posts'],
        queryFn: async () => {
            const res = await apiClient.get('/posts/me/purchased');
            return res.data;
        },
        enabled: !!user && activeSection === 'orders',
    });

    const balance = walletData?.balance ?? 0;
    const transactions: Transaction[] = walletData?.transactions ?? [];
    const salesTrend = walletData?.sales_trend ?? [];

    const handleWithdraw = (method: string) => {
        const amountStr = balance.toLocaleString('en-US', { minimumFractionDigits: 2 });
        Alert.alert(
            "Solicitar Retiro",
            `¿Deseas retirar tu balance disponible de $${amountStr} por ${method}?`,
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Confirmar", 
                    onPress: async () => {
                        try {
                            const provider = method.toLowerCase().includes('mercado') ? 'mercadopago' : method.toLowerCase();
                            await apiClient.post('/payments/withdraw', null, {
                                params: { amount: balance, method: provider }
                            });
                            Alert.alert("Éxito", "Tu solicitud de retiro ha sido enviada.");
                            refetch();
                        } catch (err: any) {
                            Alert.alert("Error", err.response?.data?.detail || "No se pudo procesar el retiro");
                        }
                    }
                }
            ]
        );
    };

    const handleAddFunds = (method: string) => {
        Alert.alert(
            "Cargar Billetera",
            `Cargar saldo mediante ${method} estará disponible próximamente.`,
            [{ text: "OK" }]
        );
    };

    if (isLoading && !walletData) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={NEON_GREEN} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
                <View style={styles.profileInfo}>
                    <View style={styles.avatarWrapper}>
                        {user?.foto_perfil ? (
                            <Image source={{ uri: user.foto_perfil }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatar}>
                                <Ionicons name="person" size={28} color="#64748B" />
                            </View>
                        )}
                        <View style={styles.proBadge}>
                            <Text style={styles.proBadgeText}>PRO</Text>
                        </View>
                    </View>
                    <View>
                        <Text style={styles.userName}>{user?.nombre_artistico || user?.username || 'Creador'}</Text>
                        <View style={styles.roleRow}>
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleBadgeText}>Creador</Text>
                            </View>
                            <Text style={styles.handle}>@{user?.username || 'usuario'}</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
                    <Ionicons name="settings-outline" size={20} color="#64748B" />
                </TouchableOpacity>
            </View>

            {/* Segmented Control */}
            <View style={styles.segmentedContainer}>
                <TouchableOpacity 
                    style={[styles.segmentBtn, activeSection === 'balance' && styles.segmentBtnActive]}
                    onPress={() => setActiveSection('balance')}
                >
                    <Text style={[styles.segmentText, activeSection === 'balance' && styles.segmentTextActive]}>MI BILLETERA</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.segmentBtn, activeSection === 'orders' && styles.segmentBtnActive]}
                    onPress={() => setActiveSection('orders')}
                >
                    <Text style={[styles.segmentText, activeSection === 'orders' && styles.segmentTextActive]}>RESUMEN DE COMPRA</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={NEON_GREEN} />
                }
            >
                {activeSection === 'balance' ? (
                    <>
                        {/* Balance Card */}
                        <View style={styles.balanceCard}>
                            <Text style={styles.balanceLabel}>Balance Actual</Text>
                            <Text style={styles.balanceAmount}>
                                ${typeof balance === 'number' ? balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                            </Text>
                            <Text style={styles.balanceSubtext}>Disponible para retiro</Text>

                            <View style={styles.balanceActions}>
                                <TouchableOpacity 
                                    style={[styles.withdrawBtn, balance <= 0 && { opacity: 0.5 }]} 
                                    onPress={() => balance > 0 && handleWithdraw('Banco')}
                                    disabled={balance <= 0}
                                >
                                    <Text style={styles.withdrawBtnText}>Retirar Fondos</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.addBtn} onPress={() => handleAddFunds('Mercado Pago')}>
                                    <Ionicons name="add" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Withdrawal Methods */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Métodos de Retiro</Text>
                            <View style={styles.methodsGrid}>
                                <TouchableOpacity style={styles.methodCard} onPress={() => handleWithdraw('Stripe')}>
                                    <View style={styles.methodIconCircle}>
                                        <Ionicons name="card-outline" size={20} color={NEON_GREEN} />
                                    </View>
                                    <Text style={styles.methodLabel}>{'BANCO\n(STRIPE)'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.methodCard} onPress={() => handleWithdraw('Mercado Pago')}>
                                    <View style={styles.methodIconCircle}>
                                        <MaterialCommunityIcons name="wallet-outline" size={20} color={NEON_GREEN} />
                                    </View>
                                    <Text style={styles.methodLabel}>MERCADO PAGO</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.methodCard} onPress={() => handleWithdraw('PayPal')}>
                                    <View style={styles.methodIconCircle}>
                                        <Ionicons name="logo-paypal" size={20} color={NEON_GREEN} />
                                    </View>
                                    <Text style={styles.methodLabel}>PAYPAL</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Analytics Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Analíticas de Ventas</Text>
                                <View style={styles.periodBadge}>
                                    <Text style={styles.periodText}>Últimos 7 Días</Text>
                                </View>
                            </View>
                            <View style={styles.analyticsCard}>
                                <View style={styles.analyticsStats}>
                                    <View>
                                        <Text style={styles.analyticsLabel}>Ventas Totales</Text>
                                        <Text style={[styles.analyticsValue, { color: NEON_GREEN }]}>
                                            {user?.sales_count || 0}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.analyticsLabel}>Alcance Único</Text>
                                        <Text style={styles.analyticsValue}>
                                            {walletData?.audience?.total_spectators || 0}
                                        </Text>
                                    </View>
                                </View>
                                {/* Real bar chart */}
                                <View style={styles.barsRow}>
                                    {salesTrend.length > 0 ? (
                                        salesTrend.map((t: any, i: number) => {
                                            const maxVal = Math.max(...salesTrend.map((x:any)=>x.count), 1);
                                            const h = (t.count / maxVal) * 100;
                                            return (
                                                <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                                                    <View
                                                        style={[
                                                            styles.bar,
                                                            {
                                                                height: Math.max(h, 5),
                                                                backgroundColor: i === salesTrend.length - 1 ? NEON_GREEN : '#333',
                                                            },
                                                        ]}
                                                    />
                                                    <Text style={{ color: '#222', fontSize: 6, marginTop: 4 }}>
                                                        {t.date.split('-').slice(2).join('')}
                                                    </Text>
                                                </View>
                                            );
                                        })
                                    ) : (
                                        <Text style={{color: '#333', fontSize: 12, textAlign: 'center', width: '100%'}}>Sin ventas recientes</Text>
                                    ) }
                                </View>
                            </View>
                        </View>
                    </>
                ) : (
                    <>
                        {/* Purchased Items Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Tus Compras</Text>
                                <View style={styles.periodBadge}>
                                    <Text style={styles.periodText}>{purchasedPosts.length} Beats</Text>
                                </View>
                            </View>

                            {isLoadingPurchased ? (
                                <ActivityIndicator color={NEON_GREEN} style={{ marginTop: 20 }} />
                            ) : purchasedPosts.length === 0 ? (
                                <View style={styles.emptyTransactions}>
                                    <Ionicons name="cart-outline" size={40} color="#1E293B" />
                                    <Text style={styles.emptyText}>Aún no has comprado beats</Text>
                                    <TouchableOpacity 
                                       style={styles.exploreBtn}
                                       onPress={() => router.push('/explore')}
                                    >
                                        <Text style={styles.exploreBtnText}>Explorar Marketplace</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.purchasedGrid}>
                                    {purchasedPosts.map((post: any) => (
                                        <TouchableOpacity 
                                            key={post.id} 
                                            style={styles.purchasedCard}
                                            onPress={() => router.push({ pathname: '/(tabs)', params: { startPostId: post.id } })}
                                        >
                                            <Image 
                                                source={{ uri: post.cover_url }} 
                                                style={styles.purchasedCover} 
                                            />
                                            <View style={styles.purchasedInfo}>
                                                <Text style={styles.purchasedTitle} numberOfLines={1}>{post.titulo}</Text>
                                                <Text style={styles.purchasedArtist}>@{post.artista}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },

    // Profile Header — Stitch billetera
    profileHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 60, paddingHorizontal: 16, paddingBottom: 24,
    },
    segmentedContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 24,
        gap: 12,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#111',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222',
    },
    segmentBtnActive: {
        backgroundColor: NEON_GREEN,
        borderColor: NEON_GREEN,
    },
    segmentText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1,
    },
    segmentTextActive: {
        color: '#000',
    },
    profileInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatarWrapper: { position: 'relative' },
    avatar: {
        width: 64, height: 64, borderRadius: 32,
        borderWidth: 2, borderColor: NEON_GREEN,
        backgroundColor: '#0F0F0F', justifyContent: 'center', alignItems: 'center',
    },
    proBadge: {
        position: 'absolute', bottom: -4, right: -4,
        backgroundColor: NEON_GREEN, paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: 9999,
    },
    proBadgeText: { color: '#0A0A0A', fontSize: 10, fontWeight: '900', letterSpacing: -0.5, textTransform: 'uppercase' },
    userName: { color: '#fff', fontSize: 20, fontWeight: '800' },
    roleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    roleBadge: { backgroundColor: '#1E293B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    roleBadgeText: { color: NEON_GREEN, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
    handle: { color: '#64748B', fontSize: 12 },
    settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },

    // Balance Card — Stitch bg-brand-card rounded-3xl
    balanceCard: {
        backgroundColor: CARD_BG, borderRadius: 24, padding: 24,
        marginHorizontal: 16, marginBottom: 32,
        borderWidth: 1, borderColor: BORDER_SUBTLE,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5, shadowRadius: 30, elevation: 10,
    },
    balanceLabel: { color: '#64748B', fontSize: 14, fontWeight: '500', marginBottom: 4 },
    balanceAmount: { color: NEON_GREEN, fontSize: 36, fontWeight: '900', letterSpacing: -1 },
    balanceSubtext: { color: '#334155', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700', marginTop: 8 },
    balanceActions: { flexDirection: 'row', gap: 12, marginTop: 32 },
    withdrawBtn: {
        flex: 1, backgroundColor: NEON_GREEN, paddingVertical: 16, borderRadius: 16,
        alignItems: 'center',
    },
    withdrawBtnText: { color: '#0A0A0A', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
    addBtn: {
        width: 56, backgroundColor: '#1E293B', borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
    },

    // Sections
    section: { marginBottom: 32, paddingHorizontal: 16 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 16 },

    // Methods Grid — Stitch grid-cols-3
    methodsGrid: { flexDirection: 'row', gap: 12 },
    methodCard: {
        flex: 1, backgroundColor: CARD_BG, borderRadius: 16, padding: 16,
        alignItems: 'center', borderWidth: 1, borderColor: BORDER_SUBTLE,
    },
    methodIconCircle: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E293B',
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    methodLabel: { color: '#fff', fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 14 },

    // Analytics — Stitch bg-brand-card rounded-3xl
    analyticsCard: {
        backgroundColor: CARD_BG, borderRadius: 24, padding: 20,
        borderWidth: 1, borderColor: BORDER_SUBTLE,
    },
    analyticsStats: { flexDirection: 'row', gap: 32, marginBottom: 16 },
    analyticsLabel: { color: '#334155', fontSize: 10, textTransform: 'uppercase', fontWeight: '700' },
    analyticsValue: { color: '#fff', fontSize: 18, fontWeight: '900' },
    periodBadge: { backgroundColor: '#111', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    periodText: { color: '#64748B', fontSize: 12 },
    barsRow: {
        flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
        height: 120, paddingTop: 10,
    },
    bar: { width: (width - 100) / 10, borderRadius: 4 },

    // Transactions — Stitch bg-brand-card rounded-2xl
    viewAllText: { color: NEON_GREEN, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    txItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: CARD_BG, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: BORDER_SUBTLE, marginBottom: 12,
    },
    txIconCircle: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: '#1E293B',
        alignItems: 'center', justifyContent: 'center',
    },
    txInfo: { flex: 1, marginLeft: 12 },
    txTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
    txMeta: { color: '#334155', fontSize: 10, textTransform: 'uppercase', marginTop: 2 },
    txAmountCol: { alignItems: 'flex-end' },
    txAmount: { color: NEON_GREEN, fontSize: 14, fontWeight: '700' },
    txStatus: { color: '#334155', fontSize: 10, marginTop: 2 },

    emptyTransactions: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    emptyText: { color: '#334155', fontSize: 14, fontWeight: '600' },
    exploreBtn: { 
        backgroundColor: NEON_GREEN, 
        paddingHorizontal: 20, 
        paddingVertical: 10, 
        borderRadius: 12, 
        marginTop: 10 
    },
    exploreBtnText: { color: '#000', fontSize: 13, fontWeight: '900' },
    purchasedGrid: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: 12, 
        justifyContent: 'space-between' 
    },
    purchasedCard: { 
        width: (width - 44) / 2, 
        backgroundColor: CARD_BG, 
        borderRadius: 16, 
        padding: 8, 
        borderWidth: 1, 
        borderColor: BORDER_SUBTLE 
    },
    purchasedCover: { 
        width: '100%', 
        aspectRatio: 1, 
        borderRadius: 10, 
        marginBottom: 8 
    },
    purchasedInfo: { paddingHorizontal: 4 },
    purchasedTitle: { color: '#fff', fontSize: 12, fontWeight: '800' },
    purchasedArtist: { color: NEON_GREEN, fontSize: 10, fontWeight: '600' },
});
