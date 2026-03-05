class Genre {
  final String id;
  final String name;
  final String imageUrl;
  final String color; // Hex color for fallback or overlay

  const Genre({
    required this.id,
    required this.name,
    required this.imageUrl,
    required this.color,
  });
}
