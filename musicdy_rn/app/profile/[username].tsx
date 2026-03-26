import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, Animated, Image, TouchableOpacity,
    Dimensions, RefreshControl, ActivityIndicator, Linking, Alert, Share, ScrollView
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '@/src/api/client';
import { Skeleton } from '@/src/components/common/Skeleton';

const { width } = Dimensions.get('window');
const GRID_SIZE = width / 3;
const HEADER_MAX_HEIGHT = 160;
const HEADER_MIN_HEIGHT = 100;

const APP_YELLOW = '#FFDE03';

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
}

type Tab = 'beats' | 'songs' | 'collabs' | 'saved';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const fetchPublicProfile = async (username: string): Promise<Profile> => {
    const res = await apiClient.get(`/users/profile/${username}`);
    return res.data;
};

const fetchCategoryPosts = async (params: any): Promise<Post[]> => {
    const res = await apiClient.get('/posts/', { params });
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

const PostThumb = ({ post, isPinned, onPress }: { post: Post; isPinned?: boolean; onPress: () => void }) => {
    const isVideo = post.tipo_contenido === 'video';
    const hasPrice = post.licencias && Object.keys(post.licencias).length > 0;

    return (
        <TouchableOpacity style={styles.thumb} onPress={onPress} activeOpacity={0.85}>
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
                {isPinned && <View style={[styles.badge, { backgroundColor: APP_YELLOW }]}><Ionicons name="pin" size={10} color="#000" /></View>}
                {hasPrice && <View style={[styles.badge, { backgroundColor: APP_YELLOW }]}><Ionicons name="cart" size={10} color="#000" /></View>}
                {isVideo && <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}><Ionicons name="videocam" size={10} color="#fff" /></View>}
            </View>
        </TouchableOpacity>
    );
};

