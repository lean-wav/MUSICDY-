import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    TouchableOpacity, Image, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';

const ACCENT_COLORS = [
    { id: 'yellow', value: '#FFDE03', label: 'Musicdy' },
    { id: 'gold', value: '#FFD700', label: 'Gold' },
    { id: 'purple', value: '#9575CD', label: 'Purple' },
    { id: 'blue', value: '#2196F3', label: 'Wave' },
    { id: 'red', value: '#FF5252', label: 'Pulse' },
];


interface Profile {
    username: string;
    nombre_artistico?: string;
    bio: string;
    foto_perfil?: string | null;
    banner_image?: string | null;
    website?: string | null;
    instagram?: string | null;
    youtube?: string | null;
    spotify?: string | null;
    tiktok?: string | null;
    saved_visibility?: string;
    verified_type?: string;
    accent_color?: string | null;
    profile_sections?: { [key: string]: boolean };
}

export default function EditProfileScreen() {
    const qc = useQueryClient();
    const [saving, setSaving] = useState(false);

    // ── Fetch current profile ──────────────────────────────────────────────────
    const { data: current, isLoading } = useQuery<Profile>({
        queryKey: ['myProfile'],
        queryFn: async () => (await apiClient.get('/users/me/profile')).data,
        staleTime: 60_000,
    });

    // ── Local form state ───────────────────────────────────────────────────────
    const [nombre, setNombre] = useState('');
    const [bio, setBio] = useState('');
    const [website, setWebsite] = useState('');
    const [instagram, setInstagram] = useState('');
    const [tiktok, setTiktok] = useState('');
    const [spotify, setSpotify] = useState('');
    const [youtube, setYoutube] = useState('');
    const [savedVisibility, setSavedVisibility] = useState<'public' | 'private'>('public');
    const [accentColor, setAccentColor] = useState<string | null>(null);
    const [profileSections, setProfileSections] = useState<{ [key: string]: boolean }>({
        stats: false, beats: true, songs: true, collabs: true, saved: true
    });

    const [avatarUri, setAvatarUri] = useState<string | null>(null);   // new pick (local)
    const [bannerUri, setBannerUri] = useState<string | null>(null);   // new pick (local)
    const [avatarCurrent, setAvatarCurrent] = useState<string | null>(null);  // existing
    const [bannerCurrent, setBannerCurrent] = useState<string | null>(null);  // existing

    // ── Pre-populate once data loads ───────────────────────────────────────────
    useEffect(() => {
        if (!current) return;
        setNombre(current.nombre_artistico ?? '');
        setBio(current.bio ?? '');
        setWebsite(current.website ?? '');
        setInstagram(current.instagram ?? '');
        setTiktok(current.tiktok ?? '');
        setSpotify(current.spotify ?? '');
        setYoutube(current.youtube ?? '');
        setAccentColor(current.accent_color ?? '#FFD700');
        if (current.profile_sections) setProfileSections(current.profile_sections);
        setSavedVisibility((current.saved_visibility as 'public' | 'private') ?? 'public');
        setAvatarCurrent(current.foto_perfil ?? null);
        setBannerCurrent(current.banner_image ?? null);
    }, [current]);


    const toggleSection = (key: string) => {
        setProfileSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const pickImage = async (type: 'avatar' | 'banner') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: type === 'banner' ? [16, 5] : [1, 1],
            quality: 0.85,
        });
        if (!result.canceled && result.assets[0]) {
            if (type === 'avatar') setAvatarUri(result.assets[0].uri);
            else setBannerUri(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string, endpoint: string, fieldName: string) => {
        const filename = uri.split('/').pop() || 'image.jpg';
        const form = new FormData();
        // @ts-ignore
        form.append(fieldName, { uri, name: filename, type: 'image/jpeg' });
        await apiClient.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (avatarUri) await uploadImage(avatarUri, '/users/me/avatar', 'foto_perfil');
            if (bannerUri) await uploadImage(bannerUri, '/users/me/banner', 'banner');

            const form = new FormData();
            form.append('bio', bio);
            form.append('nombre_artistico', nombre);
            form.append('website', website);
            form.append('instagram', instagram);
            form.append('tiktok', tiktok);
            form.append('spotify', spotify);
            form.append('youtube', youtube);
            form.append('saved_visibility', savedVisibility);
            if (accentColor) form.append('accent_color', accentColor);
            form.append('profile_sections', JSON.stringify(profileSections));

            await apiClient.patch('/users/me/profile', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            await qc.invalidateQueries({ queryKey: ['myProfile'] });
            Alert.alert('✅ Guardado', 'Perfil actualizado.');
            router.back();
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.detail || 'No se pudo guardar');
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color="#FFD700" size="large" />
            </View>
        );
    }

    const showAvatar = avatarUri ?? (avatarCurrent?.startsWith('http') ? avatarCurrent : null);
    const showBanner = bannerUri ?? (bannerCurrent?.startsWith('http') ? bannerCurrent : null);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Editar perfil</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    {saving
                        ? <ActivityIndicator color="#FFD700" size="small" />
                        : <Text style={styles.saveBtn}>Guardar</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

                {/* BANNER */}
                <TouchableOpacity style={styles.bannerPick} onPress={() => pickImage('banner')} activeOpacity={0.85}>
                    {showBanner ? (
                        <Image source={{ uri: showBanner }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    ) : null}
                    <View style={styles.bannerOverlay}>
                        <Ionicons name="image-outline" size={26} color={showBanner ? '#fff' : '#555'} />
                        <Text style={[styles.pickLabel, showBanner && { color: '#ddd' }]}>
                            {showBanner ? 'Cambiar banner' : 'Agregar banner'}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* AVATAR */}
                <View style={styles.avatarRow}>
                    <TouchableOpacity onPress={() => pickImage('avatar')} activeOpacity={0.85}>
                        {showAvatar ? (
                            <Image source={{ uri: showAvatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarEmpty]}>
                                <Ionicons name="camera" size={22} color="#555" />
                            </View>
                        )}
                        <View style={[styles.avatarBadge, { backgroundColor: accentColor || '#FFD700' }]}>
                            <Ionicons name="camera" size={11} color="#000" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* FORM */}
                <View style={styles.form}>

                    <Field label="Nombre artístico" value={nombre} onChange={setNombre} placeholder="Tu nombre en Musicdy" />
                    <Field label="Bio" value={bio} onChange={setBio} placeholder="Describe tu música…" multiline />

                    <SectionTitle>Links</SectionTitle>
                    <Field label="Instagram" value={instagram} onChange={setInstagram} placeholder="@usuario" />
                    <Field label="TikTok" value={tiktok} onChange={setTiktok} placeholder="@usuario" />
                    <Field label="Spotify" value={spotify} onChange={setSpotify} placeholder="Link o Artist ID" />
                    <Field label="YouTube" value={youtube} onChange={setYoutube} placeholder="Link del canal" />
                    <Field label="Sitio web" value={website} onChange={setWebsite} placeholder="tusitio.com" />


                    {/* ── Secciones Visibles ── */}
                    <SectionTitle>Secciones Visibles</SectionTitle>
                    <View style={styles.genreGrid}>
                        {Object.keys(profileSections).map(key => {
                            const active = profileSections[key];
                            const label = key === 'stats' ? 'Estadísticas' :
                                key === 'beats' ? 'Beats' :
                                    key === 'songs' ? 'Canciones' :
                                        key === 'collabs' ? 'Collabs' : 'Guardados';
                            return (
                                <TouchableOpacity
                                    key={key}
                                    style={[styles.chip, active && { borderColor: accentColor || '#FFDE03', backgroundColor: `${accentColor || '#FFDE03'}20` }]}
                                    onPress={() => toggleSection(key)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons
                                            name={active ? 'eye-outline' : 'eye-off-outline'}
                                            size={14}
                                            color={active ? (accentColor || '#FFDE03') : '#555'}
                                        />
                                        <Text style={[styles.chipText, active && { color: accentColor || '#FFDE03', fontWeight: 'bold' }]}>{label}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {current?.verified_type !== 'none' && (
                        <>
                            <SectionTitle>Color de Perfil (VIP 💎)</SectionTitle>
                            <View style={styles.colorGrid}>
                                {ACCENT_COLORS.map(c => (
                                    <TouchableOpacity
                                        key={c.id}
                                        style={[styles.colorOption, { backgroundColor: c.value }, accentColor === c.value && styles.colorActive]}
                                        onPress={() => setAccentColor(c.value)}
                                    >
                                        {accentColor === c.value && <Ionicons name="checkmark" size={16} color={c.id === 'gold' ? '#000' : '#fff'} />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    <SectionTitle>Visibilidad de guardados</SectionTitle>
                    <View style={styles.row}>
                        {(['public', 'private'] as const).map(v => {
                            const active = savedVisibility === v;
                            return (
                                <TouchableOpacity
                                    key={v}
                                    style={[styles.visOption, active && { borderColor: accentColor || '#FFD700', backgroundColor: `${accentColor || '#FFD700'}15` }]}
                                    onPress={() => setSavedVisibility(v)}
                                >
                                    <Ionicons
                                        name={v === 'public' ? 'globe-outline' : 'lock-closed-outline'}
                                        size={16}
                                        color={active ? (accentColor || '#FFD700') : '#555'}
                                    />
                                    <Text style={[styles.visText, active && { color: accentColor || '#FFD700', fontWeight: '700' }]}>
                                        {v === 'public' ? 'Público' : 'Privado'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                </View>
            </ScrollView>
        </View>
    );
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <Text style={styles.section}>{children}</Text>
);

const Field = ({ label, value, onChange, placeholder, multiline }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; multiline?: boolean;
}) => (
    <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
            style={[styles.input, multiline && styles.inputMulti]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#3a3a3a"
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
        />
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, borderBottomWidth: 0.5, borderColor: '#1a1a1a' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
    saveBtn: { fontSize: 15, fontWeight: '700', color: '#FFD700' },
    bannerPick: { height: 130, backgroundColor: '#0d0d0d', overflow: 'hidden' },
    bannerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.35)' },
    pickLabel: { color: '#555', fontSize: 12 },
    avatarRow: { paddingLeft: 16, marginTop: -30 },
    avatar: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: '#000', backgroundColor: '#1a1a1a' },
    avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
    avatarBadge: { position: 'absolute', right: 0, bottom: 0, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
    form: { paddingHorizontal: 16, paddingTop: 12 },
    section: { fontSize: 11, fontWeight: '700', color: '#666', marginTop: 24, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.2 },
    field: { marginBottom: 12 },
    fieldLabel: { fontSize: 11, color: '#444', marginBottom: 4, fontWeight: '600' },
    input: { backgroundColor: '#0f0f0f', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, color: '#fff', fontSize: 14, borderWidth: 0.5, borderColor: '#222' },
    inputMulti: { height: 88 },
    genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: '#0f0f0f', borderWidth: 0.5, borderColor: '#2a2a2a' },
    chipText: { fontSize: 13, color: '#555' },
    colorGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    colorOption: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    colorActive: { borderColor: '#fff' },
    row: { flexDirection: 'row', gap: 10 },
    visOption: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, borderRadius: 10, backgroundColor: '#0f0f0f', borderWidth: 0.5, borderColor: '#222' },
    visText: { fontSize: 14, color: '#555' },
});
