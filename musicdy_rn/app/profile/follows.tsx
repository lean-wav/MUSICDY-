import React from 'react';
import {
    View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '@/src/components/common/Skeleton';

interface UserItem {
    id: number;
    username: string;
    nombre_artistico?: string;
    foto_perfil?: string | null;
    verified_type?: string;
}

export default function FollowsScreen() {
    const { userId, type } = useLocalSearchParams<{ userId: string; type: 'followers' | 'following' }>();

    const { data: users = [], isLoading, error, refetch } = useQuery<UserItem[]>({
        queryKey: ['userFollows', userId, type],
        queryFn: async () => {
            const endpoint = `/users/${userId}/${type}`;
            const res = await apiClient.get(endpoint);
            return res.data;
        },
        enabled: !!userId && !!type,
    });

    const renderUser = ({ item }: { item: UserItem }) => {
        const avatarUri = item.foto_perfil?.startsWith('http') ? item.foto_perfil : null;

        return (
            <TouchableOpacity
                style={styles.userRow}
                onPress={() => router.push(`/profile/${item.username}` as any)}
            >
                {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={20} color="#555" />
                    </View>
                )}
                <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.displayName}>
                            {item.nombre_artistico || item.username}
                        </Text>
                        {item.verified_type && item.verified_type !== 'none' && (
                            <Ionicons
                                name={item.verified_type === 'official' ? 'checkmark-circle' : 'star'}
                                size={12}
                                color={item.verified_type === 'official' ? '#FFD700' : '#FFD700'}
                            />
                        )}
                    </View>
                    <Text style={styles.username}>@{item.username}</Text>
                </View>
                <TouchableOpacity style={styles.viewBtn} onPress={() => router.push(`/profile/${item.username}` as any)}>
                    <Text style={styles.viewBtnText}>Ver perfil</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {type === 'followers' ? 'Seguidores' : 'Siguiendo'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {isLoading ? (
                <View style={{ padding: 16 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <View key={i} style={styles.skeletonRow}>
                            <Skeleton width={44} height={44} borderRadius={22} />
                            <View style={{ flex: 1, gap: 6 }}>
                                <Skeleton width={120} height={14} />
                                <Skeleton width={80} height={12} />
                            </View>
                        </View>
                    ))}
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Text style={{ color: '#666' }}>Ocurrió un error</Text>
                    <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
                        <Text style={styles.retryText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            ) : users.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="people-outline" size={48} color="#222" />
                    <Text style={styles.emptyText}>Lista vacía</Text>
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderUser}
                    contentContainerStyle={{ paddingBottom: 40 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 60, paddingBottom: 16, paddingHorizontal: 4,
        borderBottomWidth: 0.5, borderColor: '#1a1a1a',
    },
    backBtn: { width: 40, alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },

    userRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        gap: 12
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a1a1a' },
    avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    userInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    displayName: { color: '#fff', fontSize: 14, fontWeight: '700' },
    username: { color: '#777', fontSize: 12, marginTop: 1 },

    viewBtn: {
        backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 6, borderWidth: 1, borderColor: '#333'
    },
    viewBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText: { color: '#444' },
    retryBtn: { padding: 10, backgroundColor: '#FFD700', borderRadius: 8 },
    retryText: { color: '#000', fontWeight: '700' },
});
