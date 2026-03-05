import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'register_screen.dart';
import 'forgot_password_screen.dart';
import 'onboarding_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.redAccent),
    );
  }

  Future<void> _handleLogin() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text;

    if (username.isEmpty || password.isEmpty) {
      _showError("Completá todos los campos.");
      return;
    }

    try {
      await context.read<AuthProvider>().login(username, password);
    } catch (e) {
      _showError("Error al iniciar sesión. Verificá tus credenciales.");
    }
  }

  Future<void> _handleProviderLogin(String provider) async {
    try {
      String? email;
      String? providerId;

      if (provider == 'google') {
        final GoogleSignIn googleSignIn = GoogleSignIn(scopes: ['email']);
        final GoogleSignInAccount? account = await googleSignIn.signIn();
        if (account == null) {
          return; // User canceled the sign-in flow
        }
        email = account.email;
        providerId = account.id;
      } else if (provider == 'apple') {
        final AuthorizationCredentialAppleID credential =
            await SignInWithApple.getAppleIDCredential(
              scopes: [
                AppleIDAuthorizationScopes.email,
                AppleIDAuthorizationScopes.fullName,
              ],
            );
        email = credential.email;
        providerId = credential.userIdentifier;

        // Note: Apple only returns the email on the first login.
        // If email is null, you probably need to handle it or show an error
        // Or store it locally after first fetch.
        if (email == null || email.isEmpty) {
          _showError("No se pudo obtener el correo de Apple.");
          return;
        }
      }

      if (email == null || providerId == null) {
        _showError("No se pudo completar el inicio de sesión");
        return;
      }

      final res = await context.read<AuthProvider>().loginProvider(
        email,
        provider,
        providerId,
      );

      if (res['needs_registration'] == true) {
        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => OnboardingScreen(
                initialData: {
                  'flow': 'oauth',
                  'email': email,
                  'provider': provider,
                  'provider_id': providerId,
                },
              ),
            ),
          );
        }
      }
    } catch (e) {
      _showError("Error al conectar con $provider.");
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = context.watch<AuthProvider>().loading;

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 48.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 48),
              Text(
                'MUSICDY',
                style: GoogleFonts.outfit(
                  fontSize: 48,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF06D6A0),
                  letterSpacing: -2,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Tu nueva casa musical',
                style: GoogleFonts.inter(fontSize: 14, color: Colors.white54),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 64),
              TextField(
                controller: _usernameController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Username o Email',
                  labelStyle: const TextStyle(color: Colors.white54),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.05),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF06D6A0)),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: true,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Contraseña',
                  labelStyle: const TextStyle(color: Colors.white54),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.05),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF06D6A0)),
                  ),
                ),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const ForgotPasswordScreen(),
                    ),
                  ),
                  child: Text(
                    '¿Olvidaste tu contraseña?',
                    style: GoogleFonts.inter(
                      color: Colors.white54,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: isLoading ? null : _handleLogin,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: const Color(0xFF06D6A0),
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          color: Colors.black,
                          strokeWidth: 2,
                        ),
                      )
                    : Text(
                        'Iniciar Sesión',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
              ),
              const SizedBox(height: 32),
              Row(
                children: [
                  Expanded(
                    child: Divider(color: Colors.white.withOpacity(0.1)),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'O continuá con',
                      style: GoogleFonts.inter(
                        color: Colors.white54,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Divider(color: Colors.white.withOpacity(0.1)),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              _buildSocialBtn(
                'Continuar con Google',
                Icons.g_mobiledata,
                () => _handleProviderLogin('google'),
              ),
              const SizedBox(height: 12),
              _buildSocialBtn(
                'Continuar con Apple',
                Icons.apple,
                () => _handleProviderLogin('apple'),
              ),
              const SizedBox(height: 48),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "¿No tenés cuenta?",
                    style: GoogleFonts.inter(color: Colors.white54),
                  ),
                  TextButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const RegisterScreen()),
                    ),
                    child: Text(
                      'Crear cuenta',
                      style: GoogleFonts.inter(
                        color: const Color(0xFF06D6A0),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSocialBtn(String text, IconData icon, VoidCallback onTap) {
    return ElevatedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, color: Colors.white, size: 28),
      label: Text(
        text,
        style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 15),
      ),
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 14),
        backgroundColor: Colors.white.withOpacity(0.05),
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: Colors.white12),
        ),
        elevation: 0,
      ),
    );
  }
}
