from typing import List, Optional, Any
from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException, status, Body, BackgroundTasks
from sqlalchemy.orm import Session
from app.api import deps
from app.models.models import Publicacion, Usuario, Like, Comentario, Reproduccion
from app.schemas import post as post_schemas, social as social_schemas
import hashlib
import logging
import traceback
from app.schemas.enums import TipoContenido, GeneroMusical, TipoLicencia
from app.worker import analyze_audio
from app.services.upload_service import handle_background_upload
import shutil
import os
from datetime import datetime
from app.api.v1.endpoints.notifications import notify_user as ws_notify
import asyncio
from app.services.social_service import SocialService
from app.core.config import settings
from app.services.post_service import PostService

logger = logging.getLogger(__name__)


router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=post_schemas.PublicacionResponse)
async def create_post(
    titulo: str = Form(...),
    tipo_contenido: TipoContenido = Form(...),
    artista: Optional[str] = Form(None),
    genero_musical: Optional[GeneroMusical] = Form(None),
    subgenero: Optional[str] = Form(None),
    descripcion: Optional[str] = Form(""),
    subtitulo: Optional[str] = Form(None),
    archivo: Optional[UploadFile] = File(None),
    portada: Optional[UploadFile] = File(None),
    visual_loop: Optional[UploadFile] = File(None),
    hashtags: str = Form(""),
    tags: Optional[str] = Form(None), # JSON string
    mood: Optional[str] = Form(None), # JSON string
    inspirado_en: Optional[str] = Form(None),
    idioma: Optional[str] = Form(None),
    creditos: Optional[str] = Form(None), # JSON string
    isrc: Optional[str] = Form(None),
    contacto: Optional[str] = Form(None),
    bpm: Optional[int] = Form(None),
    escala: Optional[str] = Form(None),
    artista_original: Optional[str] = Form(None),
    plataforma_origen: Optional[str] = Form(None),
    link_externo: Optional[str] = Form(None),
    visibilidad: str = Form("public"),
    permitir_comentarios: bool = Form(True),
    permitir_reutilizacion: bool = Form(True),
    permitir_remix: bool = Form(True),
    permitir_colaboracion: bool = Form(True),
    permitir_descarga_gratuita: bool = Form(False),
    incluir_stems: bool = Form(False),
    incluir_trackouts: bool = Form(False),
    free_use: bool = Form(False),
    es_autor: bool = Form(False),
    licenses: Optional[str] = Form(None), # JSON string: [{id, price_usd, price_ars}, ...]
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    import json
    parsed_tags = json.loads(tags) if tags else []
    parsed_mood = json.loads(mood) if mood else []
    parsed_creditos = json.loads(creditos) if creditos else {}
    parsed_licenses = json.loads(licenses) if licenses else []

    post_data = {
        "titulo": titulo,
        "artista": artista or current_user.username,
        "tipo_contenido": tipo_contenido,
        "genero_musical": genero_musical,
        "subgenero": subgenero,
        "descripcion": descripcion or "",
        "subtitulo": subtitulo,
        "hashtags": hashtags,
        "tags": parsed_tags,
        "mood": parsed_mood,
        "inspirado_en": inspirado_en,
        "idioma": idioma,
        "creditos": parsed_creditos,
        "isrc": isrc,
        "contacto": contacto,
        "bpm": bpm,
        "escala": escala,
        "visibilidad": visibilidad,
        "permitir_comentarios": permitir_comentarios,
        "permitir_reutilizacion": permitir_reutilizacion,
        "permitir_remix": permitir_remix,
        "permitir_colaboracion": permitir_colaboracion,
        "permitir_descarga_gratuita": permitir_descarga_gratuita,
        "incluir_stems": incluir_stems,
        "incluir_trackouts": incluir_trackouts,
        "free_use": free_use,
        "es_autor": es_autor,
        "artista_original": artista_original,
        "plataforma_origen": plataforma_origen,
        "link_externo": link_externo,
        "licencias": parsed_licenses,
    }

    service = PostService(db)
    try:
        return await service.create_post(
            user_id=current_user.id,
            post_data=post_data,
            archivo=archivo,
            portada=portada,
            visual_loop=visual_loop,
            background_tasks=background_tasks
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CREATE_POST ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error al crear publicación: {str(e)}")


@router.get("/media/sign")
def get_signed_media_url(key: str, db: Session = Depends(deps.get_db)):
    from app.core.storage import generate_presigned_url
    url = generate_presigned_url(key, expiration=3600)
    if not url:
        raise HTTPException(status_code=404, detail="No se pudo generar URL firmada.")
    return {"url": url}


@router.get("/debug/{post_id}")
def debug_post_urls(post_id: int, db: Session = Depends(deps.get_db)):
    """Debug endpoint: shows raw DB URLs and what presigned URLs they become."""
    from app.core.storage import generate_presigned_url
    from app.core.config import settings

    post = db.query(Publicacion).filter(Publicacion.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    def sign_debug(field_name: str, stored: str | None) -> dict:
        if not stored:
            return {"raw": None, "signed": None, "key": None}
        key = _extract_s3_key(stored, settings.AWS_BUCKET_NAME or "") if stored.startswith("http") else None
        signed = generate_presigned_url(key) if key else None
        return {"raw": stored, "key": key, "signed": signed}

    return {
        "id": post.id,
        "bucket": settings.AWS_BUCKET_NAME,
        "endpoint": settings.AWS_ENDPOINT_URL,
        "archivo_original": sign_debug("archivo_original", post.archivo_original),
        "cover_url": sign_debug("cover_url", post.cover_url),
    }



def _extract_s3_key(stored_url: str, bucket_name: str) -> str | None:
    """
    Extract the S3 object key from a stored URL.
    NOTE: We deliberately do NOT URL-decode the key — the S3 objects were
    uploaded with URL-encoded characters (e.g. %20) as literal key chars.
    R2 handles the resulting double-encoding (%2520) gracefully on lookup.
    """
    import logging
    from urllib.parse import urlparse

    logger = logging.getLogger(__name__)

    if not stored_url or not stored_url.startswith('http'):
        return None

    parsed = urlparse(stored_url)
    path = parsed.path.lstrip('/')

    # Strip bucket prefix from path if present
    if path.startswith(f'{bucket_name}/'):
        key = path[len(f'{bucket_name}/'):]
    elif f'/{bucket_name}/' in f'/{path}':
        key = path.split(f'{bucket_name}/', 1)[-1]
    else:
        # Custom domain or r2.dev — whole path is the key
        key = path

    logger.info(f"Extracted S3 key '{key}' from '{stored_url}'")
    return key or None


def _sign_post(post: Publicacion) -> Publicacion:
    """Attach presigned URLs to a post object's media fields."""
    from app.core.storage import generate_presigned_url
    from app.core.config import settings

    if not settings.AWS_BUCKET_NAME:
        return post  # local dev: return as-is

    def sign(stored_url: str | None) -> str | None:
        if not stored_url:
            return None
        if not stored_url.startswith('http'):
            return stored_url  # local static file
        key = _extract_s3_key(stored_url, settings.AWS_BUCKET_NAME)
        if not key:
            return stored_url
        signed = generate_presigned_url(key)
        return signed or stored_url  # fallback to original if signing fails

    post.archivo_original = sign(post.archivo_original)
    post.archivo = sign(post.archivo)
    post.cover_url = sign(post.cover_url)
    post.visual_loop_url = sign(post.visual_loop_url)
    
    # Calculate base price from licenses for frontend
    if post.licencias:
        if isinstance(post.licencias, dict):
            prices = [float(l.get('precio', 0)) for l in post.licencias.values() if isinstance(l, dict) and l.get('disponible', True)]
            if prices:
                post.precio = min(prices)
        elif isinstance(post.licencias, list):
            usd_prices = [float(l.get('price_usd', 0)) for l in post.licencias if isinstance(l, dict)]
            ars_prices = [float(l.get('price_ars', 0)) for l in post.licencias if isinstance(l, dict)]
            if usd_prices:
                post.precio = min(usd_prices)
            if ars_prices:
                post.precio_ars = min(ars_prices)
    
    return post


@router.get("/me/purchased", response_model=List[post_schemas.PublicacionResponse])
def read_purchased_posts(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    from app.models.models import Transaccion
    
    # Get successful transactions for this user
    transactions = db.query(Transaccion).filter(
        Transaccion.usuario_id == current_user.id,
        Transaccion.estado == "completado"
    ).all()
    
    post_ids = [t.publicacion_id for t in transactions]
    if not post_ids:
        return []
        
    posts = db.query(Publicacion).filter(Publicacion.id.in_(post_ids)).all()
    
    return [_sign_post(p) for p in posts]


@router.get("/following", response_model=List[post_schemas.PublicacionResponse])
def read_following_posts(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 20,
):
    from app.core.cache import CacheService
    cache_key = f"feed_following_{current_user.id}_{skip}_{limit}"
    cached = CacheService.get(cache_key)
    if cached:
        return cached

    # Get IDs of followed users
    from app.models.models import followers
    followed_ids = [u.id for u in current_user.following]
    
    if not followed_ids:
        return []
        
    posts = db.query(Publicacion).filter(Publicacion.usuario_id.in_(followed_ids))\
             .order_by(Publicacion.fecha_subida.desc())\
             .offset(skip).limit(limit).all()
             
    result = [_sign_post(p) for p in posts]
    CacheService.set(cache_key, result, expire=60)
    return result


@router.get("/me/recent", response_model=List[post_schemas.PublicacionResponse])
def read_recent_plays(
    limit: int = 10,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """
    Get the current user's recently played posts.
    """
    from sqlalchemy import desc, func
    
    # Subquery to get the latest play for each post by this user
    subquery = db.query(
        Reproduccion.publicacion_id,
        func.max(Reproduccion.fecha).label('max_fecha')
    ).filter(Reproduccion.usuario_id == current_user.id)\
     .group_by(Reproduccion.publicacion_id)\
     .subquery()

    # Join with Publicacion to get the actual post data
    plays = db.query(Publicacion)\
        .join(subquery, Publicacion.id == subquery.c.publicacion_id)\
        .order_by(desc(subquery.c.max_fecha))\
        .limit(limit)\
        .all()
        
    return [_sign_post(p) for p in plays]


@router.get("/{post_id}", response_model=post_schemas.PublicacionResponse)
def read_post(
    post_id: int,
    db: Session = Depends(deps.get_db),
):
    post = db.query(Publicacion).filter(Publicacion.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
    return _sign_post(post)


@router.get("/", response_model=List[post_schemas.PublicacionResponse])
def read_posts(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 20,
    tipo_contenido: Optional[TipoContenido] = None,
    genero: Optional[GeneroMusical] = None,
    usuario_id: Optional[int] = None,
    visibilidad: Optional[str] = None,
):
    from app.core.cache import CacheService
    cache_key = f"feed_global_{skip}_{limit}_{tipo_contenido}_{genero}_{usuario_id}_{visibilidad}"
    cached = CacheService.get(cache_key)
    if cached:
        return cached

    query = db.query(Publicacion)
    if tipo_contenido:
        query = query.filter(Publicacion.tipo_contenido == tipo_contenido)
    if genero:
        query = query.filter(Publicacion.genero_musical == genero)
    if usuario_id:
        query = query.filter(Publicacion.usuario_id == usuario_id)
    if visibilidad:
        query = query.filter(Publicacion.visibilidad == visibilidad)

    posts = query.order_by(Publicacion.fecha_subida.desc()).offset(skip).limit(limit).all()
    result = [_sign_post(p) for p in posts]
    
    CacheService.set(cache_key, result, expire=60) # 1 min cache
    return result


@router.post("/{post_id}/like", response_model=social_schemas.SocialStats)
async def toggle_like(
    post_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    service = SocialService(db)
    return await service.toggle_like(current_user.id, post_id)

@router.post("/{post_id}/comments", response_model=social_schemas.CommentResponse)
async def create_comment(
    post_id: int,
    comment_in: social_schemas.CommentCreate,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    service = SocialService(db)
    comment = await service.create_comment(current_user.id, post_id, comment_in.texto)
    if not comment:
        raise HTTPException(status_code=404, detail="Post not found")
    return comment

@router.get("/{post_id}/comments", response_model=List[social_schemas.CommentResponse])
def read_comments(
    post_id: int,
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 50,
):
    return db.query(Comentario).filter(Comentario.publicacion_id == post_id)\
             .order_by(Comentario.fecha.asc())\
             .offset(skip).limit(limit).all()

@router.get("/{post_id}/stats", response_model=social_schemas.SocialStats)
def read_post_stats(
    post_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Optional[Usuario] = Depends(deps.get_current_user_optional),
):
    post = db.query(Publicacion).filter(Publicacion.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    is_liked = False
    if current_user:
        like = db.query(Like).filter(
            Like.usuario_id == current_user.id,
            Like.publicacion_id == post_id
        ).first()
        is_liked = True if like else False
        
    return {
        "likes_count": post.likes_count or 0,
        "comentarios_count": post.comments_count or 0,
        "is_liked": is_liked
    }

@router.put("/{post_id}", response_model=post_schemas.PublicacionResponse)
def update_post(
    post_id: int,
    post_in: post_schemas.PublicacionUpdate,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    service = PostService(db)
    post = service.update_post(post_id, current_user.id, post_in)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found or permission denied")
    return post

@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    service = PostService(db)
    if not service.delete_post(post_id, current_user.id):
        raise HTTPException(status_code=404, detail="Post not found or permission denied")
    return {"msg": "Post deleted"}

@router.patch("/{post_id}/monetization")
def update_post_monetization(
    post_id: int,
    allow_offers: Optional[bool] = Body(None),
    licencias: Optional[Any] = Body(None),
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    post = db.query(Publicacion).filter(Publicacion.id == post_id, Publicacion.usuario_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Beat no encontrado o no tienes permiso")
    
    if allow_offers is not None:
        post.allow_offers = allow_offers
    if licencias is not None:
        post.licencias = licencias
        
    db.commit()
    db.refresh(post)
    return _sign_post(post)

@router.post("/{post_id}/contract")
def upload_contract(
    post_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    post = db.query(Publicacion).filter(Publicacion.id == post_id, Publicacion.usuario_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Beat no encontrado")

    if not archivo.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF para contratos")

    safe_filename = f"contract_{post_id}_{int(datetime.now().timestamp())}.pdf"
    
    if settings.AWS_BUCKET_NAME and settings.AWS_ACCESS_KEY_ID:
        s3_url = upload_file_to_s3(archivo.file, f"contracts/{safe_filename}", archivo.content_type)
        if s3_url:
            post.contract_url = s3_url
    else:
        CONTRACTS_DIR = "static/contracts"
        os.makedirs(CONTRACTS_DIR, exist_ok=True)
        file_path = os.path.join(CONTRACTS_DIR, safe_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(archivo.file, buffer)
        post.contract_url = f"contracts/{safe_filename}"
        
    db.commit()
    return {"contract_url": post.contract_url}

@router.post("/{post_id}/offers")
async def make_offer(
    post_id: int,
    amount: float = Body(..., embed=True),
    message: str = Body("", embed=True),
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    post = db.query(Publicacion).filter(Publicacion.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Beat no encontrado")
        
    if not post.allow_offers:
        raise HTTPException(status_code=400, detail="Este beat no acepta ofertas actualmente")

    # Notificar al productor
    from .notifications import notify_user
    await notify_user(
        post.usuario_id,
        "new_offer",
        {
            "de": current_user.username,
            "monto": amount,
            "beat_id": post.id,
            "beat_titulo": post.titulo,
            "mensaje": message
        }
    )
    
    return {"status": "success", "message": "Oferta enviada correctamente"}


# ─── Like / Save ───────────────────────────────────────────────────────────────

@router.post("/{post_id}/save")
def toggle_save(
    post_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """Toggle save (bookmark) on a post."""
    service = SocialService(db)
    saved = service.toggle_save(current_user.id, post_id)
    return {"saved": saved}


# ─── Collaboration tagging ──────────────────────────────────────────────────────

@router.post("/{post_id}/collaborators/invite")
def invite_collaborator(
    post_id: int,
    user_id: int = Body(..., embed=True),
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """Invite a user to be a collaborator on a post."""
    from app.models.models import PostColaboracion, Usuario as U
    post = db.query(Publicacion).filter(Publicacion.id == post_id, Publicacion.usuario_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado o no te pertenece")
    invited = db.query(U).filter(U.id == user_id).first()
    if not invited:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    existing = db.query(PostColaboracion).filter(PostColaboracion.publicacion_id == post_id, PostColaboracion.usuario_id == user_id).first()
    if existing:
        return {"status": existing.status}
    collab = PostColaboracion(publicacion_id=post_id, usuario_id=user_id, status="pending")
    db.add(collab)
    db.commit()
    return {"status": "pending", "usuario_id": user_id}


@router.patch("/{post_id}/collaborators/accept")
def accept_collaboration(
    post_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """Accept a collaboration invitation on a post."""
    from app.models.models import PostColaboracion
    collab = db.query(PostColaboracion).filter(
        PostColaboracion.publicacion_id == post_id,
        PostColaboracion.usuario_id == current_user.id,
        PostColaboracion.status == "pending"
    ).first()
    if not collab:
        raise HTTPException(status_code=404, detail="Invitación no encontrada")
    collab.status = "accepted"
    db.commit()
    return {"status": "accepted"}


@router.patch("/{post_id}/collaborators/reject")
def reject_collaboration(
    post_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """Reject a collaboration invitation."""
    from app.models.models import PostColaboracion
    collab = db.query(PostColaboracion).filter(
        PostColaboracion.publicacion_id == post_id,
        PostColaboracion.usuario_id == current_user.id,
    ).first()
    if not collab:
        raise HTTPException(status_code=404, detail="Invitación no encontrada")
    collab.status = "rejected"
    db.commit()
    return {"status": "rejected"}


@router.delete("/{post_id}/collaborators")
def remove_collaboration(
    post_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """Remove self from a collaboration (user removes post from their collabs tab)."""
    from app.models.models import PostColaboracion
    collab = db.query(PostColaboracion).filter(
        PostColaboracion.publicacion_id == post_id,
        PostColaboracion.usuario_id == current_user.id,
    ).first()
    if collab:
        collab.status = "removed"
        db.commit()
    return {"status": "removed"}

@router.post("/{id}/play")
async def register_play(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: Optional[Usuario] = Depends(deps.get_current_user_optional),
    ip_address: str = Body(None, embed=True)
):
    """
    Register a play for a post. Uses IP hashing for unique listener tracking.
    """
    post = db.query(Publicacion).filter(Publicacion.id == id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    # Increment denormalized counter
    post.plays += 1
    
    # Hash IP for uniqueness tracking without storing PII
    ip_hash = hashlib.sha256(ip_address.encode()).hexdigest() if ip_address else "unknown"
    
    # Create detailed record
    play = Reproduccion(
        publicacion_id=id,
        usuario_id=current_user.id if current_user else None,
        ip_hash=ip_hash
    )
    
    db.add(play)
    db.commit()
    
    return {"message": "Reproducción registrada"}


@router.get("/me/recent", response_model=List[post_schemas.PublicacionResponse])
def read_recent_plays(
    limit: int = 10,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """
    Get the current user's recently played posts.
    """
    from sqlalchemy import desc, func
    
    # Subquery to get the latest play for each post by this user
    subquery = db.query(
        Reproduccion.publicacion_id,
        func.max(Reproduccion.fecha).label('max_fecha')
    ).filter(Reproduccion.usuario_id == current_user.id)\
     .group_by(Reproduccion.publicacion_id)\
     .subquery()

    # Join with Publicacion to get the actual post data
    plays = db.query(Publicacion)\
        .join(subquery, Publicacion.id == subquery.c.publicacion_id)\
        .order_by(desc(subquery.c.max_fecha))\
        .limit(limit)\
        .all()
        
    return [_sign_post(p) for p in plays]
