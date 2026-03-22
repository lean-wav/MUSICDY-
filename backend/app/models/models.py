from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table, Boolean, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base_class import Base

# Tabla para seguidores


# Tabla para seguidores
followers = Table(
    'followers',
    Base.metadata,
    Column('follower_id', Integer, ForeignKey('usuarios.id')),
    Column('followed_id', Integer, ForeignKey('usuarios.id'))
)

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True)
    password_hash = Column(String)
    foto_perfil = Column(String, default="default.jpg")
    banner_image = Column(String, nullable=True)
    nombre_artistico = Column(String, nullable=True)
    bio = Column(String, default="")
    sales_count = Column(Integer, default=0)
    total_plays = Column(Integer, default=0)
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    stripe_account_id = Column(String, nullable=True)
    mp_account_id = Column(String, nullable=True)
    paypal_email = Column(String, nullable=True)
    usdt_address = Column(String, nullable=True)
    country = Column(String, default="US")
    gender = Column(String, nullable=True) # "Male", "Female", "Non-binary", etc.
    profile_views = Column(Integer, default=0)
    phone = Column(String, nullable=True)
    birthdate = Column(DateTime, nullable=True)
    is_private = Column(Boolean, default=False)
    
    # Denormalized counters
    followers_count = Column(Integer, default=0)
    following_count = Column(Integer, default=0)
    
    # Financial
    wallet_balance = Column(Float, default=0.0)

    # Social links
    website = Column(String, nullable=True)
    instagram = Column(String, nullable=True)
    youtube = Column(String, nullable=True)
    spotify = Column(String, nullable=True)
    tiktok = Column(String, nullable=True)

    # Genres & discovery
    genres = Column(JSON, default=[])
    subgenres = Column(JSON, default=[])

    # Verification & visibility
    verified_type = Column(String, default="none")  # none, subscription, official
    saved_visibility = Column(String, default="public")  # public, private
    pinned_posts = Column(JSON, default=[])  # list of post IDs (max 3)
    accent_color = Column(String, nullable=True)  # Hex color for VIP users

    # Auth & Profile Fields
    provider = Column(String, default="email")
    provider_id = Column(String, nullable=True, index=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True, index=True)
    reset_password_token = Column(String, nullable=True, index=True)
    reset_password_expire = Column(DateTime, nullable=True)
    account_status = Column(String, default="active")
    tipo_usuario = Column(String, default="Oyente")

    settings = Column(JSON, default={
        "privacy": {
            "find_by_email": True, "find_by_phone": True,
            "recommend_account": True, "sync_contacts": False,
            "allow_reuse": True, "allow_download": False,
            "show_followers": True, "show_activity": True
        },
        "profile_sections": {
            "stats": False, "beats": True, "songs": True, "collabs": True, "saved": True
        },
        "notifications": {
            "push": {"sales": True, "followers": True, "comments": True},
            "email": {"sales": True, "followers": False, "comments": True}
        },
        "interactions": {
            "who_can_comment": "everyone",
            "who_can_message": "everyone",
            "allow_offers": True
        }
    })

    # Relationships
    publicaciones = relationship("Publicacion", back_populates="usuario")
    likes = relationship("Like", back_populates="usuario")
    comentarios = relationship("Comentario", back_populates="usuario")
    guardados = relationship("Guardado", back_populates="usuario")
    colaboraciones = relationship("PostColaboracion", back_populates="usuario", foreign_keys="PostColaboracion.usuario_id")
    sesiones = relationship("SesionUsuario", back_populates="usuario", cascade="all, delete-orphan")
    notificaciones = relationship("Notificacion", back_populates="usuario", cascade="all, delete-orphan")

    following = relationship(
        'Usuario', secondary=followers,
        primaryjoin=(followers.c.follower_id == id),
        secondaryjoin=(followers.c.followed_id == id),
        backref='followers'
    )


