class User {
  final int id;
  final String username;
  final String email;
  final String? fotoPerfil;
  final String bio;
  final int followersCount;
  final int followingCount;
  final int postsCount;
  final int salesCount;
  final int totalPlays;
  final String? artisticName;
  final String? phone;
  final bool isPrivate;
  final Map<String, dynamic>? settings;

  // New auth/profile fields
  final String provider;
  final bool isVerified;
  final String accountStatus;
  final String tipoUsuario;

  User({
    required this.id,
    required this.username,
    required this.email,
    this.fotoPerfil,
    this.bio = '',
    this.followersCount = 0,
    this.followingCount = 0,
    this.postsCount = 0,
    this.salesCount = 0,
    this.totalPlays = 0,
    this.artisticName,
    this.phone,
    this.isPrivate = false,
    this.settings,
    this.provider = 'email',
    this.isVerified = false,
    this.accountStatus = 'active',
    this.tipoUsuario = 'Oyente',
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      username: json['username'],
      email: json['email'],
      fotoPerfil: json['foto_perfil'],
      bio: json['bio'] ?? '',
      followersCount: json['followers_count'] ?? 0,
      followingCount: json['following_count'] ?? 0,
      postsCount: json['posts_count'] ?? 0,
      salesCount: json['sales_count'] ?? 0,
      totalPlays: json['total_plays'] ?? 0,
      artisticName: json['artistic_name'] ?? json['username'],
      phone: json['phone'],
      isPrivate: json['is_private'] ?? false,
      settings: json['settings'],
      provider: json['provider'] ?? 'email',
      isVerified: json['is_verified'] ?? false,
      accountStatus: json['account_status'] ?? 'active',
      tipoUsuario: json['tipo_usuario'] ?? 'Oyente',
    );
  }

  User copyWith({
    String? username,
    String? fotoPerfil,
    String? bio,
    String? artisticName,
    String? phone,
    bool? isPrivate,
    Map<String, dynamic>? settings,
  }) {
    return User(
      id: this.id,
      username: username ?? this.username,
      email: this.email,
      fotoPerfil: fotoPerfil ?? this.fotoPerfil,
      bio: bio ?? this.bio,
      followersCount: this.followersCount,
      followingCount: this.followingCount,
      postsCount: this.postsCount,
      salesCount: this.salesCount,
      totalPlays: this.totalPlays,
      artisticName: artisticName ?? this.artisticName,
      phone: phone ?? this.phone,
      isPrivate: isPrivate ?? this.isPrivate,
      settings: settings ?? this.settings,
      provider: this.provider,
      isVerified: this.isVerified,
      accountStatus: this.accountStatus,
      tipoUsuario: this.tipoUsuario,
    );
  }
}
