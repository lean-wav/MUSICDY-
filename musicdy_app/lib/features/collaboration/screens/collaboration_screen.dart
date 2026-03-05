import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/collaboration_model.dart';
import '../services/collaboration_service.dart';
import '../../auth/models/user_model.dart';
import 'collaboration_detail_screen.dart';

class CollaborationScreen extends StatefulWidget {
  const CollaborationScreen({super.key});

  @override
  State<CollaborationScreen> createState() => _CollaborationScreenState();
}

class _CollaborationScreenState extends State<CollaborationScreen> {
  final _service = CollaborationService();

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        backgroundColor: const Color(0xFF0F0F0F),
        appBar: AppBar(
          backgroundColor: const Color(0xFF0F0F0F),
          elevation: 0,
          title: Text(
            "ESTUDIO COLABORATIVO",
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 18,
              letterSpacing: 1.2,
            ),
          ),
          bottom: TabBar(
            isScrollable: true,
            indicatorColor: Colors.blueAccent,
            indicatorWeight: 3,
            labelStyle: GoogleFonts.inter(
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
            unselectedLabelStyle: GoogleFonts.inter(
              fontWeight: FontWeight.normal,
              fontSize: 13,
            ),
            tabs: const [
              Tab(text: "CONEXIONES"),
              Tab(text: "PROYECTOS"),
              Tab(text: "SOLICITUDES"),
              Tab(text: "HISTORIAL"),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildConnectionsTab(),
            _buildProjectsTab(),
            _buildRequestsTab(),
            _buildHistoryTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildConnectionsTab() {
    return FutureBuilder<List<User>>(
      future: _service.getConnections(),
      builder: (context, snapshot) {
        if (!snapshot.hasData)
          return const Center(child: CircularProgressIndicator());
        final users = snapshot.data!;
        if (users.isEmpty)
          return _buildEmptyState(
            "Sin conexiones aún",
            "Sigue a otros productores para conectar.",
          );

        return ListView.separated(
          padding: const EdgeInsets.all(24),
          itemCount: users.length,
          separatorBuilder: (_, __) => const SizedBox(height: 16),
          itemBuilder: (context, index) {
            final user = users[index];
            return _buildConnectionCard(user);
          },
        );
      },
    );
  }

  Widget _buildConnectionCard(User user) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundImage: NetworkImage(
              user.fotoPerfil ?? "https://via.placeholder.com/150",
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user.username,
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  "Productor • Buenos Aires",
                  style: GoogleFonts.inter(color: Colors.white38, fontSize: 12),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => _showStartProjectModal(user),
            icon: const Icon(
              Icons.add_circle_outline,
              color: Colors.blueAccent,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProjectsTab() {
    return FutureBuilder<List<ProyectoColaboracion>>(
      future: _service.getProjects(),
      builder: (context, snapshot) {
        if (!snapshot.hasData)
          return const Center(child: CircularProgressIndicator());
        final projects = snapshot.data!;
        if (projects.isEmpty)
          return _buildEmptyState(
            "Sin proyectos activos",
            "Inicia una colaboración con una conexión.",
          );

        return ListView.separated(
          padding: const EdgeInsets.all(24),
          itemCount: projects.length,
          separatorBuilder: (_, __) => const SizedBox(height: 16),
          itemBuilder: (context, index) {
            final proj = projects[index];
            return _buildProjectCard(proj);
          },
        );
      },
    );
  }

  Widget _buildProjectCard(ProyectoColaboracion proj) {
    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => CollaborationDetailScreen(projectId: proj.id),
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Colors.white.withOpacity(0.05),
              Colors.white.withOpacity(0.02),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.blueAccent.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    proj.tipo.toUpperCase(),
                    style: GoogleFonts.inter(
                      color: Colors.blueAccent,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                Text(
                  proj.estado == "en_proceso" ? "● ACTIVO" : "CERRADO",
                  style: GoogleFonts.inter(
                    color: proj.estado == "en_proceso"
                        ? Colors.greenAccent
                        : Colors.white24,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              proj.titulo,
              style: GoogleFonts.outfit(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                ...proj.participantes
                    .take(3)
                    .map(
                      (p) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: CircleAvatar(
                          radius: 12,
                          backgroundImage: NetworkImage(
                            p.usuario.fotoPerfil ??
                                "https://via.placeholder.com/150",
                          ),
                        ),
                      ),
                    ),
                if (proj.participantes.length > 3)
                  Text(
                    "+${proj.participantes.length - 3}",
                    style: GoogleFonts.inter(
                      color: Colors.white38,
                      fontSize: 12,
                    ),
                  ),
              ],
            ),
            const Divider(color: Colors.white10, height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Última actividad: Hoy 14:30",
                  style: GoogleFonts.inter(color: Colors.white24, fontSize: 11),
                ),
                const Icon(
                  Icons.arrow_forward_ios,
                  color: Colors.white24,
                  size: 14,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRequestsTab() {
    return FutureBuilder<List<SolicitudColaboracion>>(
      future: _service.getRequests(),
      builder: (context, snapshot) {
        if (!snapshot.hasData)
          return const Center(child: CircularProgressIndicator());
        final requests = snapshot.data!;
        if (requests.isEmpty)
          return _buildEmptyState(
            "Sin solicitudes",
            "Aquí aparecerán tus propuestas de colaboración.",
          );

        return ListView.separated(
          padding: const EdgeInsets.all(24),
          itemCount: requests.length,
          separatorBuilder: (_, __) => const SizedBox(height: 16),
          itemBuilder: (context, index) {
            final req = requests[index];
            return _buildRequestCard(req);
          },
        );
      },
    );
  }

  Widget _buildRequestCard(SolicitudColaboracion req) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundImage: NetworkImage(
                  req.emisor.fotoPerfil ?? "https://via.placeholder.com/150",
                ),
              ),
              const SizedBox(width: 12),
              Text(
                req.emisor.username,
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Text(
                req.estado.toUpperCase(),
                style: GoogleFonts.inter(
                  color: req.estado == "pendiente"
                      ? Colors.orangeAccent
                      : Colors.white24,
                  fontSize: 10,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            req.tipoProyecto,
            style: GoogleFonts.inter(color: Colors.white70, fontSize: 13),
          ),
          if (req.propuestaEconomica != null)
            Text(
              "\$ ${req.propuestaEconomica}",
              style: GoogleFonts.outfit(
                color: Colors.greenAccent,
                fontWeight: FontWeight.bold,
              ),
            ),
          const SizedBox(height: 8),
          Text(
            req.mensajeInicial,
            style: GoogleFonts.inter(color: Colors.white38, fontSize: 12),
            maxLines: 2,
          ),
          const SizedBox(height: 16),
          if (req.estado == "pendiente")
            Row(
              children: [
                Expanded(
                  child: _buildSmallButton(
                    "RECHAZAR",
                    Colors.redAccent.withOpacity(0.1),
                    Colors.redAccent,
                    () async {
                      await _service.updateRequestStatus(req.id, "rechazada");
                      setState(() {});
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildSmallButton(
                    "ACEPTAR",
                    Colors.blueAccent,
                    Colors.white,
                    () async {
                      await _service.updateRequestStatus(req.id, "aceptada");
                      setState(() {});
                    },
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildHistoryTab() {
    return _buildEmptyState(
      "Historial vacío",
      "Aquí verás tus proyectos finalizados.",
    );
  }

  Widget _buildEmptyState(String title, String sub) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.handshake_outlined, size: 64, color: Colors.white10),
          const SizedBox(height: 24),
          Text(
            title,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            sub,
            style: GoogleFonts.inter(color: Colors.white24, fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildSmallButton(
    String text,
    Color bg,
    Color fg,
    VoidCallback onTap,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 36,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          text,
          style: GoogleFonts.inter(
            color: fg,
            fontSize: 11,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }

  void _showStartProjectModal(User connection) {
    final titleController = TextEditingController();
    final msgController = TextEditingController();
    String selectedType = "Beat";

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F0F0F),
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
          left: 24,
          right: 24,
          top: 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "PROPONER COLABORACIÓN",
              style: GoogleFonts.outfit(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "Con ${connection.username}",
              style: GoogleFonts.inter(color: Colors.white38, fontSize: 12),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: titleController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: "Título del Proyecto",
                labelStyle: TextStyle(color: Colors.white38),
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: selectedType,
              dropdownColor: const Color(0xFF0F0F0F),
              style: const TextStyle(color: Colors.white),
              items: [
                "Beat",
                "Canción",
                "Remix",
                "Mixing",
                "Otro",
              ].map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
              onChanged: (v) => selectedType = v!,
              decoration: const InputDecoration(
                labelText: "Tipo de Trabajo",
                labelStyle: TextStyle(color: Colors.white38),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: msgController,
              maxLines: 3,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: "Tu propuesta / mensaje",
                labelStyle: TextStyle(color: Colors.white38),
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () async {
                  await _service.sendRequest(
                    receptorId: connection.id,
                    tipo: selectedType,
                    mensaje: msgController.text,
                  );
                  if (mounted) {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Solicitud enviada")),
                    );
                    setState(() {});
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blueAccent,
                ),
                child: const Text("ENVIAR PROPUESTA"),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
