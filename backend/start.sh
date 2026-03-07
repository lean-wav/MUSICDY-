#!/bin/bash

# Generar migraciones automáticamente si es necesario (sin bloquear la app)
echo "Running database migrations..."
alembic upgrade head || true

# Start Uvicorn directly for better memory efficiency and logging on Free Tier
PORT="${PORT:-8000}"
echo "Starting Uvicorn on port $PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
