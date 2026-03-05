import 'package:flutter/material.dart';
import '../models/genre_model.dart';
import '../models/post_model.dart';
import '../services/feed_service.dart';
import '../widgets/category_feed.dart';

class GenreDetailScreen extends StatefulWidget {
  final Genre genre;

  const GenreDetailScreen({super.key, required this.genre});

  @override
  State<GenreDetailScreen> createState() => _GenreDetailScreenState();
}

class _GenreDetailScreenState extends State<GenreDetailScreen> {
  final FeedService _feedService = FeedService();
  List<Post> _posts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadGenreContent();
  }

  Future<void> _loadGenreContent() async {
    try {
      final posts = await _feedService.getFeed(genero: widget.genre.name);
      setState(() {
        _posts = posts;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(widget.genre.name),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : CategoryFeed(posts: _posts),
    );
  }
}
