from typing import List, Optional
from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException, status, Body
from sqlalchemy.orm import Session
from app.api import deps
from app.models.models import Publicacion, Usuario, Like, Comentario
from app.schemas import post as post_schemas, social as social_schemas
from app.schemas.enums import TipoContenido, GeneroMusical, TipoLicencia
from app.worker import analyze_audio
import shutil
import os
from datetime import datetime
from app.api.v1.endpoints.notifications import notify_user as ws_notify
import asyncio
from app.core.storage import upload_file_to_s3
from app.core.config import settings


router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=post_schemas.PublicacionResponse)
def create_post(
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
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    import json
    
    original_location = None
    if tipo_contenido in [TipoContenido.BEAT, TipoContenido.OWN_MUSIC, TipoContenido.VIDEO_TERCEROS, TipoContenido.VIDEO]:
        if not archivo:
            raise HTTPException(status_code=400, detail="Este tipo de contenido requiere un archivo adjunto.")
        
        file_ext = os.path.splitext(archivo.filename)[1].lower()
        if tipo_contenido in [TipoContenido.VIDEO, TipoContenido.VIDEO_TERCEROS]:
            ALLOWED_EXTENSIONS = [".mp4", ".mov"]
        else:
            ALLOWED_EXTENSIONS = [".wav", ".aiff", ".aif", ".flac"]
            
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato no permitido. Por favor sube archivos: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Limit (200MB)
        MAX_FILE_SIZE = 200 * 1024 * 1024 
        if archivo.size and archivo.size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo es demasiado grande."
            )

        timestamp_prefix = int(datetime.now().timestamp())
        safe_filename = f"{timestamp_prefix}_{archivo.filename}"
        
        # If AWS is enabled in .env, upload to S3 directly:
        if settings.AWS_BUCKET_NAME and settings.AWS_ACCESS_KEY_ID:
            s3_url = upload_file_to_s3(archivo.file, f"originals/{safe_filename}", archivo.content_type)
            if s3_url:
                original_location = s3_url
            else:
                raise HTTPException(status_code=500, detail="Fallo la conexión con Cloud Storage.")
        else:
            # Fallback local (Development only)
            os.makedirs(os.path.join(UPLOAD_DIR, "originals"), exist_ok=True)
            original_location = os.path.join(UPLOAD_DIR, "originals", safe_filename)
            with open(original_location, "wb") as buffer:
                shutil.copyfileobj(archivo.file, buffer)
    else:
        timestamp_prefix = int(datetime.now().timestamp())
        
    # Salvar Portada
    cover_loc = None
    if portada:
        cover_safe = f"{timestamp_prefix}_cover_{portada.filename}"
        if settings.AWS_BUCKET_NAME and settings.AWS_ACCESS_KEY_ID:
            s3_url = upload_file_to_s3(portada.file, f"covers/{cover_safe}", portada.content_type)
            if s3_url: cover_loc = s3_url
        else:
            # Fallback Local
            os.makedirs(os.path.join(UPLOAD_DIR, "covers"), exist_ok=True)
            cover_full = os.path.join(UPLOAD_DIR, "covers", cover_safe)
            with open(cover_full, "wb") as buffer:
                shutil.copyfileobj(portada.file, buffer)
            cover_loc = f"/static/covers/{cover_safe}" 
        
    # Salvar Visual Loop
    loop_loc = None
    if visual_loop:
        loop_safe = f"{timestamp_prefix}_loop_{visual_loop.filename}"
        if settings.AWS_BUCKET_NAME and settings.AWS_ACCESS_KEY_ID:
            s3_url = upload_file_to_s3(visual_loop.file, f"loops/{loop_safe}", visual_loop.content_type)
            if s3_url: loop_loc = s3_url
        else:
            os.makedirs(os.path.join(UPLOAD_DIR, "loops"), exist_ok=True)
            loop_full = os.path.join(UPLOAD_DIR, "loops", loop_safe)
            with open(loop_full, "wb") as buffer:
                shutil.copyfileobj(visual_loop.file, buffer)
            loop_loc = f"/static/loops/{loop_safe}"
        
    # Parsear JSONs
    parsed_tags = json.loads(tags) if tags else []
    parsed_mood = json.loads(mood) if mood else []
    parsed_creditos = json.loads(creditos) if creditos else {}

    # 4. Create DB object with 'processing' status
    db_obj = Publicacion(
        titulo=titulo,
        artista=artista or current_user.username,
        tipo_contenido=tipo_contenido,
        genero_musical=genero_musical,
        subgenero=subgenero,
        descripcion=descripcion or "",
        subtitulo=subtitulo,
        archivo_original=original_location,
        archivo=original_location, # Fallback while processing
        cover_url=cover_loc,
        visual_loop_url=loop_loc,
        hashtags=hashtags,
        tags=parsed_tags,
        mood=parsed_mood,
        inspirado_en=inspirado_en,
        idioma=idioma,
        creditos=parsed_creditos,
        isrc=isrc,
        contacto=contacto,
        bpm=bpm,
        escala=escala,
        visibilidad=visibilidad,
        permitir_comentarios=permitir_comentarios,
        permitir_reutilizacion=permitir_reutilizacion,
        permitir_remix=permitir_remix,
        permitir_colaboracion=permitir_colaboracion,
        permitir_descarga_gratuita=permitir_descarga_gratuita,
        incluir_stems=incluir_stems,
        incluir_trackouts=incluir_trackouts,
        free_use=free_use,
        es_autor=es_autor,
        artista_original=artista_original,
        plataforma_origen=plataforma_origen,
        link_externo=link_externo,
        usuario_id=current_user.id,
        fecha_subida=datetime.utcnow(),
        status="processing",
    )
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    # 5. Trigger Background Processing
    from app.worker import process_audio
    process_audio.delay(db_obj.id, original_location)
        
    return db_obj

