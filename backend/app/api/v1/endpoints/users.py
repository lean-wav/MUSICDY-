from typing import Any, List, Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Form, File, UploadFile, BackgroundTasks
from fastapi.responses import HTMLResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api import deps
from app.core import security
from app.api.v1.endpoints.notifications import notify_user as ws_notify
import asyncio
from app.services.social_service import SocialService
from datetime import timedelta
from jose import jwt, JWTError
from app.models.models import Usuario, followers, SesionUsuario
from app.schemas import user as user_schemas, social as social_schemas
from app.core.storage import upload_file_to_s3
from app.core.config import settings
from pydantic import BaseModel, constr

router = APIRouter()


@router.post("/", response_model=user_schemas.User)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: user_schemas.UserCreate
) -> Any:
    """
    Create new user.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        if db.query(Usuario).filter(Usuario.email == user_in.email).first():
            raise HTTPException(
                status_code=400,
                detail="The user with this username already exists in the system.",
            )
        if db.query(Usuario).filter(Usuario.username == user_in.username).first():
            raise HTTPException(
                status_code=400,
                detail="The username is already in use.",
            )
        
        hashed_password = security.get_password_hash(user_in.password)
        
        db_user = Usuario(
            username=user_in.username,
            email=user_in.email,
            password_hash=hashed_password,
            foto_perfil="default.jpg",
            bio="",
            tipo_usuario=user_in.tipo_usuario,
            provider=user_in.provider,
            provider_id=user_in.provider_id,
            birthdate=user_in.birthdate,
            is_verified=True, # Simplified: everyone is verified by default to fix the 500 email error
            account_status="active"
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        # Triggers email verification removed to simplify and avoid server crashing on missing SMTP

        return db_user
    except HTTPException:
        # Re-raise standard HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error 500 in create_user: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Error interno del servidor al crear cuenta."
        )

@router.get("/verify-email", response_class=HTMLResponse)
def verify_email(token: str, db: Session = Depends(deps.get_db)) -> Any:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=400, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=400, detail="El token ha expirado o es inválido")
    
    user = db.query(Usuario).filter(Usuario.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.is_verified:
        return "<html><body style='background:#000;color:#06d6a0;text-align:center;padding:50px;font-family:sans-serif;'><h1>¡Tu cuenta ya estaba verificada!</h1><p>Puedes regresar a Musicdy.</p></body></html>"

    user.is_verified = True
    user.account_status = "active"
    db.commit()

    return "<html><body style='background:#000;color:#06d6a0;text-align:center;padding:50px;font-family:sans-serif;'><h1>¡Cuenta Verificada Exitosamente! 🎶</h1><p>Ya puedes iniciar sesión en Musicdy.</p></body></html>"

@router.get("/check-username")
def check_username(username: str, db: Session = Depends(deps.get_db)) -> Any:
    """
    Check if a username is available.
    """
    user = db.query(Usuario).filter(Usuario.username == username).first()
    return {"available": user is None}

@router.get("/me", response_model=user_schemas.User)
def read_user_me(
    current_user: Usuario = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.patch("/me", response_model=user_schemas.User)
def patch_user_me(
    *,
    db: Session = Depends(deps.get_db),
    user_in: user_schemas.UserUpdate,
    current_user: Usuario = Depends(deps.get_current_user),
) -> Any:
    """
    Update current user profile (JSON body).
    """
    update_data = user_in.model_dump(exclude_unset=True)
    
    if "username" in update_data:
        # Check if username taken
        new_username = update_data["username"]
        existing_user = db.query(Usuario).filter(Usuario.username == new_username, Usuario.id != current_user.id).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")

    for field, value in update_data.items():
        if hasattr(current_user, field):
            setattr(current_user, field, value)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/me", response_model=user_schemas.User)
def update_user_me(
    *,
    db: Session = Depends(deps.get_db),
    username: Optional[str] = Form(None),
    nombre_artistico: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    is_private: Optional[bool] = Form(None),
    settings_json: Optional[str] = Form(None), # JSON string (renamed to avoid shadowing config `settings`)
    tipo_usuario: Optional[str] = Form(None),
    foto_perfil: Optional[UploadFile] = File(None),
    current_user: Usuario = Depends(deps.get_current_user),
) -> Any:
    """
    Update own user profile.
    """
    if username:
        # Check if username taken
        existing_user = db.query(Usuario).filter(Usuario.username == username, Usuario.id != current_user.id).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        current_user.username = username
        
    if nombre_artistico is not None:
        current_user.nombre_artistico = nombre_artistico
    
    if bio is not None:
        current_user.bio = bio

    if phone is not None:
        current_user.phone = phone
    
    if is_private is not None:
        current_user.is_private = is_private
        
    if tipo_usuario is not None:
        current_user.tipo_usuario = tipo_usuario
        
    if settings_json is not None:
        import json
        try:
            current_user.settings = json.loads(settings_json)
        except:
            pass
        
    if foto_perfil:
        # Save file
        import os
        from datetime import datetime
        import shutil
        
        file_extension = foto_perfil.filename.split('.')[-1]
        safe_filename = f"profile_{current_user.id}_{int(datetime.now().timestamp())}.{file_extension}"
        
        if settings.AWS_BUCKET_NAME and settings.AWS_ACCESS_KEY_ID:
            s3_url = upload_file_to_s3(foto_perfil.file, f"profiles/{safe_filename}", foto_perfil.content_type)
            if s3_url:
                current_user.foto_perfil = s3_url
        else:
            UPLOAD_DIR = "static/profiles"
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            file_path = os.path.join(UPLOAD_DIR, safe_filename)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(foto_perfil.file, buffer)
                
            current_user.foto_perfil = f"profiles/{safe_filename}"

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


# ─── Helper ────────────────────────────────────────────────────────────────────

def _sign_user_media(user: Usuario) -> dict:
    """Return presigned URLs for user avatar and banner."""
    from app.core.storage import generate_presigned_url
    from app.core.config import settings

    def sign(url: str | None) -> str | None:
        if not url or not url.startswith('http'):
            return url
        from urllib.parse import urlparse
        parsed = urlparse(url)
        path = parsed.path.lstrip('/')
        bucket = settings.AWS_BUCKET_NAME or ''
        if path.startswith(f'{bucket}/'):
            key = path[len(f'{bucket}/'):]
        elif f'/{bucket}/' in f'/{path}':
            key = path.split(f'{bucket}/', 1)[-1]
        else:
            key = path
        return generate_presigned_url(key) or url

    return {
        "foto_perfil": sign(user.foto_perfil),
        "banner_image": sign(user.banner_image),
    }


def _build_profile(user: Usuario, current_user: Usuario | None, db: Session) -> dict:
    """Build a UserProfile dict with counts and viewer context."""
    followers_count = user.followers_count or 0
    following_count = user.following_count or 0
    is_following = False
    is_own = False
    if current_user:
        is_own = current_user.id == user.id
        if not is_own:
            is_following = db.query(followers).filter(
                followers.c.follower_id == current_user.id,
                followers.c.followed_id == user.id
            ).count() > 0

    # Calculate total likes across all posts (Optionally denormalize this too later)
    from app.models.models import Publicacion, Like
    total_likes = db.query(func.sum(Publicacion.likes_count)).filter(Publicacion.usuario_id == user.id).scalar() or 0

    media = _sign_user_media(user)
    return {
        "id": user.id,
        "username": user.username,
        "nombre_artistico": user.nombre_artistico,
        "bio": user.bio or "",
        "foto_perfil": media["foto_perfil"],
        "banner_image": media["banner_image"],
        "verified_type": user.verified_type or "none",
        "total_plays": user.total_plays or 0,
        "followers_count": followers_count,
        "following_count": following_count,
        "is_private": user.is_private,
        "website": user.website,
        "instagram": user.instagram,
        "youtube": user.youtube,
        "spotify": user.spotify,
        "tiktok": user.tiktok,
        "genres": user.genres or [],
        "subgenres": user.subgenres or [],
        "pinned_posts": user.pinned_posts or [],
        "total_likes": total_likes,
        "accent_color": getattr(user, "accent_color", None),
        "profile_sections": (user.settings or {}).get("profile_sections", {}),
        "is_following": is_following,
        "is_own_profile": is_own,
    }


# ─── Profile endpoints ─────────────────────────────────────────────────────────

@router.get("/profile/{username}")
def get_profile_by_username(
    username: str,
    db: Session = Depends(deps.get_db),
    current_user: Optional[Usuario] = Depends(deps.get_current_user_optional),
):
    """Public profile page."""
    user = db.query(Usuario).filter(Usuario.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return _build_profile(user, current_user, db)


@router.get("/me/profile")
def get_own_profile(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """Own profile with all private stats."""
    profile = _build_profile(current_user, current_user, db)
    profile["sales_count"] = current_user.sales_count or 0
    profile["saved_visibility"] = current_user.saved_visibility or "public"
    return profile


@router.patch("/me/profile")
def update_profile(
    *,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
    bio: Optional[str] = Form(None),
    nombre_artistico: Optional[str] = Form(None),
    website: Optional[str] = Form(None),
    instagram: Optional[str] = Form(None),
    youtube: Optional[str] = Form(None),
    spotify: Optional[str] = Form(None),
    tiktok: Optional[str] = Form(None),
    genres: Optional[str] = Form(None),       # JSON array string ["trap","rnb"]
    subgenres: Optional[str] = Form(None),
    saved_visibility: Optional[str] = Form(None),
    is_private: Optional[bool] = Form(None),
    tipo_usuario: Optional[str] = Form(None),
    accent_color: Optional[str] = Form(None),
    profile_sections: Optional[str] = Form(None),
):
    """Update profile text fields, social links, and genres."""
    import json
    if bio is not None: current_user.bio = bio
    if nombre_artistico is not None: current_user.nombre_artistico = nombre_artistico
    if website is not None: current_user.website = website
    if instagram is not None: current_user.instagram = instagram
    if youtube is not None: current_user.youtube = youtube
    if spotify is not None: current_user.spotify = spotify
    if tiktok is not None: current_user.tiktok = tiktok
    if saved_visibility is not None: current_user.saved_visibility = saved_visibility
    if is_private is not None: current_user.is_private = is_private
    if tipo_usuario is not None: current_user.tipo_usuario = tipo_usuario
    if accent_color is not None and current_user.verified_type != "none":
        current_user.accent_color = accent_color
    
    if profile_sections is not None:
        try:
            sections_data = json.loads(profile_sections)
            if not current_user.settings:
                current_user.settings = {}
            current_user.settings["profile_sections"] = sections_data
            # Force SQLAlchemy to detect change in JSON
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(current_user, "settings")
        except:
            pass
    if genres is not None:
        try: current_user.genres = json.loads(genres)
        except: pass
    if subgenres is not None:
        try: current_user.subgenres = json.loads(subgenres)
        except: pass
    db.commit()
    db.refresh(current_user)
    return _build_profile(current_user, current_user, db)


@router.patch("/me/username")
def change_username(
    new_username: str = Form(...),
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """Change username — previous one becomes available immediately."""
    if db.query(Usuario).filter(Usuario.username == new_username, Usuario.id != current_user.id).first():
        raise HTTPException(status_code=400, detail="El username ya está en uso")
    current_user.username = new_username
    db.commit()
    return {"username": new_username}


@router.post("/me/avatar")
def upload_avatar(
    foto_perfil: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """Upload/replace profile picture."""
    from datetime import datetime as _dt
    ts = int(_dt.now().timestamp())
    ext = (foto_perfil.filename or "avatar.jpg").split('.')[-1]
    safe = f"profiles/{current_user.id}_{ts}_avatar.{ext}"
    url = upload_file_to_s3(foto_perfil.file, safe, foto_perfil.content_type)
    if not url:
        raise HTTPException(status_code=500, detail="Error al subir la imagen")
    current_user.foto_perfil = url
    db.commit()
    return {"foto_perfil": url}


@router.post("/me/banner")
def upload_banner(
    banner: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """Upload/replace banner image."""
    from datetime import datetime as _dt
    ts = int(_dt.now().timestamp())
    ext = (banner.filename or "banner.jpg").split('.')[-1]
    safe = f"banners/{current_user.id}_{ts}_banner.{ext}"
    url = upload_file_to_s3(banner.file, safe, banner.content_type)
    if not url:
        raise HTTPException(status_code=500, detail="Error al subir el banner")
    current_user.banner_image = url
    db.commit()
    return {"banner_image": url}


@router.post("/me/pin/{post_id}")
def pin_post(
    post_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """Pin a post to the top of the profile grid (max 3)."""
    from app.models.models import Publicacion
    post = db.query(Publicacion).filter(
        Publicacion.id == post_id,
        Publicacion.usuario_id == current_user.id
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    pinned = list(current_user.pinned_posts or [])
    if post_id in pinned:
        return {"pinned_posts": pinned}
    if len(pinned) >= 3:
        raise HTTPException(status_code=400, detail="Solo puedes fijar hasta 3 posts")
    pinned.append(post_id)
    current_user.pinned_posts = pinned
    db.commit()
    return {"pinned_posts": pinned}


@router.delete("/me/pin/{post_id}")
def unpin_post(
    post_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """Unpin a post from the profile grid."""
    pinned = list(current_user.pinned_posts or [])
    if post_id in pinned:
        pinned.remove(post_id)
        current_user.pinned_posts = pinned
        db.commit()
    return {"pinned_posts": pinned}


# ─── User content lists ────────────────────────────────────────────────────────

@router.get("/{username}/posts")
def get_user_posts(
    username: str,
    db: Session = Depends(deps.get_db),
    current_user: Optional[Usuario] = Depends(deps.get_current_user_optional),
    skip: int = 0,
    limit: int = 30,
):
    """All posts by a user (respects private account)."""
    from app.models.models import Publicacion
    user = db.query(Usuario).filter(Usuario.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.is_private and (not current_user or current_user.id != user.id):
        return []
    posts = (
        db.query(Publicacion)
        .filter(Publicacion.usuario_id == user.id, Publicacion.is_private == False)
        .order_by(Publicacion.fecha_subida.desc())
        .offset(skip).limit(limit).all()
    )
    from app.api.v1.endpoints.posts import _sign_post
    return [_sign_post(p) for p in posts]


@router.get("/{username}/collaborations")
def get_user_collaborations(
    username: str,
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 30,
):
    """Posts where this user accepted a collaboration tag."""
    from app.models.models import Publicacion, PostColaboracion
    user = db.query(Usuario).filter(Usuario.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    collab_ids = [
        c.publicacion_id for c in
        db.query(PostColaboracion)
        .filter(PostColaboracion.usuario_id == user.id, PostColaboracion.status == "accepted")
        .offset(skip).limit(limit).all()
    ]
    if not collab_ids:
        return []
    posts = db.query(Publicacion).filter(Publicacion.id.in_(collab_ids)).all()
    from app.api.v1.endpoints.posts import _sign_post
    return [_sign_post(p) for p in posts]


@router.get("/{username}/saved")
def get_user_saved(
    username: str,
    db: Session = Depends(deps.get_db),
    current_user: Optional[Usuario] = Depends(deps.get_current_user_optional),
    skip: int = 0,
    limit: int = 30,
):
    """Saved posts (respects saved_visibility setting)."""
    from app.models.models import Publicacion, Guardado
    user = db.query(Usuario).filter(Usuario.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    is_own = current_user and current_user.id == user.id
    if user.saved_visibility == "private" and not is_own:
        raise HTTPException(status_code=403, detail="Los guardados son privados")
    saved_ids = [
        g.publicacion_id for g in
        db.query(Guardado)
        .filter(Guardado.usuario_id == user.id)
        .order_by(Guardado.fecha.desc())
        .offset(skip).limit(limit).all()
    ]
    if not saved_ids:
        return []
    posts = db.query(Publicacion).filter(Publicacion.id.in_(saved_ids)).all()
    from app.api.v1.endpoints.posts import _sign_post
    return [_sign_post(p) for p in posts]


# ─── Follow / Social ───────────────────────────────────────────────────────────

@router.post("/{user_id}/follow", response_model=social_schemas.FollowStats)
async def toggle_follow(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    service = SocialService(db)
    result = await service.toggle_follow(current_user.id, user_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{user_id}/followers", response_model=List[user_schemas.User])
def get_followers(user_id: int, db: Session = Depends(deps.get_db)):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user.followers


@router.get("/{user_id}/following", response_model=List[user_schemas.User])
def get_following(user_id: int, db: Session = Depends(deps.get_db)):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user.following

@router.get("/{user_id}/stats", response_model=social_schemas.FollowStats)
def get_user_stats(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Optional[Usuario] = Depends(deps.get_current_user_optional),
):
    from app.models.models import followers
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    is_following = False
    if current_user:
        is_following = db.query(followers).filter(
            followers.c.follower_id == current_user.id,
            followers.c.followed_id == user_id
        ).first() is not None

    return {
        "is_following": is_following,
        "followers_count": user.followers_count or 0,
        "following_count": user.following_count or 0
    }

# ─── Password & security ──────────────────────────────────────────────────────────

class PasswordChange(BaseModel):
    old_password: str
    new_password: constr(min_length=8)

@router.post("/me/change-password")
def change_password(
    data: PasswordChange,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    if not security.verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    
    current_user.password_hash = security.get_password_hash(data.new_password)
    # Revoke all other sessions for safety?
    db.query(SesionUsuario).filter(SesionUsuario.usuario_id == current_user.id).update({"is_active": False})
    
    db.commit()
    return {"msg": "Contraseña actualizada exitosamente. Se han cerrado las demás sesiones por seguridad."}


# ─── Session Management ────────────────────────────────────────────────────────

@router.get("/me/sessions")
def list_sessions(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """List active devices/sessions."""
    sessions = db.query(SesionUsuario).filter(
        SesionUsuario.usuario_id == current_user.id,
        SesionUsuario.is_active == True
    ).order_by(SesionUsuario.last_activity.desc()).all()
    
    return [
        {
            "id": s.id,
            "device": s.device_name,
            "ip": s.ip_address,
            "last_activity": s.last_activity,
            "location": s.location,
            "is_current": False # Logic to compare with current JTI could be added if needed
        }
        for s in sessions
    ]

@router.delete("/me/sessions/{session_id}")
def revoke_session(
    session_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """Log out a specific device remotely."""
    session = db.query(SesionUsuario).filter(
        SesionUsuario.id == session_id,
        SesionUsuario.usuario_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    session.is_active = False
    db.commit()
    return {"msg": "Sesión cerrada exitosamente"}

@router.delete("/me/sessions")
def revoke_all_sessions(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """Log out from all devices except possibly the current one (not implemented here for simplicity)."""
    db.query(SesionUsuario).filter(SesionUsuario.usuario_id == current_user.id).update({"is_active": False})
    db.commit()
    return {"msg": "Todas las sesiones han sido cerradas"}


@router.get("/{user_id}/stats", response_model=social_schemas.FollowStats)
def get_user_social_stats(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Optional[Usuario] = Depends(deps.get_current_user_optional),
):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    is_following = False
    if current_user:
        is_following = db.query(followers).filter(
            followers.c.follower_id == current_user.id,
            followers.c.followed_id == user_id
        ).count() > 0
        
    return {
        "followers_count": user.followers_count or 0,
        "following_count": user.following_count or 0,
        "is_following": is_following
    }

@router.get("/me/analytics")
def get_my_analytics(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """
    Get aggregated analytics for the producer.
    """
    from app.models.models import Publicacion, Transaccion, Reproduccion
    from sqlalchemy import func
    from datetime import datetime, timedelta

    # 1. Total Metrics
    total_plays = db.query(func.sum(Publicacion.plays)).filter(Publicacion.usuario_id == current_user.id).scalar() or 0
    total_sales = db.query(func.count(Transaccion.id)).filter(Transaccion.vendedor_id == current_user.id).scalar() or 0
    
    # Unique Listeners (Total Spectators)
    unique_listeners = db.query(func.count(func.distinct(Reproduccion.usuario_id))).join(Publicacion).filter(
        Publicacion.usuario_id == current_user.id
    ).scalar() or 0

    # 2. Daily Trends (Last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    plays_trend = db.query(
        func.date(Reproduccion.fecha).label('date'),
        func.count(Reproduccion.id).label('count')
    ).join(Publicacion).filter(
        Publicacion.usuario_id == current_user.id,
        Reproduccion.fecha >= seven_days_ago
    ).group_by(func.date(Reproduccion.fecha)).all()

    # 3. Top Tracks
    top_tracks = db.query(
        Publicacion.id,
        Publicacion.titulo,
        Publicacion.plays
    ).filter(Publicacion.usuario_id == current_user.id).order_by(Publicacion.plays.desc()).limit(5).all()

    # Sales Trend (Last 7 days)
    sales_trend = db.query(
        func.date(Transaccion.fecha).label('date'),
        func.count(Transaccion.id).label('count')
    ).filter(
        Transaccion.vendedor_id == current_user.id,
        Transaccion.fecha >= seven_days_ago
    ).group_by(func.date(Transaccion.fecha)).all()

    # 4. Audience Segmentation (Demographics & Retention)
    # Fetch all users who reproduced content
    audience_users = db.query(Usuario).join(Reproduccion, Reproduccion.usuario_id == Usuario.id).join(Publicacion).filter(
        Publicacion.usuario_id == current_user.id
    ).all()

    # Genders
    gender_counts = {"Hombres": 0, "Mujeres": 0, "No binario/Otros": 0}
    for u in audience_users:
        if u.gender == "Male": gender_counts["Hombres"] += 1
        elif u.gender == "Female": gender_counts["Mujeres"] += 1
        else: gender_counts["No binario/Otros"] += 1
    
    total_audience = len(audience_users) or 1
    gender_dist = [{"label": k, "value": round((v / total_audience) * 100)} for k, v in gender_counts.items()]

    # Age Groups
    age_bins = {"13-17": 0, "18-24": 0, "25-34": 0, "35+": 0}
    now = datetime.utcnow()
    for u in audience_users:
        if u.birthdate:
            age = (now - u.birthdate).days // 365
            if age <= 17: age_bins["13-17"] += 1
            elif age <= 24: age_bins["18-24"] += 1
            elif age <= 34: age_bins["25-34"] += 1
            else: age_bins["35+"] += 1
    age_dist = [{"label": k, "value": round((v / total_audience) * 100)} for k, v in age_bins.items()]

    # Countries
    country_counts = {}
    for u in audience_users:
        c = u.country or "Otros"
        country_counts[c] = country_counts.get(c, 0) + 1
    top_locations = sorted([{"country": k, "value": round((v / total_audience) * 100)} for k, v in country_counts.items()], key=lambda x: x["value"], reverse=True)[:5]

    # Retention: Recurring vs New
    # A user is recurring if they have Reproduccion records for this producer on different days
    recurring_count = db.query(func.count(func.distinct(Reproduccion.usuario_id))).join(Publicacion).filter(
        Publicacion.usuario_id == current_user.id
    ).group_by(Reproduccion.usuario_id).having(func.count(Reproduccion.id) > 1).count()
    
    new_count = max(0, unique_listeners - recurring_count)
    retention = {
        "new": round((new_count / max(1, unique_listeners)) * 100),
        "recurring": round((recurring_count / max(1, unique_listeners)) * 100)
    }

    # Subscription: Followers vs Not Following
    follower_ids = [f.id for f in current_user.followers]
    followed_audience_count = sum(1 for u in audience_users if u.id in follower_ids)
    not_followed_count = max(0, total_audience - followed_audience_count)

    subscription = {
        "following": round((followed_audience_count / total_audience) * 100),
        "not_following": round((not_followed_count / total_audience) * 100)
    }

    return {
        "kpis": {
            "total_plays": float(total_plays),
            "total_sales": total_sales,
            "followers": current_user.followers_count
        },
        "trends": [
            {"date": str(t.date), "count": t.count} for t in plays_trend
        ],
        "top_tracks": [
            {"id": t.id, "title": t.titulo, "plays": t.plays} for t in top_tracks
        ],
        "sales_trend": [
            {"date": str(t.date), "count": t.count} for t in sales_trend
        ],
        "audience": {
            "total_spectators": unique_listeners,
            "retention": retention,
            "subscription": subscription,
            "gender": gender_dist,
            "age_range": age_dist,
            "locations": top_locations
        }
    }


