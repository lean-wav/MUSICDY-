import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:musicdy_app/core/network/api_service.dart';

class AuthService {
  final _dio = ApiService().dio;
  final _storage = const FlutterSecureStorage();

  Future<Map<String, dynamic>> login(String username, String password) async {
    final formData = FormData.fromMap({
      'username': username,
      'password': password,
    });

    final response = await _dio.post('login/access-token', data: formData);
    final token = response.data['access_token'];

    await _storage.write(key: 'access_token', value: token);

    return response.data;
  }

  Future<Map<String, dynamic>> loginProvider(
    String email,
    String provider,
    String providerId,
  ) async {
    final response = await _dio.post(
      'login/provider',
      data: {'email': email, 'provider': provider, 'provider_id': providerId},
    );

    if (response.data['access_token'] != null) {
      await _storage.write(
        key: 'access_token',
        value: response.data['access_token'],
      );
    }

    return response.data; // Includes 'needs_registration' boolean
  }

  Future<Map<String, dynamic>> register({
    required String username,
    required String email,
    required String password,
    String? birthdate,
    String? provider,
    String? providerId,
    String? tipoUsuario,
  }) async {
    final response = await _dio.post(
      'users/',
      data: {
        'username': username,
        'email': email,
        'password': password,
        'birthdate': birthdate,
        'provider': provider ?? 'email',
        'provider_id': providerId,
        'tipo_usuario': tipoUsuario ?? 'Oyente',
      },
    );

    // Auto-login if registration successful via email
    if (provider == null || provider == 'email') {
      await login(username, password);
    }

    return response.data;
  }

  Future<void> recoverPassword(String email) async {
    await _dio.post('password-recovery', data: {'email': email});
  }

  Future<Map<String, dynamic>> getMe() async {
    final response = await _dio.get('users/me');
    return response.data;
  }

  Future<bool> checkUsername(String username) async {
    try {
      final response = await _dio.get(
        'users/check-username',
        queryParameters: {'username': username},
      );
      return response.data['available'] ?? false;
    } catch (e) {
      return false;
    }
  }

  Future<Map<String, dynamic>> updateMe({
    String? username,
    String? artisticName,
    String? bio,
    String? phone,
    bool? isPrivate,
    Map<String, dynamic>? settings,
    String? tipoUsuario,
    String? imagePath,
  }) async {
    final formData = FormData();
    if (username != null) formData.fields.add(MapEntry('username', username));
    if (artisticName != null)
      formData.fields.add(MapEntry('nombre_artistico', artisticName));
    if (bio != null) formData.fields.add(MapEntry('bio', bio));
    if (phone != null) formData.fields.add(MapEntry('phone', phone));
    if (isPrivate != null)
      formData.fields.add(MapEntry('is_private', isPrivate.toString()));
    if (tipoUsuario != null)
      formData.fields.add(MapEntry('tipo_usuario', tipoUsuario));
    if (settings != null) {
      formData.fields.add(MapEntry('settings', jsonEncode(settings)));
    }
    if (imagePath != null) {
      formData.files.add(
        MapEntry('foto_perfil', await MultipartFile.fromFile(imagePath)),
      );
    }

    final response = await _dio.put('users/me', data: formData);
    return response.data;
  }

  Future<void> logout() async {
    await _storage.delete(key: 'access_token');
  }
}
