from app.db.session import engine
from app.db.base_class import Base


# Import all models here for Alembic
from app.models.models import Usuario, Publicacion, Like, Comentario, Guardado, CategoriaExplorar
