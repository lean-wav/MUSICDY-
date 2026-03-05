from meilisearch import Client
from app.core.config import settings

client = Client(settings.MEILI_URL, settings.MEILI_MASTER_KEY)

class SearchService:
    @staticmethod
    def index_post(post_data: dict):
        try:
            client.index('posts').add_documents([post_data])
        except Exception as e:
            print(f"Error indexing post via Meilisearch: {e}")

    @staticmethod
    def search_posts(query: str, limit: int = 20):
        try:
            result = client.index('posts').search(query, {'limit': limit})
            return result['hits']
        except Exception as e:
            print(f"Error searching via Meilisearch: {e}")
            return []
            
    @staticmethod
    def sync_all_posts(db_posts: list):
        try:
            documents = []
            for p in db_posts:
                doc = {
                    'id': p.id,
                    'titulo': p.titulo,
                    'artista': p.artista,
                    'genero_musical': p.genero_musical,
                    'tipo_contenido': p.tipo_contenido,
                    'hashtags': p.hashtags,
                    'descripcion': p.descripcion
                }
                documents.append(doc)
            
            task = client.index('posts').add_documents(documents)
            print(f"Meilisearch sync task: {task.task_uid}")
        except Exception as e:
            print(f"Error syncing Meilisearch: {e}")
