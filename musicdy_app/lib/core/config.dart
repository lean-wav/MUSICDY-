class AppConfig {
  static const String ipAddress = '192.168.0.140';
  static const String baseUrl = 'http://$ipAddress:8000/api/v1';
  static const String wsUrl = 'ws://$ipAddress:8000/api/v1/ws';
  static const String mediaUrl = 'http://$ipAddress:8000/';

  static String getFullMediaUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http'))
      return path; // Already full URL (from S3 or DB)
    if (path.startsWith('/'))
      path = path.substring(1); // Handle leading slashes
    return '$mediaUrl$path';
  }
}
