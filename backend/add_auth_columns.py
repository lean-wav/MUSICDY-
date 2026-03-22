import sqlite3
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_db():
    conn = sqlite3.connect("musica.db")
    cursor = conn.cursor()
    
    columns_to_add = [
        ("verification_token", "VARCHAR"),
        ("reset_password_token", "VARCHAR"),
        ("reset_password_expire", "DATETIME")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE usuarios ADD COLUMN {col_name} {col_type}")
            logger.info(f"Added column {col_name} successfully.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                logger.info(f"Column {col_name} already exists.")
            else:
                logger.error(f"Error adding {col_name}: {e}")
                
    conn.commit()
    conn.close()
    logger.info("Database update finished.")

if __name__ == "__main__":
    update_db()
