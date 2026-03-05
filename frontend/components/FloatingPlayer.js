import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useAudio } from '../AudioContext';
import { Ionicons } from '@expo/vector-icons';

const FloatingPlayer = () => {
    const { currentTrack, isPlaying, playTrack, isLoading } = useAudio();

    if (!currentTrack) return null;

    return (
        <View style={styles.container}>
            <View style={styles.info}>
                <View style={styles.artwork} />
                <View style={styles.textContainer}>
                    <Text style={styles.title} numberOfLines={1}>{currentTrack.titulo}</Text>
                    <Text style={styles.artist} numberOfLines={1}>{currentTrack.artista}</Text>
                </View>
            </View>

            <TouchableOpacity onPress={() => playTrack(currentTrack)} style={styles.playButton}>
                {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#fff" />
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 60, // Above tab bar (approx height 50-60)
        left: 10,
        right: 10,
        backgroundColor: '#333',
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        justifyContent: 'space-between',
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    info: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    artwork: {
        width: 40,
        height: 40,
        backgroundColor: '#555',
        borderRadius: 4,
        marginRight: 10,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    artist: {
        color: '#ccc',
        fontSize: 12,
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6200ee',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    }
});

export default FloatingPlayer;
