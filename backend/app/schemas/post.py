from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, HttpUrl
from .enums import TipoContenido, GeneroMusical, TipoLicencia, FormatoAudio
from .user import UserResponse

class EnlaceExterno(BaseModel):
    plataforma: str
    url: HttpUrl

class Licencia(BaseModel):
    tipo: TipoLicencia
    precio: Decimal
    descripcion: str
    formatos_incluidos: List[FormatoAudio]
    limite_copias: Optional[int]
    requiere_mencion: bool = True
    disponible: bool = True
    contacto_custom: Optional[str] = None

class PublicacionBase(BaseModel):
    titulo: str
    artista: str
    descripcion: str
    hashtags: str
    genero_musical: GeneroMusical

class PublicacionCreate(PublicacionBase):
    tipo_contenido: TipoContenido
    # Additional fields would come from Form data in the actual endpoint
    # This schema might need to be adapted if we use JSON body, 
class PublicacionUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    hashtags: Optional[str] = None
    genero_musical: Optional[GeneroMusical] = None
    bpm: Optional[int] = None
    escala: Optional[str] = None
    is_private: Optional[bool] = None
    is_pinned: Optional[bool] = None

class PublicacionResponse(BaseModel):
    id: int
    titulo: str
    artista: str
    descripcion: str
    hashtags: str
    archivo: str
    archivo_original: Optional[str] = None
    archivo_preview_hq: Optional[str] = None
    archivo_preview_stream: Optional[str] = None
    cover_url: Optional[str] = None
    visual_loop_url: Optional[str] = None
    status: str = "ready"
    tipo_contenido: TipoContenido
    genero_musical: GeneroMusical
    usuario: UserResponse
    likes_count: int = 0
    comentarios_count: int = 0
    guardados_count: int = 0
    plays: int = 0
    fecha_subida: datetime
    licencias: Optional[Any] = None
    precio: Optional[float] = None # USD Base price
    precio_ars: Optional[float] = None # ARS Base price
    
    # Interaction controls
    permitir_remix: bool = True
    permitir_descarga_gratuita: bool = False
    
    # Specific fields
    free_use: Optional[bool] = None
    bpm: Optional[int] = None
    escala: Optional[str] = None
    contacto: Optional[str] = None
    es_autor: Optional[bool] = None
    enlaces_externos: Optional[List[Dict]] = None # Simplified types for JSON
    artista_original: Optional[str] = None
    plataforma_origen: Optional[str] = None
    is_private: bool = False
    is_pinned: bool = False

    class Config:
        from_attributes = True
