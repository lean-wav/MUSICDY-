from typing import Any, List, Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Form, File, UploadFile, BackgroundTasks
from fastapi.responses import HTMLResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from app.api import deps
from app.core import security
from app.core.emails import send_verification_email
from app.api.v1.endpoints.notifications import notify_user as ws_notify
import asyncio
from datetime import timedelta
from jose import jwt, JWTError
from app.models.models import Usuario, followers
from app.schemas import user as user_schemas, social as social_schemas
from app.core.storage import upload_file_to_s3
from app.core.config import settings

router = APIRouter()

@router.post("/", response_model=user_schemas.User)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: user_schemas.UserCreate,
    background_tasks: BackgroundTasks
) -> Any:
    """
    Create new user.
    """
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
        is_verified=True,
        account_status="active"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user

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

@router.put("/me", response_model=user_schemas.User)
def update_user_me(
    *,
    db: Session = Depends(deps.get_db),
    username: Optional[str] = Form(None),
    nombre_artistico: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    is_private: Optional[bool] = Form(None),
    settings: Optional[str] = Form(None), # JSON string
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
        
    if settings is not None:
        import json
        try:
            current_user.settings = json.loads(settings)
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

@router.post("/{user_id}/follow", response_model=social_schemas.FollowStats)
def toggle_follow(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")
        
    user_to_follow = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user_to_follow:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check if already following
    is_following = db.query(Usuario).filter(
        Usuario.id == current_user.id,
        Usuario.following.any(id=user_id)
    ).first()
    
    if is_following:
        current_user.following.remove(user_to_follow)
        result = False
    else:
        current_user.following.append(user_to_follow)
        result = True
        
    db.commit()
    
    # Trigger Notification for Follow
    if result: # If it was a follow
        asyncio.create_task(ws_notify(
            user_id=user_id,
            notification_type="NEW_FOLLOWER",
            data={
                "follower_name": current_user.username,
                "follower_id": current_user.id
            }
        ))
    
    followers_count = db.query(followers).filter(followers.c.followed_id == user_id).count()
    following_count = db.query(followers).filter(followers.c.follower_id == user_id).count()
    
    return {
        "followers_count": followers_count,
        "following_count": following_count,
        "is_following": result
    }

@router.get("/{user_id}/followers", response_model=List[user_schemas.User])
def get_followers(
    user_id: int,
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.followers

@router.get("/{user_id}/following", response_model=List[user_schemas.User])
def get_following(
    user_id: int,
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.following

@router.get("/{user_id}/stats", response_model=social_schemas.FollowStats)
def get_user_social_stats(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Optional[Usuario] = Depends(deps.get_current_user_optional),
):
    followers_count = db.query(followers).filter(followers.c.followed_id == user_id).count()
    following_count = db.query(followers).filter(followers.c.follower_id == user_id).count()
    
    is_following = False
    if current_user:
        is_following = db.query(Usuario).filter(
            Usuario.id == current_user.id,
            Usuario.following.any(id=user_id)
        ).first() is not None
        
    return {
        "followers_count": followers_count,
        "following_count": following_count,
        "is_following": is_following
    }
