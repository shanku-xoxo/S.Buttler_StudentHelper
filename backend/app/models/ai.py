from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, default="Academic Chat")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    proposed_actions = relationship("ProposedAction", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender = Column(String, nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="messages")

class ProposedAction(Base):
    __tablename__ = "proposed_actions"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    action_type = Column(String, nullable=False)  # ADD_CALENDAR_EVENT, UPDATE_PROGRESS, SAVE_NOTE
    status = Column(String, default="PENDING")    # PENDING, CONFIRMED, REJECTED
    payload_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="proposed_actions")
