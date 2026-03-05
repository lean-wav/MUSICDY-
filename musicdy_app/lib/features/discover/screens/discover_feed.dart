import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../feed/models/post_model.dart';
import '../../feed/services/feed_service.dart';
import '../../feed/widgets/vertical_post_view.dart';
import 'discover_upload_screen.dart';

class DiscoverFeed extends StatefulWidget {
  const DiscoverFeed({super.key});

  @override
  State<DiscoverFeed> createState() => _DiscoverFeedState();
}

class _DiscoverFeedState extends State<DiscoverFeed> {
  final FeedService _feedService = FeedService();
  List<Post> _allPosts = [];
  bool _isLoading = true;

  // Filtros
  String _activeFilter =
      'Todos'; // 'Todos', 'Música Original', 'Videos', 'Recomendaciones'

  final List<String> _filters = [
    'Todos',
    'Música Original',
    'Videos',
    'Recomendaciones',
  ];

  // Mapping filter names to backend enums
  final Map<String, List<String>> _filterTypes = {
    'Música Original': ['own_music'],
    'Videos': ['video_terceros'],
    'Recomendaciones': ['recomendacion'],
  };

  @override
  void initState() {
    super.initState();
    _loadFeed();
  }

  Future<void> _loadFeed() async {
    try {
      // Pedimos todo y lo filtramos en el cliente (para el prototipo)
      final posts = await _feedService.getFeed();
      setState(() {
        _allPosts = posts
            .where(
              (p) =>
                  p.tipoContenido == 'own_music' ||
                  p.tipoContenido == 'video_terceros' ||
                  p.tipoContenido == 'recomendacion',
            )
            .toList();
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<Post> get _filteredPosts {
    return _allPosts.where((p) {
      // 1. Filter by Post Type
      if (_activeFilter != 'Todos') {
        final allowedTypes = _filterTypes[_activeFilter];
        if (allowedTypes != null && !allowedTypes.contains(p.tipoContenido)) {
          return false;
        }
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _filteredPosts.isEmpty
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.search_off_rounded,
                      color: Colors.white38,
                      size: 64,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      "No hay contenido aquí",
                      style: GoogleFonts.outfit(
                        color: Colors.white54,
                        fontSize: 18,
                      ),
                    ),
                  ],
                ),
              )
            : PageView.builder(
                scrollDirection: Axis.vertical,
                itemCount: _filteredPosts.length,
                itemBuilder: (context, index) {
                  return VerticalPostView(
                    post: _filteredPosts[index],
                    showFollowButton: true,
                  );
                },
              ),

        // Floating Filter Bar
        Positioned(
          top: kToolbarHeight + 40,
          left: 0,
          right: 0,
          child: SizedBox(
            height: 40,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _filters.length,
              itemBuilder: (context, index) {
                final filter = _filters[index];
                final isActive = _activeFilter == filter;
                return GestureDetector(
                  onTap: () => setState(() => _activeFilter = filter),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: isActive
                          ? Colors.white
                          : Colors.black.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isActive ? Colors.white : Colors.white24,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        filter,
                        style: GoogleFonts.inter(
                          color: isActive ? Colors.black : Colors.white,
                          fontWeight: isActive
                              ? FontWeight.bold
                              : FontWeight.normal,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),

        // Floating 'Share Content' Button specific to Discover tab
        Positioned(
          bottom: 24,
          right: 24,
          child: FloatingActionButton(
            backgroundColor: const Color(0xFF06D6A0),
            child: const Icon(Icons.add, color: Colors.black, size: 28),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const DiscoverUploadScreen()),
              );
            },
          ),
        ),
      ],
    );
  }
}
