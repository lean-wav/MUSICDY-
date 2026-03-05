import sys
import os
sys.path.append(os.getcwd())
import sqlalchemy
from sqlalchemy import create_engine, inspect
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
inspector = inspect(engine)
print("Tables in DB:", inspector.get_table_names())
