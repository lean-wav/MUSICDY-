import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class PrivacySettingsScreen extends StatefulWidget {
  const PrivacySettingsScreen({super.key});

  @override
  State<PrivacySettingsScreen> createState() => _PrivacySettingsScreenState();
}

class _PrivacySettingsScreenState extends State<PrivacySettingsScreen> {
  late bool _isPrivate;
  late Map<String, dynamic> _privacySettings;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _isPrivate = user?.isPrivate ?? false;
    _privacySettings = Map<String, dynamic>.from(
      user?.settings?['privacy'] ??
          {
            "find_by_email": true,
            "find_by_phone": true,
            "recommend_account": true,
            "sync_contacts": false,
            "allow_reuse": true,
            "allow_download": false,
            "show_followers": true,
            "show_activity": true,
          },
    );
  }

  Future<void> _saveSettings() async {
    try {
      final user = context.read<AuthProvider>().user;
      final currentSettings = Map<String, dynamic>.from(user?.settings ?? {});
      currentSettings['privacy'] = _privacySettings;

      await context.read<AuthProvider>().updateProfile(
        isPrivate: _isPrivate,
        settings: currentSettings,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Ajustes de privacidad guardados")),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text("Error al guardar: $e")));
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
          "PRIVACIDAD",
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
                  onPressed: _saveSettings,
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
          _buildPrivacyGroup("VISIBILIDAD", [
            _buildSwitchTile(
              "Cuenta Privada",
              "Solo tus seguidores aprobados verán tu contenido",
              _isPrivate,
              (v) => setState(() => _isPrivate = v),
            ),
            _buildSwitchTile(
              "Sugerir cuenta",
              "Permite que el algoritmo recomiende tu perfil",
              _privacySettings['recommend_account'],
              (v) => setState(() => _privacySettings['recommend_account'] = v),
            ),
          ]),
          _buildPrivacyGroup("DESCUBRIMIENTO", [
            _buildSwitchTile(
              "Encontrar por Email",
              "Permite que te encuentren usando tu correo",
              _privacySettings['find_by_email'],
              (v) => setState(() => _privacySettings['find_by_email'] = v),
            ),
            _buildActionTile(
              "Sincronizar Contactos",
              Icons.import_contacts_rounded,
              () {},
            ),
          ]),
          _buildPrivacyGroup("DERECHOS DE CONTENIDO", [
            _buildSwitchTile(
              "Permitir reutilización",
              "Otros productores pueden usar tus loops en sus beats",
              _privacySettings['allow_reuse'],
              (v) => setState(() => _privacySettings['allow_reuse'] = v),
            ),
            _buildSwitchTile(
              "Permitir descarga",
              "Habilita la descarga de tus archivos públicos",
              _privacySettings['allow_download'],
              (v) => setState(() => _privacySettings['allow_download'] = v),
            ),
            _buildActionTile(
              "Permisos de Remix",
              Icons.auto_awesome_motion_rounded,
              () {},
            ),
          ]),
          _buildPrivacyGroup("DATOS Y ACTIVIDAD", [
            _buildSwitchTile(
              "Mostrar seguidores",
              "Permite ver quiénes te siguen",
              _privacySettings['show_followers'],
              (v) => setState(() => _privacySettings['show_followers'] = v),
            ),
            _buildSwitchTile(
              "Estado de actividad",
              "Muestra si estás conectado en el estudio",
              _privacySettings['show_activity'],
              (v) => setState(() => _privacySettings['show_activity'] = v),
            ),
          ]),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildPrivacyGroup(String title, List<Widget> children) {
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

  Widget _buildSwitchTile(
    String title,
    String subtitle,
    bool value,
    ValueChanged<bool> onChanged,
  ) {
    return SwitchListTile.adaptive(
      value: value,
      onChanged: onChanged,
      activeColor: Colors.white,
      activeTrackColor: Colors.white24,
      inactiveTrackColor: Colors.white.withOpacity(0.05),
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      title: Text(
        title,
        style: GoogleFonts.inter(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Text(
          subtitle,
          style: GoogleFonts.inter(color: Colors.white24, fontSize: 11),
        ),
      ),
    );
  }

  Widget _buildActionTile(String title, IconData icon, VoidCallback onTap) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      leading: Icon(icon, color: Colors.white38, size: 20),
      title: Text(
        title,
        style: GoogleFonts.inter(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
      trailing: const Icon(Icons.chevron_right_rounded, color: Colors.white12),
    );
  }
}