class Publicacion(Base):
    __tablename__ = "publicaciones"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, index=True)
    artista = Column(String)
    tipo_contenido = Column(String)  # beat, own_music, for_you
    genero_musical = Column(String)
    archivo = Column(String)  # This will point to the stream preview by default for feed
    archivo_original = Column(String, nullable=True) # Lossless (WAV/AIFF/FLAC)
    archivo_preview_hq = Column(String, nullable=True) # MP3 320kbps
    archivo_preview_stream = Column(String, nullable=True) # MP3 128kbps
    cover_url = Column(String, nullable=True)
    visual_loop_url = Column(String, nullable=True)
    
    subtitulo = Column(String, nullable=True)
    descripcion = Column(String, default="")
    hashtags = Column(String, default="")
    tags = Column(JSON, nullable=True) # Lista de strings inteligentes
    is_private = Column(Boolean, default=False)
    visibilidad = Column(String, default="public") # public, connections, private
    is_pinned = Column(Boolean, default=False)
    fecha_subida = Column(DateTime, default=datetime.utcnow)
    fecha_programada = Column(DateTime, nullable=True)
    
    # Controles de Interacción
    permitir_comentarios = Column(Boolean, default=True)
    permitir_reutilizacion = Column(Boolean, default=True)
    permitir_remix = Column(Boolean, default=True)
    permitir_colaboracion = Column(Boolean, default=True)
    
    # Status de procesamiento
    status = Column(String, default="processing") # uploading, processing, ready, error
    
    # Analytics
    plays = Column(Integer, default=0)
    views = Column(Integer, default=0)
    
    # Denormalized counters
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    saves_count = Column(Integer, default=0)
    
    # Campo para link externo (obligatorio si no es contenido propio)
    link_externo = Column(String, nullable=True)
    
    # Campos específicos para beats/canciones
    bpm = Column(Integer, nullable=True)
    escala = Column(String, nullable=True)
    subgenero = Column(String, nullable=True)
    mood = Column(JSON, nullable=True) # Lista de strings
    inspirado_en = Column(String, nullable=True)
    idioma = Column(String, nullable=True)
    creditos = Column(JSON, nullable=True) # dict: producer, artist, featuring, mix, master
    isrc = Column(String, nullable=True)
    
    free_use = Column(Boolean, default=False)
    permitir_descarga_gratuita = Column(Boolean, default=False)
    incluir_stems = Column(Boolean, default=False)
    incluir_trackouts = Column(Boolean, default=False)
    contacto = Column(String, nullable=True)
    
    # Campos específicos para own_music
    es_autor = Column(Boolean, default=False)
    enlaces_externos = Column(JSON, nullable=True)  # Lista de {plataforma: str, url: str}
    licencias = Column(JSON, nullable=True) # Dict de {tipo: {precio, ...}}
    allow_offers = Column(Boolean, default=True)
    contract_url = Column(String, nullable=True)
    
    # Campos específicos para for_you
    artista_original = Column(String, nullable=True)
    plataforma_origen = Column(String, nullable=True)
    
    # Relaciones con el usuario
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    usuario = relationship("Usuario", back_populates="publicaciones")
    
    # Métricas e interacciones
    likes = relationship("Like", back_populates="publicacion")
    comentarios = relationship("Comentario", back_populates="publicacion")
    guardados = relationship("Guardado", back_populates="publicacion")
    reproducciones = relationship("Reproduccion", back_populates="publicacion", cascade="all, delete-orphan")

class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    publicacion_id = Column(Integer, ForeignKey("publicaciones.id"))
    fecha = Column(DateTime, default=datetime.utcnow)
    
    usuario = relationship("Usuario", back_populates="likes")
    publicacion = relationship("Publicacion", back_populates="likes")

class Comentario(Base):
    __tablename__ = "comentarios"

    id = Column(Integer, primary_key=True, index=True)
    texto = Column(String)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    publicacion_id = Column(Integer, ForeignKey("publicaciones.id"))
    fecha = Column(DateTime, default=datetime.utcnow)
    
    usuario = relationship("Usuario", back_populates="comentarios")
    publicacion = relationship("Publicacion", back_populates="comentarios")

