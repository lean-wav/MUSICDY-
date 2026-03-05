import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Audio } from 'expo-av';
import analyticsService from './services/analytics';

const AudioContext = createContext();

export const AudioProvider = ({ children }) => {
    const [sound, setSound] = useState(null);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Setup audio mode
    useEffect(() => {
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
        });

        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, []);

    const playTrack = async (track) => {
        try {
            setIsLoading(true);

            // If same track, toggle play/pause
            if (currentTrack?.id === track.id) {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await sound.playAsync();
                    setIsPlaying(true);
                }
                setIsLoading(false);
                return;
            }

            // New track
            if (sound) {
                await sound.unloadAsync();
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: track.archivo }, // Assuming 'archivo' is the full URL or we process it
                { shouldPlay: true }
            );

            setSound(newSound);
            setCurrentTrack(track);
            setIsPlaying(true);

            // Setup status update listener for progress bar (future)
            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    setIsPlaying(false);
                }
            });

            // Track analytics
            analyticsService.trackPlay(track.id);

        } catch (error) {
            console.error("Error playing sound", error);
        } finally {
            setIsLoading(false);
        }
    };

    const pauseTrack = async () => {
        if (sound && isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
        }
    };

    return (
        <AudioContext.Provider value={{
            currentTrack,
            isPlaying,
            isLoading,
            playTrack,
            pauseTrack
        }}>
            {children}
        </AudioContext.Provider>
    );
};

export const useAudio = () => useContext(AudioContext);
