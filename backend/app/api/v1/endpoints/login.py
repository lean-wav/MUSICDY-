from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.models import Usuario, SesionUsuario
from app.schemas import token as token_schemas
from app.core.rate_limit import check_auth_brute_force, register_auth_failure, clear_auth_failures, rate_limiter
import uuid
from fastapi import Request

router = APIRouter()

@router.post("/login/access-token", response_model=token_schemas.Token, dependencies=[Depends(rate_limiter(times=5, seconds=60))])
async def login_access_token(
    request: Request,
    db: Session = Depends(deps.get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        from sqlalchemy import or_
        user = db.query(Usuario).filter(
            or_(
                Usuario.username == form_data.username,
                Usuario.email == form_data.username
            )
        ).first()
        
        # Check for brute force
        await check_auth_brute_force(form_data.username)

        if not user or not security.verify_password(form_data.password, user.password_hash):
            register_auth_failure(form_data.username)
            raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos")
            
        # Success
        clear_auth_failures(form_data.username)
        
        # Create JTI for session tracking
        jti = str(uuid.uuid4())
        
        # Register session
        new_session = SesionUsuario(
            usuario_id=user.id,
            token_jti=jti,
            ip_address=request.client.host if request.client else "127.0.0.1",
            device_name=request.headers.get("User-Agent", "Desconocido"),
            is_active=True
        )
        db.add(new_session)
        db.commit()

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return {
            "access_token": security.create_access_token(
                user.id, expires_delta=access_token_expires, jti=jti
            ),
            "token_type": "bearer",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error 500 in login_access_token: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error interno del servidor al iniciar sesión. Revisa los logs de Render."
        )

from pydantic import BaseModel, EmailStr

class ProviderLogin(BaseModel):
    email: EmailStr
    provider: str
    provider_id: str

@router.post("/login/provider", dependencies=[Depends(rate_limiter(times=10, seconds=60))])
async def login_provider(
    request: Request,
    data: ProviderLogin,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Login with external provider (Google, Apple).
    If user doesn't exist, tell frontend to complete registration.
    """
    user = db.query(Usuario).filter(Usuario.email == data.email).first()
    
    if not user:
        # Check if another user has this provider_id (to be safe)
        user_by_id = db.query(Usuario).filter(Usuario.provider_id == data.provider_id).first()
        if user_by_id:
            user = user_by_id
            
    if not user:
        return {
            "needs_registration": True,
            "email": data.email,
            "provider": data.provider,
            "provider_id": data.provider_id
        }
        
    # User exists, log them in
    jti = str(uuid.uuid4())
    new_session = SesionUsuario(
        usuario_id=user.id,
        token_jti=jti,
        ip_address=request.client.host if request.client else "127.0.0.1",
        device_name=request.headers.get("User-Agent", "Provider Login"),
        is_active=True
    )
    db.add(new_session)
    db.commit()

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires, jti=jti
        ),
        "token_type": "bearer",
    }

class PasswordRecovery(BaseModel):
    email: EmailStr

@router.post("/password-recovery")
def recover_password(
    data: PasswordRecovery,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Password Recovery.
    Sends an email with a secure token to reset the password.
    """
    user = db.query(Usuario).filter(Usuario.email == data.email).first()
    if not user:
        # Don't reveal if user exists or not for security, just say "If an account exists, an email was sent"
        return {"msg": "Si el correo está registrado, recibirás un enlace de recuperación."}
    
    from datetime import timedelta
    from app.core import security
    from app.utils.email import send_password_reset_email
    import asyncio
    
    # Generate a temporary JWT token for password reset
    reset_token = security.create_access_token(
        user.email, expires_delta=timedelta(hours=24)
    )
    
    # Store token in DB
    user.reset_password_token = reset_token
    db.commit()

    # Send email
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(send_password_reset_email(user.email, reset_token))
    except RuntimeError:
        asyncio.run(send_password_reset_email(user.email, reset_token))

    return {"msg": "Si el correo está registrado, recibirás un enlace de recuperación."}

class ResetPassword(BaseModel):
    token: str
    new_password: str

@router.post("/reset-password")
def reset_password(
    data: ResetPassword,
    db: Session = Depends(deps.get_db)
) -> Any:
    from app.core import security
    from jose import jwt, JWTError
    from app.core.config import settings

    try:
        payload = jwt.decode(data.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=400, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=400, detail="El token ha expirado o es inválido")

    user = db.query(Usuario).filter(Usuario.email == email).first()
    if not user or user.reset_password_token != data.token:
        raise HTTPException(status_code=400, detail="Token inválido o ya fue usado")

    # Update password and invalidate token
    user.password_hash = security.get_password_hash(data.new_password)
    user.reset_password_token = None
    db.commit()

    return {"msg": "Contraseña actualizada exitosamente"}
