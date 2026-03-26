import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, Animated, Image, TouchableOpacity,
    Dimensions, RefreshControl, ActivityIndicator, Linking, Alert, Share, ScrollView
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { apiClient } from '@/src/api/client';
import { Skeleton } from '@/src/components/common/Skeleton';

const { width } = Dimensions.get('window');
const GRID_SIZE = width / 3;
const HEADER_MAX_HEIGHT = 160;
const HEADER_MIN_HEIGHT = 100;

// Characteristic App Color: Industrial Yellow
const APP_YELLOW = '#FFD700';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Profile {
    id: number;
    username: string;
    nombre_artistico?: string;
    bio: string;
    foto_perfil?: string | null;
    banner_image?: string | null;
    verified_type: string;
    followers_count: number;
    following_count: number;
    total_plays: number;
    total_likes: number;
    accent_color?: string | null;
    website?: string | null;
    instagram?: string | null;
    youtube?: string | null;
    spotify?: string | null;
    tiktok?: string | null;
    genres?: string[];
    pinned_posts?: number[];
    is_own_profile: boolean;
    is_following: boolean;
    profile_sections?: { [key: string]: boolean };
}

interface Post {
    id: number;
    titulo: string;
    cover_url?: string | null;
    plays: number;
    tipo_contenido?: string;
    licencias?: any;
    visibilidad?: string;
}

type Tab = 'beats' | 'songs' | 'purchased' | 'collabs' | 'saved' | 'hidden' | 'stats';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const fetchProfile = async (): Promise<Profile> => {
    const res = await apiClient.get('/users/me/profile');
    return res.data;
};

const fetchCategoryPosts = async (params: any): Promise<Post[]> => {
    const res = await apiClient.get('/posts/', { params });
    return res.data;
};

const fetchPurchased = async (): Promise<Post[]> => {
    const res = await apiClient.get('/posts/me/purchased');
    return res.data;
};

const fetchCollabs = async (username: string): Promise<Post[]> => {
    const res = await apiClient.get(`/users/${username}/collaborations`);
    return res.data;
};

const fetchSaved = async (username: string): Promise<Post[]> => {
    const res = await apiClient.get(`/users/${username}/saved`);
    return res.data;
};

const fetchAnalytics = async (): Promise<any> => {
    const res = await apiClient.get('/users/me/analytics');
    return res.data;
};

// ─── Sub-components ─────────────────────────────────────────────────────────────

const VerifiedBadge = ({ type }: { type: string }) => {
    if (!type || type === 'none') return null;
    return (
        <Ionicons
            name={type === 'official' ? 'checkmark-circle' : 'star'}
            size={14}
            color={type === 'official' ? '#FFD700' : APP_YELLOW}
        />
    );
};

