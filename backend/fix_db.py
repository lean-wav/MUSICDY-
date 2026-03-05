import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
with engine.connect() as connection:
    connection.execute(text("DROP TABLE IF EXISTS alembic_version"))
    connection.commit()
    try:
        connection.execute(text("ALTER TABLE usuarios ADD COLUMN provider VARCHAR DEFAULT 'email'"))
        connection.execute(text("ALTER TABLE usuarios ADD COLUMN provider_id VARCHAR"))
        connection.execute(text("ALTER TABLE usuarios ADD COLUMN is_verified BOOLEAN DEFAULT 0"))
        connection.execute(text("ALTER TABLE usuarios ADD COLUMN account_status VARCHAR DEFAULT 'active'"))
        connection.execute(text("ALTER TABLE usuarios ADD COLUMN tipo_usuario VARCHAR DEFAULT 'Oyente'"))
        connection.commit()
        print("Updated columns successfully.")
    except Exception as e:
        print("Columns might already exist:", e)
