from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from .user import UserResponse

class ParticipanteBase(BaseModel):
    usuario_id: int
    rol: str
    split_porcentual: float
    permisos_descarga: bool = True

class ParticipanteResponse(ParticipanteBase):
    id: int
    usuario: UserResponse

    class Config:
        from_attributes = True

class ProyectoColaboracionBase(BaseModel):
    titulo: str
    tipo: str
    descripcion_acuerdo: str = ""
    precio_fijo: Optional[float] = None
    fecha_limite: Optional[datetime] = None

class ProyectoColaboracionCreate(ProyectoColaboracionBase):
    participantes: List[ParticipanteBase]

class ProyectoColaboracionResponse(ProyectoColaboracionBase):
    id: int
    estado: str
    pago_estado: str
    fecha_creacion: datetime
    archivos: List[dict] = []
    historial: List[dict] = []
    participantes: List[ParticipanteResponse]

    class Config:
        from_attributes = True

class SolicitudColaboracionBase(BaseModel):
    receptor_id: int
    tipo_proyecto: str
    propuesta_economica: Optional[float] = None
    mensaje_inicial: str

class SolicitudColaboracionCreate(SolicitudColaboracionBase):
    pass

class SolicitudColaboracionResponse(BaseModel):
    id: int
    emisor: UserResponse
    receptor: UserResponse
    tipo_proyecto: str
    propuesta_economica: Optional[float] = None
    mensaje_inicial: str
    estado: str
    fecha_creacion: datetime

    class Config:
        from_attributes = True

class MensajeColaboracionBase(BaseModel):
    texto: str

class MensajeColaboracionCreate(MensajeColaboracionBase):
    pass

class MensajeColaboracionResponse(MensajeColaboracionBase):
    id: int
    usuario: UserResponse
    fecha: datetime

    class Config:
        from_attributes = True

class SplitUpdate(BaseModel):
    usuario_id: int
    split_porcentual: float

class SplitUpdateRequest(BaseModel):
    splits: List[SplitUpdate]
