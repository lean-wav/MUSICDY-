import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/post_model.dart';
import '../services/feed_service.dart';
import 'package:musicdy_app/features/auth/providers/auth_provider.dart';
import '../widgets/category_feed.dart';
import '../../discover/screens/discover_feed.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  final FeedService _feedService = FeedService();
  List<Post> _posts = [];
  List<Post> _followingPosts = [];
  bool _isLoading = true;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 3,
      vsync: this,
      initialIndex: 1,
    ); // Default to 'Descubrir'
    _loadFeed();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadFeed() async {
    try {
      final posts = await _feedService.getFeed();
      final following = await _feedService.getFollowingFeed();
      setState(() {
        _posts = posts;
        _followingPosts = following;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<Post> _filterPosts(String type) {
    return _posts.where((p) => p.tipoContenido == type).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: TabBar(
          controller: _tabController,
          indicatorColor: Theme.of(context).primaryColor,
          indicatorWeight: 3,
          labelStyle: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
          unselectedLabelStyle: const TextStyle(fontSize: 14),
          tabs: const [
            Tab(text: 'BEATS'),
            Tab(text: 'DESCUBRIR'),
            Tab(text: 'SEGUIDOS'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            onPressed: () => context.read<AuthProvider>().logout(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                CategoryFeed(posts: _filterPosts('beat'), showSaveButton: true),
                const DiscoverFeed(),
                CategoryFeed(posts: _followingPosts),
              ],
            ),
    );
  }
}
