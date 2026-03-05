import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class InteractionsSettingsScreen extends StatefulWidget {
  const InteractionsSettingsScreen({super.key});

  @override
  State<InteractionsSettingsScreen> createState() =>
      _InteractionsSettingsScreenState();
}

class _InteractionsSettingsScreenState
    extends State<InteractionsSettingsScreen> {
  late Map<String, dynamic> _interSettings;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _interSettings = Map<String, dynamic>.from(
      user?.settings?['interactions'] ??
          {
            "who_can_comment": "everyone", // everyone, followers, nobody
            "who_can_message": "everyone",
            "who_can_collab": "everyone",
            "allow_offers": true,
            "allow_split_requests": true,
          },
    );
  }

  Future<void> _saveSettings() async {
    try {
      final user = context.read<AuthProvider>().user;
      final currentSettings = Map<String, dynamic>.from(user?.settings ?? {});
      currentSettings['interactions'] = _interSettings;

      await context.read<AuthProvider>().updateProfile(
        settings: currentSettings,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Preferencias de interacción guardadas"),
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
          "INTERACCIONES",
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
          _buildInteractionGroup("COMUNIDAD", [
            _buildSelectorTile(
              "Quién puede comentar",
              _interSettings['who_can_comment'],
              (v) => setState(() => _interSettings['who_can_comment'] = v),
            ),
            _buildSelectorTile("Quién puede mencionarme", "everyone", (v) {}),
            _buildSelectorTile(
              "Enviar mensajes directos",
              _interSettings['who_can_message'],
              (v) => setState(() => _interSettings['who_can_message'] = v),
            ),
          ]),
          _buildInteractionGroup("NEGOCIOS Y COLABORACIÓN", [
            _buildSelectorTile(
              "Quién puede colaborar",
              _interSettings['who_can_collab'],
              (v) => setState(() => _interSettings['who_can_collab'] = v),
            ),
            _buildSwitchTile(
              "Permitir ofertas por beats",
              "Habilita el botón de negociación en tus beats",
              _interSettings['allow_offers'],
              (v) => setState(() => _interSettings['allow_offers'] = v),
            ),
            _buildSwitchTile(
              "Solicitudes de split",
              "Recibir invitaciones para compartir regalías",
              _interSettings['allow_split_requests'],
              (v) => setState(() => _interSettings['allow_split_requests'] = v),
            ),
          ]),
          _buildInteractionGroup("MODERACIÓN", [
            _buildActionTile(
              "Palabras filtradas",
              Icons.filter_list_rounded,
              "Bloquear comentarios con términos específicos",
              () {},
            ),
            _buildActionTile(
              "Cuentas bloqueadas",
              Icons.block_flipped,
              "Ver y gestionar usuarios bloqueados",
              () {},
            ),
          ]),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildInteractionGroup(String title, List<Widget> children) {
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

  Widget _buildSelectorTile(
    String title,
    String current,
    ValueChanged<String> onSelected,
  ) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24),
      title: Text(
        title,
        style: GoogleFonts.inter(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: Text(
        current.toUpperCase(),
        style: GoogleFonts.inter(
          color: Colors.white24,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
        ),
      ),
      trailing: const Icon(Icons.expand_more_rounded, color: Colors.white10),
      onTap: () => _showSelectionMenu(title, current, onSelected),
    );
  }

  void _showSelectionMenu(
    String title,
    String current,
    ValueChanged<String> onSelected,
  ) {
    showModalBottomSheet(
      backgroundColor: const Color(0xFF0F0F0F),
      context: context,
      builder: (_) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Text(
              title.toUpperCase(),
              style: GoogleFonts.inter(
                color: Colors.white38,
                fontSize: 10,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          ...["everyone", "followers", "nobody"]
              .map(
                (opt) => ListTile(
                  title: Text(
                    opt.toUpperCase(),
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  trailing: opt == current
                      ? const Icon(Icons.check, color: Colors.white, size: 16)
                      : null,
                  onTap: () {
                    onSelected(opt);
                    Navigator.pop(context);
                  },
                ),
              )
              .toList(),
          const SizedBox(height: 20),
        ],
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
}
