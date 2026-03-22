from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class UserBasic(BaseModel):
    id: int
    username: str
    nombre_artistico: Optional[str] = None
    foto_perfil: Optional[str] = None

    class Config:
        from_attributes = True

class MessageChatBase(BaseModel):
    convo_id: int
    texto: str

class MessageChatCreate(MessageChatBase):
    pass

class MessageChat(BaseModel):
    id: int
    convo_id: int
    sender_id: int
    texto: str
    is_read: bool
    created_at: datetime
    sender: Optional[UserBasic] = None

    class Config:
        from_attributes = True

class Participant(BaseModel):
    usuario_id: int
    unread_count: int
    usuario: UserBasic

    class Config:
        from_attributes = True

class Conversation(BaseModel):
    id: int
    created_at: datetime
    updated_at: datetime
    last_message_at: datetime
    participantes: List[Participant]
    last_message: Optional[MessageChat] = None

    class Config:
        from_attributes = True

class ConversationList(BaseModel):
    id: int
    updated_at: datetime
    last_message_at: datetime
    other_participant: UserBasic
    last_message_text: Optional[str] = None
    unread_count: int

    class Config:
        from_attributes = True
