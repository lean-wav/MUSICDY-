import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/post_model.dart';
import '../services/feed_service.dart';

final _kLicenseTypes = {
  'lease': {
    'label': 'Lease',
    'icon': Icons.lock_open_rounded,
    'color': const Color(0xFF6C63FF),
    'desc': 'No exclusiva. Múltiples compradores.',
  },
  'premium': {
    'label': 'Premium Lease',
    'icon': Icons.star_rounded,
    'color': const Color(0xFFFFBF00),
    'desc': 'Mayor calidad. PDF de contrato incluido.',
  },
  'exclusive': {
    'label': 'Exclusiva',
    'icon': Icons.workspace_premium_rounded,
    'color': const Color(0xFFFF4D6D),
    'desc': 'Solo un comprador. Plenos derechos.',
  },
  'unlimited': {
    'label': 'Ilimitada',
    'icon': Icons.all_inclusive_rounded,
    'color': const Color(0xFF06D6A0),
    'desc': 'Sin restricciones de uso.',
  },
};

class MonetizationSheet extends StatefulWidget {
  final Post post;
  final bool isOwner;

  const MonetizationSheet({
    super.key,
    required this.post,
    required this.isOwner,
  });

  @override
  State<MonetizationSheet> createState() => _MonetizationSheetState();
}

