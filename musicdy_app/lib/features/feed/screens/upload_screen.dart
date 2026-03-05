import 'dart:io' show File;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import '../services/feed_service.dart';

class UploadScreen extends StatefulWidget {
  const UploadScreen({super.key});

  @override
  State<UploadScreen> createState() => _UploadScreenState();
}

class _UploadScreenState extends State<UploadScreen> {
  final PageController _pageController = PageController();
  int _currentStep = 0;
  bool _isUploading = false;
  double _uploadProgress = 0.0;

  // --- WIZARD STATE ---
  String? _tipoContenido; // 'beat', 'own_music', 'video'

  // Fase 2: Identidad Visual
  XFile? _coverFile;
  PlatformFile? _visualLoopFile;
  final _titleCtrl = TextEditingController();
  final _subtitleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  // Fase 3: Archivo Principal
  PlatformFile? _mainFile;

  // Fase 4: Datos Musicales
  final _bpmCtrl = TextEditingController();
  final _keyCtrl = TextEditingController();
  String _genre = 'Trap';
  String _subgenre = '';
  final _tagsCtrl = TextEditingController();
  final _inspiredByCtrl = TextEditingController();
  final _idiomaCtrl = TextEditingController();
  final _isrcCtrl = TextEditingController();

  // Moods (max 3 for example)
  final Set<String> _selectedMoods = {};

  // Fase 5: Monetización
  bool _allowMonetization = false;
  final _basePriceCtrl = TextEditingController();
  bool _allowOffers = true;
  bool _incluirStems = false;
  bool _incluirTrackouts = false;
  bool _freeDownload = false;

  // Fase 6: Visibilidad y Control
  String _visibilidad = 'public'; // public, connections, private
  bool _permitirComents = true;
  bool _permitirRemix = true;
  bool _permitirColab = true;

  @override
  void dispose() {
    _pageController.dispose();
    _titleCtrl.dispose();
    _subtitleCtrl.dispose();
    _descCtrl.dispose();
    _bpmCtrl.dispose();
    _keyCtrl.dispose();
    _tagsCtrl.dispose();
    _inspiredByCtrl.dispose();
    _idiomaCtrl.dispose();
    _isrcCtrl.dispose();
    _basePriceCtrl.dispose();
    super.dispose();
  }

