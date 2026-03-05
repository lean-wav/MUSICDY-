import boto3
from botocore.exceptions import ClientError
from app.core.config import settings
import logging

def send_verification_email(user_email: str, username: str, verification_token: str):
    """
    Envía un correo de verificación transaccional a través de AWS SES.
    """
    # Preferiblemente configurado en variables de entorno, este es el correo verificado en SES que envía los mensajes.
    SENDER = "Registro Musicdy <no-reply@musicdy.com>"
    AWS_REGION = settings.AWS_REGION or "us-east-1"
    
    # URL al frontend o un endpoint de fastapi que valide el token y redirija
    VERIFICATION_LINK = f"http://192.168.0.140:8000/api/v1/users/verify-email?token={verification_token}"

    SUBJECT = "¡Bienvenido a Musicdy! Verifica tu cuenta"
    
    # Versión HTML súper limpia
    BODY_HTML = f"""<html>
    <head></head>
    <body style="background-color:#000; color:#fff; font-family:Arial, sans-serif; padding: 20px;">
      <h1 style="color:#06D6A0;">Bienvenido a bordo, @{username} 🎵</h1>
      <p style="color:#aaa;">Estás a un paso de entrar a tu nueva casa musical. Para mantener la red segura, necesitamos verificar tu correo.</p>
      <a href="{VERIFICATION_LINK}" style="background-color:#06D6A0; color:#000; padding:12px 24px; text-decoration:none; border-radius:8px; display:inline-block; font-weight:bold; margin-top:16px;">
        Verificar Mi Cuenta
      </a>
      <p style="color:#555; font-size: 12px; margin-top:24px;">Este enlace expirará en 24 horas.</p>
    </body>
    </html>
    """

    client = boto3.client(
        'ses',
        region_name=AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
    )

    try:
        response = client.send_email(
            Destination={'ToAddresses': [user_email]},
            Message={
                'Body': {'Html': {'Charset': "UTF-8", 'Data': BODY_HTML}},
                'Subject': {'Charset': "UTF-8", 'Data': SUBJECT},
            },
            Source=SENDER,
        )
        logging.info(f"Email sent! Message ID: {response['MessageId']}")
    except ClientError as e:
        logging.error(f"Error enviando correo SES: {e.response['Error']['Message']}")
