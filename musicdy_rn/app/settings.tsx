import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, Share } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/src/store/useAuthStore';

const APP_YELLOW = '#FFDE03';

export default function SettingsScreen() {
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        Alert.alert(
            "Cerrar sesión",
            "¿Estás seguro que quieres salir?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Salir",
                    style: "destructive",
                    onPress: async () => {
                        await logout();
                        router.replace('/(auth)/login');
                    }
                }
            ]
        );
    };

    const onShare = async () => {
        try {
            await Share.share({
                message: `¡Mira mi perfil en Musicdy! https://musicdy.com/${user?.username}`,
            });
        } catch (error) { console.log(error); }
    };

    const SettingItem = ({ icon, label, value, onPress, isSwitch, switchValue, onSwitchChange, color = '#fff' }: any) => (
        <TouchableOpacity
            style={styles.item}
            onPress={onPress}
            disabled={isSwitch}
            activeOpacity={0.7}
        >
            <View style={styles.itemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#111' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
                <Text style={styles.itemLabel}>{label}</Text>
            </View>
            {isSwitch ? (
                <Switch
                    value={switchValue}
                    onValueChange={onSwitchChange}
                    trackColor={{ false: '#333', true: APP_YELLOW }}
                    thumbColor={'#fff'}
                />
            ) : (
                <View style={styles.itemRight}>
                    {value && <Text style={styles.itemValue}>{value}</Text>}
                    <Ionicons name="chevron-forward" size={18} color="#444" />
                </View>
            )}
        </TouchableOpacity>
    );

    const SectionTitle = ({ title }: { title: string }) => (
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ajustes</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

                <View style={styles.userSection}>
                    <View style={[styles.avatarPlaceholder, { borderColor: APP_YELLOW }]}>
                        <Ionicons name="person" size={26} color={APP_YELLOW} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.userName}>{user?.username || 'Usuario'}</Text>
                        <Text style={styles.userEmail}>{user?.email || 'email@musicdy.com'}</Text>
                    </View>
                    <TouchableOpacity style={styles.shareProfileBtn} onPress={onShare}>
                        <Ionicons name="share-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <SectionTitle title="Cuenta" />
                <SettingItem
                    icon="person-outline"
                    label="Editar Perfil"
                    onPress={() => router.push('/profile/edit')}
                />
                <SettingItem
                    icon="shield-checkmark-outline"
                    label="Verificación de cuenta"
                    value={user?.tipo_usuario === 'Oyente' ? 'Solicitar' : 'Activo'}
                    onPress={() => Alert.alert("Musicdy Official", "Para verificar tu cuenta debés tener al menos 5 beats/canciones y 100 seguidores.")}
                />
                <SettingItem
                    icon="cash-outline"
                    label="Monetización y Pagos"
                    onPress={() => router.push('/settings/billing' as any)}
                />
                <SettingItem
                    icon="lock-closed-outline"
                    label="Contraseña y Seguridad"
                    onPress={() => { }}
                />

                <SectionTitle title="Contenido" />
                <SettingItem
                    icon="cloud-upload-outline"
                    label="Gestionar Subidas"
                    onPress={() => router.push('/(tabs)/studio' as any)}
                />
                <SettingItem
                    icon="heart-outline"
                    label="Mis Me Gusta"
                    onPress={() => { }}
                />
                <SettingItem
                    icon="archive-outline"
                    label="Contenido Archivado"
                    onPress={() => { }}
                />

                <SectionTitle title="Preferencias" />
                <SettingItem
                    icon="notifications-outline"
                    label="Notificaciones Push"
                    isSwitch
                    switchValue={true}
                    onSwitchChange={() => { }}
                />
                <SettingItem
                    icon="color-palette-outline"
                    label="Apariencia"
                    value="Oscuro"
                    onPress={() => { }}
                />
                <SettingItem
                    icon="language-outline"
                    label="Idioma"
                    value="Español"
                />

                <SectionTitle title="Musicdy" />
                <SettingItem
                    icon="star-outline"
                    label="Calificar la App"
                    onPress={() => { }}
                />
                <SettingItem
                    icon="chatbubble-ellipses-outline"
                    label="Enviar Feedback"
                    onPress={() => { }}
                />
                <SettingItem
                    icon="information-circle-outline"
                    label="Términos y Privacidad"
                    onPress={() => { }}
                />

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#FF4B4B" />
                    <Text style={styles.logoutText}>Cerrar Sesión</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Musicdy for Artists v1.0.4 - beta</Text>
            </ScrollView>
        </View>
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
    backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },

    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#080808',
        marginHorizontal: 16,
        marginTop: 20,
        borderRadius: 20,
        gap: 15,
        borderWidth: 1,
        borderColor: '#111'
    },
    avatarPlaceholder: {
        width: 54,
        height: 54,
        borderRadius: 12,
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5
    },
    userName: { color: '#fff', fontSize: 17, fontWeight: '800' },
    userEmail: { color: '#666', fontSize: 12, marginTop: 1 },
    shareProfileBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#161616',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#222'
    },

    sectionTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: '#333',
        marginLeft: 20,
        marginTop: 30,
        marginBottom: 8,
        letterSpacing: 1.5
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 0.5,
        borderBottomColor: '#0a0a0a'
    },
    itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconContainer: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    itemLabel: { color: '#ccc', fontSize: 14, fontWeight: '500' },
    itemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemValue: { color: '#555', fontSize: 13 },

    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 40,
        paddingVertical: 16,
        marginHorizontal: 20,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 75, 75, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 75, 75, 0.1)'
    },
    logoutText: { color: '#FF4B4B', fontSize: 15, fontWeight: '800' },
    versionText: { color: '#1a1a1a', textAlign: 'center', marginTop: 30, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }
});
