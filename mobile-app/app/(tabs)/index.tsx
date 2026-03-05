import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Text, View } from 'react-native';

export default function TabOneScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi App Musical</Text>
        <Text style={styles.subtitle}>Descubre, crea y comparte música</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Beats Recientes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {[1, 2, 3].map((item) => (
            <TouchableOpacity key={item} style={styles.beatCard}>
              <View style={styles.beatImage} />
              <Text style={styles.beatTitle}>Beat #{item}</Text>
              <Text style={styles.beatArtist}>Artista</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Artistas Trending</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {[1, 2, 3].map((item) => (
            <TouchableOpacity key={item} style={styles.artistCard}>
              <View style={styles.artistImage} />
              <Text style={styles.artistName}>Artista #{item}</Text>
              <Text style={styles.artistGenre}>Género</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categorías</Text>
        <View style={styles.categoriesGrid}>
          {['Trap', 'Reggaeton', 'Pop', 'Hip Hop'].map((category) => (
            <TouchableOpacity key={category} style={styles.categoryCard}>
              <Text style={styles.categoryText}>{category}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 5,
  },
  section: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000000',
  },
  horizontalScroll: {
    flexGrow: 0,
  },
  beatCard: {
    width: 150,
    marginRight: 15,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  beatImage: {
    width: '100%',
    height: 130,
    backgroundColor: '#dddddd',
    borderRadius: 8,
    marginBottom: 10,
  },
  beatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  beatArtist: {
    fontSize: 14,
    color: '#666666',
  },
  artistCard: {
    width: 120,
    marginRight: 15,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  artistImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dddddd',
    marginBottom: 10,
  },
  artistName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  artistGenre: {
    fontSize: 12,
    color: '#666666',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    height: 100,
    backgroundColor: '#6200ee',
    borderRadius: 10,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 