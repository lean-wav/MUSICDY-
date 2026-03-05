import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class SecuritySettingsScreen extends StatefulWidget {
  const SecuritySettingsScreen({super.key});

  @override
  State<SecuritySettingsScreen> createState() => _SecuritySettingsScreenState();
}

class _SecuritySettingsScreenState extends State<SecuritySettingsScreen> {
  late bool _twoFactorEnabled;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _twoFactorEnabled = user?.settings?['security']?['two_factor'] ?? false;
  }

  Future<void> _saveSettings() async {
    try {
      final user = context.read<AuthProvider>().user;
      final currentSettings = Map<String, dynamic>.from(user?.settings ?? {});
      currentSettings['security'] = {"two_factor": _twoFactorEnabled};

      await context.read<AuthProvider>().updateProfile(
        settings: currentSettings,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Ajustes de seguridad actualizados")),
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
          "SEGURIDAD",
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w900,
            letterSpacing: 2,
          ),
        ),
        actions: [
          context.watch<AuthProvider>().loading
              ? const Padding(
                  padding: EdgeInsets.only(right: 16),
                  child: Center(
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
          _buildSecurityGroup("PROTECCIÓN DE ACCESO", [
            _buildSwitchTile(
              "Autenticación en dos pasos (2FA)",
              "Añade una capa extra de seguridad a tu estudio",
              _twoFactorEnabled,
              (v) => setState(() => _twoFactorEnabled = v),
            ),
            _buildActionTile(
              "Cambiar contraseña",
              Icons.lock_outline_rounded,
              "Último cambio: hace 3 meses",
              () {},
            ),
          ]),
          _buildSecurityGroup("SESIONES ACTIVAS", [
            _buildDeviceTile(
              "Windows PC • Chrome",
              "Buenos Aires, AR",
              "Sesión actual",
              true,
            ),
            _buildDeviceTile(
              "iPhone 13 • MusicDy App",
              "Cordoba, AR",
              "Hace 2 horas",
              false,
            ),
            _buildDeviceTile(
              "MacBook Pro • Safari",
              "Mendoza, AR",
              "Hace 3 días",
              false,
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: TextButton(
                onPressed: () {},
                child: Text(
                  "CERRAR TODAS LAS SESIONES",
                  style: GoogleFonts.inter(
                    color: Colors.redAccent,
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1,
                  ),
                ),
              ),
            ),
          ]),
          _buildSecurityGroup("HISTORIAL DE ACTIVIDAD", [
            _buildActivityItem(
              "Inicio de sesión detectado",
              "Hoy, 14:20",
              "Windows PC",
            ),
            _buildActivityItem(
              "Cambio de nombre artístico",
              "Ayer, 10:05",
              "MusicDy App",
            ),
          ]),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildSecurityGroup(String title, List<Widget> children) {
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
      subtitle: Text(
        subtitle,
        style: GoogleFonts.inter(color: Colors.white24, fontSize: 11),
      ),
    );
  }

  Widget _buildActionTile(
    String title,
    IconData icon,
    String subtitle,
    VoidCallback onTap,
  ) {
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
      subtitle: Text(
        subtitle,
        style: GoogleFonts.inter(color: Colors.white24, fontSize: 11),
      ),
      trailing: const Icon(Icons.chevron_right_rounded, color: Colors.white12),
    );
  }

  Widget _buildDeviceTile(
    String name,
    String location,
    String time,
    bool isCurrent,
  ) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      leading: Icon(
        isCurrent ? Icons.laptop_mac_rounded : Icons.smartphone_rounded,
        color: isCurrent ? Colors.greenAccent : Colors.white24,
        size: 20,
      ),
      title: Text(
        name,
        style: GoogleFonts.inter(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: Text(
        "$location • $time",
        style: GoogleFonts.inter(color: Colors.white24, fontSize: 11),
      ),
      trailing: isCurrent
          ? null
          : const Icon(Icons.logout_rounded, color: Colors.white12, size: 18),
    );
  }

  Widget _buildActivityItem(String activity, String time, String device) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: Colors.white10,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  activity,
                  style: GoogleFonts.inter(
                    color: Colors.white70,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  "$time via $device",
                  style: GoogleFonts.inter(color: Colors.white12, fontSize: 10),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
