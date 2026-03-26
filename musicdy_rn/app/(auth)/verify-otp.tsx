import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Animated, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiClient } from '@/src/api/client';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';

const OTP_LENGTH = 6;
const TIMER_SECONDS = 600; // 10 minutes

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [canResend, setCanResend] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('error');
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const inputs = useRef<(TextInput | null)[]>([]);
  const router = useRouter();
  const { login } = useAuthStore();

  // Timer countdown
  useEffect(() => {
    if (secondsLeft <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  // Auto-focus first input
  useEffect(() => {
    setTimeout(() => inputs.current[0]?.focus(), 300);
  }, []);

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

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      showToast('Ingresá los 6 dígitos del código.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('users/verify-otp', { email, otp_code: code });
      const { access_token, user } = res.data;
      // Fetch full user profile
      const resMe = await apiClient.get('users/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      await login(access_token, resMe.data);
      showToast('¡Cuenta verificada! Bienvenido 🎶', 'success');
      setTimeout(() => router.replace('/(tabs)/feed'), 1200);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail?.includes('expiró')) {
        showToast('El código expiró. Pedí uno nuevo.', 'error');
        setCanResend(true);
      } else if (detail?.includes('incorrecto')) {
        showToast('Código incorrecto. Revisá y volvé a intentar.', 'error');
      } else if (err.message === 'Network Error') {
        showToast('Problema de conexión. Intentá en unos segundos.', 'error');
      } else {
        showToast(detail || 'Error al verificar el código.', 'error');
      }
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await apiClient.post('users/resend-otp', { email });
      setSecondsLeft(TIMER_SECONDS);
      setCanResend(false);
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputs.current[0]?.focus(), 100);
      showToast('Nuevo código enviado 📬', 'success');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      showToast(detail || 'Error al reenviar. Intentá de nuevo.', 'error');
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {toastVisible && (
        <Animated.View style={[styles.toast, { backgroundColor: toastType === 'success' ? '#06d6a0' : '#EF476F', opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>

        <View style={styles.iconWrap}>
          <Ionicons name="mail-unread-outline" size={64} color="#FFD700" />
        </View>

        <Text style={styles.title}>Verificá tu Email</Text>
        <Text style={styles.subtitle}>
          Enviamos un código de 6 dígitos a{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        {/* OTP inputs */}
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={ref => { inputs.current[i] = ref; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={t => handleChange(t, i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectionColor="#FFD700"
              textAlign="center"
              autoComplete="one-time-code"
            />
          ))}
        </View>

        {/* Timer */}
        <Text style={styles.timerText}>
          {canResend ? '' : `El código expira en ${formatTime(secondsLeft)}`}
        </Text>

        {/* Verify button */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Verificar Código</Text>}
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity
          style={[styles.resendBtn, !canResend && styles.resendBtnDisabled]}
          onPress={handleResend}
          disabled={!canResend || resendLoading}
        >
          {resendLoading
            ? <ActivityIndicator color="#FFD700" size="small" />
            : <Text style={[styles.resendText, !canResend && styles.resendTextDisabled]}>
                {canResend ? 'Reenviar código' : 'Podés reenviar cuando expire el actual'}
              </Text>
          }
        </TouchableOpacity>
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
  backBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 16, left: 16, zIndex: 10, padding: 8 },
  iconWrap: { alignItems: 'center', marginBottom: 24, marginTop: 60 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  emailText: { color: '#FFD700', fontWeight: 'bold' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 },
  otpBox: {
    width: 48, height: 60, borderRadius: 12,
    borderWidth: 2, borderColor: '#222',
    backgroundColor: '#121212',
    color: '#fff', fontSize: 24, fontWeight: 'bold',
  },
  otpBoxFilled: {
    borderColor: '#FFD700',
    shadowColor: '#FFD700', shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, elevation: 4,
  },
  timerText: { textAlign: 'center', color: '#555', fontSize: 13, marginBottom: 24 },
  btn: {
    height: 58, backgroundColor: '#FFD700', borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  btnDisabled: { opacity: 0.65, shadowOpacity: 0 },
  btnText: { color: '#000', fontSize: 18, fontWeight: '800' },
  resendBtn: { marginTop: 20, alignItems: 'center', padding: 10 },
  resendBtnDisabled: {},
  resendText: { color: '#FFD700', fontWeight: 'bold', fontSize: 14 },
  resendTextDisabled: { color: '#444', fontWeight: 'normal', fontSize: 13 },
});
