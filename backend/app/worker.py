from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.models import Publicacion
import librosa
import numpy as np
import os

import subprocess

UPLOAD_DIR = "uploads"

@celery_app.task(acks_late=True)
def process_audio(publicacion_id: int, file_path: str):
    db = SessionLocal()
    try:
        # Create previews directory
        previews_dir = os.path.join(UPLOAD_DIR, "previews")
        os.makedirs(previews_dir, exist_ok=True)
        
        filename = os.path.basename(file_path)
        base_name = os.path.splitext(filename)[0]
        
        path_hq = os.path.join(previews_dir, f"{base_name}_320k.mp3")
        path_stream = os.path.join(previews_dir, f"{base_name}_128k.mp3")

        # 1. Generate MP3 320kbps (HQ Preview) & Normalize Metadata
        # -map_metadata -1 removes all metadata
        subprocess.run([
            "ffmpeg", "-i", file_path, 
            "-codec:a", "libmp3lame", "-b:a", "320k", 
            "-map_metadata", "-1",
            "-y", path_hq
        ], check=True)

        # 2. Generate MP3 128kbps (Fast Stream)
        subprocess.run([
            "ffmpeg", "-i", file_path, 
            "-codec:a", "libmp3lame", "-b:a", "128k", 
            "-map_metadata", "-1",
            "-y", path_stream
        ], check=True)

        # 3. Analyze Audio (BPM & Key)
        y, sr = librosa.load(file_path)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        key_idx = np.argmax(np.mean(chroma, axis=1))
        notas = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        escala = notas[key_idx]

        # 4. Update DB
        publicacion = db.query(Publicacion).filter(Publicacion.id == publicacion_id).first()
        if publicacion:
            publicacion.archivo_preview_hq = path_hq
            publicacion.archivo_preview_stream = path_stream
            publicacion.archivo = path_stream # Default for feed
            publicacion.bpm = round(tempo)
            publicacion.escala = escala
            publicacion.status = "ready"
            db.commit()
            
    except Exception as e:
        print(f"Error processing audio for {publicacion_id}: {e}")
        publicacion = db.query(Publicacion).filter(Publicacion.id == publicacion_id).first()
        if publicacion:
            publicacion.status = "error"
            db.commit()
    finally:
        db.close()

@celery_app.task(acks_late=True)
def analyze_audio(publicacion_id: int, file_path: str):
    # Keeping old one just in case, but structure it to not conflict
    db = SessionLocal()
    try:
        # Check if file exists
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            return

        y, sr = librosa.load(file_path)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        key_idx = np.argmax(np.mean(chroma, axis=1))
        notas = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        escala = notas[key_idx]
        
        # Update DB
        publicacion = db.query(Publicacion).filter(Publicacion.id == publicacion_id).first()
        if publicacion:
            publicacion.bpm = round(tempo)
            publicacion.escala = escala
            db.commit()
            
    except Exception as e:
        print(f"Error analyzing audio: {e}")
    finally:
        db.close()
