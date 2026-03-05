import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicdy_app/core/app_theme.dart';
import 'package:musicdy_app/features/auth/providers/auth_provider.dart';
import 'package:musicdy_app/features/audio_player/services/audio_player_manager.dart';
import 'package:musicdy_app/features/auth/screens/login_screen.dart';
import 'package:musicdy_app/features/main/main_screen.dart';
import 'package:just_audio_background/just_audio_background.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await JustAudioBackground.init(
    androidNotificationChannelId: 'com.ryanheise.bg_demo.channel.audio',
    androidNotificationChannelName: 'Audio playback',
    androidNotificationOngoing: true,
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => AudioPlayerManager()),
      ],
      child: const MusicdyApp(),
    ),
  );
}

class MusicdyApp extends StatelessWidget {
  const MusicdyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Musicdy',
      debugShowCheckedModeBanner: false,
      scaffoldMessengerKey: context.read<AuthProvider>().scaffoldMessengerKey,
      theme: AppTheme.darkTheme,
      home: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          if (auth.loading) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          return auth.isAuthenticated
              ? const MainScreen()
              : const LoginScreen();
        },
      ),
    );
  }
}
