import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class ContentLibrarySettingsScreen extends StatefulWidget {
  const ContentLibrarySettingsScreen({super.key});

  @override
  State<ContentLibrarySettingsScreen> createState() =>
      _ContentLibrarySettingsScreenState();
}

class _ContentLibrarySettingsScreenState
    extends State<ContentLibrarySettingsScreen> {
  late String _previewQuality;
  late bool _autoUpload;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _previewQuality =
        user?.settings?['library']?['preview_quality'] ?? "High (320kbps)";
    _autoUpload = user?.settings?['library']?['auto_upload'] ?? true;
  }

  Future<void> _saveSettings() async {
    try {
      final user = context.read<AuthProvider>().user;
      final currentSettings = Map<String, dynamic>.from(user?.settings ?? {});
      currentSettings['library'] = {
        "preview_quality": _previewQuality,
        "auto_upload": _autoUpload,
      };

      await context.read<AuthProvider>().updateProfile(
        settings: currentSettings,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Configuración de biblioteca guardada")),
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
          "CONTENIDO Y BIBLIOTECA",
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w900,
            letterSpacing: 2,
          ),
        ),
        actions: [
          TextButton(
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
          _buildStorageStat(),
          _buildLibraryGroup("GESTIÓN DE ARCHIVOS", [
            _buildActionTile(
              "Limpiar caché de audio",
              Icons.cleaning_services_rounded,
              "Libera 240 MB",
              () {},
            ),
            _buildActionTile(
              "Descargar toda mi biblioteca",
              Icons.download_rounded,
              "Solicitar copia de seguridad",
              () {},
            ),
            _buildSwitchTile(
              "Sincronización automática",
              "Subir stems y proyectos al cerrar sesión",
              _autoUpload,
              (v) => setState(() => _autoUpload = v),
            ),
          ]),
          _buildLibraryGroup("CALIDAD DE STREAMING", [
            _buildQualitySelector(),
            _buildSwitchTile(
              "Normalizar volumen",
              "Mantiene un nivel constante en el estudio",
              true,
              (v) {},
            ),
          ]),
          _buildLibraryGroup("ACCIONES GLOBALES", [
            _buildActionTile(
              "Eliminar todos los borradores",
              Icons.delete_sweep_rounded,
              "Esta acción es irreversible",
              () {},
              color: Colors.redAccent,
            ),
          ]),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildStorageStat() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "ESPACIO UTILIZADO",
            style: GoogleFonts.inter(
              color: Colors.white24,
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "1.2 GB / 5.0 GB",
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Text(
                "24%",
                style: GoogleFonts.inter(color: Colors.white38, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Stack(
            children: [
              Container(
                height: 2,
                width: double.infinity,
                color: Colors.white10,
              ),
              FractionallySizedBox(
                widthFactor: 0.24,
                child: Container(height: 2, color: Colors.white),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLibraryGroup(String title, List<Widget> children) {
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

  Widget _buildQualitySelector() {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24),
      title: Text(
        "Calidad de Previsualización",
        style: GoogleFonts.inter(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: Text(
        _previewQuality,
        style: GoogleFonts.inter(color: Colors.white24, fontSize: 12),
      ),
      trailing: const Icon(Icons.expand_more_rounded, color: Colors.white24),
      onTap: () => _showQualityMenu(),
    );
  }

  void _showQualityMenu() {
    showModalBottomSheet(
      backgroundColor: const Color(0xFF111111),
      context: context,
      builder: (_) => Column(
        mainAxisSize: MainAxisSize.min,
        children:
            [
                  "Low (128kbps)",
                  "Standard (192kbps)",
                  "High (320kbps)",
                  "Lossless (WAV)",
                ]
                .map(
                  (q) => ListTile(
                    title: Text(
                      q,
                      style: GoogleFonts.inter(
                        color: Colors.white,
                        fontSize: 14,
                      ),
                    ),
                    onTap: () {
                      setState(() => _previewQuality = q);
                      Navigator.pop(context);
                    },
                  ),
                )
                .toList(),
      ),
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
    VoidCallback onTap, {
    Color? color,
  }) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      leading: Icon(icon, color: color ?? Colors.white38, size: 20),
      title: Text(
        title,
        style: GoogleFonts.inter(
          color: color ?? Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: GoogleFonts.inter(
          color: color?.withOpacity(0.5) ?? Colors.white24,
          fontSize: 11,
        ),
      ),
      trailing: const Icon(Icons.chevron_right_rounded, color: Colors.white12),
    );
  }
}
