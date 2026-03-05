import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() =>
      _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState
    extends State<NotificationSettingsScreen> {
  late Map<String, dynamic> _notifSettings;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _notifSettings = Map<String, dynamic>.from(
      user?.settings?['notifications'] ??
          {
            "push": {
              "sales": true,
              "followers": true,
              "comments": true,
              "messages": true,
              "collabs": true,
            },
            "email": {
              "sales": true,
              "followers": false,
              "comments": true,
              "messages": true,
            },
          },
    );
  }

  Future<void> _saveSettings() async {
    try {
      final user = context.read<AuthProvider>().user;
      final currentSettings = Map<String, dynamic>.from(user?.settings ?? {});
      currentSettings['notifications'] = _notifSettings;

      await context.read<AuthProvider>().updateProfile(
        settings: currentSettings,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Preferencias de notificación actualizadas"),
          ),
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
          "NOTIFICACIONES",
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
          _buildNotifGroup("ALERTAS PUSH", "push", [
            _buildToggleItem(
              "push",
              "sales",
              "Ventas",
              "Avisar cuando alguien compre un beat",
            ),
            _buildToggleItem(
              "push",
              "followers",
              "Nuevos Seguidores",
              "Avisar cuando alguien te siga",
            ),
            _buildToggleItem(
              "push",
              "comments",
              "Comentarios",
              "Avisar sobre actividad en tus posts",
            ),
            _buildToggleItem(
              "push",
              "messages",
              "Mensajes Directos",
              "Notificaciones de chat",
            ),
            _buildToggleItem(
              "push",
              "collabs",
              "Colaboraciones",
              "Peticiones de split y edición",
            ),
          ]),
          _buildNotifGroup("E-MAIL", "email", [
            _buildToggleItem(
              "email",
              "sales",
              "Resumen de Ventas",
              "Reportes diarios/semanales",
            ),
            _buildToggleItem(
              "email",
              "messages",
              "Mensajes no leídos",
              "Avisar si tienes chats pendientes",
            ),
            _buildToggleItem(
              "email",
              "comments",
              "Actividad Social",
              "Comentarios y menciones",
            ),
          ]),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildNotifGroup(String title, String type, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 32, 24, 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: GoogleFonts.inter(
                  color: Colors.white24,
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.5,
                ),
              ),
              Icon(
                type == 'push'
                    ? Icons.notifications_active_outlined
                    : Icons.alternate_email_rounded,
                color: Colors.white10,
                size: 14,
              ),
            ],
          ),
        ),
        ...children,
      ],
    );
  }

  Widget _buildToggleItem(
    String type,
    String key,
    String title,
    String subtitle,
  ) {
    bool value = _notifSettings[type][key] ?? false;
    return SwitchListTile.adaptive(
      value: value,
      onChanged: (v) => setState(() => _notifSettings[type][key] = v),
      activeColor: Colors.white,
      activeTrackColor: Colors.white24,
      inactiveTrackColor: Colors.white.withOpacity(0.05),
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      title: Text(
        title,
        style: GoogleFonts.inter(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: GoogleFonts.inter(color: Colors.white24, fontSize: 11),
      ),
    );
  }
}
