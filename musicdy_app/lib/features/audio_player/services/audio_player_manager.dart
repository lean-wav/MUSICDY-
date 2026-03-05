import 'package:just_audio/just_audio.dart';
import 'package:flutter/foundation.dart';
import 'package:musicdy_app/features/feed/models/post_model.dart';
import 'package:musicdy_app/core/config.dart';
import 'package:just_audio_background/just_audio_background.dart';

class AudioPlayerManager extends ChangeNotifier {
  final AudioPlayer _player = AudioPlayer();
  Post? _currentPost;
  bool _isPlaying = false;
  bool _isLoading = false;

  Post? get currentPost => _currentPost;
  bool get isPlaying => _isPlaying;
  bool get isLoading => _isLoading;
  AudioPlayer get player => _player;

  AudioPlayerManager() {
    _player.playerStateStream.listen((state) {
      final isPlaying = state.playing;
      final processingState = state.processingState;

      _isPlaying = isPlaying;
      _isLoading =
          processingState == ProcessingState.loading ||
          processingState == ProcessingState.buffering;

      notifyListeners();
    });

    // Escuchar errores del stream para evitar crashes silenciosos
    _player.playbackEventStream.listen(
      (event) {},
      onError: (Object e, StackTrace stackTrace) {
        debugPrint('A stream error occurred: $e');
        _isPlaying = false;
        _isLoading = false;
        notifyListeners();
      },
    );
  }

  Future<void> playPost(Post post, {bool useHighQuality = false}) async {
    // Si la misma canción está cargada, hacer toggle
    if (_currentPost?.id == post.id) {
      if (_isPlaying) {
        await _player.pause();
      } else {
        await _player.play();
      }
      return;
    }

    await _player.stop();

    _currentPost = post;
    _isLoading = true;
    notifyListeners();

    // Seleccionar la versión de audio apropiada
    // Prioridad: Preview específica > Archivo general
    String targetFile = useHighQuality
        ? (post.archivoPreviewHq ?? post.archivo)
        : (post.archivoPreviewStream ?? post.archivo);

    final url = AppConfig.getFullMediaUrl(targetFile);

    try {
      final audioSource = AudioSource.uri(
        Uri.parse(url),
        tag: MediaItem(
          id: post.id.toString(),
          album: post.generoMusical,
          title: post.titulo,
          artist: post.artista,
          artUri: post.coverUrl != null
              ? Uri.parse(AppConfig.getFullMediaUrl(post.coverUrl))
              : null,
        ),
      );

      await _player.setAudioSource(audioSource);

      if (_currentPost?.id == post.id) {
        await _player.play();
      }
    } catch (e) {
      debugPrint("Error jugando audio para post ${post.id}: $e");
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> setSpeed(double speed) async {
    await _player.setSpeed(speed);
    notifyListeners();
  }

  Future<void> setPitch(double pitch) async {
    await _player.setPitch(pitch);
    notifyListeners();
  }

  Future<void> setVolume(double volume) async {
    await _player.setVolume(volume);
    notifyListeners();
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }
}
