from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.models.models import Usuario, Publicacion

router = APIRouter()

@router.post("/track/play/{post_id}")
def track_play(post_id: int, db: Session = Depends(deps.get_db)):
    post = db.query(Publicacion).filter(Publicacion.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    
    post.plays += 1
    db.commit()
    return {"status": "ok", "plays": post.plays}

@router.post("/track/profile/{user_id}")
def track_profile_view(user_id: int, db: Session = Depends(deps.get_db)):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user.profile_views += 1
    db.commit()
    return {"status": "ok", "views": user.profile_views}
