import React, { useState } from 'react';
import { View, Modal, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';

const CheckoutModal = ({ visible, url, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(true);

    return (
        <Modal visible={visible} animationType="slide">
            <View style={{ flex: 1 }}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeText}>Cerrar</Text>
                </TouchableOpacity>

                {url ? (
                    <View style={{ flex: 1 }}>
                        <WebView
                            source={{ uri: url }}
                            style={{ flex: 1 }}
                            onLoadStart={() => setLoading(true)}
                            onLoadEnd={() => setLoading(false)}
                            onNavigationStateChange={(navState) => {
                                // Success detection for both Stripe and MP
                                if (navState.url.includes('/success') || navState.url.includes('status=approved')) {
                                    onSuccess();
                                    onClose();
                                }
                                if (navState.url.includes('/cancel') || navState.url.includes('status=cancelled')) {
                                    onClose();
                                }
                            }}
                        />
                        {loading && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color="#0000ff" />
                                <Text style={styles.loadingText}>Cargando pago seguro...</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <ActivityIndicator size="large" style={styles.loader} />
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    closeButton: {
        padding: 20,
        backgroundColor: '#fff',
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    closeText: {
        fontSize: 16,
        color: 'blue',
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#333',
    }
});

export default CheckoutModal;
