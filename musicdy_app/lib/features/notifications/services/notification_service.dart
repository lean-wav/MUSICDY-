import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:musicdy_app/core/config.dart';

class NotificationService {
  WebSocketChannel? _channel;

  void connect(int userId, Function(Map<String, dynamic>) onMessage) {
    final url = Uri.parse('${AppConfig.wsUrl}/$userId');
    _channel = WebSocketChannel.connect(url);

    _channel!.stream.listen((message) {
      final data = jsonDecode(message);
      onMessage(data);
    });
  }

  void disconnect() {
    _channel?.sink.close();
  }
}
