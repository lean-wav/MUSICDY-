from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, JSON, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy import create_engine
from datetime import datetime
from enum import Enum as PyEnum

Base = declarative_base()
engine = create_engine('sqlite:///app.db')
SessionLocal = sessionmaker(bind=engine)

class TipoContenido(str, PyEnum):
    BEAT = "beat"
    OWN_MUSIC = "own_music"
    FOR_YOU = "for_you"

class GeneroMusical(str, PyEnum):
    TRAP = "trap"
    REGGAETON = "reggaeton"
    POP = "pop"
    RAP = "rap"
    ROCK = "rock"
    ELECTRONICA = "electronica"
    OTRO = "otro"

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    foto_perfil = Column(String, default="default.jpg")
    bio = Column(String, nullable=True)
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    es_moderador = Column(Boolean, default=False)
    tipo_suscripcion = Column(String, default="gratis")

    publicaciones = relationship("Publicacion", back_populates="usuario")
    likes = relationship("Like", back_populates="usuario")
    comentarios = relationship("Comentario", back_populates="usuario")
    guardados = relationship("Guardado", back_populates="usuario")

class Publicacion(Base):
    __tablename__ = "publicaciones"
    
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, index=True)
    artista = Column(String, index=True)
    descripcion = Column(String)
    archivo = Column(String)  # Ruta al archivo
    tipo_contenido = Column(String)
    genero_musical = Column(String)
    hashtags = Column(String)
    fecha_subida = Column(DateTime, default=datetime.utcnow)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    
    # Campos específicos para beats
    free_use = Column(Boolean)
    bpm = Column(Integer)
    escala = Column(String)
    contacto = Column(String)
    licencias = Column(JSON)
    
    # Campos específicos para own_music
    es_autor = Column(Boolean)
    enlaces_externos = Column(JSON)
    
    # Campos específicos para for_you
    artista_original = Column(String)
    plataforma_origen = Column(String)
    link_externo = Column(String)
    
    usuario = relationship("Usuario", back_populates="publicaciones")
    likes = relationship("Like", back_populates="publicacion")
    comentarios = relationship("Comentario", back_populates="publicacion")
    guardados = relationship("Guardado", back_populates="publicacion")

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