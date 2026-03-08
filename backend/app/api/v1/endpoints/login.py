from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.models import Usuario
from app.schemas import token as token_schemas

router = APIRouter()

@router.post("/login/access-token", response_model=token_schemas.Token)
def login_access_token(
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    from sqlalchemy import or_
    user = db.query(Usuario).filter(
        or_(
            Usuario.username == form_data.username,
            Usuario.email == form_data.username
        )
    ).first()
    
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

from pydantic import BaseModel, EmailStr

class ProviderLogin(BaseModel):
    email: EmailStr
    provider: str
    provider_id: str

@router.post("/login/provider")
def login_provider(
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
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
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
    
    # In a real app, generate a JWT token and send an email via SendGrid, AWS SES, etc.
    # We will simulate this for now.
    
    return {"msg": "Si el correo está registrado, recibirás un enlace de recuperación."}
