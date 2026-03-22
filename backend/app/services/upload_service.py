import os
import shutil
import logging
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.models import Publicacion
from app.core.storage import upload_file_to_s3
from app.core.config import settings

logger = logging.getLogger(__name__)

def handle_background_upload(
    post_id: int,
    temp_file_path: str,
    original_filename: str,
    content_type: str,
    file_type: str = "original" # original, cover, loop
):
    db = SessionLocal()
    try:
        post = db.query(Publicacion).filter(Publicacion.id == post_id).first()
        if not post:
            logger.error(f"Post {post_id} not found for background upload")
            return

        # Upload to S3 if configured
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_BUCKET_NAME:
            folder = "originals" if file_type == "original" else "covers" if file_type == "cover" else "loops"
            safe_filename = os.path.basename(temp_file_path)
            
            with open(temp_file_path, "rb") as f:
                s3_url = upload_file_to_s3(f, f"{folder}/{safe_filename}", content_type)
            
            if s3_url:
                if file_type == "original":
                    post.archivo_original = s3_url
                    post.archivo = s3_url # Default preview is the original for now
                elif file_type == "cover":
                    post.cover_url = s3_url
                elif file_type == "loop":
                    post.visual_loop_url = s3_url
                
                db.add(post)
                db.commit()
                logger.info(f"Background upload successful for post {post_id} ({file_type})")
            else:
                logger.error(f"Failed to upload {file_type} to S3 for post {post_id}")
        
        # If it was the original file, trigger processing if needed
        if file_type == "original":
            post.status = "ready" # Or "processing" if you trigger Celery
            db.add(post)
            db.commit()
            
            # Here you could trigger Celery audio processing
            try:
                from app.worker import process_audio
                # Use the S3 URL if available, else use temp path (risky for separate workers)
                location = post.archivo_original or temp_file_path
                process_audio.delay(post.id, location)
            except Exception as e:
                logger.warning(f"Could not trigger Celery task: {e}")

    except Exception as e:
        logger.error(f"Error in handle_background_upload: {e}", exc_info=True)
    finally:
        # We don't delete the temp file here if Celery might need it, 
        # but in a real prod env with S3, we should clean up after S3 upload.
        # For now, let's keep it if S3 failed as a fallback.
        db.close()
