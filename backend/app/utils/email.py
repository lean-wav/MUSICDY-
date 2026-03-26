import smtplib
import ssl
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


def generate_otp(length: int = 6) -> str:
    """Generate a random numeric OTP code."""
    return ''.join(random.choices(string.digits, k=length))


def _create_smtp_connection():
    """Create an SSL SMTP connection to Hostinger."""
    context = ssl.create_default_context()
    server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context)
    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
    return server


def send_otp_email(to_email: str, otp_code: str, username: str = "") -> bool:
    """
    Send OTP verification email via Hostinger SMTP.
    Returns True on success, False on failure (never raises).
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — skipping OTP email (set SMTP_USER and SMTP_PASSWORD in Render env)")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Tu código de verificación — Musicdy"
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = to_email

        html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;overflow:hidden;">
                  <tr>
                    <td style="background:#FFD700;padding:24px;text-align:center;">
                      <h1 style="margin:0;color:#000;font-size:28px;font-weight:900;letter-spacing:-1px;">MUSICDY</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px 32px;text-align:center;">
                      <p style="color:#ccc;font-size:16px;margin:0 0 32px;">{"Hola <strong style='color:#fff'>@" + username + "</strong>!<br>" if username else ""}
                        Usá este código para verificar tu cuenta:</p>
                      <div style="background:#1a1a1a;border:2px solid #FFD700;border-radius:12px;display:inline-block;padding:20px 40px;">
                        <span style="color:#FFD700;font-size:40px;font-weight:900;letter-spacing:12px;">{otp_code}</span>
                      </div>
                      <p style="color:#888;font-size:13px;margin:24px 0 0;">Este código expira en <strong style="color:#ccc">10 minutos</strong>.<br>
                        Si no creaste esta cuenta, ignorá este mensaje.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 32px 24px;text-align:center;">
                      <p style="color:#555;font-size:11px;margin:0;">© 2024 Musicdy — La red social musical</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """

        msg.attach(MIMEText(html, "html"))

        with _create_smtp_connection() as server:
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())

        logger.info(f"OTP email sent to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}")
        return False


def send_password_reset_email(email: str, otp_code: str) -> bool:
    """
    Send password reset OTP email.
    Returns True on success, False on failure.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — skipping password reset email")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Recuperación de contraseña — Musicdy"
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = email

        html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;overflow:hidden;">
                  <tr>
                    <td style="background:#FFD700;padding:24px;text-align:center;">
                      <h1 style="margin:0;color:#000;font-size:28px;font-weight:900;letter-spacing:-1px;">MUSICDY</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px 32px;text-align:center;">
                      <p style="color:#ccc;font-size:16px;margin:0 0 32px;">¿Olvidaste tu contraseña?<br>Usá este código para resetearla:</p>
                      <div style="background:#1a1a1a;border:2px solid #EF476F;border-radius:12px;display:inline-block;padding:20px 40px;">
                        <span style="color:#EF476F;font-size:40px;font-weight:900;letter-spacing:12px;">{otp_code}</span>
                      </div>
                      <p style="color:#888;font-size:13px;margin:24px 0 0;">Este código expira en <strong style="color:#ccc">15 minutos</strong>.<br>
                        Si no pediste esto, ignorá este mensaje.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 32px 24px;text-align:center;">
                      <p style="color:#555;font-size:11px;margin:0;">© 2024 Musicdy</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """

        msg.attach(MIMEText(html, "html"))

        with _create_smtp_connection() as server:
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())

        logger.info(f"Password reset email sent to {email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send password reset email to {email}: {e}")
        return False
