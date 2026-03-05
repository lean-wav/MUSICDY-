from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr
from .user import UserResponse

class CommentBase(BaseModel):
    texto: str

class CommentCreate(CommentBase):
    pass

class CommentResponse(CommentBase):
    id: int
    usuario_id: int
    publicacion_id: int
    fecha: datetime
    usuario: UserResponse

    class Config:
        from_attributes = True

class LikeResponse(BaseModel):
    id: int
    usuario_id: int
    publicacion_id: int
    fecha: datetime

    class Config:
        from_attributes = True

class SocialStats(BaseModel):
    likes_count: int
    comentarios_count: int
    is_liked: bool = False

class FollowStats(BaseModel):
    followers_count: int
    following_count: int
    is_following: bool = False
