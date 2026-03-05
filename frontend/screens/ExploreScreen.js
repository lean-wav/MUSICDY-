import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../AudioContext';
import searchService from '../services/search';
import feedService from '../services/feed'; // Fallback to random feed if no search
import { MEDIA_URL } from '../config';
import Animated, { FadeInRight, FadeOutLeft, Layout } from 'react-native-reanimated';

const ExploreScreen = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    // Load initial random content
    useEffect(() => {
        loadRandomContent();
    }, []);

    const loadRandomContent = async () => {
        try {
            const posts = await feedService.getFeed();
            setResults(posts);
        } catch (e) {
            console.log("Error loading explore content", e);
        }
    };

    const handleSearch = async (text) => {
        setQuery(text);
        if (text.length > 2) {
            const data = await searchService.search(text);
            setResults(data);
        } else if (text.length === 0) {
            loadRandomContent();
        }
    };

    const { playTrack, currentTrack, isPlaying } = useAudio();

    const handlePlayPause = (item) => {
        const track = {
            id: item.id,
            titulo: item.titulo,
            artista: item.artista,
            archivo: item.archivo.startsWith('http') ? item.archivo : `${MEDIA_URL}/${item.archivo}`
        };
        playTrack(track);
    };

    const renderItem = ({ item, index }) => (
        <Animated.View
            entering={FadeInRight.delay(index * 50).springify()}
            layout={Layout.springify()}
            style={styles.card}
        >
            <View style={styles.cardContent}>
                <Text style={styles.title}>{item.titulo}</Text>
                <Text style={styles.artist}>{item.artista}</Text>
                <Text style={styles.genre}>{item.genero_musical} • {item.bpm} BPM</Text>
            </View>
            <TouchableOpacity onPress={() => handlePlayPause(item)}>
                <Ionicons name={(currentTrack?.id === item.id && isPlaying) ? "pause-circle" : "play-circle"} size={40} color="#007bff" />
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Buscar beats, artistas, géneros..."
                    value={query}
                    onChangeText={handleSearch}
                />
            </View>

            <Animated.FlatList
                data={results}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                itemLayoutAnimation={Layout.springify()}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 50, // Safe area
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        margin: 15,
        borderRadius: 10,
        paddingHorizontal: 10,
    },
    searchIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
    },
    list: {
        paddingHorizontal: 15,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        marginBottom: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
    },
    cardContent: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    artist: {
        color: '#666',
        marginBottom: 5,
    },
    genre: {
        fontSize: 12,
        color: '#888',
    }
});

export default ExploreScreen;
