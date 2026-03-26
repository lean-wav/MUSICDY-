import random
import logging
from fastapi import BackgroundTasks
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from app.core.config import settings

logger = logging.getLogger(__name__)

# Lazy-initialized so missing env vars don't crash startup
_mail_conf = None


def _get_mail_conf() -> ConnectionConfig | None:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP_USER / SMTP_PASSWORD not configured — emails will be skipped")
        return None
    global _mail_conf
    if _mail_conf is None:
        _mail_conf = ConnectionConfig(
            MAIL_USERNAME=settings.SMTP_USER,
            MAIL_PASSWORD=settings.SMTP_PASSWORD,
            MAIL_FROM=settings.SMTP_USER,
            MAIL_FROM_NAME=settings.SMTP_FROM_NAME,
            MAIL_PORT=settings.SMTP_PORT,
            MAIL_SERVER=settings.SMTP_HOST,
            MAIL_STARTTLS=False,
            MAIL_SSL_TLS=True,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
        )
    return _mail_conf


def generate_otp(length: int = 6) -> str:
    """Return a random numeric OTP code."""
    return f"{random.randint(10 ** (length - 1), 10 ** length - 1)}"


async def _send_otp_email_async(to_email: str, otp_code: str, username: str = "") -> None:
    conf = _get_mail_conf()
    if not conf:
        return

    greeting = f"Hola <strong>@{username}</strong>!<br>" if username else ""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
        <tr><td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#FFD700;padding:24px;text-align:center;">
                <h1 style="margin:0;color:#000;font-size:28px;font-weight:900;letter-spacing:-1px;">MUSICDY</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 32px;text-align:center;">
                <p style="color:#ccc;font-size:16px;margin:0 0 32px;">
                  {greeting}Tu código de verificación es:
                </p>
                <div style="background:#1a1a1a;border:2px solid #FFD700;border-radius:12px;display:inline-block;padding:20px 40px;">
                  <span style="color:#FFD700;font-size:40px;font-weight:900;letter-spacing:12px;">{otp_code}</span>
                </div>
                <p style="color:#888;font-size:13px;margin:24px 0 0;">
                  Este código expira en <strong style="color:#ccc">10 minutos</strong>.<br>
                  Si no creaste esta cuenta, ignorá este mensaje.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px;text-align:center;">
                <p style="color:#555;font-size:11px;margin:0;">© 2024 Musicdy — La red social musical</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """

    message = MessageSchema(
        subject="Tu código de verificación — Musicdy 🎶",
        recipients=[to_email],
        body=html,
        subtype=MessageType.html,
    )

    try:
        fm = FastMail(conf)
        await fm.send_message(message)
        logger.info(f"OTP email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}")


async def _send_reset_email_async(to_email: str, otp_code: str) -> None:
    conf = _get_mail_conf()
    if not conf:
        return

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
        <tr><td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#FFD700;padding:24px;text-align:center;">
                <h1 style="margin:0;color:#000;font-size:28px;font-weight:900;letter-spacing:-1px;">MUSICDY</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 32px;text-align:center;">
                <p style="color:#ccc;font-size:16px;margin:0 0 32px;">
                  ¿Olvidaste tu contraseña?<br>Usá este código para resetearla:
                </p>
                <div style="background:#1a1a1a;border:2px solid #EF476F;border-radius:12px;display:inline-block;padding:20px 40px;">
                  <span style="color:#EF476F;font-size:40px;font-weight:900;letter-spacing:12px;">{otp_code}</span>
                </div>
                <p style="color:#888;font-size:13px;margin:24px 0 0;">
                  Expira en <strong style="color:#ccc">15 minutos</strong>.<br>
                  Si no lo pediste, ignorá este mensaje.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px;text-align:center;">
                <p style="color:#555;font-size:11px;margin:0;">© 2024 Musicdy</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """

    message = MessageSchema(
        subject="Recuperación de contraseña — Musicdy",
        recipients=[to_email],
        body=html,
        subtype=MessageType.html,
    )

    try:
        fm = FastMail(conf)
        await fm.send_message(message)
        logger.info(f"Password reset email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {e}")


# ── Sync wrappers for use with BackgroundTasks.add_task ──────────────────────
# BackgroundTasks.add_task supports coroutines directly since FastAPI 0.93+

def send_otp_email(to_email: str, otp_code: str, username: str = "") -> None:
    """Sync entry point — FastAPI BackgroundTasks will await this coroutine."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Running inside async context (normal FastAPI usage)
            loop.create_task(_send_otp_email_async(to_email, otp_code, username))
        else:
            loop.run_until_complete(_send_otp_email_async(to_email, otp_code, username))
    except Exception as e:
        logger.error(f"send_otp_email wrapper error: {e}")


def send_password_reset_email(to_email: str, otp_code: str) -> None:
    """Sync entry point for password reset email."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_send_reset_email_async(to_email, otp_code))
        else:
            loop.run_until_complete(_send_reset_email_async(to_email, otp_code))
    except Exception as e:
        logger.error(f"send_password_reset_email wrapper error: {e}")
