from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from app.api import deps
from app.services.search import SearchService

router = APIRouter()

@router.get("/")
def search_content(q: str, limit: int = 20, db: Session = Depends(deps.get_db)):
    if not q:
        return {"posts": [], "users": []}
    
    # 1. Search posts via Meilisearch
    posts = SearchService.search_posts(q, limit)
    
    # 2. Search users via DB (simple ilike for now)
    from app.models.models import Usuario
    users = (
        db.query(Usuario)
        .filter(
            (Usuario.username.ilike(f"%{q}%")) | 
            (Usuario.nombre_artistico.ilike(f"%{q}%"))
        )
        .limit(limit)
        .all()
    )
    
    from app.api.v1.endpoints.users import _sign_user_media
    from app.schemas.user import UserProfile
    
    user_results = []
    for u in users:
        # Build a simplified profile for search results
        user_results.append({
            "id": u.id,
            "username": u.username,
            "nombre_artistico": u.nombre_artistico,
            "foto_perfil": _sign_user_media(u.foto_perfil),
            "verified_type": u.verified_type
        })

    return {
        "posts": posts,
        "users": user_results
    }

@router.post("/sync")
def sync_search_index():
    # Helper to manually trigger sync (should be admin only or background task)
    from app.db.session import SessionLocal
    from app.models.models import Publicacion
    
    db = SessionLocal()
    posts = db.query(Publicacion).all()
    SearchService.sync_all_posts(posts)
    db.close()
    return {"status": "synced", "count": len(posts)}
