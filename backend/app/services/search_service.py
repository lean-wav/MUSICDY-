import meilisearch
from app.core.config import settings
from app.models.models import Publicacion, Usuario

class SearchService:
    def __init__(self):
        self.client = meilisearch.Client(settings.MEILI_URL, settings.MEILI_MASTER_KEY)
        self.posts_index = self.client.index("posts")
        self.users_index = self.client.index("users")
        
        # Configure indices (once)
        self._setup_indices()

    def _setup_indices(self):
        try:
            self.posts_index.update_filterable_attributes([
                "tipo_contenido", "genero_musical", "bpm", "escala", "usuario_id", "visibilidad"
            ])
            self.posts_index.update_sortable_attributes(["fecha_subida", "plays", "likes_count"])
            
            self.users_index.update_filterable_attributes(["tipo_usuario", "is_verified", "country"])
            self.users_index.update_sortable_attributes(["followers_count", "total_plays"])
        except Exception:
            pass # Meilisearch might not be reachable during init

    def index_post(self, post: Publicacion):
        """Index or update a post in Meilisearch."""
        if post.is_private or post.visibilidad != "public":
            self.posts_index.delete_document(str(post.id))
            return

        data = {
            "id": post.id,
            "titulo": post.subtitulo or "",
            "descripcion": post.descripcion or "",
            "usuario_id": post.usuario_id,
            "tipo_contenido": post.tipo_contenido,
            "genero_musical": post.genero_musical,
            "subgenero": post.subgenero,
            "bpm": post.bpm,
            "escala": post.escala,
            "hashtags": post.hashtags,
            "fecha_subida": post.fecha_subida.timestamp(),
            "likes_count": post.likes_count,
            "plays": post.plays
        }
        self.posts_index.add_documents([data])

    def delete_post(self, post_id: int):
        self.posts_index.delete_document(str(post_id))

    def search_posts(self, query: str, filters: str = None, limit: int = 20, offset: int = 0):
        """
        Search with filters.
        Example filter: "bpm >= 120 AND bpm <= 140 AND genero_musical = 'Trap'"
        """
        params = {
            "filter": filters,
            "limit": limit,
            "offset": offset,
            "sort": ["fecha_subida:desc"]
        }
        return self.posts_index.search(query, params)

    def index_user(self, user: Usuario):
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
        self.users_index.add_documents([data])

search_service = SearchService()
