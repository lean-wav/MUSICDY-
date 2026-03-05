class Post {
  final int id;
  final int? usuarioId;
  final String titulo;
  final String descripcion;
  final String artista;
  final String archivo;
  final String? coverUrl;
  final int likesCount;
  final int comentariosCount;
  final String tipoContenido;
  final String? generoMusical;
  final bool isLiked;

  // Studio specific fields
  final int? bpm;
  final String? tonalidad;
  final double? precio;
  final String? duracion;
  final bool isPrivate;
  final bool isPinned;
  final List<String>? colaboradores;
  final Map<String, double>? splits;

  // Audio versioning & Status
  final String? status; // 'uploading', 'processing', 'ready', 'error'
  final String? archivoOriginal;
  final String? archivoPreviewHq;
  final String? archivoPreviewStream;
  final DateTime? fechaCreacion;
  final int plays;
  final int sales;
  final Map<String, dynamic>? licencias;
  final bool allowOffers;
  final String? contractUrl;

  Post({
    required this.id,
    this.usuarioId,
    required this.titulo,
    required this.descripcion,
    required this.artista,
    required this.archivo,
    this.archivoOriginal,
    this.archivoPreviewHq,
    this.archivoPreviewStream,
    this.coverUrl,
    required this.likesCount,
    required this.comentariosCount,
    required this.tipoContenido,
    this.generoMusical,
    this.isLiked = false,
    this.bpm,
    this.tonalidad,
    this.precio,
    this.duracion,
    this.isPrivate = false,
    this.isPinned = false,
    this.colaboradores,
    this.splits,
    this.status,
    this.fechaCreacion,
    this.plays = 0,
    this.sales = 0,
    this.licencias,
    this.allowOffers = true,
    this.contractUrl,
  });

  factory Post.fromJson(Map<String, dynamic> json) {
    return Post(
      id: json['id'],
      usuarioId: json['usuario_id'],
      titulo: json['titulo'],
      descripcion: json['descripcion'] ?? '',
      artista: json['artista'] ?? 'Artista Desconocido',
      archivo: json['archivo'],
      archivoOriginal: json['archivo_original'],
      archivoPreviewHq: json['archivo_preview_hq'],
      archivoPreviewStream: json['archivo_preview_stream'],
      coverUrl: json['cover_url'],
      likesCount: json['likes_count'] ?? 0,
      comentariosCount: json['comentarios_count'] ?? 0,
      tipoContenido: json['tipo_contenido'] ?? 'own_music',
      generoMusical: json['genero_musical'],
      isLiked: json['is_liked'] ?? false,
      bpm: json['bpm'],
      tonalidad: json['escala'], // Backend uses 'escala'
      precio: (json['precio'] as num?)?.toDouble(),
      duracion: json['duracion'],
      isPrivate: json['is_private'] ?? false,
      isPinned: json['is_pinned'] ?? false,
      colaboradores: json['colaboradores'] != null
          ? List<String>.from(json['colaboradores'])
          : null,
      splits: json['splits'] != null
          ? Map<String, double>.from(
              json['splits'].map((k, v) => MapEntry(k, (v as num).toDouble())),
            )
          : null,
      status: json['status'],
      fechaCreacion: json['fecha_subida'] != null
          ? DateTime.parse(json['fecha_subida'])
          : null,
      plays: json['plays'] ?? 0,
      sales: json['sales'] ?? 0,
      licencias: json['licencias'] != null
          ? Map<String, dynamic>.from(json['licencias'])
          : null,
      allowOffers: json['allow_offers'] ?? true,
      contractUrl: json['contract_url'],
    );
  }
}
