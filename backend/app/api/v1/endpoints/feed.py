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

def _sign_post(post: Publicacion) -> dict:
    """Helper to sign URLs for recommendations and convert to dict."""
    from app.core.storage import generate_presigned_url
    from app.core.config import settings
    
    # Simple JSON conversion first
    data = post_schemas.PublicacionResponse.from_orm(post).dict()
    
    if not settings.AWS_BUCKET_NAME:
        return data  # local development as is

    def sign(stored_url: str | None) -> str | None:
        if not stored_url or not stored_url.startswith('http'): 
            return stored_url
        from app.api.v1.endpoints.posts import _extract_s3_key
        key = _extract_s3_key(stored_url, settings.AWS_BUCKET_NAME)
        if not key: return stored_url
        return generate_presigned_url(key) or stored_url

    data['archivo'] = sign(data.get('archivo'))
    data['cover_url'] = sign(data.get('cover_url'))
    data['visual_loop_url'] = sign(data.get('visual_loop_url'))
    # Clean up datetime objects
    if isinstance(data.get('fecha_subida'), datetime):
        data['fecha_subida'] = data['fecha_subida'].isoformat()
    return data


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
        return json.loads(cached_data)

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    posts = db.query(Publicacion)\
        .filter(Publicacion.fecha_subida >= thirty_days_ago)\
        .order_by(Publicacion.fecha_subida.desc())\
        .offset(skip).limit(limit).all()
    
    posts_data = [_sign_post(p) for p in posts]
    CacheService.set(cache_key, json.dumps(posts_data), expire=300)
    return posts_data


@router.get("/trending/country", response_model=List[post_schemas.PublicacionResponse])
def read_trending_by_country(
    limit: int = 10,
    db: Session = Depends(deps.get_db),
    current_user: Optional[Usuario] = Depends(deps.get_current_user_optional),
):
    """
    Get trending posts from producers in the user's country.
    """
    # Prefer AR (Argentina) if no user logged in or country missing
    user_country = current_user.country if current_user and current_user.country else "AR"
    
    cache_key = f"feed:trending:{user_country}:{limit}"
    cached = CacheService.get(cache_key)
    if cached: return json.loads(cached)

    # Join with Usuario to filter by author's country
    posts = db.query(Publicacion)\
        .join(Usuario, Publicacion.usuario_id == Usuario.id)\
        .filter(Usuario.country == user_country)\
        .order_by(Publicacion.plays.desc(), Publicacion.fecha_subida.desc())\
        .limit(limit).all()
        
    posts_data = [_sign_post(p) for p in posts]
    CacheService.set(cache_key, json.dumps(posts_data), expire=600) # 10 min cache
    return posts_data
