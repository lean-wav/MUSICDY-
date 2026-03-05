import 'dart:io' show File;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import '../../feed/services/feed_service.dart';

class DiscoverUploadScreen extends StatefulWidget {
  const DiscoverUploadScreen({super.key});

  @override
  State<DiscoverUploadScreen> createState() => _DiscoverUploadScreenState();
}

class _DiscoverUploadScreenState extends State<DiscoverUploadScreen> {
  final PageController _pageController = PageController();
  int _currentStep = 0;
  bool _isUploading = false;

  // --- WIZARD STATE ---
  String? _tipoPublicacion; // 'own_music', 'video_terceros', 'recomendacion'

  // Common Fields
  final _tituloCtrl = TextEditingController();
  final _artistaCtrl = TextEditingController(); // Or artistaOriginal
  String _genre = 'Pop';
  final _idiomaCtrl = TextEditingController();
  final _ciudadCtrl = TextEditingController();

  // Audio / Video Files
  PlatformFile? _mainFile;
  XFile? _coverFile;

  // Fields for external sources (Types B & C)
  String _plataformaOrigen = 'Spotify';
  final _linkOficialCtrl = TextEditingController();
  final _miniReviewCtrl = TextEditingController(); // For recommendation

  // Visibility (Type A)
  String _visibilidad = 'public';

  // Fields for Type A
  final _isrcCtrl = TextEditingController();
  final _creditosCtrl = TextEditingController();

  final List<String> _platforms = [
    'YouTube Music',
    'Spotify',
    'Apple Music',
    'SoundCloud',
    'Otro',
  ];

  @override
  void dispose() {
    _pageController.dispose();
    _tituloCtrl.dispose();
    _artistaCtrl.dispose();
    _idiomaCtrl.dispose();
    _ciudadCtrl.dispose();
    _linkOficialCtrl.dispose();
    _miniReviewCtrl.dispose();
    _isrcCtrl.dispose();
    _creditosCtrl.dispose();
    super.dispose();
  }

