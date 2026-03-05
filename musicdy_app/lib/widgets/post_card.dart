import 'package:flutter/material.dart';
import 'package:musicdy_app/features/feed/models/post_model.dart';
import 'package:musicdy_app/core/config.dart';
import 'package:provider/provider.dart';
import 'package:musicdy_app/features/audio_player/services/audio_player_manager.dart';

class PostCard extends StatelessWidget {
  final Post post;

  const PostCard({super.key, required this.post});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ListTile(
            leading: const CircleAvatar(backgroundColor: Colors.grey),
            title: Text(
              post.titulo,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Text(post.artista),
          ),
          if (post.coverUrl != null)
            Image.network(
              AppConfig.getFullMediaUrl(post.coverUrl),
              height: 200,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text(post.descripcion),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
            child: Row(
              children: [
                IconButton(
                  icon: Icon(
                    post.isLiked ? Icons.favorite : Icons.favorite_border,
                    color: post.isLiked ? Colors.red : null,
                  ),
                  onPressed: () {},
                ),
                Text('${post.likesCount}'),
                const SizedBox(width: 16),
                const Icon(Icons.comment_outlined),
                const SizedBox(width: 4),
                Text('${post.comentariosCount}'),
                const Spacer(),
                ElevatedButton(
                  onPressed: () {
                    context.read<AudioPlayerManager>().playPost(post);
                  },
                  child: Consumer<AudioPlayerManager>(
                    builder: (context, audio, _) {
                      bool isTarget = audio.currentPost?.id == post.id;
                      return Text(
                        isTarget && audio.isPlaying ? 'Pause' : 'Play',
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
