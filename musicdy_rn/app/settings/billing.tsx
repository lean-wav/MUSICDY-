import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ScrollView, 
    TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/src/store/useAuthStore';
import { apiClient } from '@/src/api/client';

const APP_YELLOW = '#FFDE03';
const NEON_GREEN = '#39FF14';

export default function BillingSettingsScreen() {
    const { user, checkSession } = useAuthStore();
    const [loading, setLoading] = useState(false);
    
    // Form states
    const [stripeId, setStripeId] = useState((user as any)?.stripe_account_id || '');
    const [mpId, setMpId] = useState((user as any)?.mp_account_id || '');
    const [paypal, setPaypal] = useState((user as any)?.paypal_email || '');
    const [usdt, setUsdt] = useState((user as any)?.usdt_address || '');

    const handleSave = async () => {
        setLoading(true);
        try {
            await apiClient.patch('/users/me', {
                stripe_account_id: stripeId,
                mp_account_id: mpId,
                paypal_email: paypal,
                usdt_address: usdt
            });
            await checkSession(); // Refresh local user data
            Alert.alert("Éxito", "Tus ajustes de facturación han sido actualizados.");
            router.back();
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.detail || "No se pudo actualizar la información");
        } finally {
            setLoading(false);
        }
    };

    const BillingInput = ({ label, value, onChangeText, placeholder, icon, type = 'default' }: any) => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.inputWrapper}>
                <Ionicons name={icon} size={20} color="#555" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#333"
                    keyboardType={type}
                    autoCapitalize="none"
                />
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Facturación y Pagos</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator size="small" color={NEON_GREEN} />
                    ) : (
                        <Text style={[styles.saveText, { color: NEON_GREEN }]}>Guardar</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.infoBanner}>
                    <Ionicons name="information-circle" size={20} color={NEON_GREEN} />
                    <Text style={styles.infoText}>
                        Configura tus métodos para recibir pagos por tus beats y canciones. Asegúrate de que los datos sean correctos.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>MÉTODOS TRADICIONALES</Text>
                    <BillingInput 
                        label="Stripe Account ID"
                        value={stripeId}
                        onChangeText={setStripeId}
                        placeholder="acct_..."
                        icon="card-outline"
                    />
                    <Text style={styles.helperText}>Usado para pagos internacionales y tarjetas de crédito.</Text>

                    <BillingInput 
                        label="Mercado Pago ID"
                        value={mpId}
                        onChangeText={setMpId}
                        placeholder="ID de cliente o email"
                        icon="wallet-outline"
                    />
                    <Text style={styles.helperText}>Ideal para ventas en Argentina y Latinoamérica.</Text>

                    <BillingInput 
                        label="PayPal Email"
                        value={paypal}
                        onChangeText={setPaypal}
                        placeholder="tu@email.com"
                        icon="logo-paypal"
                        type="email-address"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CRIPTOMONEDAS</Text>
                    <BillingInput 
                        label="USDT Address (TRC20)"
                        value={usdt}
                        onChangeText={setUsdt}
                        placeholder="Dirección de billetera"
                        icon="logo-bitcoin"
                    />
                    <Text style={styles.helperText}>Solo red TRC20 para evitar pérdida de fondos.</Text>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.saveBtnText}>Actualizar Ajustes</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 16,
        paddingBottom: 20,
        backgroundColor: '#000',
        borderBottomWidth: 0.5,
        borderColor: '#111'
    },
    backBtn: { width: 50, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
    saveText: { fontSize: 15, fontWeight: '700' },

    scrollContent: { padding: 20 },
    
    infoBanner: {
        flexDirection: 'row',
        backgroundColor: 'rgba(57, 255, 20, 0.05)',
        padding: 15,
        borderRadius: 15,
        borderWidth: 0.5,
        borderColor: 'rgba(57, 255, 20, 0.2)',
        marginBottom: 25,
        gap: 12,
        alignItems: 'center'
    },
    infoText: { flex: 1, color: '#aaa', fontSize: 13, lineHeight: 18 },

    section: { marginBottom: 30 },
    sectionTitle: { fontSize: 11, fontWeight: '900', color: '#333', marginBottom: 15, letterSpacing: 1.5 },

    inputGroup: { marginBottom: 20 },
    inputLabel: { color: '#666', fontSize: 13, fontWeight: '600', marginBottom: 8 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#080808',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#111',
        height: 52,
        paddingHorizontal: 15
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: '#fff', fontSize: 15 },
    
    helperText: { color: '#444', fontSize: 11, marginTop: -15, marginBottom: 15, marginLeft: 2 },

    saveBtn: {
        backgroundColor: NEON_GREEN,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 40
    },
    saveBtnText: { color: '#000', fontSize: 16, fontWeight: '900', textTransform: 'uppercase' }
});
