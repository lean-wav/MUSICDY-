from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Like, Comentario, Guardado, Publicacion, Usuario, followers
from typing import Optional
import asyncio
from app.api.v1.endpoints.notifications import notify_user as ws_notify
from app.core.cache import CacheService

class SocialService:
    def __init__(self, db: Session):
        self.db = db

    def _invalidate_feed_cache(self, user_id: Optional[int] = None):
        """Invalidate general and personal feed caches."""
        CacheService.delete("feed_global")
        if user_id:
            CacheService.delete(f"feed_following_{user_id}")

    async def toggle_like(self, user_id: int, post_id: int) -> dict:
        post = self.db.query(Publicacion).filter(Publicacion.id == post_id).with_for_update().first()
        if not post:
            return None
        
        like = self.db.query(Like).filter(
            Like.usuario_id == user_id,
            Like.publicacion_id == post_id
        ).first()

        is_liked = False
        if like:
            self.db.delete(like)
            if post.likes_count is None: post.likes_count = 0
            post.likes_count -= 1
            if post.likes_count < 0: post.likes_count = 0
        else:
            db_like = Like(usuario_id=user_id, publicacion_id=post_id)
            self.db.add(db_like)
            if post.likes_count is None: post.likes_count = 0
            post.likes_count += 1
            is_liked = True
            
        self.db.commit()
        self._invalidate_feed_cache()

        if is_liked:
            user_who_liked = self.db.query(Usuario).filter(Usuario.id == user_id).first()
            asyncio.create_task(ws_notify(
                user_id=post.usuario_id,
                notification_type="NEW_LIKE",
                data={
                    "post_id": post_id,
                    "liker_name": user_who_liked.username if user_who_liked else "Alguien",
                    "post_title": post.titulo
                },
                db=self.db
            ))

        return {
            "likes_count": post.likes_count,
            "comentarios_count": post.comments_count or 0,
            "is_liked": is_liked
        }

    async def create_comment(self, user_id: int, post_id: int, texto: str) -> Optional[Comentario]:
        post = self.db.query(Publicacion).filter(Publicacion.id == post_id).with_for_update().first()
        if not post:
            return None
            
        db_comment = Comentario(texto=texto, usuario_id=user_id, publicacion_id=post_id)
        self.db.add(db_comment)
        
        if post.comments_count is None: post.comments_count = 0
        post.comments_count += 1
        
        self.db.commit()
        self.db.refresh(db_comment)
        self._invalidate_feed_cache()

        user_who_commented = self.db.query(Usuario).filter(Usuario.id == user_id).first()
        asyncio.create_task(ws_notify(
            user_id=post.usuario_id,
            notification_type="NEW_COMMENT",
            data={
                "post_id": post_id,
                "commenter_name": user_who_commented.username if user_who_commented else "Alguien",
                "comment_text": texto,
                "post_title": post.titulo
            },
            db=self.db
        ))

        return db_comment

    def toggle_save(self, user_id: int, post_id: int) -> bool:
        post = self.db.query(Publicacion).filter(Publicacion.id == post_id).with_for_update().first()
        if not post:
            return False
            
        existing = self.db.query(Guardado).filter(Guardado.usuario_id == user_id, Guardado.publicacion_id == post_id).first()

        if existing:
            self.db.delete(existing)
            if post.saves_count is None: post.saves_count = 0
            post.saves_count -= 1
            if post.saves_count < 0: post.saves_count = 0
            saved = False
        else:
            self.db.add(Guardado(usuario_id=user_id, publicacion_id=post_id))
            if post.saves_count is None: post.saves_count = 0
            post.saves_count += 1
            saved = True
            
        self.db.commit()
        return saved

    async def toggle_follow(self, follower_id: int, followed_id: int) -> dict:
        if follower_id == followed_id: return {"error": "No puedes seguirte a ti mismo"}

        follower = self.db.query(Usuario).filter(Usuario.id == follower_id).with_for_update().first()
        followed = self.db.query(Usuario).filter(Usuario.id == followed_id).with_for_update().first()
        
        if not follower or not followed: return {"error": "Usuario no encontrado"}

        is_following = self.db.query(followers).filter(
            followers.c.follower_id == follower_id,
            followers.c.followed_id == followed_id
        ).first() is not None

        if is_following:
            self.db.execute(followers.delete().where(followers.c.follower_id == follower_id, followers.c.followed_id == followed_id))
            if follower.following_count is None: follower.following_count = 0
            if followed.followers_count is None: followed.followers_count = 0
            follower.following_count -= 1
            followed.followers_count -= 1
            result = False
        else:
            self.db.execute(followers.insert().values(follower_id=follower_id, followed_id=followed_id))
            if follower.following_count is None: follower.following_count = 0
            if followed.followers_count is None: followed.followers_count = 0
            follower.following_count += 1
            followed.followers_count += 1
            result = True
            
            asyncio.create_task(ws_notify(
                user_id=followed_id,
                notification_type="NEW_FOLLOWER",
                data={"follower_id": follower_id, "follower_name": follower.username},
                db=self.db
            ))

        self.db.commit()
        self._invalidate_feed_cache(follower_id)
        return {
            "is_following": result,
            "followers_count": followed.followers_count,
            "following_count": followed.following_count
        }
