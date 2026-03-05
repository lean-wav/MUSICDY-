import 'package:flutter/material.dart';
import '../models/genre_model.dart';

class GenreCard extends StatelessWidget {
  final Genre genre;
  final VoidCallback onTap;

  const GenreCard({super.key, required this.genre, required this.onTap});

  @override
  Widget build(BuildContext context) {
    // Parse hex color
    final color = Color(int.parse(genre.color.replaceFirst('#', '0xFF')));

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          color: color,
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            // Rotated Background Design (Spotify style)
            Positioned(
              right: -15,
              bottom: -10,
              child: Transform.rotate(
                angle: 0.4,
                child: Container(
                  width: 70,
                  height: 100,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(4),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.3),
                        blurRadius: 10,
                        offset: const Offset(0, 5),
                      ),
                    ],
                    image: DecorationImage(
                      image: NetworkImage(genre.imageUrl),
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
              ),
            ),

            // Text Title
            Padding(
              padding: const EdgeInsets.all(12.0),
              child: Text(
                genre.name,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
