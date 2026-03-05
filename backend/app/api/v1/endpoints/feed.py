from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.models.models import Publicacion, Usuario
from app.schemas import post as post_schemas

router = APIRouter()

from app.core.cache import CacheService
import json
from datetime import datetime, timedelta

@router.get("/recommendations", response_model=List[post_schemas.PublicacionResponse])
def read_recommendations(
    limit: int = 10,
    skip: int = 0,
    db: Session = Depends(deps.get_db),
    # current_user: Usuario = Depends(deps.get_current_user) # Optional for public feed
):
    # Try to get from cache
    cache_key = f"feed:recommendations:{limit}:{skip}"
    cached_data = CacheService.get(cache_key)
    if cached_data:
        # CacheService.get returns a string, need to parse it back to list of dicts
        return json.loads(cached_data)

    # Calculate date 30 days ago
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    # Simple algorithm: Recent posts 
    # In a real app, this would be complex (collaborative filtering, etc.)
    posts = db.query(Publicacion)\
        .filter(Publicacion.fecha_subida >= thirty_days_ago)\
        .order_by(Publicacion.fecha_subida.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    # Save to cache (5 minutes)
    posts_data = [post_schemas.PublicacionResponse.from_orm(p).dict() for p in posts]
    # Serialize datetime objects for JSON
    for p in posts_data:
        p['fecha_subida'] = p['fecha_subida'].isoformat()
        
    CacheService.set(cache_key, json.dumps(posts_data), expire=300)
        
    return posts
