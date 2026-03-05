import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:musicdy_app/features/auth/screens/settings/account_settings_screen.dart';
import 'package:musicdy_app/features/auth/screens/settings/privacy_settings_screen.dart';
import 'package:musicdy_app/features/auth/screens/settings/notification_settings_screen.dart';
import 'package:musicdy_app/features/auth/screens/settings/content_library_screen.dart';
import 'package:musicdy_app/features/auth/screens/settings/security_settings_screen.dart';
import 'package:musicdy_app/features/auth/screens/settings/interactions_settings_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        centerTitle: false,
        title: Text(
          "SYSTEM CONFIG",
          style: GoogleFonts.inter(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w900,
            letterSpacing: 2,
          ),
        ),
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new,
            color: Colors.white,
            size: 18,
          ),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(vertical: 20),
        children: [
          _buildSettingsGroup("GESTIÓN PROFESIONAL", [
            _buildSettingsTile(
              icon: Icons.person_outline_rounded,
              title: "Cuenta",
              subtitle: "Nombre, email, seguridad y estado de cuenta",
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const AccountSettingsScreen(),
                ),
              ),
            ),
            _buildSettingsTile(
              icon: Icons.lock_outline_rounded,
              title: "Privacidad",
              subtitle: "Control de visibilidad y descubrimiento",
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const PrivacySettingsScreen(),
                ),
              ),
            ),
            _buildSettingsTile(
              icon: Icons.forum_outlined,
              title: "Interacciones",
              subtitle: "Comentarios, mensajes y colaboraciones",
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const InteractionsSettingsScreen(),
                ),
              ),
            ),
          ]),
          _buildSettingsGroup("SISTEMA", [
            _buildSettingsTile(
              icon: Icons.notifications_none_rounded,
              title: "Notificaciones",
              subtitle: "Configuración push y e-mail",
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const NotificationSettingsScreen(),
                ),
              ),
            ),
            _buildSettingsTile(
              icon: Icons.shield_outlined,
              title: "Seguridad",
              subtitle: "Dispositivos, actividad y 2FA",
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const SecuritySettingsScreen(),
                ),
              ),
            ),
          ]),
          _buildSettingsGroup("ESTUDIO Y CONTENIDO", [
            _buildSettingsTile(
              icon: Icons.storage_rounded,
              title: "Contenido y Biblioteca",
              subtitle: "Espacio, archivos y calidad de preview",
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const ContentLibrarySettingsScreen(),
                ),
              ),
            ),
            _buildSettingsTile(
              icon: Icons.block_flipped,
              title: "Bloqueos y Moderación",
              subtitle: "Cuentas bloqueadas y filtros de palabras",
              onTap: () {},
            ),
          ]),
          const SizedBox(height: 40),
          Center(
            child: Text(
              "VERSION 1.0.4 - STABLE BUILD",
              style: GoogleFonts.inter(
                color: Colors.white10,
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildSettingsGroup(String label, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
          child: Text(
            label,
            style: GoogleFonts.inter(
              color: Colors.white24,
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 2,
            ),
          ),
        ),
        ...children,
      ],
    );
  }

  Widget _buildSettingsTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
      title: Text(
        title,
        style: GoogleFonts.inter(
          color: Colors.white,
          fontSize: 15,
          fontWeight: FontWeight.w700,
        ),
      ),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Text(
          subtitle,
          style: GoogleFonts.inter(
            color: Colors.white30,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
      trailing: const Icon(
        Icons.arrow_forward_ios_rounded,
        color: Colors.white10,
        size: 14,
      ),
    );
  }
}
