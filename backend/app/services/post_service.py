from sqlalchemy.orm import Session
from app.models.models import Publicacion, Usuario
from app.schemas.post import PublicacionUpdate
from typing import Optional, List
import os
import shutil
from datetime import datetime
from app.services.upload_service import handle_background_upload
from fastapi import BackgroundTasks

class PostService:
    def __init__(self, db: Session):
        self.db = db

    async def create_post(
        self,
        user_id: int,
        post_data: dict,
        archivo: Optional[any] = None,
        portada: Optional[any] = None,
        visual_loop: Optional[any] = None,
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Publicacion:
        UPLOAD_DIR = "uploads"
        timestamp_prefix = int(datetime.now().timestamp())
        
        original_location = None
        if archivo:
            os.makedirs(os.path.join(UPLOAD_DIR, "originals"), exist_ok=True)
            safe_filename = f"{timestamp_prefix}_{archivo.filename}"
            # Usar .replace(os.sep, "/") para asegurar compatibilidad web
            original_location = os.path.join(UPLOAD_DIR, "originals", safe_filename).replace(os.sep, "/")
            with open(original_location, "wb") as buffer:
                shutil.copyfileobj(archivo.file, buffer)

        cover_loc = None
        if portada:
            os.makedirs(os.path.join(UPLOAD_DIR, "covers"), exist_ok=True)
            cover_safe = f"{timestamp_prefix}_cover_{portada.filename}"
            cover_loc = os.path.join(UPLOAD_DIR, "covers", cover_safe).replace(os.sep, "/")
            with open(cover_loc, "wb") as buffer:
                shutil.copyfileobj(portada.file, buffer)

        loop_loc = None
        if visual_loop:
            os.makedirs(os.path.join(UPLOAD_DIR, "loops"), exist_ok=True)
            loop_safe = f"{timestamp_prefix}_loop_{visual_loop.filename}"
            loop_loc = os.path.join(UPLOAD_DIR, "loops", loop_safe).replace(os.sep, "/")
            with open(loop_loc, "wb") as buffer:
                shutil.copyfileobj(visual_loop.file, buffer)

        db_obj = Publicacion(
            **post_data,
            usuario_id=user_id,
            archivo_original=original_location,
            archivo=original_location, # provisional
            cover_url=cover_loc,
            visual_loop_url=loop_loc,
            fecha_subida=datetime.utcnow(),
            status="processing"
        )
        
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)

        if background_tasks:
            if archivo:
                background_tasks.add_task(
                    handle_background_upload, 
                    db_obj.id, original_location, archivo.filename, archivo.content_type, "original"
                )
            if portada:
                background_tasks.add_task(
                    handle_background_upload, 
                    db_obj.id, cover_loc, portada.filename, portada.content_type, "cover"
                )
            if visual_loop:
                background_tasks.add_task(
                    handle_background_upload, 
                    db_obj.id, loop_loc, visual_loop.filename, visual_loop.content_type, "loop"
                )
        
        return db_obj

    def get_post(self, post_id: int) -> Optional[Publicacion]:
        return self.db.query(Publicacion).filter(Publicacion.id == post_id).first()

    def update_post(self, post_id: int, user_id: int, post_in: PublicacionUpdate) -> Optional[Publicacion]:
        post = self.get_post(post_id)
        if not post or post.usuario_id != user_id:
            return None
        
        update_data = post_in.dict(exclude_unset=True)
        for field in update_data:
            setattr(post, field, update_data[field])
        
        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        return post

    def delete_post(self, post_id: int, user_id: int) -> bool:
        post = self.get_post(post_id)
        if not post or post.usuario_id != user_id:
            return False
        
        self.db.delete(post)
        self.db.commit()
        return True
