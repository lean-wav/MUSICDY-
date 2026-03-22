import smtplib
import logging
from email.message import EmailMessage
from app.core.config import settings
from typing import Optional

logger = logging.getLogger(__name__)

async def send_email(to_email: str, subject: str, body: str, is_html: bool = False):
    """
    Sends an email using standard SMTP. If SMTP credentials aren't configured,
    it simply logs the email to the console (useful for development).
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"--- FAKE EMAIL SENDING (No SMTP config) ---")
        logger.warning(f"To: {to_email}")
        logger.warning(f"Subject: {subject}")
        logger.warning(f"Body:\n{body}")
        logger.warning(f"--------------------------------------------")
        return True

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = settings.SMTP_USER
    msg['To'] = to_email
    
    if is_html:
        msg.set_content(body, subtype='html')
    else:
        msg.set_content(body)

    # Allow configuration via env, fallback to Gmail default for ease
    smtp_host = getattr(settings, 'SMTP_HOST', 'smtp.gmail.com')
    smtp_port = getattr(settings, 'SMTP_PORT', 587)
    
    try:
        # We run this in an executor or block here since smtplib is synchronous.
        # In a real heavy-load production app, we would use aiosmtplib.
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            logger.info(f"Email sent successfully to {to_email}")
            return True
    except Exception as e:
        logger.error(f"Error sending email to {to_email}: {e}")
        return False

async def send_verification_email(to_email: str, username: str, token: str):
    frontend_url = getattr(settings, "FRONTEND_URL", "https://musicdy.com")
    verify_url = f"{frontend_url}/verify-email?token={token}"
    
    subject = "Verifica tu cuenta en Musicdy"
    body = f"""
    Hola {username},
    
    ¡Gracias por registrarte en Musicdy!
    Por favor, verifica tu correo haciendo clic en el siguiente enlace:
    
    {verify_url}
    
    Si no creaste esta cuenta, ignora este correo.
    
    El equipo de Musicdy
    """
    await send_email(to_email, subject, body, is_html=False)

async def send_password_reset_email(to_email: str, token: str):
    frontend_url = getattr(settings, "FRONTEND_URL", "https://musicdy.com")
    reset_url = f"{frontend_url}/reset-password?token={token}"
    
    subject = "Recuperación de contraseña en Musicdy"
    body = f"""
    Hemos recibido una solicitud para cambiar tu contraseña.
    
    Usa el siguiente enlace para establecer una nueva contraseña. El enlace expirará en 24 horas:
    
    {reset_url}
    
    Si no solicitaste este cambio, simplemente ignora este correo.
    
    El equipo de Musicdy
    """
    await send_email(to_email, subject, body, is_html=False)
