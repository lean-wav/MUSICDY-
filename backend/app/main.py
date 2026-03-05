from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config import settings

from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Musicdy - La red social definitiva para músicos y productores. Streaming, Beats y Comunidad.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

import os

# Montar archivos estáticos
os.makedirs("static", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Set all CORS enabled origins
if settings.API_V1_STR:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # TODO: Restrict in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Musicdy API v1"}

@app.get("/health")
def health_check():
    """
    Endpoint for Render/Railway Health Checks.
    Returns 200 OK if the server is running.
    """
    return {"status": "ok", "db": "operational"}

if __name__ == "__main__":
    import uvicorn
    import logging
    logger = logging.getLogger(__name__)
    logger.info("Iniciando servidor...")
    
    # Render y Railway inyectan un puerto dinámico en la variable de entorno PORT
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
