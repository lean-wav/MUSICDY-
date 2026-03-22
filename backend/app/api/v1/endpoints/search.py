from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from app.api import deps
from app.services.search import SearchService

router = APIRouter()

@router.get("/")
def search_content(
    q: str = "", 
    tipo: Optional[str] = None,
    genre: Optional[str] = None,
    min_bpm: Optional[int] = None,
    max_bpm: Optional[int] = None,
    escala: Optional[str] = None,
    limit: int = 20, 
    offset: int = 0
):
    """
    Advanced search for posts and users using Meilisearch filters.
    """
    filters = []
    if tipo:
        filters.append(f"tipo_contenido = '{tipo}'")
    if genre:
        filters.append(f"genero_musical = '{genre}'")
    if min_bpm:
        filters.append(f"bpm >= {min_bpm}")
    if max_bpm:
        filters.append(f"bpm <= {max_bpm}")
    if escala:
        filters.append(f"escala = '{escala}'")
    
    filter_str = " AND ".join(filters) if filters else None
    
    # 1. Search posts
    posts_hits = SearchService.search_posts(q, filters=filter_str, limit=limit, offset=offset)
    
    # 2. Search users (if no technical filters are applied)
    user_results = []
    if not (min_bpm or max_bpm or escala):
        user_hits = SearchService.search_users(q, limit=limit)
        for u in user_hits:
            user_results.append({
                "id": u["id"],
                "username": u["username"],
                "nombre_artistico": u.get("nombre_artistico"),
                "tipo_usuario": u.get("tipo_usuario"),
                "is_verified": u.get("is_verified", False)
            })

    return {
        "posts": posts_hits,
        "users": user_results
    }


@router.post("/sync")
def sync_search_index(db: Session = Depends(deps.get_db)):
    """Manually trigger full sync of posts and users."""
    from app.models.models import Publicacion, Usuario
    posts = db.query(Publicacion).all()
    users = db.query(Usuario).all()
    
    SearchService.setup_indices()
    SearchService.sync_all(posts, users)
    
    return {"status": "sync_triggered", "posts_count": len(posts), "users_count": len(users)}
