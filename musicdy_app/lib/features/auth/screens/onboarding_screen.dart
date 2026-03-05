import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../../feed/screens/home_screen.dart' as main;

class OnboardingScreen extends StatefulWidget {
  final Map<String, dynamic>? initialData;
  const OnboardingScreen({super.key, this.initialData});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _usernameController = TextEditingController();
  String _selectedRole = "Oyente";

  @override
  void initState() {
    super.initState();
    if (widget.initialData != null && widget.initialData!['username'] != null) {
      _usernameController.text = widget.initialData!['username'];
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.redAccent),
    );
  }

  Future<void> _handleComplete() async {
    final username = _usernameController.text.trim();
    if (username.isEmpty) {
      _showError("Por favor, elige un nombre de usuario.");
      return;
    }

    try {
      if (widget.initialData != null) {
        if (widget.initialData!['flow'] == 'email') {
          await context.read<AuthProvider>().register(
            username: username,
            email: widget.initialData!['email'],
            password: widget.initialData!['password'],
            birthdate: widget.initialData!['birthdate'],
            tipoUsuario: _selectedRole,
          );
        } else {
          // Came from an OAuth provider that needs registration
          await context.read<AuthProvider>().registerProvider(
            username: username,
            email: widget.initialData!['email'],
            provider: widget.initialData!['provider'],
            providerId: widget.initialData!['provider_id'],
            tipoUsuario: _selectedRole,
          );
        }
      } else {
        // Fallback or updating existing profile
        await context.read<AuthProvider>().updateProfile(username: username);
      }

      if (mounted) {
        // Redirigir a vista central
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const main.HomeScreen()),
          (Route<dynamic> route) => false,
        );
      }
    } catch (e) {
      _showError("Error al completar el perfil.");
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = context.watch<AuthProvider>().loading;

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading:
            false, // We don't want them to go back to login here
        title: const Text("Completa tu Perfil"),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Personaliza tu \nexperiencia',
                style: GoogleFonts.outfit(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: -1,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Configura los detalles finales para que podamos ofrecerte el mejor contenido.',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: Colors.white54,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 48),

              // Username Block
              Text(
                'TU USERNAME ÚNICO',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: Colors.white38,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _usernameController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'ej: mr_producer',
                  hintStyle: const TextStyle(color: Colors.white38),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.05),
                  prefixIcon: const Icon(
                    Icons.alternate_email,
                    color: Color(0xFF06D6A0),
                    size: 20,
                  ),
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

              const SizedBox(height: 48),

              // Role Block
              Text(
                '¿CÓMO VAS A USAR MUSICDY?',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: Colors.white38,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 16),
              _buildRoleCard(
                'Oyente',
                'Quiero descubrir nueva música',
                Icons.headphones,
              ),
              _buildRoleCard(
                'Artista',
                'Quiero subir mis canciones y encontrar beats',
                Icons.mic,
              ),
              _buildRoleCard(
                'Productor',
                'Hago beats, sampleos y tracks instrumentales',
                Icons.piano,
              ),
              _buildRoleCard(
                'Ambos',
                'Produzco y además interpreto',
                Icons.layers,
              ),

              const SizedBox(height: 48),

              ElevatedButton(
                onPressed: isLoading ? null : _handleComplete,
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
                        'FINALIZAR',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          letterSpacing: 2,
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRoleCard(String title, String desc, IconData icon) {
    bool isSelected = _selectedRole == title;

    return GestureDetector(
      onTap: () => setState(() => _selectedRole = title),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF06D6A0).withOpacity(0.1)
              : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? const Color(0xFF06D6A0) : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFF06D6A0) : Colors.black26,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                color: isSelected ? Colors.black : Colors.white70,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    desc,
                    style: GoogleFonts.inter(
                      color: Colors.white54,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              const Icon(Icons.check_circle, color: Color(0xFF06D6A0)),
          ],
        ),
      ),
    );
  }
}
