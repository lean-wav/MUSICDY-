import 'package:dio/dio.dart';
import '../../../core/config.dart';
import '../models/collaboration_model.dart';
import '../../auth/models/user_model.dart';

class CollaborationService {
  final Dio _dio = Dio(BaseOptions(baseUrl: AppConfig.baseUrl));

  Future<List<User>> getConnections() async {
    final response = await _dio.get('/collaboration/conexiones');
    return (response.data as List).map((u) => User.fromJson(u)).toList();
  }

  Future<List<SolicitudColaboracion>> getRequests() async {
    final response = await _dio.get('/collaboration/solicitudes');
    return (response.data as List)
        .map((s) => SolicitudColaboracion.fromJson(s))
        .toList();
  }

  Future<void> sendRequest({
    required int receptorId,
    required String tipo,
    double? propuesta,
    required String mensaje,
  }) async {
    await _dio.post(
      '/collaboration/solicitudes',
      data: {
        'receptor_id': receptorId,
        'tipo_proyecto': tipo,
        'propuesta_economica': propuesta,
        'mensaje_inicial': mensaje,
      },
    );
  }

  Future<void> updateRequestStatus(int id, String status) async {
    await _dio.patch(
      '/collaboration/solicitudes/$id',
      queryParameters: {'status': status},
    );
  }

  Future<List<ProyectoColaboracion>> getProjects() async {
    final response = await _dio.get('/collaboration/proyectos');
    return (response.data as List)
        .map((p) => ProyectoColaboracion.fromJson(p))
        .toList();
  }

  Future<ProyectoColaboracion> getProjectDetail(int id) async {
    final response = await _dio.get('/collaboration/proyectos/$id');
    return ProyectoColaboracion.fromJson(response.data);
  }

  Future<List<MensajeColaboracion>> getMessages(int projectId) async {
    final response = await _dio.get(
      '/collaboration/proyectos/$projectId/mensajes',
    );
    return (response.data as List)
        .map((m) => MensajeColaboracion.fromJson(m))
        .toList();
  }

  Future<void> sendMessage(int projectId, String text) async {
    await _dio.post(
      '/collaboration/proyectos/$projectId/mensajes',
      data: {'texto': text},
    );
  }

  Future<void> updateSplits(
    int projectId,
    List<Map<String, dynamic>> splits,
  ) async {
    await _dio.patch(
      '/collaboration/proyectos/$projectId/splits',
      data: {'splits': splits},
    );
  }

  Future<String> checkoutCollaboration(int projectId) async {
    final response = await _dio.post(
      '/payments/checkout-collaboration/$projectId',
    );
    return response.data['url'];
  }
}
