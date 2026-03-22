from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Musicdy"
    API_V1_STR: str = "/api/v1"
    
    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "musicdy"
    DATABASE_URL: Optional[str] = None

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 dias para testing

    # AWS / Storage / CDN
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_BUCKET_NAME: Optional[str] = None
    AWS_REGION: Optional[str] = None
    AWS_ENDPOINT_URL: Optional[str] = None
    R2_PUBLIC_URL: Optional[str] = None  # e.g. https://pub-XXXX.r2.dev or custom domain

    # Stripe
    STRIPE_API_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    # MercadoPago
    MERCADOPAGO_ACCESS_TOKEN: Optional[str] = None
    MERCADOPAGO_PUBLIC_KEY: Optional[str] = None

    # Meilisearch
    MEILI_URL: str = "http://localhost:7700"
    MEILI_MASTER_KEY: str = "masterKey123"

    # Redis
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"

    # SMTP Correo
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    MERCADOPAGO_ACCESS_TOKEN: Optional[str] = None
    MERCADOPAGO_PUBLIC_KEY: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.DATABASE_URL and self.DATABASE_URL.startswith("postgres://"):
            self.DATABASE_URL = self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
            
        if not self.DATABASE_URL:
            if self.POSTGRES_SERVER == "localhost":
                 # Development fallback to SQLite
                 self.DATABASE_URL = "sqlite:///./musica.db"
            else:
                 self.DATABASE_URL = f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

settings = Settings()
