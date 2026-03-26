import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
    Image, Dimensions, ActivityIndicator, ScrollView, RefreshControl
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Skeleton } from '@/src/components/common/Skeleton';

const { width } = Dimensions.get('window');

const COLORFUL_CATEGORIES = [
    { id: 'trap', name: 'Trap Argento', color: '#E91E63', image: 'https://images.unsplash.com/photo-1514525253361-b83a85f089c2?w=400&q=80', query: 'trap' },
    { id: 'reggaeton', name: 'Reggaeton Flow', color: '#009688', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&q=80', query: 'reggaeton' },
    { id: 'hiphop', name: 'Hip Hop Classics', color: '#8E24AA', image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&q=80', query: 'hip hop' },
    { id: 'pop', name: 'Pop Hits', color: '#7E57C2', image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&q=80', query: 'pop' },
    { id: 'lofi', name: 'Lo-Fi Chill', color: '#689F38', image: 'https://images.unsplash.com/photo-1459749411177-042180ce673c?w=400&q=80', query: 'lofi' },
    { id: 'drill', name: 'Drill Scene', color: '#F57C00', image: 'https://images.unsplash.com/photo-1496293455970-f8581aae0e3c?w=400&q=80', query: 'drill' },
    { id: 'electronic', name: 'Electronic', color: '#303F9F', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80', query: 'electronic' },
    { id: 'rb', name: 'R&B Soul', color: '#1976D2', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80', query: 'r&b' },
];

interface SearchResults {
    users: any[];
    posts: any[];
}

export default function ExploreScreen() {
    const [query, setQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // 1. Fetch recommendations for Video sections
    const { data: videos = [], isLoading: loadingVideos, refetch: refetchVideos } = useQuery({
        queryKey: ['exploreVideos'],
        queryFn: async () => {
            const res = await apiClient.get('/posts/?limit=6&tipo_contenido=video');
            return res.data;
        },
        enabled: query.length === 0,
    });

    // 2. Fetch "Episodes for You" (or just own_music)
    const { data: recommendations = [], isLoading: loadingRecs, refetch: refetchRecs } = useQuery({
        queryKey: ['exploreRecs'],
        queryFn: async () => {
            const res = await apiClient.get('/feed/recommendations?limit=6');
            return res.data;
        },
        enabled: query.length === 0,
    });

    // 3. Fetch recently played posts
    const { data: recentPlays = [], isLoading: loadingRecent, refetch: refetchRecent } = useQuery({
        queryKey: ['recentPlays'],
        queryFn: async () => {
            const res = await apiClient.get('/posts/me/recent?limit=6');
            return res.data;
        },
        enabled: query.length === 0,
    });

    // 4. Fetch trending by country
    const { data: countryTrending = [], isLoading: loadingCountry, refetch: refetchCountry } = useQuery({
        queryKey: ['countryTrending'],
        queryFn: async () => {
            const res = await apiClient.get('/feed/trending/country?limit=6');
            return res.data;
        },
        enabled: query.length === 0,
    });

    // 5. Search Query
    const { data: results, isLoading: searching } = useQuery<SearchResults>({
        queryKey: ['search', query],
        queryFn: async () => {
            const res = await apiClient.get(`/search/?q=${query}`);
            return res.data;
        },
        enabled: query.length > 2,
    });

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchVideos(), refetchRecs(), refetchRecent(), refetchCountry()]);
        setRefreshing(false);
    }, [refetchVideos, refetchRecs, refetchRecent, refetchCountry]);

    const handleCategoryPress = (tag: string) => {
        setQuery(tag);
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.searchRow}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={24} color="#000" style={{ marginLeft: 16 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="¿Qué querés escuchar?"
                        placeholderTextColor="#666"
                        value={query}
                        onChangeText={setQuery}
                        autoCorrect={false}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 8 }}>
                            <Ionicons name="close-circle" size={18} color="#000" />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity style={styles.cameraIcon}>
                    <Ionicons name="camera-outline" size={28} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderPosterCard = (item: any) => (
        <TouchableOpacity 
            key={item.id} 
            style={styles.posterCard}
            onPress={() => router.push({ pathname: '/(tabs)', params: { startPostId: item.id } })}
        >
            <Image source={{ uri: item.cover_url }} style={styles.posterImg} />
            <Text style={styles.posterText} numberOfLines={2}>{item.titulo}</Text>
        </TouchableOpacity>
    );

    const renderCategoryCard = (cat: any) => (
        <TouchableOpacity 
            key={cat.id} 
            style={[styles.catCard, { backgroundColor: cat.color }]}
            onPress={() => handleCategoryPress(cat.query)}
        >
            <Text style={styles.catName}>{cat.name}</Text>
            <Image source={{ uri: cat.image }} style={styles.catImg} />
        </TouchableOpacity>
    );

    const renderDefaultView = () => (
        <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
            {/* Recently Played */}
            {recentPlays.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recién escuchados</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.postersContainer}>
                        {loadingRecent ? (
                            [1,2,3].map(i => <View key={i} style={[styles.posterCard, { backgroundColor: '#1A1A1A' }]} />)
                        ) : (
                            recentPlays.map(renderPosterCard)
                        )}
                    </ScrollView>
                </View>
            )}

            {/* Country Trending */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tendencias en tu país 🇦🇷</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.postersContainer}>
                    {loadingCountry ? (
                        [1,2,3].map(i => <View key={i} style={[styles.posterCard, { backgroundColor: '#1A1A1A' }]} />)
                    ) : (
                        countryTrending.map(renderPosterCard)
                    )}
                </ScrollView>
            </View>

            {/* Similar / For You */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recomendados para vos ✨</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.postersContainer}>
                    {loadingRecs ? (
                        [1,2,3].map(i => <View key={i} style={[styles.posterCard, { backgroundColor: '#1A1A1A' }]} />)
                    ) : (
                        recommendations.map(renderPosterCard)
                    )}
                </ScrollView>
            </View>

            {/* Explore Musical Videos */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Explorá videos musicales</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.postersContainer}>
                    {loadingVideos ? (
                        [1,2,3].map(i => <View key={i} style={[styles.posterCard, { backgroundColor: '#1A1A1A' }]} />)
                    ) : (
                        videos.map(renderPosterCard)
                    )}
                </ScrollView>
            </View>

            {/* Explore All (Spotify Grid Style) */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Explorar todo</Text>
                <View style={styles.catGrid}>
                    {COLORFUL_CATEGORIES.map(renderCategoryCard)}
                </View>
            </View>
        </ScrollView>
    );

    const renderResults = () => {
        if (searching) return <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />;
        
        const posts = results?.posts ?? [];
        const users = results?.users ?? [];

        if (posts.length === 0 && users.length === 0) {
            return (
                <View style={styles.centered}>
                    <Ionicons name="search-outline" size={48} color="#1E293B" />
                    <Text style={{ color: '#64748B', marginTop: 12 }}>No encontramos lo que buscás</Text>
                </View>
            );
        }

        return (
            <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}>
                {users.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Artistas</Text>
                        {users.map((u: any) => (
                            <TouchableOpacity key={u.id} style={styles.userItem} onPress={() => router.push(`/profile/${u.username}`)}>
                                <Image source={{ uri: u.foto_perfil }} style={styles.userAvatar} />
                                <View>
                                    <Text style={styles.userDisplayName}>{u.nombre_artistico || u.username}</Text>
                                    <Text style={styles.userUsername}>@{u.username}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
                {posts.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Beats & Tracks</Text>
                        {posts.map((post: any) => (
                            <TouchableOpacity 
                                key={post.id} 
                                style={styles.beatItem}
                                onPress={() => router.push({ pathname: '/(tabs)', params: { startPostId: post.id } })}
                            >
                                <Image source={{ uri: post.cover_url }} style={styles.beatThumb} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.beatTitle} numberOfLines={1}>{post.titulo}</Text>
                                    <Text style={styles.beatArtist}>@{post.artista}</Text>
                                </View>
                                <Ionicons name="play-circle" size={24} color="#fff" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            {renderHeader()}
            <View style={{ flex: 1 }}>
                {query.length >= 2 ? renderResults() : renderDefaultView()}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { paddingTop: 60, paddingBottom: 16, backgroundColor: '#000' },
    searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
    searchBar: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 6, height: 48,
    },
    searchInput: { flex: 1, color: '#000', fontSize: 16, fontWeight: '600', paddingHorizontal: 8 },
    cameraIcon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

    section: { marginTop: 32 },
    sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '900', paddingHorizontal: 16, marginBottom: 16 },

    // Poster Cards
    postersContainer: { paddingLeft: 16, gap: 12 },
    posterCard: { width: 150 },
    posterImg: { width: 150, height: 210, borderRadius: 8, backgroundColor: '#111' },
    posterText: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 8 },

    // Category Grid
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
    catCard: { 
        width: (width - 44) / 2, height: 100, 
        borderRadius: 8, padding: 12, 
        overflow: 'hidden', position: 'relative' 
    },
    catName: { color: '#fff', fontSize: 16, fontWeight: '900', width: '70%' },
    catImg: { 
        width: 60, height: 60, position: 'absolute', 
        right: -10, bottom: -5, transform: [{ rotate: '25deg' }],
        borderRadius: 4
    },

    // Results List
    userItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    userAvatar: { width: 56, height: 56, borderRadius: 28 },
    userDisplayName: { color: '#fff', fontSize: 16, fontWeight: '800' },
    userUsername: { color: '#94A3B8', fontSize: 13 },

    beatItem: { 
        flexDirection: 'row', alignItems: 'center', gap: 12, 
        backgroundColor: '#111', padding: 10, borderRadius: 8, marginBottom: 10 
    },
    beatThumb: { width: 50, height: 50, borderRadius: 4 },
    beatTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
    beatArtist: { color: '#666', fontSize: 12 },

    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
});
