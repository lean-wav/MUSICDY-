from typing import Optional, List
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
    gender: Optional[str] = None
    tipo_usuario: Optional[str] = "General"

    @field_validator("password")
    def password_complexity(cls, v):
        # [HOTFIX BETA] Relajado temporalmente
        return v


class UserUpdate(BaseModel):
    """Fields the user can update on their own profile."""
    password: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None
    nombre_artistico: Optional[str] = None
    tipo_usuario: Optional[str] = None
    birthdate: Optional[str] = None
    country: Optional[str] = None
    gender: Optional[str] = None
    # Payouts & Financial
    stripe_account_id: Optional[str] = None
    mp_account_id: Optional[str] = None
    paypal_email: Optional[str] = None
    usdt_address: Optional[str] = None
    # Social links
    website: Optional[str] = None
    instagram: Optional[str] = None
    youtube: Optional[str] = None
    spotify: Optional[str] = None
    tiktok: Optional[str] = None
    # Discovery
    genres: Optional[List[str]] = None
    subgenres: Optional[List[str]] = None
    # Visibility
    saved_visibility: Optional[str] = None  # public | private
    is_private: Optional[bool] = None


class UserInDBBase(UserBase):
    id: int
    foto_perfil: Optional[str] = None
    banner_image: Optional[str] = None
    nombre_artistico: Optional[str] = None
    bio: Optional[str] = ""
    followers_count: Optional[int] = 0
    following_count: Optional[int] = 0
    sales_count: Optional[int] = 0
    total_plays: Optional[int] = 0
    phone: Optional[str] = None
    is_private: Optional[bool] = False
    settings: Optional[dict] = None
    provider: Optional[str] = "email"
    is_verified: Optional[bool] = False
    account_status: Optional[str] = "active"
    tipo_usuario: Optional[str] = "Oyente"
    birthdate: Optional[str] = None
    # New fields
    website: Optional[str] = None
    instagram: Optional[str] = None
    youtube: Optional[str] = None
    spotify: Optional[str] = None
    tiktok: Optional[str] = None
    genres: Optional[List[str]] = None
    subgenres: Optional[List[str]] = None
    gender: Optional[str] = None
    # Financial & Payouts
    wallet_balance: Optional[float] = 0.0
    stripe_account_id: Optional[str] = None
    mp_account_id: Optional[str] = None
    paypal_email: Optional[str] = None
    usdt_address: Optional[str] = None
    
    pinned_posts: Optional[List[int]] = None

    class Config:
        from_attributes = True


class User(UserInDBBase):
    pass


class UserInDB(UserInDBBase):
    password_hash: str


# Public-facing profile response (excludes private info)
class UserProfile(BaseModel):
    id: int
    username: str
    nombre_artistico: Optional[str] = None
    bio: Optional[str] = ""
    foto_perfil: Optional[str] = None
    banner_image: Optional[str] = None
    verified_type: Optional[str] = "none"
    total_plays: Optional[int] = 0
    followers_count: Optional[int] = 0
    following_count: Optional[int] = 0
    is_private: Optional[bool] = False
    website: Optional[str] = None
    instagram: Optional[str] = None
    youtube: Optional[str] = None
    spotify: Optional[str] = None
    tiktok: Optional[str] = None
    genres: Optional[List[str]] = None
    subgenres: Optional[List[str]] = None
    pinned_posts: Optional[List[int]] = None
    total_likes: Optional[int] = 0
    accent_color: Optional[str] = None
    profile_sections: Optional[dict] = None
    # Viewer context (set at request time)
    is_following: Optional[bool] = False
    is_own_profile: Optional[bool] = False

    class Config:
        from_attributes = True


# Alias for compatibility
UserResponse = User
