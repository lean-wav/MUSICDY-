import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/collaboration_model.dart';
import '../services/collaboration_service.dart';
import '../../auth/providers/auth_provider.dart';

class CollaborationDetailScreen extends StatefulWidget {
  final int projectId;

  const CollaborationDetailScreen({super.key, required this.projectId});

  @override
  State<CollaborationDetailScreen> createState() =>
      _CollaborationDetailScreenState();
}

class _CollaborationDetailScreenState extends State<CollaborationDetailScreen> {
  final _service = CollaborationService();
  final _msgController = TextEditingController();
  ProyectoColaboracion? _project;
  List<MensajeColaboracion> _messages = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final proj = await _service.getProjectDetail(widget.projectId);
      final msgs = await _service.getMessages(widget.projectId);
      if (mounted) {
        setState(() {
          _project = proj;
          _messages = msgs;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _sendMessage() async {
    if (_msgController.text.isEmpty) return;
    final text = _msgController.text;
    _msgController.clear();
    await _service.sendMessage(widget.projectId, text);
    _loadData();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFF0F0F0F),
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (_project == null) {
      return const Scaffold(
        backgroundColor: Color(0xFF0F0F0F),
        body: Center(child: Text("Proyecto no encontrado")),
      );
    }

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: const Color(0xFF0F0F0F),
        appBar: AppBar(
          backgroundColor: const Color(0xFF0F0F0F),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _project!.titulo,
                style: GoogleFonts.outfit(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                _project!.tipo,
                style: GoogleFonts.inter(fontSize: 10, color: Colors.white38),
              ),
            ],
          ),
          bottom: const TabBar(
            tabs: [
              Tab(text: "CHAT"),
              Tab(text: "ARCHIVOS"),
              Tab(text: "SPLITS"),
            ],
          ),
        ),
        body: TabBarView(
          children: [_buildChatTab(), _buildFilesTab(), _buildSplitsTab()],
        ),
      ),
    );
  }

  Widget _buildSplitsTab() {
    final currentUser = context.read<AuthProvider>().user;
    final isInitiator = _project!.participantes.any(
      (p) => p.usuario.id == currentUser?.id && p.rol == "Iniciador",
    );

    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          "SPLIT SHEET",
          style: GoogleFonts.outfit(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          "Distribución de regalías y propiedad intelectual.",
          style: TextStyle(color: Colors.white38, fontSize: 12),
        ),
        const SizedBox(height: 32),
        ..._project!.participantes.map((p) => _buildSplitRow(p)),
        const Divider(color: Colors.white10, height: 64),
        if (isInitiator)
          ElevatedButton(
            onPressed: () => _showEditSplitsModal(),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blueAccent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: const Text("MODIFICAR SPLITS"),
          ),
      ],
    );
  }

  Widget _buildSplitRow(ParticipanteColaboracion p) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundImage: NetworkImage(p.usuario.fotoPerfil ?? ""),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  p.usuario.username,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  p.rol,
                  style: const TextStyle(color: Colors.white38, fontSize: 11),
                ),
              ],
            ),
          ),
          Text(
            "${p.splitPorcentual.toStringAsFixed(1)}%",
            style: GoogleFonts.outfit(
              color: Colors.blueAccent,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  void _showEditSplitsModal() {
    final List<TextEditingController> controllers = _project!.participantes
        .map(
          (p) =>
              TextEditingController(text: p.splitPorcentual.toStringAsFixed(0)),
        )
        .toList();

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A1A),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
          left: 24,
          right: 24,
          top: 32,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              "EDITAR SPLIT SHEET",
              style: GoogleFonts.outfit(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              "La suma total debe ser 100%",
              style: TextStyle(color: Colors.white38, fontSize: 12),
            ),
            const SizedBox(height: 32),
            ...List.generate(_project!.participantes.length, (index) {
              final p = _project!.participantes[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        p.usuario.username,
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                    SizedBox(
                      width: 80,
                      child: TextField(
                        controller: controllers[index],
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.blueAccent,
                          fontWeight: FontWeight.bold,
                        ),
                        decoration: const InputDecoration(
                          suffixText: "%",
                          suffixStyle: TextStyle(color: Colors.white38),
                          enabledBorder: UnderlineInputBorder(
                            borderSide: BorderSide(color: Colors.white10),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () async {
                  final List<Map<String, dynamic>> newSplits = [];
                  double total = 0;
                  for (int i = 0; i < _project!.participantes.length; i++) {
                    final val = double.tryParse(controllers[i].text) ?? 0;
                    total += val;
                    newSplits.add({
                      'usuario_id': _project!.participantes[i].usuario.id,
                      'split_porcentual': val,
                    });
                  }

                  if (total != 100) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text("El total es $total%. Debe ser 100%."),
                      ),
                    );
                    return;
                  }

                  try {
                    await _service.updateSplits(_project!.id, newSplits);
                    Navigator.pop(context);
                    _loadData();
                  } catch (e) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text("Error al actualizar splits"),
                      ),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blueAccent,
                ),
                child: const Text("GUARDAR CAMBIOS"),
              ),
            ),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }

  Widget _buildChatTab() {
    final currentUser = context.read<AuthProvider>().user;
    return Column(
      children: [
        if (_project!.precioFijo != null &&
            _project!.precioFijo! > 0 &&
            _project!.pagoEstado == 'pendiente')
          _buildPaymentBanner(),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length,
            itemBuilder: (context, index) {
              final msg = _messages[index];
              final isMe = msg.usuario.id == currentUser?.id;
              return Align(
                alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isMe ? Colors.blueAccent : Colors.white10,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(12),
                      topRight: const Radius.circular(12),
                      bottomLeft: isMe
                          ? const Radius.circular(12)
                          : Radius.zero,
                      bottomRight: isMe
                          ? Radius.zero
                          : const Radius.circular(12),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: isMe
                        ? CrossAxisAlignment.end
                        : CrossAxisAlignment.start,
                    children: [
                      if (!isMe)
                        Text(
                          msg.usuario.username,
                          style: const TextStyle(
                            fontSize: 10,
                            color: Colors.blueAccent,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      Text(
                        msg.texto,
                        style: const TextStyle(color: Colors.white),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        _buildMessageInput(),
      ],
    );
  }

  Widget _buildMessageInput() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        border: const Border(top: BorderSide(color: Colors.white10)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _msgController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                hintText: "Escribe un mensaje...",
                border: InputBorder.none,
              ),
            ),
          ),
          IconButton(
            onPressed: _sendMessage,
            icon: const Icon(Icons.send, color: Colors.blueAccent),
          ),
        ],
      ),
    );
  }

  Widget _buildFilesTab() {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        _buildUploadCard(),
        const SizedBox(height: 24),
        ..._project!.archivos.map((f) => _buildFileCard(f)),
      ],
    );
  }

  Widget _buildUploadCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.blueAccent.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.blueAccent.withOpacity(0.2),
          style: BorderStyle.solid,
        ),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.cloud_upload_outlined,
            color: Colors.blueAccent,
            size: 32,
          ),
          const SizedBox(height: 12),
          Text(
            "SUBIR STEMS O REFERENCIAS",
            style: GoogleFonts.inter(
              color: Colors.blueAccent,
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
          Text(
            "WAV, AIFF o FLAC recomendados",
            style: GoogleFonts.inter(color: Colors.white24, fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _buildFileCard(Map<String, dynamic> f) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.audio_file_outlined, color: Colors.white24),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  f['nombre'],
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  "${f['version']} • Por ${f['por']}",
                  style: const TextStyle(color: Colors.white24, fontSize: 11),
                ),
              ],
            ),
          ),
          const Icon(Icons.download_rounded, color: Colors.white24, size: 18),
        ],
      ),
    );
  }

  Widget _buildPaymentBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      color: Colors.greenAccent.withOpacity(0.1),
      child: Row(
        children: [
          const Icon(Icons.payments_outlined, color: Colors.greenAccent),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "PAGO PENDIENTE: \$${_project!.precioFijo}",
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                const Text(
                  "El fondo se mantendrá en garantía hasta finalizar.",
                  style: TextStyle(color: Colors.white60, fontSize: 11),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: _startCheckout,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.greenAccent,
              foregroundColor: Colors.black,
              textStyle: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
            child: const Text("PAGAR AHORA"),
          ),
        ],
      ),
    );
  }

  Future<void> _startCheckout() async {
    try {
      final url = await _service.checkoutCollaboration(_project!.id);
      // En un entorno real usaríamos url_launcher
      // Por ahora, simulamos o mostramos el link
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Abriendo pasarela de pago..."),
            backgroundColor: Colors.blueAccent,
          ),
        );
        print("URL de pago: $url");
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Error al iniciar el pago")),
        );
      }
    }
  }
}
