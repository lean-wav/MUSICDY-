import redis
import json
from app.core.config import settings

# Initialize Redis safely. If it fails, we just bypass cache.
try:
    if settings.REDIS_URL:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    else:
        redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    # Test connection
    redis_client.ping()
except Exception as e:
    redis_client = None
    print(f"Warning: Redis cache disabled due to connection error: {e}")

class CacheService:
    @staticmethod
    def get(key: str):
        if not redis_client:
            return None
        try:
            val = redis_client.get(key)
            if val:
                return json.loads(val)
        except Exception:
            pass
        return None

    @staticmethod
    def set(key: str, value: dict, expire: int = 300):
        if not redis_client:
            return
        try:
            redis_client.setex(key, expire, json.dumps(value))
        except Exception:
            pass

    @staticmethod
    def delete(key: str):
        if not redis_client:
            return
        try:
            redis_client.delete(key)
        except Exception:
            pass
