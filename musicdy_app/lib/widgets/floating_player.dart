import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicdy_app/features/audio_player/services/audio_player_manager.dart';
import 'package:musicdy_app/core/config.dart';

class FloatingPlayer extends StatelessWidget {
  const FloatingPlayer({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AudioPlayerManager>(
      builder: (context, audio, _) {
        if (audio.currentPost == null) return const SizedBox.shrink();

        final post = audio.currentPost!;
        return Container(
          height: 64,
          margin: const EdgeInsets.all(8),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(32),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.3),
                blurRadius: 8,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          child: Row(
            children: [
              if (post.coverUrl != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: Image.network(
                    AppConfig.getFullMediaUrl(post.coverUrl),
                    width: 40,
                    height: 40,
                    fit: BoxFit.cover,
                  ),
                ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      post.titulo,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      post.artista,
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              audio.isLoading
                  ? const Padding(
                      padding: EdgeInsets.all(12.0),
                      child: SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : IconButton(
                      icon: Icon(
                        audio.isPlaying ? Icons.pause : Icons.play_arrow,
                      ),
                      onPressed: () => audio.playPost(post),
                    ),
            ],
          ),
        );
      },
    );
  }
}
