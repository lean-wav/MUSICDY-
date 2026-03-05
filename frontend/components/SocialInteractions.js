import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, FlatList, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate, Extrapolate } from 'react-native-reanimated';
import socialService from '../services/social';
import { useAuth } from '../AuthContext';

const SocialInteractions = ({ postId }) => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ likes_count: 0, comentarios_count: 0, is_liked: false });
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [showComments, setShowComments] = useState(false);

    useEffect(() => {
        loadStats();
    }, [postId]);

    // Reanimated values
    const likeScale = useSharedValue(1);
    const commentsOpacity = useSharedValue(0);

    useEffect(() => {
        commentsOpacity.value = withTiming(showComments ? 1 : 0, { duration: 300 });
    }, [showComments]);

    const loadStats = async () => {
        try {
            const data = await socialService.getStats(postId);
            setStats(data);
        } catch (e) {
            console.error("Error loading stats", e);
        }
    };

    const loadComments = async () => {
        setLoading(true);
        try {
            const data = await socialService.getComments(postId);
            setComments(data);
            setShowComments(true);
        } catch (e) {
            console.error("Error loading comments", e);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async () => {
        if (!user) return alert("Debes iniciar sesión");

        // Animate scale
        likeScale.value = withSpring(1.5, {}, () => {
            likeScale.value = withSpring(1);
        });

        try {
            const data = await socialService.toggleLike(postId);
            setStats(data);
        } catch (e) {
            console.error("Error toggling like", e);
        }
    };

    const animatedLikeStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: likeScale.value }],
        };
    });

    const animatedCommentsStyle = useAnimatedStyle(() => {
        return {
            opacity: commentsOpacity.value,
            transform: [{ translateY: interpolate(commentsOpacity.value, [0, 1], [-10, 0]) }],
            // We use display none only when fully closed to avoid inter-tap issues
            // display: commentsOpacity.value === 0 ? 'none' : 'flex'
        };
    });

    const handleAddComment = async () => {
        if (!user) return alert("Debes iniciar sesión");
        if (!newComment.trim()) return;

        try {
            await socialService.addComment(postId, newComment);
            setNewComment('');
            loadComments();
            loadStats();
        } catch (e) {
            console.error("Error adding comment", e);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.actionRow}>
                <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
                    <Animated.View style={animatedLikeStyle}>
                        <Text style={[styles.actionText, stats.is_liked && styles.likedText]}>
                            {stats.is_liked ? '❤️' : '🤍'} {stats.likes_count}
                        </Text>
                    </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity onPress={loadComments} style={styles.actionButton}>
                    <Text style={styles.actionText}>💬 {stats.comentarios_count}</Text>
                </TouchableOpacity>
            </View>

            <Animated.View style={[styles.commentsSection, animatedCommentsStyle, !showComments && { display: 'none' }]}>
                <FlatList
                    data={comments}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.commentItem}>
                            <Text style={styles.commentUser}>{item.usuario.username}</Text>
                            <Text style={styles.commentText}>{item.texto}</Text>
                        </View>
                    )}
                    style={styles.commentsList}
                    ListEmptyComponent={<Text style={styles.emptyText}>Sin comentarios aún.</Text>}
                />

                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        placeholder="Escribe un comentario..."
                        value={newComment}
                        onChangeText={setNewComment}
                    />
                    <TouchableOpacity onPress={handleAddComment} style={styles.sendButton}>
                        <Text style={styles.sendButtonText}>Enviar</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => setShowComments(false)} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>Cerrar comentarios</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { padding: 10 },
    actionRow: { flexDirection: 'row', marginBottom: 10 },
    actionButton: { marginRight: 20 },
    actionText: { fontSize: 16, fontWeight: 'bold' },
    likedText: { color: 'red' },
    commentsSection: { backgroundColor: '#f9f9f9', padding: 10, borderRadius: 10 },
    commentsList: { maxHeight: 200 },
    commentItem: { marginBottom: 8 },
    commentUser: { fontWeight: 'bold', fontSize: 13 },
    commentText: { fontSize: 14 },
    emptyText: { textAlign: 'center', color: '#888', marginVertical: 10 },
    inputRow: { flexDirection: 'row', marginTop: 10 },
    input: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#ccc', padding: 5 },
    sendButton: { marginLeft: 10, padding: 5, backgroundColor: '#007bff', borderRadius: 5 },
    sendButtonText: { color: '#fff' },
    closeButton: { marginTop: 10, alignSelf: 'center' },
    closeButtonText: { color: '#888', fontSize: 12 }
});

export default SocialInteractions;
