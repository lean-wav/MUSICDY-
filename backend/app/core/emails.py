import smtplib
from email.message import EmailMessage
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def send_verification_email(user_email: str, username: str, verification_token: str):
    """
    Envía un correo de verificación transaccional a través de SMTP o imprime el link en consola
    """
    SENDER = settings.SMTP_USER or "Registro Musicdy <no-reply@musicdy.com>"
    
    # URL de nuestro backend en Render
    VERIFICATION_LINK = f"https://musicdy-backend.onrender.com/api/v1/users/verify-email?token={verification_token}"

    SUBJECT = "¡Bienvenido a Musicdy! Verifica tu cuenta"
    
    BODY_HTML = f"""<html>
    <head></head>
    <body style="background-color:#000; color:#fff; font-family:Arial, sans-serif; padding: 20px;">
      <h1 style="color:#06D6A0;">Bienvenido a bordo, @{username} 🎵</h1>
      <p style="color:#aaa;">Estás a un paso de entrar a tu nueva casa musical. Para mantener la red segura, necesitamos verificar tu correo.</p>
      <a href="{VERIFICATION_LINK}" style="background-color:#06D6A0; color:#000; padding:12px 24px; text-decoration:none; border-radius:8px; display:inline-block; font-weight:bold; margin-top:16px;">
        Verificar Mi Cuenta
      </a>
      <p style="color:#555; font-size: 12px; margin-top:24px;">Si el botón no funciona pega el siguiente enlace: {VERIFICATION_LINK}</p>
      <p style="color:#555; font-size: 12px; margin-top:24px;">Este enlace expirará en 24 horas.</p>
    </body>
    </html>
    """

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"============================ \n"
                       f"⚠️ ALERTA DE NUEVO REGISTRO: No hay SMTP configurado para mandar correo a {user_email}.\n"
                       f"👉 HAZ CLIC EN ESTE LINK A CONTINUACIÓN PARA VERIFICARLO MANUALMENTE: \n{VERIFICATION_LINK}\n"
                       f"============================")
        return

    try:
        msg = EmailMessage()
        msg['Subject'] = SUBJECT
        msg['From'] = SENDER
        msg['To'] = user_email
        msg.add_alternative(BODY_HTML, subtype='html')

        # Conectar a Gmail SMTP (Puedes cambiarlo por Sendgrid u otro configurándolo)
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
            
        logger.info(f"Email de verificación enviado exitosamente a {user_email}")
    except Exception as e:
        logger.error(f"Error enviando correo SMTP a {user_email}: {e}")
        # Salvavidas en consola en caso de fallo
        logger.warning(f"👉 Link manual de verificación para {user_email}: {VERIFICATION_LINK}")
