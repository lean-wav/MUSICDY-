import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../feed/models/post_model.dart';
import '../providers/auth_provider.dart';
import '../../audio_player/services/audio_player_manager.dart';
import '../../feed/services/feed_service.dart';

class BeatContextSheet extends StatefulWidget {
  final Post post;

  const BeatContextSheet({super.key, required this.post});

  static void show(BuildContext context, Post post) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BeatContextSheet(post: post),
    );
  }

  @override
  State<BeatContextSheet> createState() => _BeatContextSheetState();
}

class _BeatContextSheetState extends State<BeatContextSheet> {
  double _tempo = 1.0;
  double _pitch = 1.0; // Changed to 1.0 for just_audio (it uses multiplier)
  double _gain = 1.0;

  @override
  void initState() {
    super.initState();
    final playerManager = context.read<AudioPlayerManager>();
    if (playerManager.currentPost?.id == widget.post.id) {
      _tempo = playerManager.player.speed;
      _pitch = playerManager.player.pitch;
      _gain = playerManager.player.volume;
    }
  }

  void _updateTempo(double value, AudioPlayerManager manager) {
    setState(() => _tempo = value);
    if (manager.currentPost?.id == widget.post.id) {
      manager.setSpeed(value);
    }
  }

  void _updatePitch(double value, AudioPlayerManager manager) {
    setState(() => _pitch = value);
    if (manager.currentPost?.id == widget.post.id) {
      manager.setPitch(value);
    }
  }

  void _updateGain(double value, AudioPlayerManager manager) {
    setState(() => _gain = value);
    if (manager.currentPost?.id == widget.post.id) {
      manager.setVolume(value);
    }
  }

