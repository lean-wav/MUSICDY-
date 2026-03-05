import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Colors from '../../constants/Colors';

export default function UploadScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentResult | null>(null);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: false,
      });

      if (result.type === 'success') {
        setSelectedFile(result);
      }
    } catch (err) {
      console.error('Error al seleccionar archivo:', err);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || selectedFile.type !== 'success') {
      alert('Por favor selecciona un archivo primero');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: 'audio/mpeg'
      } as any);

      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        alert('¡Archivo subido exitosamente!');
        setTitle('');
        setDescription('');
        setSelectedFile(null);
      } else {
        throw new Error('Error al subir el archivo');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al subir el archivo');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Título</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ingresa el título"
          placeholderTextColor={Colors.textSecondary}
        />

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Ingresa una descripción"
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity style={styles.button} onPress={pickDocument}>
          <Text style={styles.buttonText}>
            {selectedFile?.type === 'success' 
              ? `Archivo seleccionado: ${selectedFile.name}`
              : 'Seleccionar Archivo'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.uploadButton]} 
          onPress={handleUpload}
        >
          <Text style={styles.buttonText}>Subir</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 5,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadButton: {
    marginTop: 10,
    backgroundColor: Colors.accent,
  },
  buttonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 