  void _nextStep() {
    // Validate step
    if (_currentStep == 0 && _tipoContenido == null) {
      _showError("Seleccioná qué querés subir.");
      return;
    }
    if (_currentStep == 1 && (_titleCtrl.text.isEmpty || _coverFile == null)) {
      _showError("Título y Portada son obligatorios.");
      return;
    }
    if (_currentStep == 2 && _mainFile == null) {
      _showError("Debes subir el archivo principal.");
      return;
    }

    if (_currentStep < 6) {
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
    setState(() {
      _isUploading = true;
      _uploadProgress = 0.1;
    });

    try {
      // Setup maps / JSON
      List<String> tags = _tagsCtrl.text
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList();
      int? bpmVal = int.tryParse(_bpmCtrl.text);

      await FeedService().createPost(
        tipoContenido: _tipoContenido!,
        titulo: _titleCtrl.text,
        subtitulo: _subtitleCtrl.text.isNotEmpty ? _subtitleCtrl.text : null,
        descripcion: _descCtrl.text,
        generoMusical: _genre,
        subgenero: _subgenre.isNotEmpty ? _subgenre : null,
        tags: tags.isNotEmpty ? tags : null,
        mood: _selectedMoods.toList(),
        inspiradoEn: _inspiredByCtrl.text.isNotEmpty
            ? _inspiredByCtrl.text
            : null,
        idioma: _idiomaCtrl.text.isNotEmpty ? _idiomaCtrl.text : null,
        isrc: _isrcCtrl.text.isNotEmpty ? _isrcCtrl.text : null,
        bpm: bpmVal,
        escala: _keyCtrl.text.isNotEmpty ? _keyCtrl.text : null,
        visibilidad: _visibilidad,
        permitirComentarios: _permitirComents,
        permitirRemix: _permitirRemix,
        permitirColaboracion: _permitirColab,
        permitirDescargaGratuita: _freeDownload,
        incluirStems: _incluirStems,
        incluirTrackouts: _incluirTrackouts,
        freeUse: _freeDownload, // Simplified mapping
        fileBytes: _mainFile!.bytes,
        filePath: _mainFile!.path,
        fileName: _mainFile!.name,
        coverBytes: _coverFile != null ? await _coverFile!.readAsBytes() : null,
        coverPath: _coverFile?.path,
        coverName: _coverFile?.name,
        visualLoopBytes: _visualLoopFile?.bytes,
        visualLoopPath: _visualLoopFile?.path,
        visualLoopName: _visualLoopFile?.name,
      );

      setState(() => _uploadProgress = 1.0);
      await Future.delayed(const Duration(milliseconds: 500));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Lanzamiento publicado con éxito!'),
            backgroundColor: Color(0xFF06D6A0),
          ),
        );
        Navigator.pop(context); // Go back or reset
      }
    } catch (e) {
      _showError("Error al publicar: $e");
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  // --- WIDGET BUILDERS ---

  @override
  Widget build(BuildContext context) {
    if (_isUploading) return _buildUploadingScreen();

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: (_currentStep + 1) / 7.0,
                  backgroundColor: Colors.white12,
                  color: const Color(0xFF06D6A0),
                  minHeight: 6,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Text(
              "PASO ${_currentStep + 1} DE 7",
              style: GoogleFonts.inter(
                fontSize: 10,
                color: Colors.white54,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
      body: PageView(
        controller: _pageController,
        physics: const NeverScrollableScrollPhysics(),
        children: [
          _buildStep1Type(),
          _buildStep2Identity(),
          _buildStep3File(),
          _buildStep4Data(),
          _buildStep5Monetization(),
          _buildStep6Visibility(),
          _buildStep7Confirm(),
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
            onPressed: _currentStep == 6 ? _handlePublish : _nextStep,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF06D6A0),
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              _currentStep == 6 ? "PUBLICAR AHORA" : "SIGUIENTE",
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

  // ================== STEPS ==================

  // STEP 1
  Widget _buildStep1Type() {
    return _StepWrapper(
      title: "¿Qué querés lanzar hoy?",
      subtitle: "Elegí el tipo de contenido para tu nuevo release.",
      child: Column(
        children: [
          _TypeCard(
            title: "Beat Instrumental",
            desc:
                "Ideal para productores. Vende licencias o alquilá tus instrumentales.",
            icon: Icons.album_rounded,
            isSelected: _tipoContenido == 'beat',
            onTap: () => setState(() => _tipoContenido = 'beat'),
          ),
          _TypeCard(
            title: "Canción / Demo",
            desc:
                "Tu tema terminado o maqueta para colaborar con otros músicos.",
            icon: Icons.mic_rounded,
            isSelected: _tipoContenido == 'own_music',
            onTap: () => setState(() => _tipoContenido = 'own_music'),
          ),
          _TypeCard(
            title: "Video / Short",
            desc:
                "Contenido visual directo al feed para conectar con la comunidad.",
            icon: Icons.videocam_rounded,
            isSelected: _tipoContenido == 'video',
            onTap: () => setState(() => _tipoContenido = 'video'),
          ),
        ],
      ),
    );
  }

  // STEP 2
  Widget _buildStep2Identity() {
    return _StepWrapper(
      title: "Identidad Visual",
      subtitle: "Dale una cara a tu arte. La portada es vital.",
      child: Column(
        children: [
          GestureDetector(
            onTap: () async {
              final picker = ImagePicker();
              final picked = await picker.pickImage(
                source: ImageSource.gallery,
              );
              if (picked != null) setState(() => _coverFile = picked);
            },
            child: Container(
              height: 200,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(20),
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
                          "Subir Portada Principal*",
                          style: GoogleFonts.inter(color: Colors.white54),
                        ),
                      ],
                    )
                  : null,
            ),
          ),
          const SizedBox(height: 16),
          // Visual Loop Picker
          if (_tipoContenido != 'video')
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF6C63FF).withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.video_library_rounded,
                  color: Color(0xFF6C63FF),
                  size: 20,
                ),
              ),
              title: const Text(
                "Visual Loop (Opcional)",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
              subtitle: Text(
                _visualLoopFile != null
                    ? _visualLoopFile!.name
                    : "Video corto para acompañar el audio",
                style: const TextStyle(color: Colors.white54, fontSize: 11),
              ),
              trailing: TextButton(
                onPressed: () async {
                  FilePickerResult? result = await FilePicker.platform
                      .pickFiles(type: FileType.video, withData: kIsWeb);
                  if (result != null)
                    setState(() => _visualLoopFile = result.files.single);
                },
                child: Text(
                  _visualLoopFile != null ? "CAMBIAR" : "AÑADIR",
                  style: const TextStyle(color: Color(0xFF06D6A0)),
                ),
              ),
            ),

          const SizedBox(height: 24),
          _CustomField(
            controller: _titleCtrl,
            label: "TÍTULO DEL PROYECTO *",
            hint: "Ej: Midnight Thoughts",
          ),
          const SizedBox(height: 16),
          _CustomField(
            controller: _subtitleCtrl,
            label: "SUBTÍTULO (Opcional)",
            hint: "Ej: Feat. Artist X",
          ),
          const SizedBox(height: 16),
          _CustomField(
            controller: _descCtrl,
            label: "DESCRIPCIÓN (Opcional)",
            hint: "Hablá sobre la inspiración...",
            maxLines: 4,
          ),
        ],
      ),
    );
  }

  // STEP 3
  Widget _buildStep3File() {
    bool isVideo = _tipoContenido == 'video';
    return _StepWrapper(
      title: isVideo ? "Subir Video" : "Archivo Maestro",
      subtitle: isVideo
          ? "Formatos MP4 o MOV."
          : "Solo aceptamos máxima calidad: WAV, AIFF o FLAC.",
      child: Column(
        children: [
          GestureDetector(
            onTap: () async {
              FilePickerResult? result = await FilePicker.platform.pickFiles(
                type: FileType.custom,
                allowedExtensions: isVideo
                    ? ['mp4', 'mov']
                    : ['wav', 'aiff', 'aif', 'flac'],
                withData: kIsWeb,
              );
              if (result != null)
                setState(() => _mainFile = result.files.single);
            },
            child: Container(
              height: 160,
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFF6C63FF).withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: const Color(0xFF6C63FF).withOpacity(0.4),
                ),
              ),
              child: _mainFile == null
                  ? Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          isVideo
                              ? Icons.video_library_rounded
                              : Icons.audio_file_rounded,
                          size: 48,
                          color: const Color(0xFF6C63FF),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          "Tocar para seleccionar archivo original",
                          style: GoogleFonts.inter(color: Colors.white70),
                        ),
                      ],
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.check_circle_rounded,
                          size: 40,
                          color: Color(0xFF06D6A0),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _mainFile!.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 24),
          if (!isVideo) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.info_outline,
                    color: Colors.white54,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      "Guardaremos tu archivo original de forma segura y generaremos automáticamente las versiones comprimidas para el streaming.",
                      style: GoogleFonts.inter(
                        color: Colors.white54,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // STEP 4
  Widget _buildStep4Data() {
    bool isBeat = _tipoContenido == 'beat';

    return _StepWrapper(
      title: "Data Musical",
      subtitle:
          "Esto ayuda al algoritmo a clasificar y recomendar tu proyecto.",
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _CustomField(
                  controller: _bpmCtrl,
                  label: "BPM",
                  hint: "Ej: 140",
                  isNumber: true,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _CustomField(
                  controller: _keyCtrl,
                  label: "TONALIDAD",
                  hint: "Ej: C Min",
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Genre simplified for now text input or a dropdown.
          _CustomField(
            controller: TextEditingController(text: _genre),
            label: "GÉNERO",
            hint: "Trap, Pop...",
            onChanged: (v) => _genre = v,
          ),
          const SizedBox(height: 16),
          if (isBeat)
            _CustomField(
              controller: _inspiredByCtrl,
              label: "INSPIRADO EN (Type Beat)",
              hint: "Ej: Drake, Travis Scott",
            ),
          if (!isBeat)
            _CustomField(
              controller: _idiomaCtrl,
              label: "IDIOMA",
              hint: "Ej: Español",
            ),
          const SizedBox(height: 16),
          _CustomField(
            controller: _tagsCtrl,
            label: "TAGS (Separados por coma)",
            hint: "dark, hard, piano",
          ),
        ],
      ),
    );
  }

  // STEP 5
  Widget _buildStep5Monetization() {
    bool isBeat = _tipoContenido == 'beat';
    if (!isBeat && !_allowMonetization) {
      return _StepWrapper(
        title: "Monetización",
        subtitle: "Ajustes de venta y distribución.",
        child: Column(
          children: [
            ListTile(
              title: const Text(
                "Activar Monetización",
                style: TextStyle(color: Colors.white),
              ),
              subtitle: const Text(
                "Vender este contenido o recibir ofertas",
                style: TextStyle(color: Colors.white54),
              ),
              trailing: Switch(
                value: _allowMonetization,
                activeColor: const Color(0xFF06D6A0),
                onChanged: (v) => setState(() => _allowMonetization = v),
              ),
            ),
            const SizedBox(height: 40),
            if (!_allowMonetization)
              Text(
                "Si sos artista, podés activar esto para recibir ofertas. De lo contrario, saltá este paso.",
                style: GoogleFonts.inter(color: Colors.white54, fontSize: 12),
                textAlign: TextAlign.center,
              ),
          ],
        ),
      );
    }

    return _StepWrapper(
      title: "Monetización Profesional",
      subtitle: "Configurá tus precios base y licencias.",
      child: Column(
        children: [
          _CustomField(
            controller: _basePriceCtrl,
            label: "PRECIO BASE SUGERIDO (USD)",
            hint: "Ej: 29.99",
            isNumber: true,
          ),
          const SizedBox(height: 16),
          SwitchListTile(
            title: const Text(
              "Permitir Contraofertas",
              style: TextStyle(color: Colors.white),
            ),
            subtitle: const Text(
              "Usuarios podrán ofrecerte precios negociados.",
              style: TextStyle(color: Colors.white38, fontSize: 11),
            ),
            value: _allowOffers,
            activeColor: const Color(0xFF06D6A0),
            onChanged: (v) => setState(() => _allowOffers = v),
            contentPadding: EdgeInsets.zero,
          ),
          SwitchListTile(
            title: const Text(
              "Permitir Descarga Gratuita",
              style: TextStyle(color: Colors.white),
            ),
            subtitle: const Text(
              "A cambio de follows / email.",
              style: TextStyle(color: Colors.white38, fontSize: 11),
            ),
            value: _freeDownload,
            activeColor: const Color(0xFF06D6A0),
            onChanged: (v) => setState(() => _freeDownload = v),
            contentPadding: EdgeInsets.zero,
          ),
          SwitchListTile(
            title: const Text(
              "Incluir Stems / Trackouts",
              style: TextStyle(color: Colors.white),
            ),
            value: _incluirStems,
            activeColor: const Color(0xFF06D6A0),
            onChanged: (v) => setState(() => _incluirStems = v),
            contentPadding: EdgeInsets.zero,
          ),
        ],
      ),
    );
  }

  // STEP 6
  Widget _buildStep6Visibility() {
    return _StepWrapper(
      title: "Control y Privacidad",
      subtitle: "Quién ve tu lanzamiento y qué pueden hacer con él.",
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "VISIBILIDAD",
            style: GoogleFonts.inter(
              color: Colors.white38,
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _ChipOption(
                label: "Público",
                isSelected: _visibilidad == 'public',
                onTap: () => setState(() => _visibilidad = 'public'),
              ),
              const SizedBox(width: 8),
              _ChipOption(
                label: "Contactos",
                isSelected: _visibilidad == 'connections',
                onTap: () => setState(() => _visibilidad = 'connections'),
              ),
              const SizedBox(width: 8),
              _ChipOption(
                label: "Privado",
                isSelected: _visibilidad == 'private',
                onTap: () => setState(() => _visibilidad = 'private'),
              ),
            ],
          ),
          const SizedBox(height: 32),
          Text(
            "PERMISOS DE LA COMUNIDAD",
            style: GoogleFonts.inter(
              color: Colors.white38,
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          CheckboxListTile(
            title: const Text(
              "Permitir Comentarios",
              style: TextStyle(color: Colors.white),
            ),
            value: _permitirComents,
            activeColor: const Color(0xFF06D6A0),
            onChanged: (v) => setState(() => _permitirComents = v ?? true),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
          ),
          CheckboxListTile(
            title: const Text(
              "Abierto a Colaboraciones",
              style: TextStyle(color: Colors.white),
            ),
            value: _permitirColab,
            activeColor: const Color(0xFF06D6A0),
            onChanged: (v) => setState(() => _permitirColab = v ?? true),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
          ),
          CheckboxListTile(
            title: const Text(
              "Permitir usar en Remixes",
              style: TextStyle(color: Colors.white),
            ),
            value: _permitirRemix,
            activeColor: const Color(0xFF06D6A0),
            onChanged: (v) => setState(() => _permitirRemix = v ?? true),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
          ),
        ],
      ),
    );
  }

  // STEP 7
  Widget _buildStep7Confirm() {
    return _StepWrapper(
      title: "Revisión Final",
      subtitle: "Asegurate de que tu lanzamiento esté impecable.",
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  image: _coverFile != null
                      ? DecorationImage(
                          image: kIsWeb
                              ? NetworkImage(_coverFile!.path) as ImageProvider
                              : FileImage(File(_coverFile!.path)),
                          fit: BoxFit.cover,
                        )
                      : null,
                  color: Colors.grey.shade900,
                ),
                child: _coverFile == null
                    ? const Icon(Icons.music_note, color: Colors.white38)
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _titleCtrl.text.isEmpty ? "Sin Titulo" : _titleCtrl.text,
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (_subtitleCtrl.text.isNotEmpty)
                      Text(
                        _subtitleCtrl.text,
                        style: GoogleFonts.inter(
                          color: Colors.white70,
                          fontSize: 14,
                        ),
                      ),
                    const SizedBox(height: 4),
                    Text(
                      "Tipo: ${_tipoContenido?.toUpperCase()}",
                      style: GoogleFonts.inter(
                        color: const Color(0xFF06D6A0),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _SummaryRow(label: "Visibilidad", value: _visibilidad.toUpperCase()),
          _SummaryRow(
            label: "Archivo Adjunto",
            value: _mainFile != null
                ? "✓ Listo para procesamiento backend"
                : "X Faltante",
          ),
          _SummaryRow(
            label: "Monetización",
            value: (_tipoContenido == 'beat' || _allowMonetization)
                ? "Activada"
                : "Desactivada",
          ),
        ],
      ),
    );
  }

  Widget _buildUploadingScreen() {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                width: 80,
                height: 80,
                child: CircularProgressIndicator(
                  color: const Color(0xFF06D6A0),
                  strokeWidth: 8,
                  value: _uploadProgress == 0 ? null : _uploadProgress,
                ),
              ),
              const SizedBox(height: 32),
              Text(
                "Subiendo al main server...",
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                "Procesando audio y encriptando en background. No cierres la app.",
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: Colors.white54, fontSize: 13),
              ),
            ],
          ),
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
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 32,
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
                      fontSize: 18,
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
  final bool isNumber;
  final Function(String)? onChanged;

  const _CustomField({
    required this.controller,
    required this.label,
    required this.hint,
    this.maxLines = 1,
    this.isNumber = false,
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
          keyboardType: isNumber
              ? const TextInputType.numberWithOptions(decimal: true)
              : TextInputType.text,
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

class _ChipOption extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _ChipOption({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF6C63FF)
              : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            color: isSelected ? Colors.white : Colors.white70,
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  const _SummaryRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(color: Colors.white54, fontSize: 14),
          ),
          Text(
            value,
            style: GoogleFonts.inter(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
