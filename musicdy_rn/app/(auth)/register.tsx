import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
  Animated, Linking,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { apiClient } from '@/src/api/client';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Real-time validation
  const [emailError, setEmailError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-3
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const checkUsernameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('error');
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const router = useRouter();

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
    Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(toastOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setToastVisible(false));
      }, 3500);
    });
  };

  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (text.length > 4 && !emailRegex.test(text)) {
      setEmailError('Formato de email inválido');
    } else {
      setEmailError('');
    }
  };

  const validatePassword = (text: string) => {
    setPassword(text);
    let strength = 0;
    if (text.length >= 8) strength++;
    if (/[A-Z]/.test(text)) strength++;
    if (/[0-9]/.test(text)) strength++;
    setPasswordStrength(strength);
  };

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    setIsUsernameAvailable(null);
    if (checkUsernameRef.current) clearTimeout(checkUsernameRef.current);
    if (text.length > 2) {
      setCheckingUsername(true);
      checkUsernameRef.current = setTimeout(async () => {
        try {
          const res = await apiClient.get(`/users/check-username?username=${text}`);
          setIsUsernameAvailable(res.data.available);
        } catch {
          setIsUsernameAvailable(null);
        } finally {
          setCheckingUsername(false);
        }
      }, 600);
    } else {
      setCheckingUsername(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !email || !password) {
      showToast('Completá todos los campos.', 'error');
      return;
    }
    if (emailError) {
      showToast('El formato del email es inválido.', 'error');
      return;
    }
    if (password.length < 8) {
      showToast('La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }
    if (isUsernameAvailable === false) {
      showToast('Ese nombre de usuario ya está en uso.', 'error');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('users/', {
        username,
        email,
        password,
        tipo_usuario: 'General',
        provider: 'email',
      });
      // Registration succeeded → navigate to OTP screen
      router.push({ pathname: '/(auth)/verify-otp', params: { email } });
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (err.message === 'Network Error' || err.code === 'ECONNABORTED') {
        showToast('Problema de conexión. Intentá en unos segundos.', 'error');
      } else if (detail?.includes('correo')) {
        showToast('Ese correo ya está registrado.', 'error');
      } else if (detail?.includes('usuario')) {
        showToast('Ese username ya está en uso.', 'error');
      } else {
        showToast(detail || 'Error al registrarse. Intentá de nuevo.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const strengthColors = ['#333', '#EF476F', '#FFD700', '#06d6a0'];
  const strengthLabels = ['', 'Débil', 'Media', 'Fuerte'];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {toastVisible && (
        <Animated.View style={[styles.toast, { backgroundColor: toastType === 'success' ? '#06d6a0' : '#EF476F', opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>MUSICDY</Text>
        <Text style={styles.subtitle}>Crea tu cuenta musical</Text>

        {/* Username */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nombre de usuario"
              placeholderTextColor="#64748B"
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.inputEndIcon}>
              {checkingUsername && <ActivityIndicator size="small" color="#FFD700" />}
              {!checkingUsername && isUsernameAvailable === true && <Ionicons name="checkmark-circle" size={22} color="#06d6a0" />}
              {!checkingUsername && isUsernameAvailable === false && <Ionicons name="close-circle" size={22} color="#EF476F" />}
            </View>
          </View>
        </View>

        {/* Email */}
        <View style={styles.inputWrapper}>
          <View style={[styles.inputRow, emailError ? styles.inputError : null]}>
            <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={validateEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
        </View>

        {/* Password */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña (mín. 8 caracteres)"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={validatePassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          {password.length > 0 && (
            <View style={styles.strengthRow}>
              {[1, 2, 3].map(i => (
                <View key={i} style={[styles.strengthBar, { backgroundColor: i <= passwordStrength ? strengthColors[passwordStrength] : '#222' }]} />
              ))}
              <Text style={[styles.strengthLabel, { color: strengthColors[passwordStrength] }]}>
                {password.length > 0 ? strengthLabels[passwordStrength] : ''}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading || isUsernameAvailable === false}
        >
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Crear Cuenta</Text>}
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.termsText}>
          Al registrarte, aceptás nuestros{' '}
          <Text style={styles.termsLink} onPress={() => Linking.openURL('https://musicdy.com/terms')}>
            Términos de Uso
          </Text>{' '}
          y{' '}
          <Text style={styles.termsLink} onPress={() => Linking.openURL('https://musicdy.com/privacy')}>
            Política de Privacidad
          </Text>
        </Text>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.loginLink}>
            <Text style={styles.loginText}>¿Ya tenés cuenta? <Text style={styles.loginTextBold}>Iniciá sesión</Text></Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20, right: 20,
    padding: 16, borderRadius: 12, zIndex: 1000,
    alignItems: 'center', elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 5,
  },
  toastText: { color: '#fff', fontWeight: 'bold', fontSize: 15, textAlign: 'center' },
  title: {
    fontSize: 48, fontWeight: '900', color: '#FFD700', textAlign: 'center',
    letterSpacing: -2, marginTop: 40,
    textShadowColor: 'rgba(255,215,0,0.3)',
    textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 15,
  },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 40, marginTop: 4 },
  inputWrapper: { marginBottom: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#121212', borderRadius: 16,
    borderWidth: 1, borderColor: '#222',
    paddingHorizontal: 16, height: 60,
  },
  inputError: { borderColor: '#EF476F' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#fff', fontSize: 16, height: '100%' },
  inputEndIcon: { marginLeft: 8 },
  fieldError: { color: '#EF476F', fontSize: 12, marginTop: 4, marginLeft: 4 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 4 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '600', width: 50, textAlign: 'right' },
  btn: {
    height: 60, backgroundColor: '#FFD700', borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  btnDisabled: { opacity: 0.65, shadowOpacity: 0 },
  btnText: { color: '#000', fontSize: 18, fontWeight: '800' },
  termsText: { color: '#555', fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  termsLink: { color: '#FFD700', fontWeight: 'bold' },
  loginLink: { alignItems: 'center', marginTop: 24, padding: 8 },
  loginText: { color: '#aaa', fontSize: 15 },
  loginTextBold: { color: '#FFD700', fontWeight: 'bold' },
});
