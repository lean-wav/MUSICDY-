from typing import List, Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.api import deps
from app.models.models import Usuario
import json
from datetime import datetime

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_text(json.dumps(message))

manager = ConnectionManager()

@router.websocket("/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    # En un entorno real, validaríamos el token aquí
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Mantener la conexión abierta
            data = await websocket.receive_text()
            # Podríamos procesar mensajes del cliente si fuera necesario
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

async def notify_user(user_id: int, notification_type: str, data: dict):
    message = {
        "type": notification_type,
        "data": data,
        "timestamp": str(datetime.utcnow())
    }
    await manager.send_personal_message(message, user_id)
