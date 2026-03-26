import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/store/useAuthStore';
import { useWebSocketStore } from '../src/store/useWebSocketStore';
import { ActivityIndicator, View } from 'react-native';
import Toast from 'react-native-toast-message';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { isLoading, isAuthenticated, checkSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Si no logueado y no en vistas auth -> lo pateamos a auth
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Si logueado y en vista auth -> lo mandamos al feed de tabs
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  // Manage WebSocket lifecycle
  useEffect(() => {
    if (isAuthenticated) {
      useWebSocketStore.getState().connect();
    } else {
      useWebSocketStore.getState().disconnect();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </QueryClientProvider>
  );
}
