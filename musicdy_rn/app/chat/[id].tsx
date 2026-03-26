import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Image
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

const APP_YELLOW = '#FFDE03';

interface Message {
    id: number;
    convo_id: number;
    sender_id: number;
    texto: string;
    is_read: boolean;
    created_at: string;
}

interface Conversation {
    id: number;
    other_participant: {
        id: number;
        username: string;
        nombre_artistico?: string;
        foto_perfil?: string;
    };
}

export default function ChatScreen() {
    const { id: convoId } = useLocalSearchParams();
    const { user } = useAuthStore();
    const qc = useQueryClient();
    const [text, setText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    // ── Queries ──────────────────────────────────────────────────────────────
    const { data: messages = [], isLoading } = useQuery<Message[]>({
        queryKey: ['messages', convoId],
        queryFn: async () => (await apiClient.get(`/chat/messages/${convoId}`)).data,
        refetchInterval: 5000, // Fallback pooling if websocket is not active
    });

    const { data: conversation } = useQuery<Conversation>({
        queryKey: ['conversation', convoId],
        queryFn: async () => {
            const res = await apiClient.get('/chat/conversations');
            return res.data.find((c: any) => c.id === Number(convoId));
        }
    });

    // ── Mutations ────────────────────────────────────────────────────────────
    const sendMutation = useMutation({
        mutationFn: async (msg: string) => {
            return (await apiClient.post('/chat/messages', {
                convo_id: Number(convoId),
                texto: msg
            })).data;
        },
        onSuccess: (newMsg) => {
            qc.setQueryData(['messages', convoId], (prev: any) => [...(prev || []), newMsg]);
            setText('');
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    });

    const handleSend = () => {
        if (!text.trim() || sendMutation.isPending) return;
        sendMutation.mutate(text.trim());
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.sender_id === user?.id;
        const time = format(new Date(item.created_at), 'HH:mm');

        return (
            <View style={[styles.msgWrapper, isMe ? styles.msgMe : styles.msgThem]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.texto}</Text>
                    <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>{time}</Text>
                </View>
            </View>
        );
    };

    if (isLoading && messages.length === 0) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={APP_YELLOW} size="large" />
            </View>
        );
    }

    const otherUser = conversation?.other_participant;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    {otherUser?.foto_perfil ? (
                        <Image source={{ uri: otherUser.foto_perfil }} style={styles.headerAvatar} />
                    ) : (
                        <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person" size={16} color="#444" />
                        </View>
                    )}
                    <View>
                        <Text style={styles.headerName}>{otherUser?.nombre_artistico || otherUser?.username || 'Chat'}</Text>
                        <Text style={styles.headerStatus}>En línea</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.moreBtn}>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />

            {/* Input */}
            <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.attachBtn}>
                    <Ionicons name="add" size={24} color="#555" />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="Escribe un mensaje..."
                    placeholderTextColor="#444"
                    value={text}
                    onChangeText={setText}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
                    onPress={handleSend}
                    disabled={!text.trim() || sendMutation.isPending}
                >
                    <Ionicons name="send" size={18} color={text.trim() ? '#000' : '#333'} />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 0.5,
        borderColor: '#111',
        gap: 12
    },
    backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#111' },
    avatarPlaceholder: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
    headerName: { color: '#fff', fontSize: 16, fontWeight: '800' },
    headerStatus: { color: '#FFD700', fontSize: 11, fontWeight: '600' },
    moreBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

    listContent: { padding: 16, paddingBottom: 32 },
    msgWrapper: { marginBottom: 16, maxWidth: '80%' },
    msgMe: { alignSelf: 'flex-end' },
    msgThem: { alignSelf: 'flex-start' },

    bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    bubbleMe: { backgroundColor: APP_YELLOW, borderBottomRightRadius: 4 },
    bubbleThem: { backgroundColor: '#161616', borderBottomLeftRadius: 4 },

    msgText: { fontSize: 15, color: '#fff', lineHeight: 20 },
    msgTextMe: { color: '#000', fontWeight: '500' },
    msgTime: { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'right' },
    msgTimeMe: { color: 'rgba(0,0,0,0.5)' },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 0.5,
        borderColor: '#111',
        backgroundColor: '#000',
        paddingBottom: Platform.OS === 'ios' ? 30 : 10
    },
    attachBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    input: {
        flex: 1,
        backgroundColor: '#111',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 10,
        color: '#fff',
        fontSize: 15,
        maxHeight: 100,
        marginHorizontal: 8
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: APP_YELLOW,
        alignItems: 'center',
        justifyContent: 'center'
    },
    sendBtnDisabled: { backgroundColor: '#111' }
});
