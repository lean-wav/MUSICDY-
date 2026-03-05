import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/post_model.dart';
import 'package:musicdy_app/features/audio_player/services/audio_player_manager.dart';
import 'package:musicdy_app/core/config.dart';
import 'package:musicdy_app/features/auth/providers/auth_provider.dart';
import 'monetization_sheet.dart';

class VerticalPostView extends StatelessWidget {
  final Post post;
  final bool showSaveButton;
  final bool showFollowButton;

  const VerticalPostView({
    super.key,
    required this.post,
    this.showSaveButton = false,
    this.showFollowButton = false,
  });

  @override
  Widget build(BuildContext context) {
    final audioManager = context.watch<AudioPlayerManager>();
    final isPlaying =
        audioManager.currentPost?.id == post.id && audioManager.isPlaying;

    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        color: Colors.black,
        image: post.coverUrl != null
            ? DecorationImage(
                image: NetworkImage(AppConfig.getFullMediaUrl(post.coverUrl)),
                fit: BoxFit.cover,
                colorFilter: ColorFilter.mode(
                  Colors.black.withOpacity(0.5),
                  BlendMode.darken,
                ),
              )
            : null,
      ),
      child: Stack(
        children: [
          // Middle content: Play/Pause indicator
          Center(
            child: IconButton(
              iconSize: 80,
              icon: Icon(
                isPlaying
                    ? Icons.pause_circle_filled
                    : Icons.play_circle_filled,
                color: Colors.white.withOpacity(0.8),
              ),
              onPressed: () => audioManager.playPost(post),
            ),
          ),

          // Top-right ⋯ menu
          Positioned(
            top: 52,
            right: 16,
            child: Builder(
              builder: (ctx) {
                final currentUser = ctx.read<AuthProvider>().user;
                final isOwner = currentUser?.id == post.usuarioId;
                return GestureDetector(
                  onTap: () => _showContextMenu(ctx, isOwner),
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Icon(
                      Icons.more_horiz_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                );
              },
            ),
          ),

          // Bottom Info
          Positioned(
            left: 16,
            bottom: 40,
            right: 80,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  post.artista,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      post.titulo,
                      style: const TextStyle(color: Colors.white, fontSize: 15),
                    ),
                    if (post.bpm != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white12,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          "${post.bpm} BPM",
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                if (post.generoMusical != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    "#${post.generoMusical}",
                    style: TextStyle(
                      color: Theme.of(context).primaryColor,
                      fontSize: 13,
                    ),
                  ),
                ],
                if (post.precio != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF06D6A0).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: const Color(0xFF06D6A0).withOpacity(0.5),
                      ),
                    ),
                    child: Text(
                      "DESDE \$${post.precio}",
                      style: GoogleFonts.outfit(
                        color: const Color(0xFF06D6A0),
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Right Sidebar (Actions)
          Positioned(
            right: 16,
            bottom: 40,
            child: Column(
              children: [
                _ActionButton(
                  icon: post.isLiked ? Icons.favorite : Icons.favorite_border,
                  label: post.likesCount.toString(),
                  color: post.isLiked ? Colors.red : Colors.white,
                  onTap: () {},
                ),
                _ActionButton(
                  icon: Icons.comment,
                  label: post.comentariosCount.toString(),
                  onTap: () {},
                ),
                if (showSaveButton)
                  _ActionButton(
                    icon: Icons.bookmark_border,
                    label: "Guardar",
                    onTap: () {},
                  ),
                if (showFollowButton)
                  _ActionButton(
                    icon: Icons.person_add_alt_1,
                    label: "Seguir",
                    onTap: () {},
                  ),
                const SizedBox(height: 20),
                _RotatingDisk(isPlaying: isPlaying),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showContextMenu(BuildContext context, bool isOwner) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A1A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _MenuTile(
              icon: Icons.attach_money_rounded,
              color: const Color(0xFF06D6A0),
              label: isOwner ? "Gestionar Monetización" : "Ver Licencias",
              onTap: () {
                Navigator.pop(context);
                showMonetizationSheet(context, post, isOwner: isOwner);
              },
            ),
            const Divider(color: Colors.white10),
            _MenuTile(
              icon: Icons.share_rounded,
              color: Colors.blueAccent,
              label: "Compartir Beat",
              onTap: () => Navigator.pop(context),
            ),
            _MenuTile(
              icon: Icons.playlist_add_rounded,
              color: Colors.purpleAccent,
              label: "Agregar a Playlist",
              onTap: () => Navigator.pop(context),
            ),
            if (isOwner) ...[
              const Divider(color: Colors.white10),
              _MenuTile(
                icon: Icons.edit_outlined,
                color: Colors.orangeAccent,
                label: "Editar Beat",
                onTap: () => Navigator.pop(context),
              ),
              _MenuTile(
                icon: Icons.delete_outline_rounded,
                color: Colors.redAccent,
                label: "Eliminar Beat",
                onTap: () => Navigator.pop(context),
              ),
            ] else ...[
              const Divider(color: Colors.white10),
              _MenuTile(
                icon: Icons.flag_outlined,
                color: Colors.white38,
                label: "Reportar contenido",
                onTap: () => Navigator.pop(context),
              ),
            ],
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    this.color = Colors.white,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Column(
        children: [
          IconButton(
            icon: Icon(icon, color: color, size: 35),
            onPressed: onTap,
          ),
          Text(
            label,
            style: const TextStyle(color: Colors.white, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final VoidCallback onTap;

  const _MenuTile({
    required this.icon,
    required this.color,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: color),
      title: Text(
        label,
        style: const TextStyle(color: Colors.white, fontSize: 14),
      ),
      onTap: onTap,
      dense: true,
    );
  }
}

class _RotatingDisk extends StatefulWidget {
  final bool isPlaying;
  const _RotatingDisk({required this.isPlaying});

  @override
  State<_RotatingDisk> createState() => _RotatingDiskState();
}

class _RotatingDiskState extends State<_RotatingDisk>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 5),
      vsync: this,
    );
    if (widget.isPlaying) _controller.repeat();
  }

  @override
  void didUpdateWidget(_RotatingDisk oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isPlaying) {
      _controller.repeat();
    } else {
      _controller.stop();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RotationTransition(
      turns: _controller,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: SweepGradient(
            colors: [Colors.grey.shade800, Colors.black, Colors.grey.shade800],
          ),
        ),
        child: const Icon(Icons.music_note, color: Colors.white, size: 20),
      ),
    );
  }
}
