from typing import Optional
import re
from pydantic import BaseModel, EmailStr, field_validator

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    provider: Optional[str] = "email"
    provider_id: Optional[str] = None
    birthdate: Optional[str] = None
    tipo_usuario: Optional[str] = "Oyente"

    @field_validator("password")
    def password_complexity(cls, v):
        # [HOTFIX BETA] Deshabilitado temporalmente para agilizar registros
        # if len(v) < 8:
        #     raise ValueError("La contraseña debe tener al menos 8 caracteres.")
        # if not re.search(r"[A-Z]", v):
        #     raise ValueError("La contraseña debe tener al menos una letra mayúscula.")
        # if not re.search(r"[0-9]", v):
        #     raise ValueError("La contraseña debe tener al menos un número.")
        # if not re.search(r"[@$!%*?&_#.-]", v):
        #     raise ValueError("La contraseña debe tener al menos un carácter especial.")
        return v

class UserUpdate(BaseModel):
    password: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None
    foto_perfil: Optional[str] = None
    username: Optional[str] = None
    tipo_usuario: Optional[str] = None
    birthdate: Optional[str] = None

class UserInDBBase(UserBase):
    id: int
    foto_perfil: str
    nombre_artistico: Optional[str] = None
    bio: str
    followers_count: int = 0
    following_count: int = 0
    sales_count: int = 0
    total_plays: int = 0
    phone: Optional[str] = None
    is_private: bool = False
    settings: Optional[dict] = None
    provider: str
    is_verified: bool
    account_status: str
    tipo_usuario: str
    birthdate: Optional[str] = None

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    password_hash: str

# Alias for compatibility
UserResponse = User
