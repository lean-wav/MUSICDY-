import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, ActivityIndicator,
  Dimensions, StatusBar, FlatList, Modal, Pressable,
  ScrollView, Alert, TextInput, Share, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useQuery, useQueryClient, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '@/src/api/client';
import { AppConfig } from '@/src/api/config';
import Toast from 'react-native-toast-message';
import { Skeleton } from '@/src/components/common/Skeleton';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const GOLD = '#FFD700';

// ─── Types ───────────────────────────────────────────────────────────────
interface Post {
  id: number;
  titulo: string;
  artista: string;
  cover_url?: string;
  archivo?: string;            // stream preview (128kbps) — used for feed playback
  archivo_original?: string;   // lossless HQ — only for purchased/download
  tipo_contenido?: string;
  genero_musical?: string;
  descripcion?: string;
  precio?: number;
  precio_ars?: number;
  visual_loop_url?: string;
  usuario_id?: number;
  likes_count?: number;
  comments_count?: number;
  saves_count?: number;
  plays?: number;
  foto_perfil_artista?: string;
}

interface Comment {
  id: number;
  texto: string;
  fecha: string;
  usuario: { id: number; username: string; foto_perfil?: string };
}

// ─── Comments Bottom Sheet ───────────────────────────────────────────────
function CommentsSheet({
  visible, onClose, postId
}: {
  visible: boolean; onClose: () => void; postId: number;
}) {
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const res = await apiClient.get(`/posts/${postId}/comments`);
      return res.data;
    },
    enabled: visible && postId > 0,
  });

  const sendComment = useMutation({
    mutationFn: async (texto: string) => {
      await apiClient.post(`/posts/${postId}/comments`, { texto });
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });

  const timeSince = (dateStr: string) => {
    const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (secs < 60) return 'ahora';
    if (secs < 3600) return `${Math.floor(secs / 60)}m`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
    return `${Math.floor(secs / 86400)}d`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={cStyles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={cStyles.sheetWrap}>
          <Pressable style={cStyles.sheet} onPress={e => e.stopPropagation()}>
            <View style={cStyles.handle} />
            <Text style={cStyles.title}>COMENTARIOS</Text>

            <ScrollView style={cStyles.list} showsVerticalScrollIndicator={false}>
              {isLoading ? (
                <ActivityIndicator color={GOLD} style={{ marginTop: 40 }} />
              ) : comments.length === 0 ? (
                <View style={{ alignItems: 'center', paddingTop: 40 }}>
                  <Ionicons name="chatbubble-outline" size={40} color="#333" />
                  <Text style={{ color: '#555', marginTop: 12 }}>Se el primero en comentar</Text>
                </View>
              ) : (
                comments.map((c) => (
                  <View key={c.id} style={cStyles.commentRow}>
                    <View style={cStyles.commentAvatar}>
                      <Text style={cStyles.commentAvatarText}>
                        {(c.usuario?.username || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={cStyles.commentUser}>@{c.usuario?.username}</Text>
                        <Text style={cStyles.commentTime}>{timeSince(c.fecha)}</Text>
                      </View>
                      <Text style={cStyles.commentText}>{c.texto}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={cStyles.inputRow}>
              <TextInput
                style={cStyles.input}
                placeholder="Escribe un comentario..."
                placeholderTextColor="#555"
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                style={[cStyles.sendBtn, !newComment.trim() && { opacity: 0.4 }]}
                disabled={!newComment.trim() || sendComment.isPending}
                onPress={() => newComment.trim() && sendComment.mutate(newComment.trim())}
              >
                {sendComment.isPending ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Ionicons name="send" size={18} color="#000" />
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const cStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#111', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 12, maxHeight: SCREEN_HEIGHT * 0.65,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  handle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { color: GOLD, fontSize: 13, fontWeight: '900', textAlign: 'center', marginBottom: 16, letterSpacing: 2 },
  list: { paddingHorizontal: 20, maxHeight: SCREEN_HEIGHT * 0.4 },
  commentRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  commentAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#222',
    justifyContent: 'center', alignItems: 'center',
  },
  commentAvatarText: { color: GOLD, fontWeight: '900', fontSize: 14 },
  commentUser: { color: '#fff', fontWeight: '700', fontSize: 13 },
  commentTime: { color: '#555', fontSize: 11 },
  commentText: { color: '#ccc', fontSize: 14, marginTop: 4, lineHeight: 20 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  input: {
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 24, paddingHorizontal: 20,
    paddingVertical: 12, color: '#fff', fontSize: 14, maxHeight: 80,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: GOLD,
    justifyContent: 'center', alignItems: 'center',
  },
});

// ─── Options Modal ────────────────────────────────────────────────────────
function OptionsModal({
  visible, onClose, item, isOwner, onDelete,
}: {
  visible: boolean; onClose: () => void; item: Post; isOwner: boolean;
  onDelete: (postId: number) => void;
}) {
  const options = [
    { id: 'stats', label: 'Estadisticas', icon: 'bar-chart-outline' },
    { id: 'archive', label: 'Archivar', icon: 'archive-outline' },
    { id: 'hide_likes', label: 'Ocultar me gustas', icon: 'eye-off-outline' },
    { id: 'disable_comments', label: 'Desactivar comentarios', icon: 'chatbubble-ellipses-outline' },
    { id: 'edit', label: 'Editar', icon: 'create-outline' },
    { id: 'pin', label: 'Fijar en la cuadricula', icon: 'pin-outline' },
  ];

  const handlePress = (optId: string) => {
    if (optId === 'delete') {
      onClose();
      setTimeout(() => {
        Alert.alert(
          'Eliminar publicacion',
          `¿Estas seguro de que quieres eliminar "${item.titulo}"? Esta accion no se puede deshacer.`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(item.id) },
          ]
        );
      }, 300);
    } else { onClose(); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>OPCIONES DE PUBLICACION</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt) => (
              <TouchableOpacity key={opt.id} style={styles.optionItem} onPress={() => handlePress(opt.id)}>
                <Ionicons name={opt.icon as any} size={22} color="#fff" />
                <Text style={styles.optionLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            {isOwner && (
              <TouchableOpacity style={styles.optionItem} onPress={() => handlePress('delete')}>
                <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                <Text style={[styles.optionLabel, { color: '#FF3B30' }]}>Eliminar publicacion</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Formatters ──────────────────────────────────────────────────────────
function msToMin(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatCount(n: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ─── Post Card ───────────────────────────────────────────────────────────
function PostCard({
  item, isVisible, currentUserId, onDelete,
}: {
  item: Post; isVisible: boolean; currentUserId?: number;
  onDelete: (id: number) => void;
}) {
  const [showOptions, setShowOptions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  // Backend-synced state
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [likesCount, setLikesCount] = useState(item.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(item.comments_count || 0);
  const [savesCount, setSavesCount] = useState(item.saves_count || 0);

  // Double-tap like animation
  const heartScale = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const playRegistered = useRef(false);

  // Media URIs
  const coverUri = AppConfig.getFullMediaUrl(item.cover_url) || null;
  // Use stream preview (archivo) for feed — saves mobile data vs archivo_original (HQ/WAV)
  const streamUri = AppConfig.getFullMediaUrl(item.archivo) || AppConfig.getFullMediaUrl(item.archivo_original) || null;
  const loopUri = item.visual_loop_url ? AppConfig.getFullMediaUrl(item.visual_loop_url) : null;

  const isVideoPost = item.tipo_contenido === 'for_you' || item.tipo_contenido === 'video';
  const isImagePost = item.tipo_contenido === 'image';
  const isAudioPost = !isVideoPost && !isImagePost;
  // For video posts use archivo_original (actual video file); for audio posts use stream preview
  const contentUri = isVideoPost
    ? AppConfig.getFullMediaUrl(item.archivo_original) || null
    : streamUri;
  const activeVideoUri = isVideoPost ? contentUri : (isAudioPost ? loopUri : null);
  const isOwner = currentUserId != null && item.usuario_id === currentUserId;

  // Audio player — uses stream preview URL
  const audioPlayer = useAudioPlayer(isAudioPost && streamUri ? { uri: streamUri } : null);
  const audioStatus = useAudioPlayerStatus(audioPlayer);

  // Video player using expo-video
  const videoPlayer = useVideoPlayer(activeVideoUri || '', (player) => {
    player.loop = true;
    player.muted = isAudioPost;
    if (isVisible) player.play();
    else player.pause();
  });

  // Sync video visibility
  useEffect(() => {
    if (isVisible) videoPlayer.play();
    else videoPlayer.pause();
  }, [isVisible]);

  // Fetch real stats on mount (likes + following state)
  useEffect(() => {
    apiClient.get(`/posts/${item.id}/stats`).then(res => {
      setLikesCount(res.data.likes_count || 0);
      setCommentsCount(res.data.comentarios_count || 0);
      setLiked(res.data.is_liked || false);
    }).catch(() => {});
    // Fetch follow state if there is a post owner and we are not the owner
    if (item.usuario_id && !isOwner) {
      apiClient.get(`/users/${item.usuario_id}/stats`).then(res => {
        setFollowing(res.data.is_following || false);
      }).catch(() => {});
    }
  }, [item.id]);

  // Register play when visible
  useEffect(() => {
    if (isVisible && !playRegistered.current) {
      playRegistered.current = true;
      apiClient.post(`/posts/${item.id}/play`, { ip_address: 'mobile' }).catch(() => {});
    }
  }, [isVisible]);

  // Auto-play / pause audio
  useEffect(() => {
    if (isAudioPost && contentUri) {
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
      if (isVisible) audioPlayer.play();
      else audioPlayer.pause();
    }
  }, [isVisible, isAudioPost, contentUri]);

  // ─── Actions ─────────────────
  const togglePlayback = () => {
    if (isAudioPost) {
      if (audioStatus.playing) audioPlayer.pause();
      else audioPlayer.play();
    } else if (activeVideoUri) {
      if (videoPlayer.playing) videoPlayer.pause();
      else videoPlayer.play();
    }
  };

  const handleLike = async () => {
    const prev = liked;
    setLiked(!prev);
    setLikesCount(c => prev ? c - 1 : c + 1);
    try {
      const res = await apiClient.post(`/posts/${item.id}/like`);
      setLikesCount(res.data.likes_count);
      setLiked(res.data.is_liked);
    } catch { setLiked(prev); setLikesCount(c => prev ? c + 1 : c - 1); }
  };

  const handleSave = async () => {
    const prev = saved;
    setSaved(!prev);
    setSavesCount(c => prev ? c - 1 : c + 1);
    try {
      const res = await apiClient.post(`/posts/${item.id}/save`);
      setSaved(res.data.saved);
      if (res.data.saved) {
        Toast.show({ type: 'success', text1: 'Guardado', text2: 'Agregado a tus guardados.' });
      }
    } catch { 
      setSaved(prev); 
      setSavesCount(c => prev ? c + 1 : c - 1); 
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo guardar.' });
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) handleLike();
      // Animate heart
      heartScale.setValue(0);
      Animated.sequence([
        Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 15, bounciness: 10 }),
        Animated.delay(600),
        Animated.timing(heartScale, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      togglePlayback();
    }
    lastTap.current = now;
  };

  const handleFollow = async () => {
    if (followLoading || !item.usuario_id || isOwner) return;
    const prev = following;
    setFollowing(!prev);
    setFollowLoading(true);
    try {
      const res = await apiClient.post(`/users/${item.usuario_id}/follow`);
      setFollowing(res.data.is_following);
    } catch {
      setFollowing(prev); // revert on error
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Escucha "${item.titulo}" de @${item.artista} en Musicdy! https://musicdy.com/track/${item.id}`,
      });
    } catch {}
  };

  return (
    <View style={styles.card}>
      {/* Background */}
      <View style={StyleSheet.absoluteFill}>
        {activeVideoUri ? (
          <VideoView
            player={videoPlayer}
            style={StyleSheet.absoluteFill}
            nativeControls={false}
          />
        ) : isImagePost && contentUri ? (
          <Image source={{ uri: contentUri }} style={styles.backgroundImage} />
        ) : (
          <>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.backgroundImage} blurRadius={22} />
            ) : (
              <View style={[styles.backgroundImage, { backgroundColor: '#0a0a0a' }]} />
            )}
            <View style={styles.overlay} />
          </>
        )}
      </View>

      {/* Double-tap layer */}
      <TouchableOpacity activeOpacity={1} onPress={handleDoubleTap} style={StyleSheet.absoluteFill} />

      {/* Double-tap heart animation */}
      <Animated.View pointerEvents="none" style={[styles.doubleTapHeart, {
        opacity: heartScale, transform: [{ scale: heartScale }],
      }]}>
        <Ionicons name="heart" size={100} color="#FF3B30" />
      </Animated.View>

      {/* Center UI for audio posts */}
      {(isAudioPost && !loopUri) && (
        <View style={styles.centerContent} pointerEvents="none">
          <View style={styles.artWrapper}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverArt} contentFit="cover" />
            ) : (
              <View style={styles.coverArtPlaceholder}>
                <Ionicons name="musical-note" size={80} color={GOLD} />
              </View>
            )}
            {audioStatus.isBuffering ? (
              <View style={styles.playOverlay}><ActivityIndicator size="large" color={GOLD} /></View>
            ) : !audioStatus.playing && (
              <View style={styles.playOverlay}><Ionicons name="play-circle" size={72} color="rgba(255,255,255,0.9)" /></View>
            )}
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${(audioStatus.currentTime / (audioStatus.duration || 1)) * 100}%` }]} />
            </View>
            <View style={styles.progressTimes}>
              <Text style={styles.timeText}>{msToMin(audioStatus.currentTime || 0)}</Text>
              <Text style={styles.timeText}>{msToMin(audioStatus.duration || 0)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Video pause indicator */}
      {isVideoPost && !videoPlayer.playing && (
        <View style={styles.centerContent} pointerEvents="none">
          <Ionicons name="play" size={80} color="rgba(255,255,255,0.4)" />
        </View>
      )}

      {/* Bottom info bar */}
      <View style={[styles.bottomBar, { zIndex: 10 }]} pointerEvents="box-none">
        <View style={styles.trackInfo} pointerEvents="box-none">
          <Text style={styles.trackTitle} numberOfLines={2}>{item.titulo}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.artistRow}
              onPress={() => router.push(`/profile/${item.artista}` as any)}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>{(item.artista || 'A').charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.artistName}>@{item.artista}</Text>
            </TouchableOpacity>
            {!isOwner && (
              <TouchableOpacity
                style={[styles.followPill, following && styles.followPillActive]}
                onPress={handleFollow}
                disabled={followLoading}
                activeOpacity={0.7}
              >
                <Text style={[styles.followPillText, following && styles.followPillTextActive]}>
                  {following ? 'Siguiendo' : 'SEGUIR'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Description */}
          {item.descripcion ? (
            <TouchableOpacity onPress={() => setDescExpanded(v => !v)}>
              <Text style={styles.description} numberOfLines={descExpanded ? undefined : 1}>
                {item.descripcion}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Buy + Download */}
          <View style={styles.actionButtonsRow} pointerEvents="box-none">
            <TouchableOpacity style={styles.buyBtn}
              onPress={() => { if (!item?.id) return; router.push(`/checkout/${item.id}` as any); }}>
              <Ionicons name="cart" size={18} color="#000" />
              <Text style={styles.buyBtnText}>BUY - ${item.precio || 29}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.downloadBtn}
              onPress={() => { 
                if (!item?.id) return; 
                router.push({
                   pathname: `/download/${item.id}`,
                   params: { postData: JSON.stringify(item) }
                } as any); 
              }}
            >
              <Ionicons name="download-outline" size={18} color={GOLD} />
            </TouchableOpacity>
          </View>

          <View style={styles.genreBadge}>
            <Text style={styles.genreText}>{(item.genero_musical || 'musica').toUpperCase()}</Text>
          </View>
        </View>

        {/* Right side actions */}
        <View style={styles.sideActions} pointerEvents="box-none">
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowOptions(true)}>
            <Ionicons name="ellipsis-horizontal" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={28} color={liked ? '#FF3B30' : GOLD} />
            <Text style={styles.actionCount}>{formatCount(likesCount)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(true)}>
            <Ionicons name="chatbubble-outline" size={26} color={GOLD} />
            <Text style={styles.actionCount}>{formatCount(commentsCount)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={26} color={GOLD} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={26} color={GOLD} />
            <Text style={styles.actionCount}>{formatCount(savesCount)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.discIcon}>
            <Ionicons name="disc" size={36} color={GOLD} />
          </TouchableOpacity>
        </View>
      </View>

      <OptionsModal visible={showOptions} onClose={() => setShowOptions(false)}
        item={item} isOwner={isOwner} onDelete={onDelete} />
      <CommentsSheet visible={showComments} onClose={() => setShowComments(false)} postId={item.id} />
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────
export default function FeedScreen() {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const { startPostId } = useLocalSearchParams<{ startPostId: string }>();
  const listRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');
  const [refreshing, setRefreshing] = useState(false);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 });

  const {
    data: forYouData,
    fetchNextPage: fetchNextForYou,
    hasNextPage: hasMoreForYou,
    isFetchingNextPage: fetchingMoreForYou,
    isLoading: loadingForYou,
    isError: errorForYou,
    refetch: refetchForYou,
  } = useInfiniteQuery({
    queryKey: ['feedPosts', 'foryou'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await apiClient.get<Post[]>(`/posts/?skip=${pageParam}&limit=10`);
      return res.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 10) return undefined;
      return allPages.flat().length;
    },
    initialPageParam: 0,
    enabled: activeTab === 'foryou',
  });

  const {
    data: followingData,
    fetchNextPage: fetchNextFollowing,
    hasNextPage: hasMoreFollowing,
    isFetchingNextPage: fetchingMoreFollowing,
    isLoading: loadingFollowing,
    isError: errorFollowing,
    refetch: refetchFollowing,
  } = useInfiniteQuery({
    queryKey: ['feedPosts', 'following'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await apiClient.get<Post[]>(`/posts/following?skip=${pageParam}&limit=10`);
      return res.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 10) return undefined;
      return allPages.flat().length;
    },
    initialPageParam: 0,
    enabled: activeTab === 'following',
  });

  const posts = useMemo(() => {
    if (activeTab === 'foryou') return forYouData?.pages.flat() ?? [];
    return followingData?.pages.flat() ?? [];
  }, [activeTab, forYouData, followingData]);

  const isLoading = activeTab === 'foryou' ? loadingForYou : loadingFollowing;
  const isError = activeTab === 'foryou' ? errorForYou : errorFollowing;

  const initialIndex = useMemo(() => {
    if (!posts.length || !startPostId) return 0;
    const idx = posts.findIndex(p => p.id === parseInt(startPostId));
    return idx !== -1 ? idx : 0;
  }, [posts, startPostId]);

  useEffect(() => {
    if (posts.length && initialIndex > 0) {
      setActiveIndex(initialIndex);
      setTimeout(() => listRef.current?.scrollToIndex({ index: initialIndex, animated: false }), 200);
    }
  }, [posts.length, initialIndex]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
  }, []);

  const onEndReached = () => {
    if (activeTab === 'foryou' && hasMoreForYou && !fetchingMoreForYou) fetchNextForYou();
    if (activeTab === 'following' && hasMoreFollowing && !fetchingMoreFollowing) fetchNextFollowing();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'foryou') await refetchForYou();
    else await refetchFollowing();
    setRefreshing(false);
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await apiClient.delete(`/posts/${postId}`);
      Toast.show({ type: 'success', text1: 'Eliminado', text2: 'La publicación ha sido eliminada.' });
      queryClient.invalidateQueries({ queryKey: ['feedPosts'] });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.detail || 'No se pudo eliminar.' });
    }
  };

  const switchTab = (tab: 'foryou' | 'following') => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setActiveIndex(0);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        {/* Fake Header */}
        <View style={styles.topHeader} pointerEvents="none">
          <Skeleton width={100} height={24} />
          <View style={styles.headerTabs}>
            <Skeleton width={60} height={20} />
            <Skeleton width={80} height={20} />
          </View>
          <Skeleton width={24} height={24} borderRadius={12} />
        </View>

        {/* Fake Side Actions */}
        <View style={{ position: 'absolute', bottom: 100, right: 16, gap: 24, alignItems: 'center' }}>
          <Skeleton width={38} height={38} borderRadius={19} />
          <Skeleton width={38} height={38} borderRadius={19} />
          <Skeleton width={38} height={38} borderRadius={19} />
          <Skeleton width={38} height={38} borderRadius={19} />
          <Skeleton width={38} height={38} borderRadius={19} />
          <Skeleton width={46} height={46} borderRadius={23} />
        </View>

        {/* Fake Bottom Info */}
        <View style={{ position: 'absolute', bottom: 30, left: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <Skeleton width={120} height={18} />
            <Skeleton width={70} height={28} borderRadius={14} />
          </View>
          <Skeleton width={SCREEN_WIDTH * 0.6} height={14} />
          <Skeleton width={SCREEN_WIDTH * 0.4} height={14} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <Skeleton width={80} height={30} borderRadius={8} />
            <Skeleton width={40} height={30} borderRadius={8} />
          </View>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="wifi-outline" size={60} color="#555" />
        <Text style={styles.loadingText}>Error al conectar</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.topHeader} pointerEvents="box-none">
        <Text style={styles.appLogo}>musicdy</Text>
        <View style={styles.headerTabs}>
          <TouchableOpacity onPress={() => switchTab('foryou')}>
            <Text style={[styles.headerTab, activeTab === 'foryou' && styles.headerTabActive]}>Para Ti</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => switchTab('following')}>
            <Text style={[styles.headerTab, activeTab === 'following' && styles.headerTabActive]}>Siguiendo</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        getItemLayout={(_, index) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * index, index })}
        renderItem={({ item, index }) => (
          <PostCard item={item} isVisible={index === activeIndex}
            currentUserId={user?.id} onDelete={handleDeletePost} />
        )}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        onEndReached={onEndReached}
        onEndReachedThreshold={2}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListFooterComponent={
          (fetchingMoreForYou || fetchingMoreFollowing) ? (
            <View style={{ height: 100, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
              <ActivityIndicator color={GOLD} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748B', fontSize: 16, marginTop: 20 },
  retryBtn: { marginTop: 24, backgroundColor: GOLD, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 30 },
  retryText: { color: '#000', fontWeight: '800', fontSize: 15 },
  topHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    paddingTop: 55, paddingHorizontal: 20, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  appLogo: { color: GOLD, fontSize: 24, fontWeight: '900', letterSpacing: -1.5, fontStyle: 'italic' },
  headerTabs: { flexDirection: 'row', gap: 24 },
  headerTab: { color: 'rgba(255,255,255,0.45)', fontSize: 16, fontWeight: '700', paddingBottom: 4 },
  headerTabActive: { color: '#fff', borderBottomWidth: 3, borderBottomColor: GOLD },
  card: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000' },
  backgroundImage: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  doubleTapHeart: {
    position: 'absolute', top: '35%', alignSelf: 'center',
    shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 20,
  },
  centerContent: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  artWrapper: { position: 'relative' },
  coverArt: {
    width: 220, height: 220, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
  },
  coverArtPlaceholder: {
    width: 200, height: 200, borderRadius: 20, backgroundColor: '#111',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333',
  },
  playOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  progressContainer: { width: 200, marginTop: 16 },
  progressBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: GOLD, borderRadius: 2 },
  progressTimes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  timeText: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  bottomBar: { position: 'absolute', bottom: 90, left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16 },
  trackInfo: { flex: 1, paddingRight: 12 },
  trackTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8, textShadowColor: '#000', textShadowRadius: 4 },
  artistRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarLetter: { color: '#000', fontSize: 14, fontWeight: '900' },
  artistName: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '700' },
  followPill: { marginLeft: 10, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  followPillActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  followPillText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  followPillTextActive: { color: '#ccc', fontSize: 10, fontWeight: '800' },
  description: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 10 },
  actionButtonsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  buyBtn: { backgroundColor: GOLD, flexDirection: 'row', alignItems: 'center', flex: 1, paddingVertical: 14, borderRadius: 16, justifyContent: 'center' },
  buyBtnText: { color: '#000', fontSize: 14, fontWeight: '900' },
  downloadBtn: { backgroundColor: '#161616', width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  genreBadge: { backgroundColor: 'rgba(255,215,0,0.15)', borderWidth: 1, borderColor: GOLD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  genreText: { color: GOLD, fontSize: 11, fontWeight: '700' },
  sideActions: { alignItems: 'center', gap: 18 },
  actionBtn: { alignItems: 'center' },
  actionCount: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  discIcon: { marginTop: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: '#0F0F0F', borderWidth: 1, borderColor: GOLD, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheetContainer: { backgroundColor: '#161616', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 12, paddingBottom: 40, paddingHorizontal: 20 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { color: GOLD, fontSize: 13, fontWeight: '900', textAlign: 'center', marginBottom: 24 },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 16 },
  optionLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});