  Future<void> _deleteBeat() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        title: Text(
          "Eliminar contenido",
          style: GoogleFonts.outfit(color: Colors.white),
        ),
        content: Text(
          "¿Estás seguro de que quieres eliminar este beat? Esta acción es irreversible.",
          style: GoogleFonts.inter(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text("CANCELAR"),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              "ELIMINAR",
              style: TextStyle(color: Colors.redAccent),
            ),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await FeedService().deletePost(widget.post.id);
        if (mounted) {
          Navigator.pop(context); // Close sheet
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text("Contenido eliminado")));
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text("Error: $e")));
        }
      }
    }
  }

  void _showEditPrice() {
    final controller = TextEditingController(
      text: widget.post.precio?.toString() ?? "",
    );
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        title: Text(
          "Cambiar precio",
          style: GoogleFonts.outfit(color: Colors.white),
        ),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            prefixText: "\$ ",
            labelText: "Nuevo precio base",
            labelStyle: TextStyle(color: Colors.white24),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("CANCELAR"),
          ),
          TextButton(
            onPressed: () async {
              try {
                final newPrice = double.tryParse(controller.text);
                if (newPrice != null) {
                  await FeedService().updatePost(widget.post.id, {
                    "licencias": {
                      "basic": {"precio": newPrice},
                    },
                  });
                  if (mounted) {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Precio actualizado")),
                    );
                  }
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(SnackBar(content: Text("Error: $e")));
                }
              }
            },
            child: const Text("GUARDAR"),
          ),
        ],
      ),
    );
  }

  void _showEditMetadata() {
    final titleController = TextEditingController(text: widget.post.titulo);
    final descController = TextEditingController(text: widget.post.descripcion);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        title: Text(
          "Editar Metadata",
          style: GoogleFonts.outfit(color: Colors.white),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: titleController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: "Título",
                labelStyle: TextStyle(color: Colors.white38),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: descController,
              maxLines: 3,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: "Descripción",
                labelStyle: TextStyle(color: Colors.white38),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("CANCELAR"),
          ),
          TextButton(
            onPressed: () async {
              try {
                await FeedService().updatePost(widget.post.id, {
                  "titulo": titleController.text,
                  "descripcion": descController.text,
                });
                if (mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Metadata actualizada")),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(SnackBar(content: Text("Error: $e")));
                }
              }
            },
            child: const Text("GUARDAR"),
          ),
        ],
      ),
    );
  }

  void _showSplitManagement() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F0F0F),
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "GESTIONAR SPLITS",
              style: GoogleFonts.inter(
                color: Colors.white24,
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            _buildSplitRow("TÚ (Productor)", 100),
            const SizedBox(height: 16),
            _buildContextButton(
              "AÑADIR COLABORADOR",
              Icons.person_add_outlined,
              () {},
            ),
            const SizedBox(height: 32),
            Text(
              "REGALÍAS TOTALES: 100%",
              style: GoogleFonts.inter(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildSplitRow(String name, double percentage) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            const CircleAvatar(
              backgroundColor: Colors.white10,
              radius: 16,
              child: Icon(Icons.person, size: 16, color: Colors.white24),
            ),
            const SizedBox(width: 12),
            Text(
              name,
              style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
            ),
          ],
        ),
        Text(
          "${percentage.toInt()}%",
          style: GoogleFonts.outfit(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  void _showLicensingDetail() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F0F0F),
      isScrollControlled: true,
      builder: (ctx) => Container(
        height: MediaQuery.of(context).size.height * 0.8,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "DETALLES DE LICENCIAS",
              style: GoogleFonts.inter(
                color: Colors.white24,
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            Expanded(
              child: ListView(
                children: [
                  _buildLicenseDetailCard("LEASE BÁSICO", "29.99", [
                    "MP3 320kbps",
                    "10,000 Streams",
                    "Uso no masivo",
                  ]),
                  _buildLicenseDetailCard("LEASE PREMIUM", "49.99", [
                    "WAV + Stems",
                    "Unlimited Streams",
                    "Radio Play",
                  ]),
                  _buildLicenseDetailCard("EXCLUSIVO", "499.00", [
                    "Derechos Totales",
                    "Contrato Firmado",
                    "Retirada de Tiendas",
                  ]),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: _buildContextButton(
                    "MÉTODOS DE PAGO",
                    Icons.payment,
                    () {},
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildContextButton("HISTORIAL", Icons.history, () {}),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLicenseDetailCard(
    String title,
    String price,
    List<String> items,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        border: Border.all(color: Colors.white10),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                "\$ $price",
                style: GoogleFonts.outfit(
                  color: Colors.greenAccent,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const Divider(color: Colors.white10, height: 24),
          ...items.map(
            (it) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  const Icon(
                    Icons.check_circle_outline,
                    color: Colors.white24,
                    size: 14,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    it,
                    style: GoogleFonts.inter(
                      color: Colors.white60,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showFullAnalytics() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F0F0F),
        title: Text(
          "ANALYTICS: ${widget.post.titulo}",
          style: GoogleFonts.outfit(color: Colors.white, fontSize: 16),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildStatLong(
              "Reproducciones Totales",
              "1,240",
              Colors.blueAccent,
            ),
            _buildStatLong("Tasa de Finalización", "74%", Colors.greenAccent),
            _buildStatLong("Búsquedas", "32", Colors.purpleAccent),
            const SizedBox(height: 16),
            Container(
              height: 100,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Center(
                child: Icon(Icons.show_chart, color: Colors.white24, size: 40),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("CERRAR"),
          ),
        ],
      ),
    );
  }

  Widget _buildStatLong(String label, String val, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(color: Colors.white38, fontSize: 12),
          ),
          Text(
            val,
            style: GoogleFonts.outfit(
              color: color,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.read<AuthProvider>().user;
    final bool isOwner = user?.username == widget.post.artista;
    final playerManager = context.watch<AudioPlayerManager>();

    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0F0F0F),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.4,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return ListView(
            controller: scrollController,
            children: [
              _buildHandle(),
              _buildHeader(),
              const Divider(color: Colors.white10),

              // BLOQUE 1: Información
              _buildSectionTitle("INFORMACIÓN TÉCNICA"),
              _buildInfoGrid(),
              _buildContextButton(
                "Ver detalles completos",
                Icons.analytics_outlined,
                _showFullAnalytics,
              ),

              // BLOQUE 2: Gestión (Solo Dueño)
              if (isOwner) ...[
                const Divider(color: Colors.white10, height: 32),
                _buildSectionTitle("GESTIÓN DE ESTUDIO"),
                _buildActionList([
                  _ActionItem(
                    Icons.edit_note_rounded,
                    "Editar metadata",
                    _showEditMetadata,
                  ),
                  _ActionItem(Icons.image_outlined, "Cambiar portada", () {}),
                  _ActionItem(
                    Icons.payments_outlined,
                    "Cambiar precio",
                    _showEditPrice,
                  ),
                  _ActionItem(
                    Icons.verified_user_outlined,
                    "Gestionar licencias",
                    () {},
                  ),
                  _ActionItem(Icons.auto_graph_rounded, "Ver analytics", () {}),
                  _ActionItem(Icons.push_pin_outlined, "Destacar beat", () {}),
                  _ActionItem(
                    Icons.visibility_off_outlined,
                    "Despublicar",
                    () {},
                  ),
                  _ActionItem(
                    Icons.delete_outline_rounded,
                    "Eliminar",
                    _deleteBeat,
                    color: Colors.redAccent,
                  ),
                ]),
              ],

              // BLOQUE 3: Ajustes Creativos Rápidos
              const Divider(color: Colors.white10, height: 32),
              _buildSectionTitle("PREVIEW CREATIVO (NO DESTRUCTIVO)"),
              _buildCreativeAdjustments(playerManager),

              // BLOQUE 4: Colaboración
              const Divider(color: Colors.white10, height: 32),
              _buildSectionTitle("COLABORACIÓN"),
              _buildActionList([
                _ActionItem(
                  Icons.handshake_outlined,
                  "Proponer colaboración",
                  () {},
                ),
                _ActionItem(
                  Icons.person_add_alt_1_outlined,
                  "Invitar productor",
                  () {},
                ),
                _ActionItem(Icons.layers_outlined, "Solicitar stems", () {}),
                _ActionItem(
                  Icons.pie_chart_outline_rounded,
                  "Gestionar splits",
                  _showSplitManagement,
                ),
                _ActionItem(
                  Icons.content_copy_rounded,
                  "Clonar como proyecto",
                  () {},
                ),
              ]),

              // BLOQUE 5: Monetización
              const Divider(color: Colors.white10, height: 32),
              _buildSectionTitle("MONETIZACIÓN Y LICENCIAS"),
              _buildMonetizationSection(),
              _buildContextButton(
                "Gestionar Licencias & Pagos",
                Icons.shopping_cart_checkout_rounded,
                _showLicensingDetail,
              ),

              // NUEVO BLOQUE: Descargas
              const Divider(color: Colors.white10, height: 32),
              _buildSectionTitle("ENTREGA DE ARCHIVOS"),
              _buildDownloadSection(),

              const SizedBox(height: 40),
            ],
          );
        },
      ),
    );
  }

  Widget _buildDownloadSection() {
    final bool isReady = widget.post.status == "ready";
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          _buildContextButton(
            isReady
                ? "Descargar Original (Lossless)"
                : "Original no disponible aún",
            Icons.download_rounded,
            isReady
                ? () {
                    // TODO: Implement actual download logic with URL
                    debugPrint("Downloading: ${widget.post.archivoOriginal}");
                  }
                : () {},
          ),
          if (isReady)
            _buildContextButton(
              "Descargar Preview HQ (320kbps)",
              Icons.high_quality_rounded,
              () {},
            ),
        ],
      ),
    );
  }

  Widget _buildHandle() {
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 12),
        width: 40,
        height: 4,
        decoration: BoxDecoration(
          color: Colors.white12,
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(8),
              image: widget.post.coverUrl != null
                  ? DecorationImage(
                      image: NetworkImage(widget.post.coverUrl!),
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            child: widget.post.coverUrl == null
                ? const Icon(Icons.music_note_rounded, color: Colors.white24)
                : null,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.post.titulo,
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  widget.post.artista,
                  style: GoogleFonts.inter(
                    color: Colors.white38,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () {
              context.read<AudioPlayerManager>().playPost(widget.post);
            },
            icon: Icon(
              (context.watch<AudioPlayerManager>().currentPost?.id ==
                          widget.post.id &&
                      context.watch<AudioPlayerManager>().isPlaying)
                  ? Icons.pause_circle_filled_rounded
                  : Icons.play_circle_filled_rounded,
              color: Colors.white,
              size: 32,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
      child: Text(
        title,
        style: GoogleFonts.inter(
          color: Colors.white24,
          fontSize: 10,
          fontWeight: FontWeight.w900,
          letterSpacing: 1.5,
        ),
      ),
    );
  }

  Widget _buildInfoGrid() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Wrap(
        spacing: 16,
        runSpacing: 16,
        children: [
          _buildInfoItem("BPM", "${widget.post.bpm ?? '--'}"),
          _buildInfoItem("KEY", widget.post.tonalidad ?? "N/A"),
          _buildInfoItem("DURACIÓN", widget.post.duracion ?? "0:00"),
          _buildInfoItem(
            "PLAYS",
            "${widget.post.likesCount}",
          ), // Placeholder for real plays
          _buildInfoItem("VENTAS", "12"), // Placeholder
          _buildInfoItem("FECHA", "04/03/26"), // Placeholder
        ],
      ),
    );
  }

  Widget _buildInfoItem(String label, String value) {
    return Container(
      width: (MediaQuery.of(context).size.width - 80) / 3,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              color: Colors.white24,
              fontSize: 8,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCreativeAdjustments(AudioPlayerManager manager) {
    if (widget.post.status == "processing") {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 24),
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.02),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white24,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              "Procesando audio de alta fidelidad...",
              style: GoogleFonts.inter(color: Colors.white38, fontSize: 11),
            ),
            Text(
              "Tempo y Pitch estarán disponibles pronto",
              style: GoogleFonts.inter(color: Colors.white10, fontSize: 9),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          _buildSliderAdjustment(
            "TEMPO",
            "%.2fx".format(_tempo),
            _tempo,
            0.5,
            2.0,
            (v) => _updateTempo(v, manager),
          ),
          _buildSliderAdjustment(
            "PITCH",
            "%.2fx".format(_pitch), // just_audio uses multiplier for pitch too
            _pitch,
            0.5,
            2.0,
            (v) => _updatePitch(v, manager),
          ),
          _buildSliderAdjustment(
            "GAIN",
            "${(_gain * 100).toInt()}%",
            _gain,
            0.0,
            2.0, // Increased max gain to 2.0 for "boost"
            (v) => _updateGain(v, manager),
          ),
          const SizedBox(height: 8),
          _buildContextButton(
            "Loop Region: Auto-detected (4 bars)",
            Icons.loop_rounded,
            () {},
          ),
        ],
      ),
    );
  }

  Widget _buildSliderAdjustment(
    String label,
    String value,
    double current,
    double min,
    double max,
    ValueChanged<double> onChanged,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: GoogleFonts.inter(
                  color: Colors.white54,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Text(
                value,
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              trackHeight: 2,
              activeTrackColor: Colors.white,
              inactiveTrackColor: Colors.white10,
              thumbColor: Colors.white,
              overlayColor: Colors.white.withOpacity(0.1),
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
            ),
            child: Slider(
              value: current,
              min: min,
              max: max,
              onChanged: onChanged,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMonetizationSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          _buildLicenseCard("LEASE BÁSICO", "US\$ 29.99", "Audio MP3", true),
          _buildLicenseCard(
            "LEASE PREMIUM",
            "US\$ 49.99",
            "WAV + Stems",
            false,
          ),
          _buildLicenseCard(
            "EXCLUSIVO",
            "US\$ 499.00",
            "Derechos totales",
            false,
          ),
          _buildContextButton(
            "Gestionar Carrito & Pagos",
            Icons.shopping_cart_checkout_rounded,
            () {},
          ),
        ],
      ),
    );
  }

  Widget _buildLicenseCard(
    String title,
    String price,
    String perks,
    bool active,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: active ? Colors.white.withOpacity(0.05) : Colors.transparent,
        border: Border.all(
          color: active ? Colors.white24 : Colors.white.withOpacity(0.05),
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                perks,
                style: GoogleFonts.inter(color: Colors.white38, fontSize: 10),
              ),
            ],
          ),
          Text(
            price,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionList(List<_ActionItem> items) {
    return Column(
      children: items
          .map(
            (item) => ListTile(
              onTap: item.onTap,
              contentPadding: const EdgeInsets.symmetric(horizontal: 24),
              leading: Icon(
                item.icon,
                color: item.color ?? Colors.white70,
                size: 20,
              ),
              title: Text(
                item.title,
                style: GoogleFonts.inter(
                  color: item.color ?? Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              trailing: const Icon(
                Icons.chevron_right_rounded,
                color: Colors.white10,
                size: 18,
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _buildContextButton(String text, IconData icon, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.white.withOpacity(0.05)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white54, size: 18),
              const SizedBox(width: 8),
              Text(
                text,
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionItem {
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final Color? color;

  _ActionItem(this.icon, this.title, this.onTap, {this.color});
}

extension on String {
  String format(double val) =>
      replaceFirst("%.2fx", val.toStringAsFixed(2) + "x");
}
