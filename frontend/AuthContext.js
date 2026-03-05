import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from './services/auth';
import { WS_URL } from './config';
import { View, ActivityIndicator, Alert } from 'react-native';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ws, setWs] = useState(null);

    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        if (user) {
            connectWebSocket(user.id);
        } else {
            if (ws) ws.close();
        }
    }, [user]);

    const connectWebSocket = (userId) => {
        const socket = new WebSocket(`${WS_URL}/${userId}`);

        socket.onmessage = (e) => {
            const notification = JSON.parse(e.data);
            handleNotification(notification);
        };

        socket.onerror = (e) => console.log("WS Error", e);
        socket.onclose = () => console.log("WS Closed");

        setWs(socket);
    };

    const handleNotification = (notif) => {
        let title = "";
        let body = "";

        switch (notif.type) {
            case 'NEW_LIKE':
                title = "¡Nuevo Like! ❤️";
                body = `${notif.data.liker_name} le dio like a "${notif.data.post_title}"`;
                break;
            case 'NEW_COMMENT':
                title = "Nuevo Comentario 💬";
                body = `${notif.data.commenter_name} comentó en "${notif.data.post_title}"`;
                break;
            case 'NEW_FOLLOWER':
                title = "Nuevo Seguidor 👤";
                body = `${notif.data.follower_name} ha empezado a seguirte`;
                break;
        }

        if (title) {
            Alert.alert(title, body);
        }
    };

    const loadUser = async () => {
        try {
            const token = await authService.getToken();
            if (token) {
                const userData = await authService.getMe();
                setUser(userData);
            }
        } catch (e) {
            console.log("Failed to load user", e);
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        await authService.login(username, password);
        await loadUser();
    };

    const register = async (name, email, password) => {
        // Basic register mapping
        await authService.register({ username: name, email, password });
        await login(name, password);
    }

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
