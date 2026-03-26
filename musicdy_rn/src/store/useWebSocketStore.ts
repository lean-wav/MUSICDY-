import { create } from 'zustand';
import { AppState, AppStateStatus } from 'react-native';
import { AppConfig } from '../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MessagePayload {
    type: string;
    data: any;
}

interface WebSocketState {
    socket: WebSocket | null;
    isConnected: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    sendMessage: (payload: MessagePayload) => void;
}

// Singleton for reconnect interval to avoid overlaps in Zustand standard state
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: any = null;
let intentionalDisconnect = false;

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
    socket: null,
    isConnected: false,

    connect: async () => {
        intentionalDisconnect = false;
        if (get().isConnected || get().socket) return;

        const token = await AsyncStorage.getItem('access_token');
        if (!token) return;

        // Build WS URL from HTTP Base URL
        const isSecure = AppConfig.baseURL.startsWith('https');
        const wsProtocol = isSecure ? 'wss://' : 'ws://';
        const hostname = AppConfig.baseURL.replace(/^https?:\/\//, '');
        const wsUrl = `${wsProtocol}${hostname}/notifications/ws?token=${token}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("WebSocket Connected!");
            set({ isConnected: true, socket: ws });
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log("WS Message received:", message);
                // Here we would dispatch to other stores (e.g., chat store or notifications store)
                // Since this is a generic socket, we can emit an event or let other hooks read from a global queue
                // For now, we just log it. Future improvement: event emitter pattern.
            } catch (e) {
                console.log("Error parsing WS message:", e);
            }
        };

        ws.onerror = (e: any) => {
            console.log("WebSocket Error:", e?.message);
        };

        ws.onclose = () => {
            console.log("WebSocket Disconnected");
            set({ isConnected: false, socket: null });

            if (!intentionalDisconnect) {
                // Auto-reconnect after 3 seconds
                if (!reconnectTimer) {
                    reconnectTimer = setTimeout(() => {
                        console.log("Attempting to reconnect WebSocket...");
                        get().connect();
                    }, 3000);
                }
            }
        };

        // Setup AppState listener if not already setup (to reconnect when app comes to foreground)
        if (!appStateSubscription) {
            appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
                if (nextAppState === 'active' && !get().isConnected && !intentionalDisconnect) {
                    get().connect();
                } else if (nextAppState === 'background') {
                    // Force disconnect to save battery and avoid silent drops
                    get().disconnect();
                    intentionalDisconnect = false; // reset intentional flag to true on next active
                }
            });
        }
    },

    disconnect: () => {
        intentionalDisconnect = true;
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        
        const { socket } = get();
        if (socket) {
            socket.close();
        }
        set({ isConnected: false, socket: null });
    },

    sendMessage: (payload: MessagePayload) => {
        const { socket, isConnected } = get();
        if (socket && isConnected) {
            socket.send(JSON.stringify(payload));
        } else {
            console.log("Cannot send message, WebSocket not connected");
        }
    }
}));
