import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../models/user_model.dart';
import 'package:musicdy_app/features/notifications/services/notification_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final NotificationService _notificationService = NotificationService();
  final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey =
      GlobalKey<ScaffoldMessengerState>();

  User? _user;
  bool _loading = true;

  User? get user => _user;
  bool get loading => _loading;
  bool get isAuthenticated => _user != null;

  AuthProvider() {
    init();
  }

  Future<void> init() async {
    try {
      final userData = await _authService.getMe();
      _user = User.fromJson(userData);
    } catch (e) {
      _user = null;
      _notificationService.disconnect();
    } finally {
      if (_user != null) {
        _notificationService.connect(_user!.id, _handleNotification);
      }
      _loading = false;
      notifyListeners();
    }
  }

  void _handleNotification(Map<String, dynamic> notif) {
    String message = "";
    if (notif['type'] == 'NEW_LIKE') {
      message = "${notif['data']['liker_name']} le dio like a tu post";
    } else if (notif['type'] == 'NEW_COMMENT') {
      message = "${notif['data']['commenter_name']} comentó tu post";
    }

    if (message.isNotEmpty) {
      scaffoldMessengerKey.currentState?.showSnackBar(
        SnackBar(content: Text(message)),
      );
    }
  }

  Future<void> login(String username, String password) async {
    _loading = true;
    notifyListeners();
    try {
      await _authService.login(username, password);
      await init();
    } catch (e) {
      // Re-throw to handle it in the UI (e.g. show a dialog)
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> register({
    required String username,
    required String email,
    required String password,
    String? birthdate,
    String? tipoUsuario,
  }) async {
    _loading = true;
    notifyListeners();
    try {
      await _authService.register(
        username: username,
        email: email,
        password: password,
        birthdate: birthdate,
        tipoUsuario: tipoUsuario,
      );
      await init();
    } catch (e) {
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  /// Returns true if 'needs_registration' is true for the provider
  Future<Map<String, dynamic>> loginProvider(
    String email,
    String provider,
    String providerId,
  ) async {
    _loading = true;
    notifyListeners();
    try {
      final res = await _authService.loginProvider(email, provider, providerId);
      if (res['needs_registration'] == true) {
        return res; // Forward this map so the UI can redirect to Onboarding
      }
      await init();
      return {'needs_registration': false};
    } catch (e) {
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> registerProvider({
    required String username,
    required String email,
    required String provider,
    required String providerId,
    String? tipoUsuario,
    String? birthdate,
  }) async {
    _loading = true;
    notifyListeners();
    try {
      // Create user and auto login
      await _authService.register(
        username: username,
        email: email,
        password:
            '', // Should be randomized or ignored on backend, but let's pass a placeholder
        provider: provider,
        providerId: providerId,
        tipoUsuario: tipoUsuario,
        birthdate: birthdate,
      );
      // It won't auto login because provider is not 'email', so we explicitly login using loginProvider
      await loginProvider(email, provider, providerId);
    } catch (e) {
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> recoverPassword(String email) async {
    await _authService.recoverPassword(email);
  }

  Future<void> updateProfile({
    String? username,
    String? artisticName,
    String? bio,
    String? phone,
    bool? isPrivate,
    Map<String, dynamic>? settings,
    String? tipoUsuario,
    String? imagePath,
  }) async {
    _loading = true;
    notifyListeners();
    try {
      final updatedData = await _authService.updateMe(
        username: username,
        artisticName: artisticName,
        bio: bio,
        phone: phone,
        isPrivate: isPrivate,
        settings: settings,
        tipoUsuario: tipoUsuario,
        imagePath: imagePath,
      );
      _user = User.fromJson(updatedData);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    notifyListeners();
  }
}