  void _nextStep() {
    if (_currentStep == 0 && _tipoPublicacion == null) {
      _showError("Seleccioná un tipo de publicación.");
      return;
    }

    if (_currentStep == 1) {
      if (_tipoPublicacion == 'own_music' &&
          _mainFile == null &&
          _coverFile == null) {
        _showError("Debes subir un archivo o una portada.");
        return;
      }
      if (_tipoPublicacion == 'video_terceros' && _mainFile == null) {
        _showError("Debes subir un video.");
        return;
      }
    }

    if (_currentStep < 3) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      setState(() => _currentStep++);
    }
  }

  void _prevStep() {
    if (_currentStep > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      setState(() => _currentStep--);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.redAccent),
    );
  }

  Future<void> _handlePublish() async {
    // Basic validations
    if (_tituloCtrl.text.isEmpty || _artistaCtrl.text.isEmpty) {
      _showError("El título y el artista son obligatorios.");
      return;
    }
    if (_tipoPublicacion != 'own_music' && _linkOficialCtrl.text.isEmpty) {
      _showError(
        "El link oficial de la canción es obligatorio para este tipo.",
      );
      return;
    }

    setState(() {
      _isUploading = true;
    });

    try {
      await FeedService().createPost(
        tipoContenido: _tipoPublicacion!,
        titulo: _tituloCtrl.text,
        artista: _tipoPublicacion == 'own_music'
            ? null
            : _artistaCtrl
                  .text, // If Type A, the current user is default artist unless overridden
        artistaOriginal: _tipoPublicacion != 'own_music'
            ? _artistaCtrl.text
            : null,
        generoMusical: _genre,
        idioma: _idiomaCtrl.text.isNotEmpty ? _idiomaCtrl.text : 'Spanish',
        descripcion: _miniReviewCtrl.text.isNotEmpty
            ? _miniReviewCtrl.text
            : '',
        plataformaOrigen: _tipoPublicacion != 'own_music'
            ? _plataformaOrigen
            : null,
        linkExterno: _tipoPublicacion != 'own_music'
            ? _linkOficialCtrl.text
            : null,
        isrc: _isrcCtrl.text.isNotEmpty ? _isrcCtrl.text : null,
        visibilidad: _visibilidad,
        fileBytes: _mainFile?.bytes,
        filePath: _mainFile?.path,
        fileName: _mainFile?.name,
        coverBytes: _coverFile != null ? await _coverFile!.readAsBytes() : null,
        coverPath: _coverFile?.path,
        coverName: _coverFile?.name,
        // Enforce strict rules on monetization/reuse if not owned
        permitirReutilizacion: _tipoPublicacion == 'own_music',
      );

      await Future.delayed(const Duration(milliseconds: 500));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Publicado en Descubrimiento!'),
            backgroundColor: Color(0xFF06D6A0),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      _showError("Error al publicar: $e");
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isUploading) return _buildUploadingScreen();

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      appBar: AppBar(
        title: const Text(
          "Descubrimiento",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: PageView(
        controller: _pageController,
        physics: const NeverScrollableScrollPhysics(),
        children: [
          _buildStep1Type(),
          _buildStep2Files(),
          _buildStep3Details(),
          _buildStep4Confirm(),
        ],
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Colors.white10)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          if (_currentStep > 0)
            TextButton(
              onPressed: _prevStep,
              child: Text(
                "ATRÁS",
                style: GoogleFonts.outfit(
                  color: Colors.white70,
                  fontWeight: FontWeight.bold,
                ),
              ),
            )
          else
            const SizedBox.shrink(),
          ElevatedButton(
            onPressed: _currentStep == 3 ? _handlePublish : _nextStep,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF06D6A0),
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              _currentStep == 3 ? "COMPARTIR" : "SIGUIENTE",
              style: GoogleFonts.outfit(
                fontWeight: FontWeight.w900,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStep1Type() {
    return _StepWrapper(
      title: "¿Qué querés compartir?",
      subtitle: "Seleccioná el tipo de contenido.",
      child: Column(
        children: [
          _TypeCard(
            title: "Música Propia",
            desc: "Audio original, video musical o solo audio + portada.",
            icon: Icons.music_note,
            isSelected: _tipoPublicacion == 'own_music',
            onTap: () => setState(() => _tipoPublicacion = 'own_music'),
          ),
          _TypeCard(
            title: "Video usando música existente",
            desc:
                "Subí tu video (lip-sync, baile, cover) con la música de un tercero. Créditos automáticos.",
            icon: Icons.video_collection_rounded,
            isSelected: _tipoPublicacion == 'video_terceros',
            onTap: () => setState(() => _tipoPublicacion = 'video_terceros'),
          ),
          _TypeCard(
            title: "Recomendación Musical",
            desc:
                "Recomendá una joya oculta de Spotify, Youtube o Soundcloud. Escribí una mini review.",
            icon: Icons.recommend_rounded,
            isSelected: _tipoPublicacion == 'recomendacion',
            onTap: () => setState(() => _tipoPublicacion = 'recomendacion'),
          ),
        ],
      ),
    );
  }

  Widget _buildStep2Files() {
    bool isTipoA = _tipoPublicacion == 'own_music';
    bool isTipoB = _tipoPublicacion == 'video_terceros';
    bool isTipoC = _tipoPublicacion == 'recomendacion';

    return _StepWrapper(
      title: "Archivos Multimedia",
      subtitle: isTipoA
          ? "Subí audio WAV/FLAC o Video MP4"
          : (isTipoB
                ? "Subí tu archivo de video MP4"
                : "Video corto o solo texto."),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isTipoA || isTipoC) ...[
            GestureDetector(
              onTap: () async {
                final picker = ImagePicker();
                final picked = await picker.pickImage(
                  source: ImageSource.gallery,
                );
                if (picked != null) setState(() => _coverFile = picked);
              },
              child: Container(
                height: 180,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Colors.white24,
                    style: BorderStyle.solid,
                  ),
                  image: _coverFile != null
                      ? DecorationImage(
                          image: kIsWeb
                              ? NetworkImage(_coverFile!.path) as ImageProvider
                              : FileImage(File(_coverFile!.path)),
                          fit: BoxFit.cover,
                        )
                      : null,
                ),
                child: _coverFile == null
                    ? Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.add_photo_alternate_rounded,
                            size: 48,
                            color: Colors.white38,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            isTipoC ? "Portada (Opcional)" : "Portada de Track",
                            style: GoogleFonts.inter(color: Colors.white54),
                          ),
                        ],
                      )
                    : null,
              ),
            ),
            const SizedBox(height: 24),
          ],

          if (!isTipoC || (isTipoC && _mainFile != null)) ...[
            GestureDetector(
              onTap: () async {
                FilePickerResult? result = await FilePicker.platform.pickFiles(
                  type: FileType.custom,
                  allowedExtensions: isTipoA
                      ? ['wav', 'aiff', 'flac', 'mp4', 'mov']
                      : ['mp4', 'mov'],
                  withData: kIsWeb,
                );
                if (result != null)
                  setState(() => _mainFile = result.files.single);
              },
              child: Container(
                height: 120,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: const Color(0xFF6C63FF).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: const Color(0xFF6C63FF).withOpacity(0.4),
                  ),
                ),
                child: _mainFile == null
                    ? Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            isTipoA
                                ? Icons.audio_file_rounded
                                : Icons.video_library_rounded,
                            size: 36,
                            color: const Color(0xFF6C63FF),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            isTipoA
                                ? "Tocar para adjuntar Audio/Video"
                                : "Tocar para adjuntar Video (Obligatorio)",
                            style: GoogleFonts.inter(
                              color: Colors.white70,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.check_circle_rounded,
                            size: 36,
                            color: Color(0xFF06D6A0),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _mainFile!.name,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ],

          if (isTipoC && _mainFile == null)
            TextButton(
              onPressed: () async {
                FilePickerResult? result = await FilePicker.platform.pickFiles(
                  type: FileType.custom,
                  allowedExtensions: ['mp4', 'mov'],
                  withData: kIsWeb,
                );
                if (result != null)
                  setState(() => _mainFile = result.files.single);
              },
              child: const Text(
                "+ Agregar video reseña (Opcional)",
                style: TextStyle(color: Color(0xFF06D6A0)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStep3Details() {
    bool isTipoA = _tipoPublicacion == 'own_music';
    bool isTipoC = _tipoPublicacion == 'recomendacion';

    return _StepWrapper(
      title: "Detalles del Post",
      subtitle: isTipoA
          ? "Configurá los datos de tu track original."
          : "Créditos claros evitan problemas de copyright.",
      child: Column(
        children: [
          _CustomField(
            controller: _tituloCtrl,
            label: "TÍTULO DE LA CANCIÓN *",
            hint: "Ej: Midnight Thoughts",
          ),
          const SizedBox(height: 16),
          _CustomField(
            controller: _artistaCtrl,
            label: isTipoA ? "ARTISTA PROPIO *" : "ARTISTA ORIGINAL *",
            hint: "Ej: The Weeknd",
          ),
          const SizedBox(height: 16),
          if (!isTipoC)
            _CustomField(
              controller: TextEditingController(text: _genre),
              label: "GÉNERO",
              hint: "Pop, Trap...",
              onChanged: (v) => _genre = v,
            ),
          const SizedBox(height: 16),

          if (!isTipoA) ...[
            const Text(
              "FUENTE OFICIAL",
              style: TextStyle(
                color: Colors.white38,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.04),
                borderRadius: BorderRadius.circular(12),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _plataformaOrigen,
                  dropdownColor: Colors.grey.shade900,
                  style: const TextStyle(color: Colors.white),
                  items: _platforms
                      .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                      .toList(),
                  onChanged: (val) => setState(() => _plataformaOrigen = val!),
                ),
              ),
            ),
            const SizedBox(height: 16),
            _CustomField(
              controller: _linkOficialCtrl,
              label: "LINK OFICIAL *",
              hint: "https://spotify...",
            ),
            const SizedBox(height: 16),
          ],

          if (isTipoC)
            _CustomField(
              controller: _miniReviewCtrl,
              label: "MINI REVIEW *",
              hint: "Por qué recomendás esta canción...",
              maxLines: 4,
            ),

          if (isTipoA) ...[
            _CustomField(
              controller: _isrcCtrl,
              label: "ISRC (Opcional)",
              hint: "Código internacional",
            ),
            const SizedBox(height: 16),
            _CustomField(
              controller: _creditosCtrl,
              label: "CRÉDITOS (Opcional)",
              hint: "Ej: Prod by XX, Mix by YY",
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStep4Confirm() {
    return _StepWrapper(
      title: "Resumen y Visibilidad",
      subtitle: "Quién verá tu post.",
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.public, color: Color(0xFF06D6A0)),
            title: const Text("Público", style: TextStyle(color: Colors.white)),
            trailing: Radio<String>(
              value: 'public',
              groupValue: _visibilidad,
              activeColor: const Color(0xFF06D6A0),
              onChanged: (v) => setState(() => _visibilidad = v!),
            ),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.group, color: Color(0xFF06D6A0)),
            title: const Text(
              "Solo Conexiones",
              style: TextStyle(color: Colors.white),
            ),
            trailing: Radio<String>(
              value: 'connections',
              groupValue: _visibilidad,
              activeColor: const Color(0xFF06D6A0),
              onChanged: (v) => setState(() => _visibilidad = v!),
            ),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.lock, color: Color(0xFF06D6A0)),
            title: const Text("Privado", style: TextStyle(color: Colors.white)),
            trailing: Radio<String>(
              value: 'private',
              groupValue: _visibilidad,
              activeColor: const Color(0xFF06D6A0),
              onChanged: (v) => setState(() => _visibilidad = v!),
            ),
          ),
          const SizedBox(height: 24),
          if (_tipoPublicacion != 'own_music')
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.amber.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.amber.withOpacity(0.4)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: Colors.amber, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      "Este post utilizará metadatos de terceros. No podrás monetizarlo directamente, pero ayudará a tu descubrimiento orgánico.",
                      style: GoogleFonts.inter(
                        color: Colors.amber,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildUploadingScreen() {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(color: Color(0xFF06D6A0)),
            const SizedBox(height: 24),
            Text(
              "Procesando...",
              style: GoogleFonts.outfit(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StepWrapper extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget child;

  const _StepWrapper({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.w900,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: GoogleFonts.inter(color: Colors.white54, fontSize: 14),
          ),
          const SizedBox(height: 32),
          child,
        ],
      ),
    );
  }
}

class _TypeCard extends StatelessWidget {
  final String title;
  final String desc;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _TypeCard({
    required this.title,
    required this.desc,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF06D6A0).withOpacity(0.1)
              : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? const Color(0xFF06D6A0) : Colors.white10,
            width: 2,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFF06D6A0) : Colors.white12,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                color: isSelected ? Colors.black : Colors.white,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    desc,
                    style: GoogleFonts.inter(
                      color: Colors.white54,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CustomField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final int maxLines;
  final Function(String)? onChanged;

  const _CustomField({
    required this.controller,
    required this.label,
    required this.hint,
    this.maxLines = 1,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            color: Colors.white38,
            fontSize: 10,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          maxLines: maxLines,
          onChanged: onChanged,
          style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: Colors.white24),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 16,
            ),
            filled: true,
            fillColor: Colors.white.withOpacity(0.04),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF06D6A0)),
            ),
          ),
        ),
      ],
    );
  }
}
