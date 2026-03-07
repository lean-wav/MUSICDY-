from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL, 
    pool_pre_ping=True,
    pool_size=2,          # Max connections kept open in pool
    max_overflow=3,       # Max extra connections allowed if pool is exhausted
    pool_recycle=1800     # Recycle connections after 30 mins to prevent stale connections
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
