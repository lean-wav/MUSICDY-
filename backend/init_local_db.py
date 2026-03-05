from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.models import Usuario, Publicacion
from app.core.security import get_password_hash

def init_db():
    print("Creando tablas en la base de datos...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin user exists
        user = db.query(Usuario).filter(Usuario.username == "admin").first()
        if not user:
            print("Creando usuario de prueba: admin / password123")
            user = Usuario(
                username="admin",
                email="admin@example.com",
                password_hash=get_password_hash("password123"),
                bio="Admin profile for testing"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Refresh sample posts
        db.query(Publicacion).delete()
        print("Actualizando contenido de prueba...")
        samples = [
            {
                "titulo": "Trap Soul Beat",
                "artista": "Producer X",
                "tipo_contenido": "beat",
                "genero_musical": "Trap",
                "archivo": "audio1.mp3",
                "descripcion": "Un beat de trap oscuro para tu próximo hit.",
                "usuario_id": user.id
            },
            {
                "titulo": "Blue Notes",
                "artista": "Jazz Master",
                "tipo_contenido": "own_music",
                "genero_musical": "Jazz",
                "archivo": "audio2.mp3",
                "descripcion": "Smooth jazz for your soul",
                "usuario_id": user.id
            },
            {
                "titulo": "Midnight Love",
                "artista": "R&B Queen",
                "tipo_contenido": "own_music",
                "genero_musical": "R&B",
                "archivo": "audio3.mp3",
                "descripcion": "Classic R&B vibes",
                "usuario_id": user.id
            },
            {
                "titulo": "Summer Hit",
                "artista": "Young Artist",
                "tipo_contenido": "following",
                "genero_musical": "Pop",
                "archivo": "audio4.mp3",
                "descripcion": "Pop anthem of the year",
                "usuario_id": user.id
            },
        ]
        for s in samples:
            p = Publicacion(**s)
            db.add(p)
        db.commit()
        print("¡Contenido de prueba agregado!")

    finally:
        db.close()

if __name__ == "__main__":
    init_db()
