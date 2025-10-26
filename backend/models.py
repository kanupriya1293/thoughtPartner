import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, JSON, Enum, Boolean
from sqlalchemy.orm import relationship
import enum

from .database import Base


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ThreadType(str, enum.Enum):
    ROOT = "root"
    FORK = "fork"
    BRANCH = "branch"


class Thread(Base):
    __tablename__ = "threads"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    parent_thread_id = Column(String, ForeignKey("threads.id"), nullable=True)
    depth = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    title = Column(String, nullable=True)
    thread_type = Column(Enum(ThreadType), nullable=False, default=ThreadType.ROOT)
    branch_from_message_id = Column(String, ForeignKey("messages.id"), nullable=True)
    branch_context_text = Column(Text, nullable=True)
    branch_text_start_offset = Column(Integer, nullable=True)
    branch_text_end_offset = Column(Integer, nullable=True)

    # Relationships
    messages = relationship("Message", back_populates="thread", foreign_keys="Message.thread_id")
    context = relationship("ThreadContext", back_populates="thread", uselist=False)
    parent = relationship("Thread", remote_side=[id], foreign_keys=[parent_thread_id])


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    thread_id = Column(String, ForeignKey("threads.id"), nullable=False)
    role = Column(Enum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    sequence = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    model = Column(String, nullable=True)
    provider = Column(String, nullable=True)
    tokens_used = Column(Integer, nullable=True)
    response_metadata = Column(JSON, nullable=True)
    openai_response_id = Column(String, nullable=True)  # For Responses API branching

    # Relationships
    thread = relationship("Thread", back_populates="messages", foreign_keys=[thread_id])


class ThreadContext(Base):
    __tablename__ = "thread_contexts"

    thread_id = Column(String, ForeignKey("threads.id"), primary_key=True)
    parent_summary = Column(Text, nullable=True)
    sibling_summary = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    thread = relationship("Thread", back_populates="context")

