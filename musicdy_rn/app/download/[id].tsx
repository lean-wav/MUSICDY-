import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Circle } from 'react-native-svg';
import { apiClient } from '@/src/api/client';
import { AppConfig } from '@/src/api/config';
import Toast from 'react-native-toast-message';

const GOLD = '#FFD700';
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function DownloadScreen() {
    const { id, postData } = useLocalSearchParams<{ id: string, postData?: string }>();
    const router = useRouter();

    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [totalSize, setTotalSize] = useState('0 MB');
    const [downloadedSize, setDownloadedSize] = useState('0 MB');
    
    // Animation for SVG circle stroke dashoffset
    const progressAnim = useRef(new Animated.Value(0)).current;

    // @ts-ignore
    const downloadResumableRef = useRef<any>(null);

    useEffect(() => {
        if (postData) {
            try {
                const parsedPost = JSON.parse(postData);
                setPost(parsedPost);
                setLoading(false);
                startDownload(parsedPost);
            } catch (e) {
                fallbackFetch();
            }
        } else {
            fallbackFetch();
        }
        
        return () => {
            if (downloadResumableRef.current) {
                downloadResumableRef.current.pauseAsync().catch(() => {});
            }
        };
    }, [id, postData]);

    const fallbackFetch = async () => {
        try {
            const res = await apiClient.get(`/posts/${id}`);
            setPost(res.data);
            startDownload(res.data);
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cargar la información del beat.' });
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const startDownload = async (postData: any) => {
        // En una app real, el backend debería devolver la URL firmada de alta calidad (archivo_original)
        const downloadUrl = AppConfig.getFullMediaUrl(postData.archivo_original || postData.archivo);
        if (!downloadUrl) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Archivo no disponible para descargar.' });
            return;
        }

        const ext = downloadUrl.split('.').pop()?.split('?')[0] || 'mp3';
        // @ts-ignore
        const fileUri = `${FileSystem.documentDirectory}${postData.titulo.replace(/[^a-zA-Z0-9]/g, '_')}_${postData.id}.${ext}`;

        // @ts-ignore
        const downloadResumable = FileSystem.createDownloadResumable(
            downloadUrl,
            fileUri,
            {},
            (downloadProgress) => {
                const pct = downloadProgress.totalBytesExpectedToWrite > 0 
                  ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite 
                  : 0;
                
                setProgress(Math.max(0, Math.min(100, pct * 100)));
                
                const downloadedMB = (downloadProgress.totalBytesWritten / (1024 * 1024)).toFixed(1);
                const totalMB = (downloadProgress.totalBytesExpectedToWrite / (1024 * 1024)).toFixed(1);
                
                setDownloadedSize(`${downloadedMB} MB`);
                setTotalSize(`${totalMB} MB`);

                Animated.timing(progressAnim, {
                    toValue: pct,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            }
        );

        downloadResumableRef.current = downloadResumable;

        try {
            const result = await downloadResumable.downloadAsync();
            if (result && result.status === 200) {
                Toast.show({ type: 'success', text1: 'Descarga Completa', text2: 'El beat ha sido guardado exitosamente.' });
                setTimeout(() => { router.back(); }, 1500);
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: 'Hubo un problema con la descarga.' });
            }
        } catch (e: any) {
            console.log('Descarga cancelada o fallida', e);
        }
    };

    const handleCancel = async () => {
        if (downloadResumableRef.current) {
            try {
                await downloadResumableRef.current.pauseAsync();
            } catch (e) {}
        }
        router.back();
    };

    const getScaleDisplay = (scale?: string) => {
        return scale ? scale.replace('_m', ' Minor').replace('_M', ' Major') : 'N/A';
    };

    // Circular Progress configuration
    const size = 260;
    const strokeWidth = 14;
    const center = size / 2;
    const radius = center - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;

    const strokeDashoffset = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, 0],
        extrapolate: 'clamp',
    });

    if (loading || !post) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={GOLD} />
            </View>
        );
    }

    const coverUri = AppConfig.getFullMediaUrl(post.cover_url);

    return (
        <View style={styles.container}>
            {/* Top Bar Logo */}
            <View style={styles.header}>
                <Ionicons name="menu" size={32} color={GOLD} />
                <Text style={styles.appLogo}>MUSICDY</Text>
                <View style={styles.profileIconPlaceholder} />
            </View>

            <View style={styles.content}>
                {/* Circular Progress */}
                <View style={styles.progressWrapper}>
                    <Svg width={size} height={size}>
                        {/* Background track */}
                        <Circle
                            stroke="#333"
                            cx={center}
                            cy={center}
                            r={radius}
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        {/* Animated fill */}
                        <AnimatedCircle
                            stroke={GOLD}
                            cx={center}
                            cy={center}
                            r={radius}
                            strokeWidth={strokeWidth}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            fill="none"
                            rotation="-90"
                            origin={`${center}, ${center}`}
                        />
                    </Svg>
                    <View style={styles.progressTextContainer}>
                        <Text style={styles.descargandoText}>DESCARGANDO...</Text>
                        <Text style={styles.percentageText}>{Math.round(progress)}%</Text>
                    </View>
                </View>

                {/* Beat Details Card */}
                <View style={styles.card}>
                    {/* Top Row: Image & Title */}
                    <View style={styles.cardHeader}>
                        {coverUri ? (
                            <Image source={{ uri: coverUri }} style={styles.coverImage} contentFit="cover" />
                        ) : (
                            <View style={[styles.coverImage, { backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' }]}>
                                <Ionicons name="musical-note" size={40} color={GOLD} />
                            </View>
                        )}
                        <View style={styles.titleWrapper}>
                            <Text style={styles.titleText}>{post.titulo}</Text>
                            <Text style={styles.artistText}>@{post.artista}</Text>
                        </View>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>TEMPO</Text>
                            <Text style={styles.statValue}>{post.bpm || '--'} BPM</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>KEY / SCALE</Text>
                            <Text style={styles.statValue}>{getScaleDisplay(post.escala)}</Text>
                        </View>
                    </View>

                    {/* Footer Row */}
                    <View style={styles.cardFooter}>
                        <View style={styles.tagsWrapper}>
                            <View style={styles.tagBadge}>
                                <Text style={styles.tagText}>LOSSLESS</Text>
                            </View>
                            <View style={styles.tagBadge}>
                                <Text style={styles.tagText}>24-BIT</Text>
                            </View>
                        </View>
                        <Text style={styles.sizeText}>
                            {downloadedSize} / {totalSize === '0.0 MB' ? '...' : totalSize}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Ionicons name="close-circle" size={20} color="#888" />
                <Text style={styles.cancelText}>CANCELAR DESCARGA</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 50, paddingHorizontal: 20, marginBottom: 20,
    },
    appLogo: { color: '#fff', fontSize: 20, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
    profileIconPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFE4B5' },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    
    progressWrapper: { alignItems: 'center', justifyContent: 'center', marginBottom: 50 },
    progressTextContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    descargandoText: { color: '#888', fontSize: 13, letterSpacing: 3, marginBottom: 4, fontWeight: '600' },
    percentageText: { color: '#fff', fontSize: 56, fontWeight: '900', textShadowColor: 'rgba(255,215,0,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },

    card: {
        width: '100%', backgroundColor: '#1A1A1A', borderRadius: 20, padding: 20,
        borderLeftWidth: 4, borderLeftColor: GOLD,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    coverImage: {
        width: 80, height: 80, borderRadius: 10,
        backgroundColor: '#222', marginRight: 16,
    },
    titleWrapper: { flex: 1, justifyContent: 'center' },
    titleText: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
    artistText: { color: GOLD, fontSize: 14, fontWeight: '600' },

    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    statBox: { flex: 1, backgroundColor: '#222', borderRadius: 12, padding: 16 },
    statLabel: { color: '#777', fontSize: 11, letterSpacing: 1.5, marginBottom: 8, fontWeight: '600' },
    statValue: { color: '#fff', fontSize: 18, fontWeight: '700' },

    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    tagsWrapper: { flexDirection: 'row', gap: 8 },
    tagBadge: { backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    tagText: { color: '#888', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    sizeText: { color: '#aaa', fontSize: 12, fontWeight: '600', letterSpacing: 1 },

    cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 40 },
    cancelText: { color: '#888', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
});
