import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, Button, Alert, TouchableOpacity } from 'react-native';
import feedService from '../services/feed';
import { useAudio } from '../AudioContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MEDIA_URL } from '../config';

import CheckoutModal from '../components/CheckoutModal';
import SocialInteractions from '../components/SocialInteractions';
import paymentService from '../services/payment';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';

const HomeScreen = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Checkout State
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState(null);

  useEffect(() => {
    loadFeed();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadFeed = async () => {
    try {
      const data = await feedService.getFeed();
      setPosts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (beatId, provider) => {
    try {
      const data = await paymentService.createCheckout(beatId, provider);
      if (data.url) {
        setCheckoutUrl(data.url);
        setCheckoutVisible(true);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo iniciar el pago");
    }
  };

  const { playTrack, currentTrack, isPlaying } = useAudio();

  const handlePlayPause = (item) => {
    // Construct track object
    const track = {
      id: item.id,
      titulo: item.titulo,
      artista: item.artista,
      // Handle URL logic here or in context. consistently
      archivo: item.archivo.startsWith('http') ? item.archivo : `${MEDIA_URL}/${item.archivo}`
    };
    playTrack(track);
  };

  const renderItem = ({ item, index }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      layout={Layout.springify()}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarPlaceholder} />
        <View>
          <Text style={styles.title}>{item.titulo}</Text>
          <Text style={styles.artist}>{item.artista}</Text>
        </View>
      </View>

      <View style={styles.audioControls}>
        <Button
          title={(currentTrack?.id === item.id && isPlaying) ? "Pausa" : "Reproducir"}
          onPress={() => handlePlayPause(item)}
        />
      </View>

      <Text style={styles.description}>{item.description || item.descripcion}</Text>

      <SocialInteractions postId={item.id} />

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleBuy(item.id, 'stripe')} style={[styles.buyButton]}>
          <Text style={styles.buyText}>Buy $29.99</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleBuy(item.id, 'mercadopago')} style={[styles.buyButton, { backgroundColor: '#009ee3', marginLeft: 10 }]}>
          <Text style={styles.buyText}>MP $35k</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  if (loading) return <ActivityIndicator style={{ marginTop: 20 }} size="large" />;

  return (
    <View style={{ flex: 1 }}>
      <Animated.FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      <CheckoutModal
        visible={checkoutVisible}
        url={checkoutUrl}
        onClose={() => setCheckoutVisible(false)}
        onSuccess={() => Alert.alert("Éxito", "Pago completado!")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  list: { padding: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ccc',
    marginRight: 10,
  },
  title: { fontSize: 16, fontWeight: 'bold' },
  artist: { fontSize: 14, color: 'gray' },
  description: { marginTop: 10, color: '#333' },
  audioControls: {
    marginVertical: 10,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  buyText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  }
});

export default HomeScreen;