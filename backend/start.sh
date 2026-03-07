#!/bin/bash

# Generar migraciones automáticamente si es necesario (sin bloquear la app)
echo "Running database migrations..."
alembic upgrade head || true

# Start Gunicorn usando el puerto dinámico de Render/Railway
PORT="${PORT:-8000}"
echo "Starting Gunicorn on port $PORT..."
exec gunicorn app.main:app \
    --workers 1 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:$PORT
