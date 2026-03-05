import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../models/user_model.dart';
import 'settings_screen.dart';
import '../widgets/beat_context_sheet.dart';
import 'package:musicdy_app/core/config.dart';
import '../../feed/models/post_model.dart';
import '../../feed/services/feed_service.dart';
import '../widgets/studio_widgets.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final FeedService _feedService = FeedService();
  List<Post> _userPosts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
    _loadAllData();
  }

  Future<void> _loadAllData() async {
    final user = context.read<AuthProvider>().user;
    if (user == null) return;
    try {
      final posts = await _feedService.getFeed(usuarioId: user.id);
      if (mounted) {
        setState(() {
          _userPosts = posts;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    if (user == null)
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: Colors.white24)),
      );

    return Scaffold(
      backgroundColor: const Color(0xFF000000), // Pure black for studio look
      body: SafeArea(
        child: Column(
          children: [
            _buildStudioHeader(user),
            const SizedBox(height: 24),
            _buildTabNavigation(),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildBeatsSection(),
                  _buildLoopsSection(),
                  _buildStemsSection(),
                  _buildCollabsSection(),
                  _buildPrivateSection(),
                  _buildAnalyticsSection(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStudioHeader(User user) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.rectangle, // Industrial look
                  borderRadius: BorderRadius.circular(2),
                  border: Border.all(color: Colors.white12, width: 1),
                  image: user.fotoPerfil != null
                      ? DecorationImage(
                          image: NetworkImage(
                            AppConfig.getFullMediaUrl(user.fotoPerfil),
                          ),
                          fit: BoxFit.cover,
                        )
                      : null,
                ),
                child: user.fotoPerfil == null
                    ? const Icon(Icons.person, color: Colors.white12, size: 40)
                    : null,
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.artisticName?.toUpperCase() ??
                          user.username.toUpperCase(),
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Text(
                          "@${user.username.toLowerCase()}",
                          style: GoogleFonts.inter(
                            color: Colors.white54,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFF06D6A0).withOpacity(0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            user.tipoUsuario.toUpperCase(),
                            style: GoogleFonts.inter(
                              color: const Color(0xFF06D6A0),
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(
                  Icons.settings_outlined,
                  color: Colors.white54,
                  size: 20,
                ),
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SettingsScreen()),
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white.withOpacity(0.05)),
              color: Colors.white.withOpacity(0.01),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                StudioStat(
                  label: "Seguidores",
                  value: user.followersCount.toString(),
                ),
                StudioStat(label: "Ventas", value: user.salesCount.toString()),
                StudioStat(
                  label: "Reproducciones",
                  value: "${(user.totalPlays / 1000).toStringAsFixed(1)}K",
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              StudioButton(
                label: "MI ESTUDIO",
                icon: Icons.settings_input_component_sharp,
                isPrimary: true,
                onPressed: () {},
              ),
              const SizedBox(width: 10),
              StudioButton(
                label: "CONFIGURACIÓN",
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SettingsScreen()),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTabNavigation() {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        border: Border(
          top: BorderSide(color: Colors.white10),
          bottom: BorderSide(color: Colors.white10),
        ),
      ),
      child: TabBar(
        controller: _tabController,
        isScrollable: true,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        indicatorColor: Colors.white,
        indicatorWeight: 1,
        dividerColor: Colors.transparent,
        tabAlignment: TabAlignment.start,
        labelPadding: const EdgeInsets.symmetric(horizontal: 20),
        labelStyle: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 1,
        ),
        unselectedLabelStyle: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          letterSpacing: 1,
        ),
        labelColor: Colors.white,
        unselectedLabelColor: Colors.white24,
        tabs: const [
          Tab(text: "BEATS"),
          Tab(text: "LOOPS"),
          Tab(text: "STEMS"),
          Tab(text: "COLABS"),
          Tab(text: "PRIVADO"),
          Tab(text: "ANALYTICS"),
        ],
      ),
    );
  }

  Widget _buildBeatsSection() {
    final beats = _userPosts
        .where((p) => p.tipoContenido == 'beat' && !p.isPrivate)
        .toList();
    if (_isLoading)
      return const Center(
        child: CircularProgressIndicator(color: Colors.white12),
      );

    return ListView(
      physics: const BouncingScrollPhysics(),
      children: [
        if (beats.any((b) => b.isPinned))
          _buildPinnedBeat(beats.firstWhere((b) => b.isPinned)),
        const SectionHeader(title: "Listado de Beats"),
        ...beats.where((b) => !b.isPinned).map((beat) => _buildBeatItem(beat)),
        if (beats.isEmpty) _buildEmptyState("Sin contenido publicado"),
        const SizedBox(height: 30),
      ],
    );
  }

  Widget _buildBeatItem(Post beat) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.01),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(2),
            ),
            child: const Icon(
              Icons.graphic_eq,
              color: Colors.white24,
              size: 18,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  beat.titulo.toUpperCase(),
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  "${beat.bpm ?? '--'} BPM • ${beat.tonalidad ?? 'TBC'} • \$${beat.precio?.toStringAsFixed(0) ?? '0'}",
                  style: GoogleFonts.inter(
                    color: Colors.white24,
                    fontSize: 10,
                    letterSpacing: 0.2,
                  ),
                ),
                if (beat.status == "processing")
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      "PROCESANDO AUDIO...",
                      style: GoogleFonts.inter(
                        color: Colors.orangeAccent,
                        fontSize: 8,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          _buildActionIcon(Icons.play_arrow_rounded, () {}),
          _buildActionIcon(
            Icons.more_horiz_rounded,
            () => BeatContextSheet.show(context, beat),
          ),
        ],
      ),
    );
  }

  Widget _buildPinnedBeat(Post beat) {
    return Column(
      children: [
        const SectionHeader(title: "Destacado"),
        _buildBeatItem(beat),
      ],
    );
  }

  Widget _buildActionIcon(IconData icon, VoidCallback onTap) {
    return IconButton(
      icon: Icon(icon, color: Colors.white54, size: 18),
      onPressed: onTap,
    );
  }

  Widget _buildLoopsSection() {
    return ListView(
      physics: const BouncingScrollPhysics(),
      children: [
        const SectionHeader(title: "Sample Library"),
        _buildLoopItem("Midnight Keys", "120", "Am", "0:15"),
        _buildLoopItem("Dark Layer Synth", "140", "Fm", "0:08"),
        _buildLoopItem("Urban Groove Bass", "95", "C#", "0:12"),
      ],
    );
  }

  Widget _buildLoopItem(String name, String bpm, String key, String duration) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(border: Border.all(color: Colors.white10)),
      child: Row(
        children: [
          const Icon(Icons.sync_rounded, color: Colors.blueAccent, size: 16),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name.toUpperCase(),
                  style: GoogleFonts.inter(
                    color: Colors.white70,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  "$bpm BPM • $key • $duration",
                  style: GoogleFonts.inter(color: Colors.white12, fontSize: 10),
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: () {},
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.blueAccent.withOpacity(0.3)),
              ),
              child: Text(
                "CONVERTIR",
                style: GoogleFonts.inter(
                  color: Colors.blueAccent,
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          const Icon(Icons.play_arrow_rounded, color: Colors.white24, size: 20),
          _buildActionIcon(Icons.more_horiz_rounded, () {
            final loopPost = Post(
              id: 0,
              titulo: name,
              artista: "ME",
              descripcion: "Sample loop",
              archivo: "",
              likesCount: 0,
              comentariosCount: 0,
              tipoContenido: "loop",
              bpm: int.tryParse(bpm),
              tonalidad: key,
              duracion: duration,
            );
            BeatContextSheet.show(context, loopPost);
          }),
        ],
      ),
    );
  }

  Widget _buildStemsSection() {
    return ListView(
      physics: const BouncingScrollPhysics(),
      children: [
        const SectionHeader(title: "Stem Packs"),
        StudioFolder(
          name: "ETERNAL NIGHT",
          fileCount: 8,
          isPublic: true,
          children: [
            _buildPackFile("DRUMS_GROUP.wav"),
            _buildPackFile("MELODY_MAIN.wav"),
            _buildPackFile("808_BASS.wav"),
          ],
        ),
        StudioFolder(
          name: "VIBE CHECK V2",
          fileCount: 14,
          isPublic: false,
          children: [
            _buildPackFile("VOCAL_CHOP.wav"),
            _buildPackFile("PADS_STEREO.wav"),
          ],
        ),
      ],
    );
  }

  Widget _buildPackFile(String filename) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.05))),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.audio_file_outlined,
            color: Colors.white12,
            size: 14,
          ),
          const SizedBox(width: 12),
          Text(
            filename,
            style: GoogleFonts.inter(color: Colors.white38, fontSize: 11),
          ),
          const Spacer(),
          const Icon(Icons.download_sharp, color: Colors.white10, size: 16),
        ],
      ),
    );
  }

  Widget _buildCollabsSection() {
    return ListView(
      physics: const BouncingScrollPhysics(),
      children: [
        const SectionHeader(title: "Active Collaborations"),
        _buildStudioCollab(
          "STUDIO SESSION #4",
          ["TAINY", "OVY"],
          50,
          "EN PROGRESO",
        ),
        _buildStudioCollab("DRILL PROJECT X", ["MURDA BEATZ"], 25, "VALIDADO"),
      ],
    );
  }

  Widget _buildStudioCollab(
    String name,
    List<String> group,
    int split,
    String status,
  ) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.01),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                name,
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                  letterSpacing: 0.5,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                color: Colors.white10,
                child: Text(
                  status,
                  style: GoogleFonts.inter(
                    color: Colors.white54,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            "COLABS: ${group.join(', ')}",
            style: GoogleFonts.inter(
              color: Colors.white24,
              fontSize: 10,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Text(
                "MY SPLIT: $split%",
                style: GoogleFonts.inter(
                  color: Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () => _showSplitDialog(),
                child: Text(
                  "GESTIONAR",
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showSplitDialog() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF111111),
        title: Text(
          "GESTIONAR SPLITS",
          style: GoogleFonts.inter(
            color: Colors.white,
            fontWeight: FontWeight.w900,
            fontSize: 14,
          ),
        ),
        content: Text(
          "Funcionalidad de gestión de regalías profesional.",
          style: GoogleFonts.inter(color: Colors.white38, fontSize: 12),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              "CERRAR",
              style: TextStyle(color: Colors.white24),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPrivateSection() {
    return ListView(
      physics: const BouncingScrollPhysics(),
      children: [
        const SectionHeader(title: "Internal Library"),
        _buildLibraryItem("DRILL LOOP #4_FINAL", "HACE 2 HORAS", "BORRADOR"),
        _buildLibraryItem("GUITAR IDEA AM", "AYER", "EN EDICIÓN"),
        _buildEmptyState("Librería privada sincronizada"),
      ],
    );
  }

  Widget _buildLibraryItem(String name, String date, String status) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: const Icon(Icons.lock_rounded, color: Colors.white12, size: 18),
      title: Text(
        name,
        style: GoogleFonts.inter(
          color: Colors.white70,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
      subtitle: Text(
        "$date • $status",
        style: GoogleFonts.inter(color: Colors.white12, fontSize: 10),
      ),
      trailing: OutlinedButton(
        onPressed: () {},
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Colors.white24),
          padding: const EdgeInsets.symmetric(horizontal: 12),
        ),
        child: Text(
          "PUBLICAR",
          style: GoogleFonts.inter(
            color: Colors.white,
            fontSize: 9,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }

  Widget _buildAnalyticsSection() {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(title: "Performance Data"),
          const SizedBox(height: 10),
          _buildInsightCard("Escuchas vs Compras", "14.2%", "↑ 2.1% ESTE MES"),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildSimpleMetric("Plays Hoy", "1,452")),
              const SizedBox(width: 16),
              Expanded(child: _buildSimpleMetric("Balance", "\$4,210")),
            ],
          ),
          const SizedBox(height: 40),
          const SectionHeader(title: "Trending Items"),
          const SizedBox(height: 8),
          const AnalyticBar(
            label: "ETERNAL SUN",
            value: 0.85,
            amount: "4.2k plays",
          ),
          const AnalyticBar(
            label: "DARK VALLEY",
            value: 0.65,
            amount: "2.8k plays",
          ),
          const AnalyticBar(
            label: "URBAN BEAT #2",
            value: 0.45,
            amount: "1.5k plays",
          ),
        ],
      ),
    );
  }

  Widget _buildInsightCard(String title, String value, String trend) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.white10),
        color: Colors.white.withOpacity(0.01),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.inter(
              color: Colors.white24,
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 36,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            trend,
            style: GoogleFonts.inter(
              color: Colors.greenAccent,
              fontSize: 10,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSimpleMetric(String title, String value) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(border: Border.all(color: Colors.white10)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: GoogleFonts.inter(
              color: Colors.white24,
              fontSize: 9,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 60),
        child: Text(
          message.toUpperCase(),
          style: GoogleFonts.inter(
            color: Colors.white.withOpacity(0.05),
            fontSize: 10,
            fontWeight: FontWeight.w900,
            letterSpacing: 2,
          ),
        ),
      ),
    );
  }
}
