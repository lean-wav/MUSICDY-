import 'dart:convert';
import 'package:dio/dio.dart';
import '../models/post_model.dart';
import 'package:musicdy_app/core/network/api_service.dart';

class FeedService {
  final _dio = ApiService().dio;

  Future<List<Post>> getFeed({
    String? tipoContenido,
    String? genero,
    int? usuarioId,
  }) async {
    final response = await _dio.get(
      'posts/',
      queryParameters: {
        if (tipoContenido != null) 'tipo_contenido': tipoContenido,
        if (genero != null) 'genero': genero,
        if (usuarioId != null) 'usuario_id': usuarioId,
      },
    );
    final List data = response.data;
    return data.map((json) => Post.fromJson(json)).toList();
  }

  Future<List<Post>> getFollowingFeed() async {
    final response = await _dio.get('posts/following');
    final List data = response.data;
    return data.map((json) => Post.fromJson(json)).toList();
  }

  Future<void> createPost({
    required String titulo,
    required String tipoContenido,
    List<int>? fileBytes,
    String? filePath,
    String? fileName,
    String? artista,
    String? generoMusical,
    String? subgenero,
    String? descripcion,
    String? subtitulo,
    List<int>? coverBytes,
    String? coverPath,
    String? coverName,
    List<int>? visualLoopBytes,
    String? visualLoopPath,
    String? visualLoopName,
    String? hashtags,
    List<String>? tags,
    List<String>? mood,
    String? inspiradoEn,
    String? idioma,
    Map<String, String>? creditos,
    String? isrc,
    String? contacto,
    int? bpm,
    String? escala,
    String? artistaOriginal,
    String? plataformaOrigen,
    String? linkExterno,
    String visibilidad = 'public',
    bool permitirComentarios = true,
    bool permitirReutilizacion = true,
    bool permitirRemix = true,
    bool permitirColaboracion = true,
    bool permitirDescargaGratuita = false,
    bool incluirStems = false,
    bool incluirTrackouts = false,
    bool freeUse = false,
    bool esAutor = false,
  }) async {
    final mapData = <String, dynamic>{
      'titulo': titulo,
      'tipo_contenido': tipoContenido,
      if (artista != null) 'artista': artista,
      if (generoMusical != null) 'genero_musical': generoMusical,
      if (subgenero != null) 'subgenero': subgenero,
      if (descripcion != null) 'descripcion': descripcion,
      if (subtitulo != null) 'subtitulo': subtitulo,
      if (hashtags != null) 'hashtags': hashtags,
      if (tags != null) 'tags': jsonEncode(tags),
      if (mood != null) 'mood': jsonEncode(mood),
      if (inspiradoEn != null) 'inspirado_en': inspiradoEn,
      if (idioma != null) 'idioma': idioma,
      if (creditos != null) 'creditos': jsonEncode(creditos),
      if (isrc != null) 'isrc': isrc,
      if (contacto != null) 'contacto': contacto,
      if (bpm != null) 'bpm': bpm,
      if (escala != null) 'escala': escala,
      if (artistaOriginal != null) 'artista_original': artistaOriginal,
      if (plataformaOrigen != null) 'plataforma_origen': plataformaOrigen,
      if (linkExterno != null) 'link_externo': linkExterno,
      'visibilidad': visibilidad,
      'permitir_comentarios': permitirComentarios,
      'permitir_reutilizacion': permitirReutilizacion,
      'permitir_remix': permitirRemix,
      'permitir_colaboracion': permitirColaboracion,
      'permitir_descarga_gratuita': permitirDescargaGratuita,
      'incluir_stems': incluirStems,
      'incluir_trackouts': incluirTrackouts,
      'free_use': freeUse,
      'es_autor': esAutor,
    };

    if (fileBytes != null) {
      mapData['archivo'] = MultipartFile.fromBytes(
        fileBytes,
        filename: fileName ?? 'file',
      );
    } else if (filePath != null) {
      mapData['archivo'] = await MultipartFile.fromFile(
        filePath,
        filename: fileName,
      );
    }

    if (coverBytes != null) {
      mapData['portada'] = MultipartFile.fromBytes(
        coverBytes,
        filename: coverName ?? 'cover.jpg',
      );
    } else if (coverPath != null) {
      mapData['portada'] = await MultipartFile.fromFile(
        coverPath,
        filename: coverName,
      );
    }

    if (visualLoopBytes != null) {
      mapData['visual_loop'] = MultipartFile.fromBytes(
        visualLoopBytes,
        filename: visualLoopName ?? 'loop.mp4',
      );
    } else if (visualLoopPath != null) {
      mapData['visual_loop'] = await MultipartFile.fromFile(
        visualLoopPath,
        filename: visualLoopName,
      );
    }

    final formData = FormData.fromMap(mapData);
    await _dio.post('posts/', data: formData);
  }

  Future<void> toggleLike(int postId) async {
    await _dio.post('posts/$postId/like');
  }

  Future<void> updatePost(int postId, Map<String, dynamic> data) async {
    await _dio.put('posts/$postId', data: data);
  }

  Future<void> deletePost(int postId) async {
    await _dio.delete('posts/$postId');
  }

  Future<void> updateMonetization(
    int postId, {
    bool? allowOffers,
    Map<String, dynamic>? licencias,
  }) async {
    await _dio.patch(
      'posts/$postId/monetization',
      data: {
        if (allowOffers != null) 'allow_offers': allowOffers,
        if (licencias != null) 'licencias': licencias,
      },
    );
  }

  Future<String> uploadContract(int postId, String filePath) async {
    final formData = FormData.fromMap({
      'archivo': await MultipartFile.fromFile(
        filePath,
        filename: 'contract.pdf',
      ),
    });
    final response = await _dio.post('posts/$postId/contract', data: formData);
    return response.data['contract_url'];
  }

  Future<void> makeOffer(int postId, double amount, String message) async {
    await _dio.post(
      '/posts/$postId/offers',
      data: {'amount': amount, 'message': message},
    );
  }
}