class Guardado(Base):
    __tablename__ = "guardados"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    publicacion_id = Column(Integer, ForeignKey("publicaciones.id"))
    fecha = Column(DateTime, default=datetime.utcnow)
    
    usuario = relationship("Usuario", back_populates="guardados")
    publicacion = relationship("Publicacion", back_populates="guardados")

class CategoriaExplorar(Base):
    __tablename__ = "categorias_explorar"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True)
    descripcion = Column(String)
    imagen_url = Column(String)
    orden = Column(Integer)

class Transaccion(Base):
    __tablename__ = "transacciones"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id")) # Comprador
    publicacion_id = Column(Integer, ForeignKey("publicaciones.id")) # Beat comprado
    vendedor_id = Column(Integer, ForeignKey("usuarios.id")) # Productor
    monto = Column(Integer) # En centavos (Stripe standard)
    currency = Column(String, default="usd") # usd, ars
    provider = Column(String, default="stripe") # stripe, mercadopago
    tipo_licencia = Column(String) # lease, exclusive, etc.
    stripe_payment_intent_id = Column(String, unique=True)
    estado = Column(String, default="pendiente") # pendiente, completado, fallido
    fecha = Column(DateTime, default=datetime.utcnow)

class ProyectoColaboracion(Base):
    __tablename__ = "proyectos_colaboracion"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, index=True)
    tipo = Column(String)  # Beat, Canción, Remix, Mixing, Otro
    estado = Column(String, default="en_proceso")  # en_proceso, cerrado
    descripcion_acuerdo = Column(String, default="")
    precio_fijo = Column(Float, nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_limite = Column(DateTime, nullable=True)
    
    archivos = Column(JSON, default=[]) # Lista de {nombre: str, url: str, version: str}
    historial = Column(JSON, default=[]) # Lista de {evento: str, usuario: str, fecha: str}
    pago_estado = Column(String, default="pendiente") # pendiente, completado

    participantes = relationship("ParticipanteColaboracion", back_populates="proyecto")
    mensajes = relationship("MensajeColaboracion", back_populates="proyecto")

class ParticipanteColaboracion(Base):
    __tablename__ = "participantes_colaboracion"

    id = Column(Integer, primary_key=True, index=True)
    proyecto_id = Column(Integer, ForeignKey("proyectos_colaboracion.id"))
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    rol = Column(String) # Productor, Artista, Ingeniero, etc.
    split_porcentual = Column(Float, default=0.0)
    permisos_descarga = Column(Boolean, default=True)

    proyecto = relationship("ProyectoColaboracion", back_populates="participantes")
    usuario = relationship("Usuario")

class SolicitudColaboracion(Base):
    __tablename__ = "solicitudes_colaboracion"

    id = Column(Integer, primary_key=True, index=True)
    emisor_id = Column(Integer, ForeignKey("usuarios.id"))
    receptor_id = Column(Integer, ForeignKey("usuarios.id"))
    tipo_proyecto = Column(String)
    propuesta_economica = Column(Float, nullable=True)
    mensaje_inicial = Column(String)
    estado = Column(String, default="pendiente") # pendiente, aceptada, rechazada
    fecha_creacion = Column(DateTime, default=datetime.utcnow)

    emisor = relationship("Usuario", foreign_keys=[emisor_id])
    receptor = relationship("Usuario", foreign_keys=[receptor_id])

class MensajeColaboracion(Base):
    __tablename__ = "mensajes_colaboracion"

    id = Column(Integer, primary_key=True, index=True)
    proyecto_id = Column(Integer, ForeignKey("proyectos_colaboracion.id"))
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    texto = Column(String)
    fecha = Column(DateTime, default=datetime.utcnow)

    proyecto = relationship("ProyectoColaboracion", back_populates="mensajes")
    usuario = relationship("Usuario")


class PostColaboracion(Base):
    """Links a post to collaborating artists (tagging system)."""
    __tablename__ = "post_colaboraciones"

    id = Column(Integer, primary_key=True, index=True)
    publicacion_id = Column(Integer, ForeignKey("publicaciones.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    # status: pending (invited) | accepted | rejected | removed
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    publicacion = relationship("Publicacion", backref="colaboradores")
    usuario = relationship("Usuario", back_populates="colaboraciones", foreign_keys=[usuario_id])


class Conversacion(Base):
    __tablename__ = "conversaciones"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_message_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    mensajes = relationship("MensajeChat", back_populates="conversacion", cascade="all, delete-orphan")
    participantes = relationship("ParticipanteConversacion", back_populates="conversacion", cascade="all, delete-orphan")


class ParticipanteConversacion(Base):
    __tablename__ = "participantes_conversacion"

    id = Column(Integer, primary_key=True, index=True)
    convo_id = Column(Integer, ForeignKey("conversaciones.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    unread_count = Column(Integer, default=0)
    joined_at = Column(DateTime, default=datetime.utcnow)

    conversacion = relationship("Conversacion", back_populates="participantes")
    usuario = relationship("Usuario")


class MensajeChat(Base):
    __tablename__ = "mensajes_chat"

    id = Column(Integer, primary_key=True, index=True)
    convo_id = Column(Integer, ForeignKey("conversaciones.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    texto = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversacion = relationship("Conversacion", back_populates="mensajes")
    sender = relationship("Usuario")

class SesionUsuario(Base):
    __tablename__ = "sesiones_usuario"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"))
    token_jti = Column(String, unique=True, index=True) # ID único del JWT
    device_name = Column(String, nullable=True) # e.g. "iPhone 13", "Windows Chrome"
    device_type = Column(String, nullable=True) # mobile, desktop, tablet
    ip_address = Column(String, nullable=True)
    location = Column(String, nullable=True)
    last_activity = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    usuario = relationship("Usuario", back_populates="sesiones")

class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"))
    tipo = Column(String)  # like, comment, follow, system, chat
    data = Column(JSON, nullable=True) # Payload extra
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    usuario = relationship("Usuario", back_populates="notificaciones")

class Retiro(Base):
    __tablename__ = "retiros"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"))
    monto = Column(Float, nullable=False)
    metodo = Column(String) # stripe, mercadopago
    estado = Column(String, default="pendiente") # pendiente, completado, fallido
    fecha = Column(DateTime, default=datetime.utcnow)
    completado_at = Column(DateTime, nullable=True)

    usuario = relationship("Usuario")


class Reproduccion(Base):
    __tablename__ = "reproducciones"

    id = Column(Integer, primary_key=True, index=True)
    publicacion_id = Column(Integer, ForeignKey("publicaciones.id", ondelete="CASCADE"))
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    fecha = Column(DateTime, default=datetime.utcnow)
    ip_hash = Column(String, index=True)

    publicacion = relationship("Publicacion", back_populates="reproducciones")
    usuario = relationship("Usuario")

# ─── Search Indexing Hooks ───────────────────────────────────────────────────
from sqlalchemy import event
from app.services.search import SearchService

@event.listens_for(Publicacion, 'after_insert')
def index_post_after_insert(mapper, connection, target):
    SearchService.index_post(target)

@event.listens_for(Publicacion, 'after_update')
def index_post_after_update(mapper, connection, target):
    SearchService.index_post(target)

@event.listens_for(Publicacion, 'after_delete')
def index_post_after_delete(mapper, connection, target):
    SearchService.delete_post(target.id)

@event.listens_for(Usuario, 'after_insert')
def index_user_after_insert(mapper, connection, target):
    SearchService.index_user(target)

@event.listens_for(Usuario, 'after_update')
def index_user_after_update(mapper, connection, target):
    SearchService.index_user(target)
