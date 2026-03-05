import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.models import Publicacion
from app.services.search import SearchService

def sync_data():
    print("Starting Meilisearch sync...")
    db = SessionLocal()
    try:
        posts = db.query(Publicacion).all()
        print(f"Found {len(posts)} posts. Indexing...")
        SearchService.sync_all_posts(posts)
        print("Sync completed!")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    sync_data()
