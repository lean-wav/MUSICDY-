import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import Colors from '../../constants/Colors';

export default function RecordScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraType, setCameraType] = useState('back');
  const cameraRef = useRef<Camera | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  React.useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: audioStatus } = await Audio.requestPermissionsAsync();
      setHasPermission(cameraStatus === 'granted' && audioStatus === 'granted');
    })();
  }, []);

  const startRecording = async () => {
    if (cameraRef.current) {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        recordingRef.current = recording;
        await recording.startAsync();
        setIsRecording(true);
      } catch (error) {
        console.error('Error al iniciar la grabación:', error);
      }
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        console.log('Grabación guardada en:', uri);
      }
      setIsRecording(false);
    } catch (error) {
      console.error('Error al detener la grabación:', error);
    }
  };

  const toggleCameraType = () => {
    setCameraType(cameraType === 'back' ? 'front' : 'back');
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Solicitando permisos...</Text></View>;
  }

  if (hasPermission === false) {
    return <View style={styles.container}><Text>Sin acceso a la cámara o micrófono</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType as any}
      >
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={toggleCameraType}>
            <Text style={styles.text}>Voltear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, isRecording && styles.recording]}
            onPress={isRecording ? stopRecording : startRecording}>
            <Text style={styles.text}>
              {isRecording ? 'Detener' : 'Grabar'}
            </Text>
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-around',
    margin: 20,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  recording: {
    backgroundColor: Colors.error,
  },
  text: {
    fontSize: 18,
    color: Colors.text,
  },
}); 