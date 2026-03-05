import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicdy_app/features/auth/providers/auth_provider.dart';
import 'package:musicdy_app/features/feed/screens/home_screen.dart';
import 'package:musicdy_app/features/feed/screens/explore_screen.dart';
import 'package:musicdy_app/features/feed/screens/upload_screen.dart';
import 'package:musicdy_app/features/collaboration/screens/collaboration_screen.dart';
import 'package:musicdy_app/features/auth/screens/profile_screen.dart';
import 'package:musicdy_app/features/notifications/services/notification_service.dart';
import 'package:musicdy_app/widgets/floating_player.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;
  final NotificationService _notificationService = NotificationService();
  final List<Widget> _pages = [
    const HomeScreen(),
    const ExploreScreen(),
    const UploadScreen(),
    const CollaborationScreen(),
    const ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initNotifications();
    });
  }

  void _initNotifications() {
    final user = context.read<AuthProvider>().user;
    if (user != null) {
      _notificationService.connect(user.id, (data) {
        if (!mounted) return;
        _handleNotification(data);
      });
    }
  }

  void _handleNotification(Map<String, dynamic> data) {
    String message = "";
    final type = data['type'];
    final info = data['data'];

    switch (type) {
      case 'collab_request':
        message = "Nueva solicitud de ${info['de']} para un ${info['tipo']}";
        break;
      case 'collab_status':
        message =
            "${info['por']} ha ${info['estado']} tu solicitud de ${info['tipo']}";
        break;
      case 'collab_message':
        message = "Mensaje en proyecto: ${info['de']}: ${info['texto']}";
        break;
      case 'collab_file':
        message = "${info['por']} subió un archivo: ${info['archivo']}";
        break;
      case 'collab_split_update':
        message = "${info['por']} actualizó el Split Sheet del proyecto";
        break;
      case 'NEW_FOLLOWER':
        message = "${info['follower_name']} ha empezado a seguirte";
        break;
      default:
        message = "Nueva notificación recibida";
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.blueAccent,
        action: SnackBarAction(
          label: "VER",
          textColor: Colors.white,
          onPressed: () {
            setState(() => _currentIndex = 3);
          },
        ),
      ),
    );
  }

  @override
  void dispose() {
    _notificationService.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          Expanded(
            child: IndexedStack(index: _currentIndex, children: _pages),
          ),
          const FloatingPlayer(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        backgroundColor: const Color(0xFF0F0F0F),
        selectedItemColor: Colors.blueAccent,
        unselectedItemColor: Colors.white38,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: 'Inicio',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.explore_outlined),
            activeIcon: Icon(Icons.explore),
            label: 'Explorar',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.add_circle_outline),
            activeIcon: Icon(Icons.add_circle),
            label: 'Subir',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.handshake_outlined),
            activeIcon: Icon(Icons.handshake),
            label: 'Colaborar',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }
}
