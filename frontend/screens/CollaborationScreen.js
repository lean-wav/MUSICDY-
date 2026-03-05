import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const DuetCard = ({ duet }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <View style={styles.duetCard}>
      <View style={styles.duetImages}>
        <Image
          source={{ uri: duet.productor_original.foto_perfil || 'https://via.placeholder.com/150' }}
          style={styles.producerImage}
        />
        <View style={styles.duetIcon}>
          <Icon name="plus" size={24} color="#ffffff" />
        </View>
        <Image
          source={{ uri: duet.productor_colaborador?.foto_perfil || 'https://via.placeholder.com/150' }}
          style={[styles.producerImage, !duet.productor_colaborador && styles.emptySlot]}
        />
      </View>

      <View style={styles.duetInfo}>
        <Text style={styles.duetTitle}>{duet.metadata_beat.titulo || "Nueva Colaboración"}</Text>
        <View style={styles.duetStatus}>
          <Icon 
            name={duet.estado === 'completada' ? 'check-circle' : 'clock-outline'} 
            size={20} 
            color={duet.estado === 'completada' ? '#4caf50' : '#ffc107'}
          />
          <Text style={styles.statusText}>{duet.estado}</Text>
        </View>

        <View style={styles.duetStats}>
          <View style={styles.statItem}>
            <Icon name="eye" size={18} color="#666666" />
            <Text style={styles.statText}>{duet.visualizaciones}</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="heart" size={18} color="#ff4081" />
            <Text style={styles.statText}>{duet.likes}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.detailsButton}
          onPress={() => setShowDetails(true)}
        >
          <Text style={styles.detailsText}>Ver detalles</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDetails(false)}
            >
              <Icon name="close" size={24} color="#666666" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Detalles de la Colaboración</Text>
            
            <View style={styles.producersSection}>
              <View style={styles.producerInfo}>
                <Image
                  source={{ uri: duet.productor_original.foto_perfil }}
                  style={styles.modalProducerImage}
                />
                <Text style={styles.producerName}>{duet.productor_original.username}</Text>
                <Text style={styles.producerRole}>Creador</Text>
              </View>

              {duet.productor_colaborador && (
                <View style={styles.producerInfo}>
                  <Image
                    source={{ uri: duet.productor_colaborador.foto_perfil }}
                    style={styles.modalProducerImage}
                  />
                  <Text style={styles.producerName}>{duet.productor_colaborador.username}</Text>
                  <Text style={styles.producerRole}>Colaborador</Text>
                </View>
              )}
            </View>

            <View style={styles.metadataSection}>
              <Text style={styles.metadataTitle}>Información del Beat</Text>
              <Text style={styles.metadataText}>
                BPM: {duet.metadata_beat.bpm || 'No especificado'}
              </Text>
              <Text style={styles.metadataText}>
                Escala: {duet.metadata_beat.escala || 'No especificada'}
              </Text>
              <Text style={styles.metadataText}>
                Género: {duet.metadata_beat.genero || 'No especificado'}
              </Text>
            </View>

            {duet.estado === 'completada' && (
              <TouchableOpacity style={styles.downloadButton}>
                <Icon name="download" size={24} color="#ffffff" />
                <Text style={styles.downloadText}>Descargar Beat</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const CollaborationScreen = () => {
  const [duets, setDuets] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDuets();
  }, []);

  const fetchDuets = async () => {
    try {
      const response = await fetch('http://localhost:8000/usuario/1/colaboraciones');
      const data = await response.json();
      setDuets(data);
    } catch (error) {
      console.error('Error fetching duets:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDuets();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createButton}>
        <Icon name="plus" size={24} color="#ffffff" />
        <Text style={styles.createButtonText}>Crear Colaboración</Text>
      </TouchableOpacity>

      <FlatList
        data={duets}
        renderItem={({ item }) => <DuetCard duet={item} />}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ee',
    margin: 15,
    padding: 15,
    borderRadius: 25,
    elevation: 3,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  listContainer: {
    padding: 10,
  },
  duetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    marginBottom: 15,
    padding: 15,
    elevation: 3,
  },
  duetImages: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  producerImage: {
    width: width * 0.25,
    height: width * 0.25,
    borderRadius: width * 0.125,
  },
  duetIcon: {
    backgroundColor: '#6200ee',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  emptySlot: {
    opacity: 0.3,
  },
  duetInfo: {
    alignItems: 'center',
  },
  duetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  duetStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusText: {
    marginLeft: 5,
    color: '#666666',
    textTransform: 'capitalize',
  },
  duetStats: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  statText: {
    marginLeft: 5,
    color: '#666666',
  },
  detailsButton: {
    backgroundColor: '#6200ee20',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  detailsText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    minHeight: '70%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  producersSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  producerInfo: {
    alignItems: 'center',
  },
  modalProducerImage: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: width * 0.1,
    marginBottom: 10,
  },
  producerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  producerRole: {
    fontSize: 14,
    color: '#666666',
  },
  metadataSection: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  metadataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  metadataText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 5,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ee',
    padding: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  downloadText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default CollaborationScreen; 