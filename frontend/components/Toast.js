import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [message, setMessage] = useState(null);
    const opacity = useState(new Animated.Value(0))[0];

    const showToast = (msg, duration = 3000) => {
        setMessage(msg);
        Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        setTimeout(() => {
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setMessage(null));
        }, duration);
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {message && (
                <Animated.View style={[styles.toast, { opacity }]}>
                    <Text style={styles.text}>{message}</Text>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
    toast: {
        position: 'absolute',
        bottom: 50,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        zIndex: 9999,
    },
    text: { color: '#fff', fontSize: 14, fontWeight: 'bold' }
});