const PostThumb = ({ post, isPinned, onPress, onLongPress }: { post: Post; isPinned?: boolean; onPress: () => void; onLongPress?: () => void }) => {
    const isVideo = post.tipo_contenido === 'video';
    const hasPrice = post.licencias && Object.keys(post.licencias).length > 0;

    return (
        <TouchableOpacity style={styles.thumb} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.85}>
            {post.cover_url ? (
                <Image source={{ uri: post.cover_url }} style={styles.thumbImg} />
            ) : (
                <View style={[styles.thumbImg, styles.thumbPlaceholder]}>
                    <Ionicons name="musical-note" size={22} color="#444" />
                </View>
            )}
            <View style={styles.thumbOverlay}>
                <Ionicons name="play" size={10} color="#fff" />
                <Text style={styles.thumbPlays}>{post.plays}</Text>
            </View>

            <View style={styles.badgesContainer}>
                {isPinned && (
                    <View style={[styles.badge, styles.badgePin]}>
                        <Ionicons name="pin" size={10} color="#fff" />
                    </View>
                )}
                {hasPrice && (
                    <View style={[styles.badge, styles.badgePrice]}>
                        <Ionicons name="cart" size={10} color="#000" />
                    </View>
                )}
                {isVideo && (
                    <View style={[styles.badge, styles.badgeVideo]}>
                        <Ionicons name="videocam" size={10} color="#fff" />
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const StatItem = ({ value, label, icon, color }: { value: string | number; label: string; icon: string; color: string }) => (
    <View style={styles.statBox}>
        <View style={[styles.statIconCircle, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View>
            <Text style={styles.statBoxVal}>{value}</Text>
            <Text style={styles.statBoxLabel}>{label}</Text>
        </View>
    </View>
);

const StatsTab = ({ profile, analytics, accent }: { profile: Profile; analytics: any; accent: string }) => {
    const kpis = analytics?.kpis || {};
    const trends = analytics?.trends || [];
    
    // Normalize trends to fit the 10-bar chart mock better if possible, 
    // or just show the last 7 days.
    const barData = trends.length > 0 ? trends.map((t: any) => t.count) : [0,0,0,0,0,0,0];
    const maxVal = Math.max(...barData, 1);

    return (
        <View style={styles.statsTabContainer}>
            <Text style={styles.statsMainTitle}>Rendimiento del Perfil</Text>

            <View style={styles.statsGrid}>
                <StatItem value={kpis.total_plays || profile.total_plays} label="Reproducciones" icon="play-circle-outline" color="#03A9F4" />
                <StatItem value={profile.total_likes} label="Fans Totales" icon="flame-outline" color="#FF5252" />
                <StatItem value={kpis.followers || profile.followers_count} label="Seguidores" icon="people-outline" color={accent} />
                <StatItem value={kpis.total_sales || 0} label="Ventas Totales" icon="cash-outline" color="#2ECC71" />
            </View>

            <View style={[styles.chartMock, { borderColor: `${accent}40` }]}>
                <Text style={{ color: '#555', fontSize: 12, marginBottom: 15 }}>Crecimiento de Audiencia (Últimos 7 días)</Text>
                <View style={styles.barsRow}>
                    {barData.map((h: number, i: number) => {
                        const heightPercent = (h / maxVal) * 100;
                        return (
                            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                                <View style={[styles.bar, { 
                                    height: Math.max(heightPercent, 5), 
                                    backgroundColor: i === barData.length - 1 ? accent : '#1E293B' 
                                }]} />
                                <Text style={{ color: '#333', fontSize: 6, marginTop: 4 }}>{trends[i]?.date?.split('-').slice(1).join('/') || '-'}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            {analytics?.top_tracks?.length > 0 && (
                <View style={{ marginTop: 25 }}>
                    <Text style={[styles.statsMainTitle, { fontSize: 15, marginBottom: 12 }]}>Top Beats</Text>
                    {analytics.top_tracks.map((track: any, idx: number) => (
                        <View key={track.id} style={styles.topTrackRow}>
                            <Text style={styles.topTrackRank}>#{idx + 1}</Text>
                            <Text style={styles.topTrackName} numberOfLines={1}>{track.title}</Text>
                            <Text style={styles.topTrackPlays}>{track.plays} plays</Text>
                        </View>
                    ))}
                </View>
            )}

            <TouchableOpacity style={[styles.fullStatsBtn, { backgroundColor: accent }]}>
                <Text style={styles.fullStatsText}>Ver Analytics Detallados</Text>
                <Ionicons name="arrow-forward" size={16} color="#000" />
            </TouchableOpacity>
        </View>
    );
};

const AudienceTab = ({ audienceData, accent }: { audienceData: any; accent: string }) => {
    const renderDistributionBar = (label: string, percentage: number, color: string) => (
        <View style={styles.distRow} key={label}>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={styles.distLabel}>{label}</Text>
                <Text style={styles.distValue}>{percentage}%</Text>
            </View>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
            </View>
        </View>
    );

    return (
        <View style={styles.statsTabContainer}>
            <View style={styles.audienceHeader}>
                <Text style={styles.statsMainTitle}>Alcance de Audiencia</Text>
                <View style={styles.totalAudienceBox}>
                    <Text style={styles.totalAudienceVal}>{audienceData.total_spectators.toLocaleString()}</Text>
                    <Text style={styles.totalAudienceLabel}>Espectadores Únicos</Text>
                </View>
            </View>

            {/* Retention & Status */}
            <View style={styles.statsGrid}>
                <View style={[styles.statBox, { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
                    <Text style={styles.statBoxLabel}>Tipos de Espectadores</Text>
                    <View style={{ width: '100%', gap: 8 }}>
                        {renderDistributionBar('Nuevos', audienceData.retention.new, '#CCFF00')}
                        {renderDistributionBar('Recurrentes', audienceData.retention.recurring, accent)}
                    </View>
                </View>
                <View style={[styles.statBox, { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
                    <Text style={styles.statBoxLabel}>Estado de Suscripción</Text>
                    <View style={{ width: '100%', gap: 8 }}>
                        {renderDistributionBar('Seguidores', audienceData.subscription.following, accent)}
                        {renderDistributionBar('No seguidores', audienceData.subscription.not_following, '#334155')}
                    </View>
                </View>
            </View>

            {/* Demographics: Gender & Age */}
            <View style={styles.demoSection}>
                <Text style={[styles.statsMainTitle, { fontSize: 16, marginBottom: 15 }]}>Demografía</Text>
                <View style={styles.demoGrid}>
                    <View style={styles.demoBox}>
                        <Text style={styles.demoTitle}>Distribución de Sexo</Text>
                        {audienceData.gender.map((g: any) => renderDistributionBar(g.label, g.value, g.label === 'Hombres' ? '#03A9F4' : '#FF5252'))}
                    </View>
                    <View style={styles.demoBox}>
                        <Text style={styles.demoTitle}>Rango de Edad</Text>
                        <View style={styles.ageBars}>
                            {audienceData.age_range.map((a: any, i: number) => (
                                <View key={a.label} style={{ alignItems: 'center', flex: 1 }}>
                                    <View style={[styles.ageBar, { height: (a.value / 100) * 80, backgroundColor: i === 1 ? accent : '#1E293B' }]} />
                                    <Text style={styles.ageLabel}>{a.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </View>

            {/* Geographic */}
            <View style={styles.locationSection}>
                <Text style={[styles.statsMainTitle, { fontSize: 16, marginBottom: 15 }]}>Ubicación Geográfica</Text>
                <View style={styles.locationList}>
                    {audienceData.locations.map((loc: any, idx: number) => (
                        <View key={loc.country} style={styles.locationRow}>
                            <Text style={styles.locationRank}>{idx + 1}</Text>
                            <Text style={styles.locationName}>{loc.country}</Text>
                            <View style={[styles.locationProgress, { flex: loc.value / 100 }]}>
                                <View style={[styles.locationProgressFill, { backgroundColor: accent }]} />
                            </View>
                            <Text style={styles.locationVal}>{loc.value}%</Text>
                        </View>
                    ))}
                </View>
            </View>

            <TouchableOpacity style={styles.privacyNote}>
                <Ionicons name="information-circle-outline" size={14} color="#64748B" />
                <Text style={styles.privacyText}>Datos basados en perfiles completados y actividad de red.</Text>
            </TouchableOpacity>
        </View>
    );
};

const ProfileSkeleton = () => (
    <View style={styles.container}>
        <Skeleton width="100%" height={160} borderRadius={0} />
        <View style={styles.headerRow}>
            <Skeleton width={80} height={80} borderRadius={40} style={{ borderWidth: 3, borderColor: '#000' }} />
            <View style={styles.nameBlock}>
                <Skeleton width={120} height={20} style={{ marginBottom: 6 }} />
                <Skeleton width={80} height={14} />
            </View>
        </View>
        <View style={styles.bioBlock}>
            <Skeleton width="90%" height={14} style={{ marginBottom: 6 }} />
            <Skeleton width="60%" height={14} style={{ marginBottom: 16 }} />
        </View>
        <View style={styles.tabsScroll}>
            {[1, 2, 3, 4, 5].map(i => <View key={i} style={styles.tab}><Skeleton width={20} height={20} /></View>)}
        </View>
        <View style={styles.grid}>
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} width={GRID_SIZE} height={GRID_SIZE} borderRadius={0} style={{ borderWidth: 0.5, borderColor: '#000' }} />)}
        </View>
    </View>
);

// ─── Screen ─────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<Tab>('beats');
    const [refreshing, setRefreshing] = useState(false);
    const scrollY = useRef(new Animated.Value(0)).current;

    const queryClient = useQueryClient();
    const { data: profile, refetch: refetchProfile, isLoading, error } = useQuery({
        queryKey: ['myProfile'],
        queryFn: fetchProfile,
        enabled: !!user,
        retry: 1,
        staleTime: 30_000,
    });

    const p: Profile = profile ?? {
        id: (user as any)?.id ?? 0,
        username: user?.username ?? '',
        nombre_artistico: (user as any)?.nombre_artistico ?? '',
        bio: (user as any)?.bio ?? '',
        foto_perfil: (user as any)?.foto_perfil ?? null,
        banner_image: null,
        verified_type: 'none',
        followers_count: 0,
        following_count: 0,
        total_plays: 0,
        total_likes: 0,
        is_own_profile: true,
        is_following: false,
    };

    const accent = p.accent_color || APP_YELLOW;

    // Queries for different tabs
    const { data: beats = [], refetch: refetchBeats } = useQuery({
        queryKey: ['userBeats', p.id],
        queryFn: () => fetchCategoryPosts({ usuario_id: p.id, tipo_contenido: 'beat' }),
        enabled: !!p.id && activeTab === 'beats',
    });

    const { data: songs = [], refetch: refetchSongs } = useQuery({
        queryKey: ['userSongs', p.id],
        queryFn: () => fetchCategoryPosts({ usuario_id: p.id, tipo_contenido: 'own_music' }),
        enabled: !!p.id && activeTab === 'songs',
    });

    const { data: purchased = [], refetch: refetchPurchased } = useQuery({
        queryKey: ['userPurchased'],
        queryFn: fetchPurchased,
        enabled: activeTab === 'purchased',
    });

    const { data: collabs = [], refetch: refetchCollabs } = useQuery({
        queryKey: ['userCollabs', p.username],
        queryFn: () => fetchCollabs(p.username),
        enabled: !!p.username && activeTab === 'collabs',
    });

    const { data: saved = [], refetch: refetchSaved } = useQuery({
        queryKey: ['userSaved', p.username],
        queryFn: () => fetchSaved(p.username),
        enabled: !!p.username && activeTab === 'saved',
    });

    const { data: hidden = [], refetch: refetchHidden } = useQuery({
        queryKey: ['userHidden', p.id],
        queryFn: () => fetchCategoryPosts({ usuario_id: p.id, visibilidad: 'private' }),
        enabled: !!p.id && activeTab === 'hidden',
    });

    const { data: analytics, refetch: refetchAnalytics } = useQuery({
        queryKey: ['userAnalytics'],
        queryFn: fetchAnalytics,
        enabled: !!user && activeTab === 'stats',
    });

    const audienceData = analytics?.audience || {
        total_spectators: 0,
        retention: { new: 0, recurring: 0 },
        subscription: { following: 0, not_following: 0 },
        gender: [],
        age_range: [],
        locations: []
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.allSettled([
            refetchProfile(),
            refetchBeats(),
            refetchSongs(),
            refetchPurchased(),
            refetchCollabs(),
            refetchSaved(),
            refetchHidden(),
            refetchAnalytics()
        ]);
        setRefreshing(false);
    }, [refetchProfile, refetchBeats, refetchSongs, refetchPurchased, refetchCollabs, refetchSaved, refetchHidden, refetchAnalytics]);

    const activePosts = useMemo(() => {
        switch (activeTab) {
            case 'beats': return beats;
            case 'songs': return songs;
            case 'purchased': return purchased;
            case 'collabs': return collabs;
            case 'saved': return saved;
            case 'hidden': return hidden;
            default: return [];
        }
    }, [activeTab, beats, songs, purchased, collabs, saved, hidden]);

    const onShare = async () => {
        try {
            await Share.share({
                message: `¡Mira el perfil de ${p.nombre_artistico || p.username} en Musicdy! https://musicdy.com/${p.username}`,
            });
        } catch (error) { console.log(error); }
    };

    // Parallax Interpolations
    const headerHeight = scrollY.interpolate({
        inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
        outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
        extrapolate: 'clamp',
    });

    if (isLoading && !profile) return <ProfileSkeleton />;

    const avatarUri = p.foto_perfil?.startsWith('http') ? p.foto_perfil : null;
    const bannerUri = p.banner_image?.startsWith('http') ? p.banner_image : null;

    const TabIcon = ({ name, active, label }: { name: string; active: boolean; label: string }) => (
        <TouchableOpacity
            style={[styles.tab, active && { borderBottomColor: accent, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(name as any)}
        >
            <View style={{ alignItems: 'center', gap: 2 }}>
                <MaterialCommunityIcons
                    name={
                        name === 'beats' ? 'music-clef-treble' :
                            name === 'songs' ? 'music-note' :
                                name === 'purchased' ? 'briefcase' :
                                    name === 'collabs' ? 'account-group' :
                                        name === 'saved' ? 'bookmark-outline' :
                                            name === 'hidden' ? 'eye-off-outline' : 'chart-timeline-variant'
                    }
                    size={22}
                    color={active ? accent : '#555'}
                />
                <Text style={{ fontSize: 9, color: active ? accent : '#444', fontWeight: active ? '700' : '400' }}>
                    {label.toUpperCase()}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
            >
                {/* BANNER */}
                <Animated.View style={[styles.banner, { height: headerHeight }]}>
                    {bannerUri ? (
                        <Image source={{ uri: bannerUri }} style={StyleSheet.absoluteFill} />
                    ) : (
                        <View style={[styles.bannerGradient, { backgroundColor: '#111' }]} />
                    )}
                    <View style={styles.bannerActions}>
                        <TouchableOpacity style={styles.iconBtn} onPress={onShare}>
                            <Ionicons name="share-outline" size={19} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings' as any)}>
                            <Ionicons name="settings-outline" size={19} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* INFO */}
                <View style={styles.headerRow}>
                    <View style={styles.avatarContainer}>
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}><Ionicons name="person" size={34} color="#555" /></View>
                        )}
                        <TouchableOpacity style={[styles.editBadge, { backgroundColor: accent }]} onPress={() => router.push('/profile/edit')}>
                            <Ionicons name="camera" size={11} color="#000" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.nameBlock}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Text style={styles.displayName}>{p.nombre_artistico || p.username}</Text>
                            <VerifiedBadge type={p.verified_type} />
                        </View>
                        <Text style={styles.usernameText}>@{p.username}</Text>
                        <Text style={styles.roleText}>Creador Musicdy</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsRow}>
                    <TouchableOpacity style={styles.editProfileBtn} onPress={() => router.push('/profile/edit')}>
                        <Text style={styles.editProfileBtnText}>Editar Perfil</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.shareProfileBtn} onPress={onShare}>
                        <Ionicons name="share-outline" size={16} color="#000" style={{ marginRight: 6 }} />
                        <Text style={styles.shareProfileBtnText}>Compartir</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.bioBlock}>
                    <Text style={styles.bio}>{p.bio || "Agregá una bio para que te conozcan..."}</Text>

                    <View style={styles.quickStats}>
                        <TouchableOpacity style={styles.qStat} onPress={() => router.push({ pathname: '/profile/follows' as any, params: { userId: p.id, type: 'followers' } })}>
                            <Text style={styles.qStatVal}>{p.followers_count}</Text>
                            <Text style={styles.qStatLabel}>Seguidores</Text>
                        </TouchableOpacity>
                        <View style={styles.qDivider} />
                        <TouchableOpacity style={styles.qStat} onPress={() => router.push({ pathname: '/profile/follows' as any, params: { userId: p.id, type: 'following' } })}>
                            <Text style={styles.qStatVal}>{p.following_count}</Text>
                            <Text style={styles.qStatLabel}>Siguiendo</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* TABS SCROLLABLE */}
                <View style={[styles.tabsScrollContainer, { borderBottomColor: '#1a1a1a', borderBottomWidth: 0.5 }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsInner}>
                        <TabIcon name="stats" active={activeTab === 'stats'} label="Stats" />
                        <TabIcon name="beats" active={activeTab === 'beats'} label="Beats" />
                        <TabIcon name="songs" active={activeTab === 'songs'} label="Canciones" />
                        <TabIcon name="purchased" active={activeTab === 'purchased'} label="Compras" />
                        <TabIcon name="collabs" active={activeTab === 'collabs'} label="Collabs" />
                        <TabIcon name="saved" active={activeTab === 'saved'} label="Guardados" />
                        <TabIcon name="hidden" active={activeTab === 'hidden'} label="Oculto" />
                    </ScrollView>
                </View>

                {/* CONTENT */}
                <View style={styles.contentArea}>
                    {activeTab === 'stats' ? (
                        <View>
                            <StatsTab profile={p} analytics={analytics} accent={accent} />
                            <AudienceTab audienceData={audienceData} accent={accent} />
                        </View>
                    ) : (
                        activePosts.length === 0 ? (
                            <View style={styles.empty}>
                                <Ionicons name="cube-outline" size={40} color="#222" />
                                <Text style={styles.emptyText}>Nada por aquí todavía</Text>
                            </View>
                        ) : (
                            <View style={styles.grid}>
                                {activePosts.map((post) => (
                                    <PostThumb
                                        key={post.id}
                                        post={post}
                                        onPress={() => router.push({ pathname: '/(tabs)', params: { startPostId: post.id } })}
                                    />
                                ))}
                            </View>
                        )
                    )}
                </View>
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    banner: { width: '100%', position: 'relative' },
    bannerGradient: { ...StyleSheet.absoluteFillObject },
    bannerActions: { position: 'absolute', top: 50, right: 16, flexDirection: 'row', gap: 10 },
    iconBtn: { width: 36, height: 36, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

    headerRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, marginTop: -35, gap: 15 },
    avatarContainer: { position: 'relative' },
    // Stitch: rounded-full, border-4 border-primary, neon-glow-primary
    avatar: {
        width: 128, height: 128, borderRadius: 64,
        borderWidth: 4, borderColor: APP_YELLOW, backgroundColor: '#111',
        shadowColor: APP_YELLOW, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4, shadowRadius: 15, elevation: 8,
    },
    avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    // Stitch: PRO badge — bg neon-yellow, text black, rounded-full, bottom-right
    editBadge: {
        position: 'absolute', bottom: 4, right: 4,
        backgroundColor: '#CCFF00', paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: 9999, alignItems: 'center', justifyContent: 'center',
    },

    nameBlock: { paddingBottom: 5, alignItems: 'center' },
    displayName: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    usernameText: { fontSize: 14, color: APP_YELLOW, fontWeight: '600' },
    roleText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

    // Stitch: Action buttons — Editar Perfil (slate-800) + Compartir (gold glow)
    actionButtonsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 16 },
    editProfileBtn: {
        flex: 1, height: 48, borderRadius: 12, backgroundColor: '#1E293B',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#334155',
    },
    editProfileBtnText: { color: '#F1F5F9', fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
    shareProfileBtn: {
        flex: 1, height: 48, borderRadius: 12, backgroundColor: APP_YELLOW,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        shadowColor: APP_YELLOW, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4, shadowRadius: 15, elevation: 5,
    },
    shareProfileBtnText: { color: '#000', fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },

    bioBlock: { padding: 16 },
    bio: { color: '#94A3B8', fontSize: 14, lineHeight: 20, marginBottom: 15 },
    // Stitch: stats with rounded-xl, border-slate-800, bg-white/5, gold values
    quickStats: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    qStat: {
        flex: 1, alignItems: 'center', paddingVertical: 16,
        borderRadius: 12, borderWidth: 1, borderColor: '#1E293B',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    qStatVal: { color: APP_YELLOW, fontSize: 20, fontWeight: '800' },
    qStatLabel: { color: '#94A3B8', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
    qDivider: { width: 0, height: 0 },

    tabsScroll: { flexDirection: 'row', backgroundColor: '#000', marginTop: 10 },
    tabsScrollContainer: { backgroundColor: '#000', marginTop: 10 },
    tabsInner: { paddingHorizontal: 10 },
    tab: { paddingHorizontal: 15, paddingVertical: 12, minWidth: 80, alignItems: 'center' },

    contentArea: { minHeight: 400 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    thumb: { width: GRID_SIZE, height: GRID_SIZE, position: 'relative' },
    thumbImg: { width: '100%', height: '100%', backgroundColor: '#050505' },
    thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    thumbOverlay: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
    thumbPlays: { fontSize: 9, color: '#fff', fontWeight: '700' },

    badgesContainer: { position: 'absolute', top: 5, right: 5, gap: 3 },
    badge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    badgePin: { backgroundColor: APP_YELLOW },
    badgePrice: { backgroundColor: APP_YELLOW },
    badgeVideo: { backgroundColor: 'rgba(0,0,0,0.5)' },

    statsTabContainer: { padding: 20 },
    statsMainTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 20 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statBox: { width: (width - 55) / 2, backgroundColor: '#0F0F0F', padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    statBoxVal: { color: '#fff', fontSize: 18, fontWeight: '900' },
    statBoxLabel: { color: '#64748B', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },

    chartMock: { marginTop: 25, backgroundColor: '#0F0F0F', borderRadius: 24, padding: 15, borderWidth: 1 },
    barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, paddingTop: 10 },
    bar: { width: (width - 100) / 10, borderRadius: 4 },

    fullStatsBtn: {
        marginTop: 25, backgroundColor: APP_YELLOW, height: 48, borderRadius: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        shadowColor: APP_YELLOW, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4, shadowRadius: 15, elevation: 5,
    },
    fullStatsText: { color: '#000', fontWeight: '800', fontSize: 14 },

    topTrackRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0A0A', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    topTrackRank: { color: APP_YELLOW, fontWeight: '900', fontSize: 14, width: 30 },
    topTrackName: { color: '#fff', flex: 1, fontWeight: '600' },
    topTrackPlays: { color: '#64748B', fontSize: 12 },

    // Audience Styles
    audienceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    totalAudienceBox: { alignItems: 'flex-end' },
    totalAudienceVal: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -1 },
    totalAudienceLabel: { color: '#CCFF00', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

    distRow: { width: '100%', marginBottom: 10 },
    distLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
    distValue: { color: '#fff', fontSize: 10, fontWeight: '700' },
    progressBarBg: { height: 4, backgroundColor: '#1E293B', borderRadius: 2, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 2 },

    demoSection: { marginTop: 20 },
    demoGrid: { flexDirection: 'row', gap: 15 },
    demoBox: { flex: 1, backgroundColor: '#0F0F0F', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    demoTitle: { color: '#64748B', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 15 },

    ageBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, paddingTop: 10 },
    ageBar: { width: 12, borderRadius: 6 },
    ageLabel: { color: '#444', fontSize: 8, marginTop: 8, fontWeight: '600' },

    locationSection: { marginTop: 30 },
    locationList: { gap: 12 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    locationRank: { color: '#334155', fontSize: 12, fontWeight: '800', width: 20 },
    locationName: { color: '#fff', fontSize: 13, fontWeight: '600', width: 90 },
    locationProgress: { height: 4, backgroundColor: 'transparent' },
    locationProgressFill: { height: '100%', borderRadius: 2, width: '100%' },
    locationVal: { color: '#94A3B8', fontSize: 12, fontWeight: '700', width: 40, textAlign: 'right' },

    privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 30, opacity: 0.6 },
    privacyText: { color: '#64748B', fontSize: 10 },

    empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
    emptyText: { color: '#334155', fontSize: 13, fontWeight: '600' },
});
