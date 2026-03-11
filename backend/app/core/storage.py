import boto3
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def get_boto3_client():
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY or not settings.AWS_BUCKET_NAME:
        return None

    from botocore.config import Config

    is_r2 = settings.AWS_ENDPOINT_URL and 'r2.cloudflarestorage.com' in settings.AWS_ENDPOINT_URL
    detected_region = 'auto' if is_r2 else (settings.AWS_REGION or 'us-east-1')

    my_config = Config(
        region_name=detected_region,
        signature_version='s3v4',
        retries={'max_attempts': 3, 'mode': 'standard'}
    )

    return boto3.client(
        's3',
        endpoint_url=settings.AWS_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=my_config
    )

def upload_file_to_s3(file_obj, object_name: str, content_type: str = None) -> str:
    """
    Upload a file to S3-compatible storage (AWS S3, Cloudflare R2, DigitalOcean Spaces).
    Returns the public URL of the uploaded file, or raises HTTPException on failure.
    """
    s3_client = get_boto3_client()
    if not s3_client:
        logger.warning("Storage credentials not configured, skipping upload.")
        return None

    try:
        from boto3.s3.transfer import TransferConfig

        ExtraArgs = {}
        if content_type:
            ExtraArgs['ContentType'] = content_type

        # NOTE: Cloudflare R2 does NOT support ACLs (public-read).
        # Make the bucket public via the R2 dashboard instead.
        # For AWS S3, uncomment the next line:
        # ExtraArgs['ACL'] = 'public-read'

        config = TransferConfig(
            multipart_threshold=5 * 1024 * 1024,
            max_concurrency=2,
            multipart_chunksize=5 * 1024 * 1024,
            use_threads=True
        )

        s3_client.upload_fileobj(
            file_obj,
            settings.AWS_BUCKET_NAME,
            object_name,
            ExtraArgs=ExtraArgs,
            Config=config
        )

        # ─── Build the public URL ───────────────────────────────────────────
        is_r2 = settings.AWS_ENDPOINT_URL and 'r2.cloudflarestorage.com' in settings.AWS_ENDPOINT_URL

        if is_r2:
            if settings.R2_PUBLIC_URL:
                # Use the custom domain / r2.dev public URL from env
                base = settings.R2_PUBLIC_URL.rstrip('/')
                public_url = f"{base}/{object_name}"
            else:
                # Fallback: derive from endpoint URL
                # AWS_ENDPOINT_URL looks like: https://<accountid>.r2.cloudflarestorage.com
                clean = settings.AWS_ENDPOINT_URL.rstrip('/')
                public_url = f"{clean}/{settings.AWS_BUCKET_NAME}/{object_name}"
        elif settings.AWS_ENDPOINT_URL:
            # DigitalOcean Spaces or other S3-compatible
            clean = settings.AWS_ENDPOINT_URL.replace("https://", "").replace("http://", "").rstrip('/')
            public_url = f"https://{settings.AWS_BUCKET_NAME}.{clean}/{object_name}"
        else:
            # Standard AWS S3
            public_url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{object_name}"

        logger.info(f"Uploaded {object_name} → {public_url}")
        return public_url

    except Exception as e:
        logger.error(f"Error uploading to storage: {e}", exc_info=True)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Fallo AWS/R2: {str(e)}")
