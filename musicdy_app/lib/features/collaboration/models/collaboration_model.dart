import '../../auth/models/user_model.dart';

class ProyectoColaboracion {
  final int id;
  final String titulo;
  final String tipo;
  final String estado;
  final String pagoEstado;
  final String descripcionAcuerdo;
  final double? precioFijo;
  final DateTime fechaCreacion;
  final DateTime? fechaLimite;
  final List<ParticipanteColaboracion> participantes;
  final List<Map<String, dynamic>> archivos;
  final List<Map<String, dynamic>> historial;

  ProyectoColaboracion({
    required this.id,
    required this.titulo,
    required this.tipo,
    required this.estado,
    required this.pagoEstado,
    required this.descripcionAcuerdo,
    this.precioFijo,
    required this.fechaCreacion,
    this.fechaLimite,
    required this.participantes,
    required this.archivos,
    required this.historial,
  });

  factory ProyectoColaboracion.fromJson(Map<String, dynamic> json) {
    return ProyectoColaboracion(
      id: json['id'],
      titulo: json['titulo'],
      tipo: json['tipo'],
      estado: json['estado'],
      pagoEstado: json['pago_estado'] ?? 'pendiente',
      descripcionAcuerdo: json['descripcion_acuerdo'] ?? '',
      precioFijo: json['precio_fijo']?.toDouble(),
      fechaCreacion: DateTime.parse(json['fecha_creacion']),
      fechaLimite: json['fecha_limite'] != null
          ? DateTime.parse(json['fecha_limite'])
          : null,
      participantes: (json['participantes'] as List)
          .map((p) => ParticipanteColaboracion.fromJson(p))
          .toList(),
      archivos: List<Map<String, dynamic>>.from(json['archivos'] ?? []),
      historial: List<Map<String, dynamic>>.from(json['historial'] ?? []),
    );
  }
}

class ParticipanteColaboracion {
  final int id;
  final User usuario;
  final String rol;
  final double splitPorcentual;
  final bool permisosDescarga;

  ParticipanteColaboracion({
    required this.id,
    required this.usuario,
    required this.rol,
    required this.splitPorcentual,
    required this.permisosDescarga,
  });

  factory ParticipanteColaboracion.fromJson(Map<String, dynamic> json) {
    return ParticipanteColaboracion(
      id: json['id'],
      usuario: User.fromJson(json['usuario']),
      rol: json['rol'],
      splitPorcentual: json['split_porcentual']?.toDouble() ?? 0.0,
      permisosDescarga: json['permisos_descarga'] ?? true,
    );
  }
}

class SolicitudColaboracion {
  final int id;
  final User emisor;
  final User receptor;
  final String tipoProyecto;
  final double? propuestaEconomica;
  final String mensajeInicial;
  final String estado;
  final DateTime fechaCreacion;

  SolicitudColaboracion({
    required this.id,
    required this.emisor,
    required this.receptor,
    required this.tipoProyecto,
    this.propuestaEconomica,
    required this.mensajeInicial,
    required this.estado,
    required this.fechaCreacion,
  });

  factory SolicitudColaboracion.fromJson(Map<String, dynamic> json) {
    return SolicitudColaboracion(
      id: json['id'],
      emisor: User.fromJson(json['emisor']),
      receptor: User.fromJson(json['receptor']),
      tipoProyecto: json['tipo_proyecto'],
      propuestaEconomica: json['propuesta_economica']?.toDouble(),
      mensajeInicial: json['mensaje_inicial'],
      estado: json['estado'],
      fechaCreacion: DateTime.parse(json['fecha_creacion']),
    );
  }
}

class MensajeColaboracion {
  final int id;
  final User usuario;
  final String texto;
  final DateTime fecha;

  MensajeColaboracion({
    required this.id,
    required this.usuario,
    required this.texto,
    required this.fecha,
  });

  factory MensajeColaboracion.fromJson(Map<String, dynamic> json) {
    return MensajeColaboracion(
      id: json['id'],
      usuario: User.fromJson(json['usuario']),
      texto: json['texto'],
      fecha: DateTime.parse(json['fecha']),
    );
  }
}
