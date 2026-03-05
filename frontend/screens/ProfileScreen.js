import { View, Text, StyleSheet, Button, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../AuthContext';
import authService from '../services/auth';
import analyticsService from '../services/analytics';

const ProfileScreen = () => {
    const { user, logout } = useAuth();

    const [stats, setStats] = useState({ followers_count: 0, following_count: 0, is_following: false });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            analyticsService.trackProfileView(user.id);
            loadStats();
        }
    }, [user]);

    const loadStats = async () => {
        try {
            const data = await authService.getUserStats(user.id);
            setStats(data);
        } catch (e) {
            console.error("Error loading profile stats", e);
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async () => {
        try {
            const data = await authService.followUser(user.id);
            setStats(data);
        } catch (e) {
            console.error("Error toggling follow", e);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Mi Perfil</Text>
            {user && (
                <View style={styles.info}>
                    <Text style={styles.label}>Usuario: <Text style={styles.value}>{user.username}</Text></Text>
                    <Text style={styles.label}>Email: <Text style={styles.value}>{user.email}</Text></Text>

                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{stats.followers_count}</Text>
                            <Text style={styles.statLabel}>Seguidores</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{stats.following_count}</Text>
                            <Text style={styles.statLabel}>Seguidos</Text>
                        </View>
                    </View>

                    <View style={styles.metrics}>
                        <Text>Perfil visto {user.profile_views || 0} veces</Text>
                    </View>
                </View>
            )}
            <Button title="Cerrar Sesión" onPress={logout} color="red" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    info: {
        marginBottom: 30,
        width: '100%',
    },
    label: {
        fontSize: 16,
        marginBottom: 10,
        color: '#555',
    },
    value: {
        fontWeight: 'bold',
        color: '#000',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 20,
        paddingVertical: 15,
        backgroundColor: '#f9f9f9',
        borderRadius: 15,
    },
    statBox: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6200ee',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    metrics: {
        alignItems: 'center',
        padding: 10,
    }
});

export default ProfileScreen;
