import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
    ActivityIndicator, Image, Alert, Dimensions, Switch, Animated, Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/src/api/client';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

const { width } = Dimensions.get('window');

// Stitch Design Tokens
const GOLD = '#FFD700';
const NEON_YELLOW = '#CCFF00';
const BG_DARK = '#000000';
const SURFACE = '#0F0F0F';
const INPUT_BG = '#1A1A1A';
const SLATE_400 = '#94A3B8';
const BORDER_SUBTLE = 'rgba(255,255,255,0.05)';

const GENEROS = ['TRAP', 'REGGAETON', 'POP', 'RAP', 'ROCK', 'ELECTRONICA', 'TECHNO', 'PHONK'];
const LICENSES = ['LEASE (ARRENDAMIENTO)', 'PREMIUM (WAV)', 'EXCLUSIVE (ILIMITADA)'];

const LICENSES_MODELS = [
    { id: 'basic', name: 'BASIC LICENSE (MP3)', description: 'Perfect for small projects' },
    { id: 'premium', name: 'PREMIUM LICENSE (MP3 + WAV)', description: 'High quality audio files' },
    { id: 'stems', name: 'TRACK OUT STEMS (MP3, WAV, STEMS)', description: 'Full track separation' },
];

export default function StudioScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'beat' | 'song'>('beat');

    // Form State
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [genero, setGenero] = useState('TRAP');
    const [bpm, setBpm] = useState('140');
    const [key, setKey] = useState('C MINOR');
    
    // Multi-Currency License State
    const [selectedLicenses, setSelectedLicenses] = useState<string[]>(['basic']);
    const [licensePrices, setLicensePrices] = useState<Record<string, { usd: string, ars: string }>>({
        basic: { usd: '29.99', ars: '35000' },
        premium: { usd: '49.99', ars: '60000' },
        stems: { usd: '149.99', ars: '180000' }
    });
    
    const [allowFree, setAllowFree] = useState(false);

    // Media State
    const [audioFile, setAudioFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
    const [coverUri, setCoverUri] = useState<string | null>(null);
    const [coverAsset, setCoverAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadPhase, setUploadPhase] = useState<'uploading' | 'processing' | 'done'>('uploading');
    const progressAnim = useRef(new Animated.Value(0)).current;

    const pickAudio = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac'],
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets.length > 0) {
                setAudioFile(result.assets[0]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const pickCover = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets.length > 0) {
                setCoverAsset(result.assets[0]);
                setCoverUri(result.assets[0].uri);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handlePublish = async () => {
        if (!titulo.trim()) return Alert.alert("Falta Título", "Por favor ingresa un título.");
        if (!audioFile) return Alert.alert("Falta Audio", "Por favor selecciona un archivo de audio.");

        setIsUploading(true);
        setUploadProgress(0);
        setUploadPhase('uploading');
        progressAnim.setValue(0);

        try {
            const formData = new FormData();
            formData.append('titulo', titulo);
            formData.append('descripcion', descripcion);
            formData.append('genero_musical', genero.toLowerCase());
            formData.append('tipo_contenido', activeTab === 'beat' ? 'beat' : 'own_music');
            formData.append('bpm', bpm);
            formData.append('escala', key); // backend field is `escala`, not `val_key`
            formData.append('free_use', String(allowFree));

            // Sending licenses as JSON string
            const licensesData = selectedLicenses.map(id => ({
                id,
                price_usd: licensePrices[id].usd,
                price_ars: licensePrices[id].ars
            }));
            formData.append('licenses', JSON.stringify(licensesData));

            // Audio Asset
            const filename = audioFile.name || 'audio.mp3';
            const mimeType = audioFile.mimeType || 'audio/mpeg';
            // @ts-ignore
            formData.append('archivo', {
                uri: audioFile.uri,
                name: filename,
                type: mimeType,
            });

            // Cover Asset
            if (coverAsset) {
                const cname = coverAsset.fileName || coverUri?.split('/').pop() || 'cover.jpg';
                const cmime = coverAsset.mimeType || (cname.endsWith('.png') ? 'image/png' : 'image/jpeg');
                // @ts-ignore
                formData.append('portada', {
                    uri: coverAsset.uri,
                    name: cname,
                    type: cmime,
                });
            }

            await apiClient.post('/posts/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent.total || 1;
                    const pct = Math.round((progressEvent.loaded * 100) / total);
                    setUploadProgress(pct);
                    Animated.timing(progressAnim, {
                        toValue: pct / 100,
                        duration: 200,
                        useNativeDriver: false,
                    }).start();
                    if (pct >= 100) {
                        setUploadPhase('processing');
                    }
                },
            });

            // Upload complete
            setUploadPhase('done');
            setUploadProgress(100);
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
            }).start();

            // Invalidate feed cache so new post shows immediately
            queryClient.invalidateQueries({ queryKey: ['feedPosts'] });
            queryClient.invalidateQueries({ queryKey: ['userBeats'] });
            queryClient.invalidateQueries({ queryKey: ['userSongs'] });

            // Small delay to show the "done" state
            await new Promise(resolve => setTimeout(resolve, 800));

            Alert.alert("¡Éxito!", "Tu track ha sido publicado exitosamente.");
            router.replace('/(tabs)');

        } catch (error: any) {
            console.error("Error al publicar:", error.response?.data || error.message);
            Alert.alert("Error de subida", error.response?.data?.detail || "Ha ocurrido un error.");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            progressAnim.setValue(0);
        }
    };

    return (
        <>
        {/* Upload Progress Overlay */}
        <Modal visible={isUploading} transparent animationType="fade">
            <View style={styles.progressOverlay}>
                <View style={styles.progressCard}>
                    {/* Icon */}
                    <View style={styles.progressIconCircle}>
                        {uploadPhase === 'done' ? (
                            <Ionicons name="checkmark-circle" size={48} color={NEON_YELLOW} />
                        ) : uploadPhase === 'processing' ? (
                            <ActivityIndicator size="large" color={NEON_YELLOW} />
                        ) : (
                            <Ionicons name="cloud-upload" size={48} color={NEON_YELLOW} />
                        )}
                    </View>

                    {/* Title */}
                    <Text style={styles.progressTitle}>
                        {uploadPhase === 'done' ? '¡PUBLICADO!' :
                         uploadPhase === 'processing' ? 'PROCESANDO...' :
                         'SUBIENDO TRACK'}
                    </Text>

                    {/* Subtitle */}
                    <Text style={styles.progressSubtitle}>
                        {uploadPhase === 'done' ? 'Tu track ya está en el feed' :
                         uploadPhase === 'processing' ? 'El servidor está procesando tu archivo' :
                         `${titulo || 'Tu track'}`}
                    </Text>

                    {/* Progress bar */}
                    <View style={styles.progressBarContainer}>
                        <Animated.View
                            style={[
                                styles.progressBarFill,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%'],
                                    }),
                                },
                            ]}
                        />
                    </View>

                    {/* Percentage */}
                    <Text style={styles.progressPercent}>{uploadProgress}%</Text>

                    {/* Phase indicator */}
                    <View style={styles.phaseRow}>
                        <View style={[styles.phaseDot, uploadPhase !== 'uploading' && styles.phaseDotDone]} />
                        <Text style={styles.phaseText}>Subida</Text>
                        <View style={styles.phaseLine} />
                        <View style={[styles.phaseDot, uploadPhase === 'done' && styles.phaseDotDone, uploadPhase === 'processing' && styles.phaseDotActive]} />
                        <Text style={styles.phaseText}>Procesando</Text>
                        <View style={styles.phaseLine} />
                        <View style={[styles.phaseDot, uploadPhase === 'done' && styles.phaseDotDone]} />
                        <Text style={styles.phaseText}>Listo</Text>
                    </View>
                </View>
            </View>
        </Modal>

        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                    <View style={styles.titlePill} />
                    <Text style={styles.headerTitle}>SUBIR CONTENIDO</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Type Selector (Tabs) */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'beat' && styles.tabActive]}
                    onPress={() => setActiveTab('beat')}
                >
                    <Text style={[styles.tabText, activeTab === 'beat' && styles.tabTextActive]}>BEAT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'song' && styles.tabActive]}
                    onPress={() => setActiveTab('song')}
                >
                    <Text style={[styles.tabText, activeTab === 'song' && styles.tabTextActive]}>CANCIÓN</Text>
                </TouchableOpacity>
            </View>

            {/* Audio Upload Zone */}
            <View style={styles.section}>
                <TouchableOpacity style={styles.uploadZone} onPress={pickAudio}>
                    <Ionicons name="cloud-upload" size={48} color={NEON_YELLOW} />
                    <Text style={styles.uploadTitle}>
                        {audioFile ? 'ARCHIVO CARGADO' : 'CARGAR ARCHIVO DE AUDIO'}
                    </Text>
                    <Text style={styles.uploadSubtitle}>
                        {audioFile ? audioFile.name : 'Arrastra o selecciona WAV o MP3'}
                    </Text>
                    {!audioFile && (
                        <View style={styles.selectBtn}>
                            <Text style={styles.selectBtnText}>SELECCIONAR ARCHIVO</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Cover Art Section */}
            <View style={styles.section}>
                <Text style={styles.label}>PORTADA DEL TRACK</Text>
                <TouchableOpacity style={styles.coverPicker} onPress={pickCover}>
                    {coverUri ? (
                        <Image source={{ uri: coverUri }} style={styles.coverImg} />
                    ) : (
                        <View style={styles.coverPlaceholder}>
                            <Ionicons name="image-outline" size={32} color={SLATE_400} />
                            <Text style={styles.coverText}>SUBE IMAGEN</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Details Form */}
            <View style={styles.section}>
                <Text style={styles.label}>TÍTULO DEL TRACK</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej: Midnight Waves (Prod. Musicdy)"
                    placeholderTextColor="#555"
                    value={titulo}
                    onChangeText={setTitulo}
                />

                <Text style={styles.label}>GÉNERO</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
                    {GENEROS.map(g => (
                        <TouchableOpacity
                            key={g}
                            style={[styles.chip, genero === g && styles.chipActive]}
                            onPress={() => setGenero(g)}
                        >
                            <Text style={[styles.chipText, genero === g && styles.chipTextActive]}>{g}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>BPM</Text>
                        <TextInput
                            style={styles.inputSmall}
                            value={bpm}
                            onChangeText={setBpm}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={{ flex: 1.5, marginLeft: 16 }}>
                        <Text style={styles.label}>KEY</Text>
                        <TextInput
                            style={styles.inputSmall}
                            value={key}
                            onChangeText={setKey}
                            placeholder="Ej: C MINOR"
                            placeholderTextColor="#555"
                        />
                    </View>
                </View>

                <Text style={styles.label}>ETIQUETAS</Text>
                <View style={styles.tagsContainer}>
                    <View style={styles.tagChip}><Text style={styles.tagText}>DARK ×</Text></View>
                    <View style={styles.tagChip}><Text style={styles.tagText}>808 ×</Text></View>
                    <View style={styles.tagChip}><Text style={styles.tagText}>HARD ×</Text></View>
                </View>
                <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="Añade etiqueta y presiona enter..."
                    placeholderTextColor="#555"
                />
            </View>

            {/* Monetization Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: GOLD }]}>💰 CONFIGURACIÓN DE MONETIZACIÓN</Text>

                <Text style={styles.label}>SELECCIONA TUS LICENCIAS DISPONIBLES</Text>
                <View style={styles.licensePicker}>
                    {LICENSES_MODELS.map(l => {
                        const isActive = selectedLicenses.includes(l.id);
                        return (
                            <View key={l.id} style={[styles.licenseCard, isActive && styles.licenseCardActive]}>
                                <TouchableOpacity 
                                    style={styles.licenseHeader}
                                    onPress={() => {
                                        setSelectedLicenses(prev => 
                                            isActive ? prev.filter(id => id !== l.id) : [...prev, l.id]
                                        );
                                    }}
                                >
                                    <View style={[styles.checkbox, isActive && styles.checkboxActive]}>
                                        {isActive && <Ionicons name="checkmark" size={14} color="#000" />}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.licenseName, isActive && { color: NEON_YELLOW }]}>{l.name}</Text>
                                        <Text style={styles.licenseDescription}>{l.description}</Text>
                                    </View>
                                </TouchableOpacity>

                                {isActive && (
                                    <View style={styles.dualPriceContainer}>
                                        <View style={styles.priceColumn}>
                                            <Text style={styles.priceLabel}>USD ($)</Text>
                                            <TextInput
                                                style={styles.priceInputSmall}
                                                value={licensePrices[l.id].usd}
                                                onChangeText={(val) => setLicensePrices(prev => ({ 
                                                    ...prev, 
                                                    [l.id]: { ...prev[l.id], usd: val } 
                                                }))}
                                                keyboardType="decimal-pad"
                                                placeholder="0.00"
                                                placeholderTextColor="#444"
                                            />
                                        </View>
                                        <View style={styles.divider} />
                                        <View style={styles.priceColumn}>
                                            <Text style={styles.priceLabel}>ARS ($)</Text>
                                            <TextInput
                                                style={styles.priceInputSmall}
                                                value={licensePrices[l.id].ars}
                                                onChangeText={(val) => setLicensePrices(prev => ({ 
                                                    ...prev, 
                                                    [l.id]: { ...prev[l.id], ars: val } 
                                                }))}
                                                keyboardType="numeric"
                                                placeholder="0"
                                                placeholderTextColor="#444"
                                            />
                                        </View>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                <View style={styles.switchRow}>
                    <Text style={styles.labelInline}>PERMITIR DESCARGA GRATUITA</Text>
                    <Switch
                        value={allowFree}
                        onValueChange={setAllowFree}
                        trackColor={{ false: '#333', true: NEON_YELLOW }}
                        thumbColor={allowFree ? '#fff' : '#888'}
                    />
                </View>
            </View>

            {/* Legal and Publish */}
            <View style={styles.footer}>
                <Text style={styles.legalText}>
                    Acepto los <Text style={styles.legalLink}>Términos y Condiciones</Text> y confirmo que poseo todos los derechos de autor.
                </Text>

                <TouchableOpacity
                    style={[styles.publishBtn, isUploading && { opacity: 0.7 }]}
                    onPress={handlePublish}
                    disabled={isUploading}
                >
                    {isUploading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.publishBtnText}>PUBLICAR TRACK</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG_DARK },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 60, paddingHorizontal: 16, paddingBottom: 20,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    titleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    titlePill: { width: 6, height: 24, backgroundColor: GOLD, borderRadius: 2 },
    headerTitle: { color: GOLD, fontSize: 18, fontWeight: '900', letterSpacing: 1 },

    tabContainer: {
        flexDirection: 'row', backgroundColor: '#000', marginHorizontal: 16,
        borderRadius: 12, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: BORDER_SUBTLE,
    },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: NEON_YELLOW },
    tabText: { color: '#fff', fontSize: 12, fontWeight: '900' },
    tabTextActive: { color: '#000' },

    section: { paddingHorizontal: 16, marginBottom: 32 },
    sectionTitle: { fontSize: 14, fontWeight: '900', marginBottom: 20, letterSpacing: 0.5 },

    // Upload Zone
    uploadZone: {
        borderWidth: 2, borderColor: NEON_YELLOW, borderStyle: 'dashed', borderRadius: 24,
        padding: 40, alignItems: 'center', backgroundColor: 'rgba(204, 255, 0, 0.05)',
    },
    uploadTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 16 },
    uploadSubtitle: { color: SLATE_400, fontSize: 12, marginTop: 4, textAlign: 'center' },
    selectBtn: {
        backgroundColor: NEON_YELLOW, paddingHorizontal: 20, paddingVertical: 10,
        borderRadius: 999, marginTop: 20, shadowColor: NEON_YELLOW, shadowOpacity: 0.3, shadowRadius: 10,
    },
    selectBtnText: { color: '#000', fontSize: 11, fontWeight: '900' },

    // Cover picker
    coverPicker: {
        width: 160, height: 160, borderRadius: 16, backgroundColor: INPUT_BG,
        borderWidth: 1, borderColor: BORDER_SUBTLE, overflow: 'hidden', marginTop: 12,
    },
    coverImg: { width: '100%', height: '100%' },
    coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    coverText: { color: SLATE_400, fontSize: 11, fontWeight: '800' },

    // Form
    label: { color: SLATE_400, fontSize: 11, fontWeight: '900', marginBottom: 12, letterSpacing: 1 },
    labelInline: { color: SLATE_400, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    input: {
        backgroundColor: INPUT_BG, color: '#fff', borderRadius: 16,
        padding: 16, fontSize: 14, fontWeight: '600', borderWidth: 1, borderColor: BORDER_SUBTLE,
    },
    inputSmall: {
        backgroundColor: INPUT_BG, color: '#fff', borderRadius: 16,
        padding: 16, fontSize: 14, fontWeight: '600', borderWidth: 1, borderColor: BORDER_SUBTLE,
    },
    row: { flexDirection: 'row', marginTop: 20 },
    genreScroll: { marginBottom: 16 },
    chip: {
        backgroundColor: INPUT_BG, paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: BORDER_SUBTLE,
    },
    chipActive: { backgroundColor: GOLD, borderColor: GOLD },
    chipText: { color: SLATE_400, fontSize: 12, fontWeight: '800' },
    chipTextActive: { color: '#000' },

    // Tags
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    tagChip: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    tagText: { color: '#fff', fontSize: 10, fontWeight: '700' },

    // Monetization
    licensePicker: { gap: 8, marginBottom: 20 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    
    // Multi-license styles
    licenseCard: {
        backgroundColor: INPUT_BG,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: BORDER_SUBTLE,
        padding: 4,
    },
    licenseCardActive: {
        borderColor: NEON_YELLOW,
    },
    licenseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: SLATE_400,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxActive: {
        backgroundColor: NEON_YELLOW,
        borderColor: NEON_YELLOW,
    },
    licenseName: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    licenseDescription: {
        color: SLATE_400,
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: BORDER_SUBTLE,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    priceLabel: {
        color: NEON_YELLOW,
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 4,
    },
    dualPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: BORDER_SUBTLE,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    priceColumn: {
        flex: 1,
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: BORDER_SUBTLE,
        marginHorizontal: 15,
    },
    priceInputSmall: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
        textAlign: 'right',
        minWidth: 80,
    },

    // Footer
    footer: { paddingHorizontal: 16, marginTop: 20 },
    legalText: { color: SLATE_400, fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
    legalLink: { color: GOLD, fontWeight: '800' },
    publishBtn: {
        backgroundColor: NEON_YELLOW, paddingVertical: 20, borderRadius: 16,
        alignItems: 'center', shadowColor: NEON_YELLOW, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
    },
    publishBtnText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 1 },

    // Upload Progress Overlay
    progressOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center', alignItems: 'center', padding: 32,
    },
    progressCard: {
        backgroundColor: '#111', borderRadius: 32, padding: 40,
        width: '100%', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(204,255,0,0.15)',
        shadowColor: NEON_YELLOW, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15, shadowRadius: 30,
    },
    progressIconCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(204,255,0,0.08)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    progressTitle: {
        color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1, marginBottom: 8,
    },
    progressSubtitle: {
        color: SLATE_400, fontSize: 13, fontWeight: '600', marginBottom: 28, textAlign: 'center',
    },
    progressBarContainer: {
        width: '100%', height: 8, backgroundColor: '#1A1A1A',
        borderRadius: 4, overflow: 'hidden', marginBottom: 12,
    },
    progressBarFill: {
        height: '100%', backgroundColor: NEON_YELLOW, borderRadius: 4,
    },
    progressPercent: {
        color: NEON_YELLOW, fontSize: 28, fontWeight: '900', letterSpacing: -1, marginBottom: 24,
    },
    phaseRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    phaseDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: '#333', borderWidth: 1, borderColor: '#444',
    },
    phaseDotActive: {
        backgroundColor: NEON_YELLOW, borderColor: NEON_YELLOW,
    },
    phaseDotDone: {
        backgroundColor: NEON_YELLOW, borderColor: NEON_YELLOW,
    },
    phaseText: {
        color: SLATE_400, fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
    },
    phaseLine: {
        width: 20, height: 1, backgroundColor: '#333',
    },
});