@router.get("/", response_model=List[post_schemas.PublicacionResponse])
def read_posts(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 20,
    tipo_contenido: Optional[TipoContenido] = None,
    genero: Optional[GeneroMusical] = None,
    usuario_id: Optional[int] = None,
):
    query = db.query(Publicacion)
    if tipo_contenido:
        query = query.filter(Publicacion.tipo_contenido == tipo_contenido)
    if genero:
        query = query.filter(Publicacion.genero_musical == genero)
    if usuario_id:
        query = query.filter(Publicacion.usuario_id == usuario_id)
        
    return query.order_by(Publicacion.fecha_subida.desc()).offset(skip).limit(limit).all()

@router.get("/following", response_model=List[post_schemas.PublicacionResponse])
def read_following_posts(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 20,
):
    """
    Get posts from users that the current user follows.
    """
    # Get IDs of followed users
    from app.models.models import followers
    followed_ids = [u.id for u in current_user.following]
    
    if not followed_ids:
        return []
        
    return db.query(Publicacion).filter(Publicacion.usuario_id.in_(followed_ids))\
             .order_by(Publicacion.fecha_subida.desc())\
             .offset(skip).limit(limit).all()

@router.post("/{post_id}/like", response_model=social_schemas.SocialStats)
def toggle_like(
    post_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    post = db.query(Publicacion).filter(Publicacion.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    like = db.query(Like).filter(
        Like.usuario_id == current_user.id,
        Like.publicacion_id == post_id
    ).first()
    
    if like:
        db.delete(like)
        is_liked = False
    else:
        db_like = Like(usuario_id=current_user.id, publicacion_id=post_id)
        db.add(db_like)
        is_liked = True
        
    db.commit()
    
    # Trigger Notification for Like
    if not is_liked == False: # If it was a like, not an unlike
        asyncio.create_task(ws_notify(
            user_id=post.usuario_id,
            notification_type="NEW_LIKE",
            data={
                "post_id": post_id,
                "liker_name": current_user.username,
                "post_title": post.titulo
            }
        ))
    
    likes_count = db.query(Like).filter(Like.publicacion_id == post_id).count()
    comments_count = db.query(Comentario).filter(Comentario.publicacion_id == post_id).count()
    
    return {
        "likes_count": likes_count,
        "comentarios_count": comments_count,
        "is_liked": is_liked
    }

@router.post("/{post_id}/comments", response_model=social_schemas.CommentResponse)
def create_comment(
    post_id: int,
    comment_in: social_schemas.CommentCreate,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    post = db.query(Publicacion).filter(Publicacion.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    db_comment = Comentario(
        texto=comment_in.texto,
        usuario_id=current_user.id,
        publicacion_id=post_id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)

    # Trigger Notification for Comment
    asyncio.create_task(ws_notify(
        user_id=post.usuario_id,
        notification_type="NEW_COMMENT",
        data={
            "post_id": post_id,
            "commenter_name": current_user.username,
            "comment_text": db_comment.texto,
            "post_title": post.titulo
        }
    ))

    return db_comment

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
    likes_count = db.query(Like).filter(Like.publicacion_id == post_id).count()
    comments_count = db.query(Comentario).filter(Comentario.publicacion_id == post_id).count()
    
    is_liked = False
    if current_user:
        like = db.query(Like).filter(
            Like.usuario_id == current_user.id,
            Like.publicacion_id == post_id
        ).first()
        is_liked = True if like else False
        
    return {
        "likes_count": likes_count,
        "comentarios_count": comments_count,
        "is_liked": is_liked
    }

@router.put("/{post_id}", response_model=post_schemas.PublicacionResponse)
def update_post(
    post_id: int,
    post_in: post_schemas.PublicacionUpdate,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    post = db.query(Publicacion).filter(Publicacion.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    update_data = post_in.dict(exclude_unset=True)
    for field in update_data:
        setattr(post, field, update_data[field])
    
    db.add(post)
    db.commit()
    db.refresh(post)
    return post

@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    post = db.query(Publicacion).filter(Publicacion.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db.delete(post)
    db.commit()
    return {"msg": "Post deleted"}

@router.patch("/{post_id}/monetization")
def update_post_monetization(
    post_id: int,
    allow_offers: Optional[bool] = Body(None),
    licencias: Optional[dict] = Body(None),
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
    return post

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

from fastapi import Body
