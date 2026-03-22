from typing import List, Dict, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.api import deps
from app.models.models import Usuario
import json
from datetime import datetime

router = APIRouter()

from jose import jwt
from app.core.config import settings
from app.api import deps
from sqlalchemy.orm import Session

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
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    # Connection might be stale
                    pass

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, 
    token: str
):
    """
    WebSocket endpoint secured with JWT.
    """
    try:
        # Validate token
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
        
        await manager.connect(websocket, user_id)
        
        try:
            while True:
                # Keep alive and listen for optional client commands
                data = await websocket.receive_text()
                # Handle pings or client-side read receipts here
        except WebSocketDisconnect:
            manager.disconnect(websocket, user_id)
            
    except Exception:
        # Invalid token or other error
        await websocket.close(code=4003)

@router.get("/", response_model=List[dict])
def get_notifications(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    """
    Get notification history for the current user.
    """
    from app.models.models import Notificacion
    notifications = (
        db.query(Notificacion)
        .filter(Notificacion.usuario_id == current_user.id)
        .order_by(Notificacion.created_at.desc())
        .limit(50)
        .all()
    )
    
    # Optional: Mark as read
    # for n in notifications: n.is_read = True
    # db.commit()
    
    return [
        {
            "id": n.id,
            "tipo": n.tipo,
            "data": n.data,
            "is_read": n.is_read,
            "created_at": str(n.created_at)
        } for n in notifications
    ]

async def notify_user(user_id: int, notification_type: str, data: dict, db: Optional[Session] = None):
    """
    Send real-time notification and persist it if db session is provided.
    """
    from app.models.models import Notificacion
    
    # 1. Persist to DB if session exists
    if db:
        db_notif = Notificacion(
            usuario_id=user_id,
            tipo=notification_type,
            data=data
        )
        db.add(db_notif)
        db.commit()

    # 2. Send real-time message
    message = {
        "type": notification_type,
        "data": data,
        "timestamp": str(datetime.utcnow())
    }
    await manager.send_personal_message(message, user_id)
