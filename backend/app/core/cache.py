from redis import Redis
import json

# Initialize Redis (Docker service name is 'redis', localhost for direct run)
# Ideally from settings, but hardcoding for simplicity given previous setup
redis_client = Redis(host='localhost', port=6379, db=0, decode_responses=True)

class CacheService:
    @staticmethod
    def get(key: str):
        val = redis_client.get(key)
        if val:
            return json.loads(val)
        return None

    @staticmethod
    def set(key: str, value: dict, expire: int = 300):
        redis_client.setex(key, expire, json.dumps(value))

    @staticmethod
    def delete(key: str):
        redis_client.delete(key)