class _MonetizationSheetState extends State<MonetizationSheet>
    with SingleTickerProviderStateMixin {
  final FeedService _service = FeedService();
  late TabController _tabController;
  late bool _allowOffers;
  late Map<String, dynamic> _licencias;
  final Map<String, TextEditingController> _priceControllers = {};
  bool _isSaving = false;

  // Offer form
  final _offerAmountController = TextEditingController();
  final _offerMessageController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: widget.isOwner ? 2 : 1, vsync: this);
    _allowOffers = widget.post.allowOffers;
    _licencias = widget.post.licencias != null
        ? Map<String, dynamic>.from(widget.post.licencias!)
        : {
            'lease': {'precio': 29.99, 'activo': true},
            'premium': {'precio': 49.99, 'activo': true},
            'exclusive': {'precio': 299.99, 'activo': false},
            'unlimited': {'precio': 199.99, 'activo': false},
          };

    for (final key in _kLicenseTypes.keys) {
      final precio = _licencias[key]?['precio'] ?? 0.0;
      _priceControllers[key] = TextEditingController(text: precio.toString());
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _offerAmountController.dispose();
    _offerMessageController.dispose();
    for (final c in _priceControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      // Build updated licencias from controllers
      final updatedLicencias = <String, dynamic>{};
      for (final key in _kLicenseTypes.keys) {
        final precio = double.tryParse(_priceControllers[key]!.text) ?? 0.0;
        updatedLicencias[key] = {
          'precio': precio,
          'activo': _licencias[key]?['activo'] ?? false,
        };
      }
      await _service.updateMonetization(
        widget.post.id,
        allowOffers: _allowOffers,
        licencias: updatedLicencias,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Monetización actualizada"),
            backgroundColor: Color(0xFF06D6A0),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text("Error al guardar")));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _sendOffer() async {
    final amount = double.tryParse(_offerAmountController.text);
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("Ingresá un monto válido")));
      return;
    }
    try {
      await _service.makeOffer(
        widget.post.id,
        amount,
        _offerMessageController.text,
      );
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              "Oferta de \$$amount enviada a ${widget.post.artista}",
            ),
            backgroundColor: const Color(0xFF06D6A0),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Error al enviar oferta"),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (_, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Color(0xFF111111),
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              // Handle
              Center(
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Header
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 8,
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.attach_money_rounded,
                      color: Color(0xFF06D6A0),
                      size: 28,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "MONETIZACIÓN",
                            style: GoogleFonts.outfit(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 18,
                              letterSpacing: 1.2,
                            ),
                          ),
                          Text(
                            widget.post.titulo,
                            style: GoogleFonts.inter(
                              color: Colors.white38,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Tabs
              if (widget.isOwner)
                TabBar(
                  controller: _tabController,
                  indicatorColor: const Color(0xFF06D6A0),
                  indicatorWeight: 3,
                  labelStyle: GoogleFonts.inter(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                  unselectedLabelColor: Colors.white38,
                  tabs: const [
                    Tab(text: "GESTIONAR LICENCIAS"),
                    Tab(text: "CONFIGURACIÓN"),
                  ],
                ),

              // Content
              Expanded(
                child: widget.isOwner
                    ? TabBarView(
                        controller: _tabController,
                        children: [
                          _buildLicensesManager(scrollController),
                          _buildSettings(scrollController),
                        ],
                      )
                    : _buildBuyerView(scrollController),
              ),
            ],
          ),
        );
      },
    );
  }

  // --- OWNER VIEWS ---

  Widget _buildLicensesManager(ScrollController scrollController) {
    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.all(24),
      children: [
        ..._kLicenseTypes.entries.map((entry) {
          final key = entry.key;
          final meta = entry.value;
          final isActive = _licencias[key]?['activo'] == true;

          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: isActive
                  ? (meta['color'] as Color).withOpacity(0.08)
                  : Colors.white.withOpacity(0.02),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isActive
                    ? (meta['color'] as Color).withOpacity(0.3)
                    : Colors.white10,
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: (meta['color'] as Color).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          meta['icon'] as IconData,
                          color: meta['color'] as Color,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              meta['label'] as String,
                              style: GoogleFonts.outfit(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                            Text(
                              meta['desc'] as String,
                              style: GoogleFonts.inter(
                                color: Colors.white38,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: isActive,
                        activeColor: meta['color'] as Color,
                        onChanged: (val) {
                          setState(() {
                            _licencias[key] = {
                              ...?(_licencias[key] as Map<String, dynamic>?),
                              'activo': val,
                            };
                          });
                        },
                      ),
                    ],
                  ),
                  if (isActive) ...[
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Text(
                          "PRECIO (USD)",
                          style: GoogleFonts.inter(
                            color: Colors.white38,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Spacer(),
                        SizedBox(
                          width: 120,
                          child: TextField(
                            controller: _priceControllers[key],
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            textAlign: TextAlign.center,
                            style: GoogleFonts.outfit(
                              color: meta['color'] as Color,
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                            decoration: InputDecoration(
                              prefixText: "\$ ",
                              prefixStyle: TextStyle(
                                color: (meta['color'] as Color).withOpacity(
                                  0.6,
                                ),
                              ),
                              enabledBorder: UnderlineInputBorder(
                                borderSide: BorderSide(
                                  color: (meta['color'] as Color).withOpacity(
                                    0.4,
                                  ),
                                ),
                              ),
                              focusedBorder: UnderlineInputBorder(
                                borderSide: BorderSide(
                                  color: meta['color'] as Color,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          );
        }),

        const SizedBox(height: 16),

        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _isSaving ? null : _save,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF06D6A0),
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: _isSaving
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(
                    "GUARDAR CAMBIOS",
                    style: GoogleFonts.outfit(
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildSettings(ScrollController scrollController) {
    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.all(24),
      children: [
        // Allow Offers toggle
        _buildSettingTile(
          icon: Icons.gavel_rounded,
          color: const Color(0xFFFFBF00),
          title: "Permitir Ofertas",
          subtitle:
              "Compradores podrán enviarte una oferta personalizada por este beat",
          trailing: Switch(
            value: _allowOffers,
            activeColor: const Color(0xFFFFBF00),
            onChanged: (val) => setState(() => _allowOffers = val),
          ),
        ),
        const SizedBox(height: 16),
        _buildSettingTile(
          icon: Icons.description_rounded,
          color: const Color(0xFF6C63FF),
          title: "Contrato PDF",
          subtitle: widget.post.contractUrl != null
              ? "Contrato subido ✓"
              : "Subí tu contrato personalizado (PDF)",
          trailing: TextButton(
            onPressed: () {
              // En producción: usar file_picker
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    "Función de carga de PDF disponible con file_picker",
                  ),
                ),
              );
            },
            child: Text(
              widget.post.contractUrl != null ? "REEMPLAZAR" : "SUBIR PDF",
              style: const TextStyle(color: Color(0xFF6C63FF), fontSize: 11),
            ),
          ),
        ),
        const SizedBox(height: 32),

        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _isSaving ? null : _save,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF06D6A0),
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: Text(
              "GUARDAR CONFIGURACIÓN",
              style: GoogleFonts.outfit(
                fontWeight: FontWeight.w900,
                fontSize: 14,
              ),
            ),
          ),
        ),
      ],
    );
  }

  // --- BUYER VIEW ---

  Widget _buildBuyerView(ScrollController scrollController) {
    final activeLicenses = _licencias.entries
        .where((e) => (e.value as Map<String, dynamic>?)?['activo'] == true)
        .toList();

    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.all(24),
      children: [
        // Licenses available
        if (activeLicenses.isNotEmpty) ...[
          Text(
            "LICENCIAS DISPONIBLES",
            style: GoogleFonts.inter(
              color: Colors.white38,
              fontWeight: FontWeight.bold,
              fontSize: 11,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 16),
          ...activeLicenses.map((entry) {
            final key = entry.key;
            final meta = _kLicenseTypes[key]!;
            final precio = (entry.value as Map<String, dynamic>)['precio'];
            return _buildBuyLicenseCard(key, meta, precio);
          }),
          const SizedBox(height: 32),
        ],

        // Make an offer section
        if (widget.post.allowOffers) ...[
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFFFFBF00).withOpacity(0.07),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xFFFFBF00).withOpacity(0.25),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.gavel_rounded,
                      color: Color(0xFFFFBF00),
                      size: 20,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      "HACER UNA OFERTA",
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  "Proponé tu precio directamente al productor",
                  style: GoogleFonts.inter(color: Colors.white38, fontSize: 11),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _offerAmountController,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  style: GoogleFonts.outfit(
                    color: const Color(0xFFFFBF00),
                    fontWeight: FontWeight.bold,
                    fontSize: 24,
                  ),
                  decoration: InputDecoration(
                    prefixText: "\$ ",
                    prefixStyle: GoogleFonts.outfit(
                      color: const Color(0xFFFFBF00).withOpacity(0.6),
                      fontSize: 24,
                    ),
                    hintText: "0.00",
                    hintStyle: const TextStyle(
                      color: Colors.white24,
                      fontSize: 24,
                    ),
                    enabledBorder: const UnderlineInputBorder(
                      borderSide: BorderSide(
                        color: Color(0xFFFFBF00),
                        width: 1,
                      ),
                    ),
                    focusedBorder: const UnderlineInputBorder(
                      borderSide: BorderSide(
                        color: Color(0xFFFFBF00),
                        width: 2,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _offerMessageController,
                  maxLines: 2,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: "Mensaje opcional al productor...",
                    hintStyle: const TextStyle(color: Colors.white24),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.04),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _sendOffer,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFFBF00),
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      "ENVIAR OFERTA",
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],
      ],
    );
  }

  Widget _buildBuyLicenseCard(
    String key,
    Map<String, dynamic> meta,
    dynamic precio,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: (meta['color'] as Color).withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              meta['icon'] as IconData,
              color: meta['color'] as Color,
              size: 20,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  meta['label'] as String,
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                Text(
                  meta['desc'] as String,
                  style: GoogleFonts.inter(color: Colors.white38, fontSize: 10),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                "\$$precio",
                style: GoogleFonts.outfit(
                  color: meta['color'] as Color,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
              GestureDetector(
                onTap: () {
                  // Navigate to checkout
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text("Comprando licencia: ${meta['label']}"),
                    ),
                  );
                },
                child: Container(
                  margin: const EdgeInsets.only(top: 4),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: meta['color'] as Color,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    "COMPRAR",
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 10,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSettingTile({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required Widget trailing,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                Text(
                  subtitle,
                  style: GoogleFonts.inter(color: Colors.white38, fontSize: 11),
                ),
              ],
            ),
          ),
          trailing,
        ],
      ),
    );
  }
}

/// Opens the monetization bottom sheet
void showMonetizationSheet(
  BuildContext context,
  Post post, {
  required bool isOwner,
}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => MonetizationSheet(post: post, isOwner: isOwner),
  );
}
