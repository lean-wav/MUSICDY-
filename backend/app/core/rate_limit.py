from fastapi import HTTPException, Request
from app.core.cache import redis_client
import time

def rate_limiter(times: int, seconds: int):
    """
    Simple rate limiter using Redis.
    Limits to 'times' requests per 'seconds' per IP.
    """
    async def decorator(request: Request):
        if not redis_client:
            return # Bypass if Redis is not available
            
        ip = request.client.host
        path = request.url.path
        key = f"rate_limit:{path}:{ip}"
        
        try:
            current_count = redis_client.get(key)
            if current_count and int(current_count) >= times:
                raise HTTPException(
                    status_code=429, 
                    detail="Demasiadas peticiones. Intenta de nuevo más tarde."
                )
            
            pipe = redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, seconds)
            pipe.execute()
        except HTTPException:
            raise
        except Exception:
            pass # Don't block user if Redis fails here
            
    return decorator

async def check_auth_brute_force(username: str):
    """Specific check for login brute force."""
    if not redis_client: return
    
    try:
        key = f"login_attempts:{username}"
        attempts = redis_client.get(key)
        if attempts and int(attempts) >= 5:
            # Block for 15 minutes after 5 failed attempts
            raise HTTPException(
                status_code=403,
                detail="Cuenta bloqueada temporalmente por seguridad. Intenta en 15 minutos."
            )
    except HTTPException:
        raise
    except Exception:
        pass

def register_auth_failure(username: str):
    if not redis_client: return
    try:
        key = f"login_attempts:{username}"
        redis_client.incr(key)
        redis_client.expire(key, 900) # 15 min lock window
    except Exception:
        pass

def clear_auth_failures(username: str):
    if not redis_client: return
    try:
        redis_client.delete(f"login_attempts:{username}")
    except Exception:
        pass
