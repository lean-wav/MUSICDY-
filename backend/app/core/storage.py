import boto3
from botocore.exceptions import NoCredentialsError
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def get_boto3_client():
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY or not settings.AWS_BUCKET_NAME:
         return None
         
    return boto3.client(
        's3',
        endpoint_url=settings.AWS_ENDPOINT_URL, # Used for non-AWS like R2 or Spaces
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
    )

def upload_file_to_s3(file_obj, object_name: str, content_type: str = None) -> str:
    """
    Upload a file to an S3 compatible storage (like AWS S3, Cloudflare R2, DigitalOcean Spaces)
    """
    s3_client = get_boto3_client()
    if not s3_client:
        logger.warning("Storage credentials not found, skipping cloud upload.")
        return None
        
    try:
        ExtraArgs = {'ACL': 'public-read'}
        if content_type:
             ExtraArgs['ContentType'] = content_type

        s3_client.upload_fileobj(file_obj, settings.AWS_BUCKET_NAME, object_name, ExtraArgs=ExtraArgs)
        
        # Build the public URL (If using R2, the format depends on your custom domain config)
        if settings.AWS_ENDPOINT_URL and 'r2.cloudflarestorage.com' in settings.AWS_ENDPOINT_URL:
            # Note: For Cloudflare R2 public links, you usually use a custom domain, 
            # this is just a placeholder example. Replace with your actual R2 public domain.
            public_url = f"https://your-r2-public-domain.com/{object_name}"
        else:
             # Standard AWS S3 format or DigitalOcean Spaces
             if settings.AWS_ENDPOINT_URL:
                 # Clean up https:// from endpoint
                 clean_endpoint = settings.AWS_ENDPOINT_URL.replace("https://", "").replace("http://", "")
                 public_url = f"https://{settings.AWS_BUCKET_NAME}.{clean_endpoint}/{object_name}"
             else:
                 public_url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{object_name}"
                 
        return public_url
    except Exception as e:
        logger.error(f"Error uploading to S3: {e}")
        return None
