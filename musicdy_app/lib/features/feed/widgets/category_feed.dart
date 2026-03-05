import 'package:flutter/material.dart';
import '../models/post_model.dart';
import 'vertical_post_view.dart';

class CategoryFeed extends StatelessWidget {
  final List<Post> posts;
  final bool showSaveButton;
  final bool showFollowButton;
  final Function(int)? onPageChanged;

  const CategoryFeed({
    super.key,
    required this.posts,
    this.showSaveButton = false,
    this.showFollowButton = false,
    this.onPageChanged,
  });

  @override
  Widget build(BuildContext context) {
    if (posts.isEmpty) {
      return const Center(child: Text("No hay contenido disponible"));
    }

    return PageView.builder(
      scrollDirection: Axis.vertical,
      itemCount: posts.length,
      onPageChanged: onPageChanged,
      itemBuilder: (context, index) {
        return VerticalPostView(
          post: posts[index],
          showSaveButton: showSaveButton,
          showFollowButton: showFollowButton,
        );
      },
    );
  }
}