const ProfileSkeleton = () => (
    <View style={styles.container}>
        <Skeleton width="100%" height={160} borderRadius={0} />
        <View style={styles.headerRow}>
            <Skeleton width={80} height={80} borderRadius={15} style={{ borderWidth: 3, borderColor: '#000' }} />
            <View style={styles.nameBlock}>
                <Skeleton width={120} height={20} style={{ marginBottom: 6 }} />
                <Skeleton width={80} height={14} />
            </View>
        </View>
        <View style={styles.bioBlock}>
            <Skeleton width="90%" height={14} style={{ marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <Skeleton width={100} height={36} borderRadius={8} />
                <Skeleton width={36} height={36} borderRadius={8} />
            </View>
        </View>
    </View>
);

// ─── Screen ─────────────────────────────────────────────────────────────────────

export default function PublicProfileScreen() {
    const { username: paramUsername } = useLocalSearchParams<{ username: string }>();
    const { user: currentUser } = useAuthStore();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<Tab>('beats');
    const [refreshing, setRefreshing] = useState(false);
    const scrollY = useRef(new Animated.Value(0)).current;

    const { data: profile, refetch: refetchProfile, isLoading, error } = useQuery({
        queryKey: ['publicProfile', paramUsername],
        queryFn: () => fetchPublicProfile(paramUsername),
        enabled: !!paramUsername,
    });

    const p = profile as Profile;
    const accent = p?.accent_color || APP_YELLOW;

    const { data: beats = [], refetch: refetchBeats } = useQuery({
        queryKey: ['publicBeats', p?.id],
        queryFn: () => fetchCategoryPosts({ usuario_id: p.id, tipo_contenido: 'beat' }),
        enabled: !!p?.id && activeTab === 'beats',
    });

    const { data: songs = [], refetch: refetchSongs } = useQuery({
        queryKey: ['publicSongs', p?.id],
        queryFn: () => fetchCategoryPosts({ usuario_id: p.id, tipo_contenido: 'own_music' }),
        enabled: !!p?.id && activeTab === 'songs',
    });

    const { data: collabs = [], refetch: refetchCollabs } = useQuery({
        queryKey: ['userCollabs', paramUsername],
        queryFn: () => fetchCollabs(paramUsername as string),
        enabled: !!paramUsername && activeTab === 'collabs',
    });

    const { data: saved = [], refetch: refetchSaved } = useQuery({
        queryKey: ['userSaved', paramUsername],
        queryFn: () => fetchSaved(paramUsername as string),
        enabled: !!paramUsername && activeTab === 'saved',
    });

    // Mutations
    const followMutation = useMutation({
        mutationFn: async (userId: number) => {
            const res = await apiClient.post(`/users/${userId}/follow`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['publicProfile', paramUsername] });
        },
        onError: () => { Alert.alert("Error", "No se pudo realizar la acción."); }
    });

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.allSettled([refetchProfile(), refetchBeats(), refetchSongs(), refetchCollabs(), refetchSaved()]);
        setRefreshing(false);
    }, [refetchProfile, refetchBeats, refetchSongs, refetchCollabs, refetchSaved]);

    const activePosts = useMemo(() => {
        switch (activeTab) {
            case 'beats': return beats;
            case 'songs': return songs;
            case 'collabs': return collabs;
            case 'saved': return saved;
            default: return [];
        }
    }, [activeTab, beats, songs, collabs, saved]);

    const headerHeight = scrollY.interpolate({
        inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
        outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
        extrapolate: 'clamp',
    });

    if (isLoading && !profile) return <ProfileSkeleton />;

    if (error || !profile) {
        return (
            <View style={styles.centered}>
                <Ionicons name="alert-circle-outline" size={48} color="#333" />
                <Text style={{ color: '#666', marginTop: 12 }}>Usuario no encontrado</Text>
            </View>
        );
    }

    const avatarUri = p.foto_perfil?.startsWith('http') ? p.foto_perfil : null;
    const bannerUri = p.banner_image?.startsWith('http') ? p.banner_image : null;

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
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                </Animated.View>

                {/* INFO */}
                <View style={styles.headerRow}>
                    <View style={styles.avatarContainer}>
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}><Ionicons name="person" size={34} color="#555" /></View>
                        )}
                    </View>
                    <View style={styles.nameBlock}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Text style={styles.displayName}>{p.nombre_artistico || p.username}</Text>
                            <VerifiedBadge type={p.verified_type} />
                        </View>
                        <Text style={styles.usernameText}>@{p.username}</Text>
                    </View>
                </View>

                <View style={styles.bioBlock}>
                    <Text style={styles.bio}>{p.bio || "Este artista aún no tiene biografía."}</Text>

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.mainBtn, p.is_following && styles.followingBtn, { backgroundColor: p.is_following ? '#1a1a1a' : accent }]}
                            onPress={() => followMutation.mutate(p.id)}
                            disabled={followMutation.isPending}
                        >
                            <Text style={[styles.mainBtnText, { color: p.is_following ? '#fff' : '#000' }]}>{p.is_following ? 'Siguiendo' : 'Seguir'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.iconBtnAction}
                            onPress={async () => {
                                try {
                                    const res = await apiClient.post(`/chat/start/${p.id}`);
                                    router.push(`/chat/${res.data.convo_id}`);
                                } catch (e) {
                                    Alert.alert("Error", "No se pudo iniciar el chat");
                                }
                            }}
                        >
                            <Ionicons name="mail-outline" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

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
                        <View style={styles.qDivider} />
                        <View style={styles.qStat}>
                            <Text style={styles.qStatVal}>{p.total_plays}</Text>
                            <Text style={styles.qStatLabel}>Plays</Text>
                        </View>
                    </View>
                </View>

                {/* TABS */}
                <View style={[styles.tabsScrollContainer, { borderBottomWidth: 0.5, borderColor: '#1a1a1a' }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsInner}>
                        {(!p.profile_sections || p.profile_sections.beats) && (
                            <TouchableOpacity style={[styles.tab, activeTab === 'beats' && { borderBottomWidth: 2, borderBottomColor: accent }]} onPress={() => setActiveTab('beats')}>
                                <MaterialCommunityIcons name="music-clef-treble" size={20} color={activeTab === 'beats' ? accent : '#555'} />
                                <Text style={[styles.tabText, { color: activeTab === 'beats' ? accent : '#444' }]}>BEATS</Text>
                            </TouchableOpacity>
                        )}
                        {(!p.profile_sections || p.profile_sections.songs) && (
                            <TouchableOpacity style={[styles.tab, activeTab === 'songs' && { borderBottomWidth: 2, borderBottomColor: accent }]} onPress={() => setActiveTab('songs')}>
                                <MaterialCommunityIcons name="music-note" size={20} color={activeTab === 'songs' ? accent : '#555'} />
                                <Text style={[styles.tabText, { color: activeTab === 'songs' ? accent : '#444' }]}>CANCIONES</Text>
                            </TouchableOpacity>
                        )}
                        {(!p.profile_sections || p.profile_sections.collabs) && (
                            <TouchableOpacity style={[styles.tab, activeTab === 'collabs' && { borderBottomWidth: 2, borderBottomColor: accent }]} onPress={() => setActiveTab('collabs')}>
                                <MaterialCommunityIcons name="account-group" size={20} color={activeTab === 'collabs' ? accent : '#555'} />
                                <Text style={[styles.tabText, { color: activeTab === 'collabs' ? accent : '#444' }]}>COLLABS</Text>
                            </TouchableOpacity>
                        )}
                        {(!p.profile_sections || p.profile_sections.saved) && (
                            <TouchableOpacity style={[styles.tab, activeTab === 'saved' && { borderBottomWidth: 2, borderBottomColor: accent }]} onPress={() => setActiveTab('saved')}>
                                <MaterialCommunityIcons name="bookmark-outline" size={20} color={activeTab === 'saved' ? accent : '#555'} />
                                <Text style={[styles.tabText, { color: activeTab === 'saved' ? accent : '#444' }]}>GUARDADOS</Text>
                            </TouchableOpacity>
                        )}
                        {p.profile_sections?.stats && (
                            <TouchableOpacity style={[styles.tab, activeTab as any === 'stats' && { borderBottomWidth: 2, borderBottomColor: accent }]} onPress={() => setActiveTab('stats' as any)}>
                                <MaterialCommunityIcons name="chart-timeline-variant" size={20} color={activeTab as any === 'stats' ? accent : '#555'} />
                                <Text style={[styles.tabText, { color: activeTab as any === 'stats' ? accent : '#444' }]}>STATS</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>

                {/* GRID */}
                <View style={styles.contentArea}>
                    {activePosts.length === 0 ? (
                        <View style={styles.empty}>
                            <Ionicons name="cube-outline" size={40} color="#222" />
                            <Text style={styles.emptyText}>Sin contenido público</Text>
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
                    )}
                </View>
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    centered: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
    banner: { width: '100%', position: 'relative' },
    bannerGradient: { ...StyleSheet.absoluteFillObject },
    backBtn: { position: 'absolute', top: 50, left: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 },

    headerRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, marginTop: -35, gap: 15 },
    avatarContainer: { position: 'relative' },
    avatar: { width: 85, height: 85, borderRadius: 15, borderWidth: 3, borderColor: '#000', backgroundColor: '#111' },
    avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },

    nameBlock: { paddingBottom: 5 },
    displayName: { fontSize: 20, fontWeight: '900', color: '#fff' },
    usernameText: { fontSize: 13, color: APP_YELLOW, fontWeight: '600' },

    bioBlock: { padding: 16 },
    bio: { color: '#888', fontSize: 14, lineHeight: 20, marginBottom: 15 },
    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    mainBtn: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    mainBtnText: { fontWeight: '800', fontSize: 14 },
    followingBtn: { borderWidth: 1, borderColor: '#222' },
    iconBtnAction: { width: 40, height: 40, backgroundColor: '#111', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#222' },

    quickStats: { flexDirection: 'row', gap: 20, alignItems: 'center' },
    qStat: { alignItems: 'flex-start' },
    qStatVal: { color: '#fff', fontSize: 16, fontWeight: '800' },
    qStatLabel: { color: '#555', fontSize: 11 },
    qDivider: { width: 1, height: 15, backgroundColor: '#222' },

    tabsScrollContainer: { backgroundColor: '#000', marginTop: 10 },
    tabsInner: { paddingHorizontal: 10 },
    tab: { paddingHorizontal: 15, paddingVertical: 12, minWidth: 90, alignItems: 'center', gap: 2 },
    tabText: { fontSize: 9, fontWeight: '700' },

    contentArea: { minHeight: 400 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    thumb: { width: GRID_SIZE, height: GRID_SIZE },
    thumbImg: { width: '100%', height: '100%', backgroundColor: '#050505' },
    thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    thumbOverlay: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
    thumbPlays: { fontSize: 9, color: '#fff', fontWeight: '700' },
    badgesContainer: { position: 'absolute', top: 5, right: 5, gap: 3 },
    badge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
    emptyText: { color: '#333', fontSize: 13, fontWeight: '600' },
});
