from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.services.search import SearchService

router = APIRouter()

@router.get("/", response_model=List[dict])
def search_content(q: str, limit: int = 20):
    if not q:
        return []
    
    results = SearchService.search_posts(q, limit)
    return results

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
