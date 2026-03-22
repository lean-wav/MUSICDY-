from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api import deps
from app.models.models import Usuario, Conversacion, ParticipanteConversacion, MensajeChat
from app.schemas.chat import MessageChat, MessageChatCreate, ConversationList, MessageChatBase
from app.api.v1.endpoints.notifications import notify_user

router = APIRouter()

@router.get("/conversations", response_model=List[ConversationList])
def get_conversations(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_active_user),
):
    """
    Retrieve all conversations for the current user.
    """
    convo_ids = (
        db.query(ParticipanteConversacion.convo_id)
        .filter(ParticipanteConversacion.usuario_id == current_user.id)
        .all()
    )
    convo_ids = [c[0] for c in convo_ids]

    conversations = (
        db.query(Conversacion)
        .filter(Conversacion.id.in_(convo_ids))
        .order_by(Conversacion.last_message_at.desc())
        .all()
    )

    result = []
    for convo in conversations:
        # Find the other participant
        other_part = (
            db.query(ParticipanteConversacion)
            .filter(ParticipanteConversacion.convo_id == convo.id)
            .filter(ParticipanteConversacion.usuario_id != current_user.id)
            .first()
        )
        
        my_part = (
            db.query(ParticipanteConversacion)
            .filter(ParticipanteConversacion.convo_id == convo.id)
            .filter(ParticipanteConversacion.usuario_id == current_user.id)
            .first()
        )

        last_msg = (
            db.query(MensajeChat)
            .filter(MensajeChat.convo_id == convo.id)
            .order_by(MensajeChat.created_at.desc())
            .first()
        )

        if other_part and other_part.usuario:
            result.append({
                "id": convo.id,
                "updated_at": convo.updated_at,
                "last_message_at": convo.last_message_at,
                "other_participant": other_part.usuario,
                "last_message_text": last_msg.texto if last_msg else None,
                "unread_count": my_part.unread_count if my_part else 0
            })

    return result

@router.get("/messages/{convo_id}", response_model=List[MessageChat])
def get_messages(
    convo_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_active_user),
):
    """
    Get message history for a conversation and mark as read.
    """
    # Verify membership
    membership = (
        db.query(ParticipanteConversacion)
        .filter(ParticipanteConversacion.convo_id == convo_id)
        .filter(ParticipanteConversacion.usuario_id == current_user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    # Mark as read
    membership.unread_count = 0
    db.commit()

    messages = (
        db.query(MensajeChat)
        .filter(MensajeChat.convo_id == convo_id)
        .order_by(MensajeChat.created_at.asc())
        .all()
    )
    return messages

@router.post("/start/{other_user_id}")
async def start_conversation(
    other_user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_active_user),
):
    """
    Find or create a 1-to-1 conversation with another user.
    """
    if other_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")

    # Find common conversation
    subq = (
        db.query(ParticipanteConversacion.convo_id)
        .filter(ParticipanteConversacion.usuario_id == current_user.id)
        .subquery()
    )
    
    existing = (
        db.query(ParticipanteConversacion.convo_id)
        .filter(ParticipanteConversacion.convo_id.in_(subq))
        .filter(ParticipanteConversacion.usuario_id == other_user_id)
        .first()
    )

    if existing:
        return {"convo_id": existing[0]}

    # Create new
    convo = Conversacion()
    db.add(convo)
    db.commit()
    db.refresh(convo)

    p1 = ParticipanteConversacion(convo_id=convo.id, usuario_id=current_user.id)
    p2 = ParticipanteConversacion(convo_id=convo.id, usuario_id=other_user_id)
    db.add_all([p1, p2])
    db.commit()

    return {"convo_id": convo.id}

@router.post("/messages", response_model=MessageChat)
async def send_message(
    msg_in: MessageChatCreate,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_active_user),
):
    """
    Send a message in a conversation.
    """
    # Verify membership
    membership = (
        db.query(ParticipanteConversacion)
        .filter(ParticipanteConversacion.convo_id == msg_in.convo_id)
        .filter(ParticipanteConversacion.usuario_id == current_user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    # Create message
    db_msg = MensajeChat(
        convo_id=msg_in.convo_id,
        sender_id=current_user.id,
        texto=msg_in.texto
    )
    db.add(db_msg)
    
    # Update convo timestamp
    convo = db.query(Conversacion).get(msg_in.convo_id)
    convo.last_message_at = db_msg.created_at
    
    # Increment unread for others
    others = (
        db.query(ParticipanteConversacion)
        .filter(ParticipanteConversacion.convo_id == msg_in.convo_id)
        .filter(ParticipanteConversacion.usuario_id != current_user.id)
        .all()
    )
    for other in others:
        other.unread_count += 1
        
        # Notify via Websocket
        await notify_user(
            other.usuario_id, 
            "chat_message", 
            {
                "convo_id": convo.id,
                "sender_id": current_user.id,
                "texto": msg_in.texto,
                "created_at": str(db_msg.created_at)
            }
        )

    db.commit()
    db.refresh(db_msg)
    return db_msg
