from pydantic import BaseModel

class CategoriaExplorarResponse(BaseModel):
    id: int
    nombre: str
    descripcion: str
    imagen_url: str
    orden: int

    class Config:
        from_attributes = True
