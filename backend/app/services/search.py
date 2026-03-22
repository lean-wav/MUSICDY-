import meilisearch
from app.core.config import settings
from app.models.models import Publicacion, Usuario

class SearchService:
    _client = meilisearch.Client(settings.MEILI_URL, settings.MEILI_MASTER_KEY)
    _posts_index = _client.index("posts")
    _users_index = _client.index("users")

    @classmethod
    def setup_indices(cls):
        """Configure indices filterable and sortable attributes."""
        try:
            cls._posts_index.update_filterable_attributes([
                "tipo_contenido", "genero_musical", "bpm", "escala", "usuario_id", "visibilidad"
            ])
            cls._posts_index.update_sortable_attributes(["fecha_subida", "plays", "likes_count"])
            
            cls._users_index.update_filterable_attributes(["tipo_usuario", "is_verified", "country"])
            cls._users_index.update_sortable_attributes(["followers_count", "total_plays"])
        except Exception as e:
            print(f"Meilisearch setup error: {e}")

    @classmethod
    def index_post(cls, post: Publicacion):
        """Index or update a post in Meilisearch."""
        if post.is_private or post.visibilidad != "public":
            cls._posts_index.delete_document(str(post.id))
            return

        # Prepare tags for search (join list into string or just index as is if Meili supports it)
        tags_str = " ".join(post.tags) if post.tags and isinstance(post.tags, list) else ""

        data = {
            "id": post.id,
            "titulo": post.titulo or "",
            "subtitulo": post.subtitulo or "",
            "descripcion": post.descripcion or "",
            "usuario_id": post.usuario_id,
            "tipo_contenido": post.tipo_contenido,
            "genero_musical": post.genero_musical,
            "subgenero": post.subgenero,
            "bpm": post.bpm,
            "escala": post.escala,
            "hashtags": post.hashtags,
            "tags": tags_str,
            "fecha_subida": int(post.fecha_subida.timestamp()) if post.fecha_subida else 0,
            "likes_count": post.likes_count,
            "plays": post.plays
        }
        cls._posts_index.add_documents([data])

    @classmethod
    def delete_post(cls, post_id: int):
        cls._posts_index.delete_document(str(post_id))

    @classmethod
    def search_posts(cls, query: str, filters: str = None, limit: int = 20, offset: int = 0):
        params = {
            "filter": filters,
            "limit": limit,
            "offset": offset,
            "sort": ["fecha_subida:desc"]
        }
        result = cls._posts_index.search(query, params)
        return result["hits"]

    @classmethod
    def index_user(cls, user: Usuario):
        data = {
            "id": user.id,
            "username": user.username,
            "nombre_artistico": user.nombre_artistico,
            "bio": user.bio,
            "tipo_usuario": user.tipo_usuario,
            "followers_count": user.followers_count,
            "is_verified": user.is_verified,
            "country": user.country
        }
        cls._users_index.add_documents([data])

    @classmethod
    def search_users(cls, query: str, filters: str = None, limit: int = 20):
        params = {
            "filter": filters,
            "limit": limit
        }
        result = cls._users_index.search(query, params)
        return result["hits"]

    @classmethod
    def sync_all(cls, posts: list, users: list = None):
        """Manually sync all records."""
        if posts:
            documents = []
            for p in posts:
                if not p.is_private and p.visibilidad == "public":
                    tags_str = " ".join(p.tags) if p.tags and isinstance(p.tags, list) else ""
                    documents.append({
                        "id": p.id,
                        "titulo": p.titulo or "",
                        "subtitulo": p.subtitulo or "",
                        "descripcion": p.descripcion or "",
                        "usuario_id": p.usuario_id,
                        "tipo_contenido": p.tipo_contenido,
                        "genero_musical": p.genero_musical,
                        "bpm": p.bpm,
                        "escala": p.escala,
                        "tags": tags_str,
                        "fecha_subida": int(p.fecha_subida.timestamp()) if p.fecha_subida else 0
                    })
            if documents:
                cls._posts_index.add_documents(documents)
        
        if users:
            user_docs = [{
                "id": u.id,
                "username": u.username,
                "nombre_artistico": u.nombre_artistico,
                "tipo_usuario": u.tipo_usuario
            } for u in users]
            if user_docs:
                cls._users_index.add_documents(user_docs)
