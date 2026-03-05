import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class AccountSettingsScreen extends StatefulWidget {
  const AccountSettingsScreen({super.key});

  @override
  State<AccountSettingsScreen> createState() => _AccountSettingsScreenState();
}

class _AccountSettingsScreenState extends State<AccountSettingsScreen> {
  late TextEditingController _artisticNameController;
  late TextEditingController _usernameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _artisticNameController = TextEditingController(
      text: user?.artisticName ?? "",
    );
    _usernameController = TextEditingController(text: user?.username ?? "");
    _emailController = TextEditingController(text: user?.email ?? "");
    _phoneController = TextEditingController(text: user?.phone ?? "");
  }

  @override
  void dispose() {
    _artisticNameController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    try {
      await context.read<AuthProvider>().updateProfile(
        username: _usernameController.text,
        artisticName: _artisticNameController.text,
        phone: _phoneController.text,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Perfil actualizado correctamente")),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text("Error al actualizar: $e")));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: Text(
          "CUENTA",
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w900,
            letterSpacing: 2,
          ),
        ),
        actions: [
          context.watch<AuthProvider>().loading
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.only(right: 16),
                    child: SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white24,
                      ),
                    ),
                  ),
                )
              : TextButton(
                  onPressed: _saveProfile,
                  child: Text(
                    "GUARDAR",
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 11,
                    ),
                  ),
                ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 20),
        physics: const BouncingScrollPhysics(),
        children: [
          _buildInfoSection("DATOS DE IDENTIDAD", [
            _buildInputField("Nombre Artístico", _artisticNameController),
            _buildInputField("Username", _usernameController),
            _buildInputField("E-mail", _emailController, enabled: false),
            _buildInputField("Teléfono", _phoneController),
          ]),
          _buildInfoSection("SOBRE TI", [
            _buildStaticTile(
              "Fecha de Nacimiento",
              "24 / 08 / 1995",
              Icons.calendar_today_rounded,
            ),
            _buildStaticTile(
              "Región / País",
              "Argentina (AR)",
              Icons.public_rounded,
            ),
          ]),
          _buildInfoSection("SEGURIDAD Y ACCESO", [
            _buildActionTile("Cambiar Contraseña", Icons.key_rounded, () {}),
            _buildActionTile(
              "Autenticación en Dos Pasos (2FA)",
              Icons.verified_user_outlined,
              () {},
            ),
          ]),
          _buildInfoSection("GESTIÓN DE CUENTA", [
            _buildActionTile(
              "Desactivar cuenta",
              Icons.pause_circle_outline_rounded,
              () {},
            ),
            _buildActionTile(
              "Eliminar cuenta",
              Icons.delete_forever_rounded,
              () => _showDeleteConfirmation(),
              color: Colors.redAccent,
            ),
          ]),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildInfoSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 32, 24, 16),
          child: Text(
            title,
            style: GoogleFonts.inter(
              color: Colors.white24,
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.5,
            ),
          ),
        ),
        ...children,
      ],
    );
  }

  Widget _buildInputField(
    String label,
    TextEditingController controller, {
    bool enabled = true,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              color: Colors.white38,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: controller,
            enabled: enabled,
            style: GoogleFonts.inter(
              color: enabled ? Colors.white : Colors.white24,
              fontSize: 14,
            ),
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white.withOpacity(0.02),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 16,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(4),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.05)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(4),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.05)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(4),
                borderSide: const BorderSide(color: Colors.white24),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStaticTile(String label, String value, IconData icon) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      leading: Icon(icon, color: Colors.white24, size: 20),
      title: Text(
        label,
        style: GoogleFonts.inter(
          color: Colors.white38,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: Text(
        value,
        style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
      ),
      trailing: const Icon(Icons.chevron_right_rounded, color: Colors.white12),
    );
  }

  Widget _buildActionTile(
    String title,
    IconData icon,
    VoidCallback onTap, {
    Color? color,
  }) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      leading: Icon(icon, color: color ?? Colors.white70, size: 20),
      title: Text(
        title,
        style: GoogleFonts.inter(
          color: color ?? Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
      trailing: const Icon(Icons.chevron_right_rounded, color: Colors.white12),
    );
  }

  void _showDeleteConfirmation() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF0A0A0A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4),
          side: const BorderSide(color: Colors.white10),
        ),
        title: Text(
          "ELIMINAR CUENTA",
          style: GoogleFonts.inter(
            color: Colors.redAccent,
            fontWeight: FontWeight.w900,
            fontSize: 14,
          ),
        ),
        content: Text(
          "Esta acción es irreversible y eliminará todos tus beats, loops y créditos. ¿Confirmas tu identidad?",
          style: GoogleFonts.inter(color: Colors.white70, fontSize: 12),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text("CANCELAR", style: TextStyle(color: Colors.white24)),
          ),
          TextButton(
            onPressed: () {},
            child: Text(
              "ELIMINAR PERMANENTEMENTE",
              style: TextStyle(
                color: Colors.redAccent,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
