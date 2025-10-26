from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ThreadType(str, Enum):
    ROOT = "root"
    FORK = "fork"
    BRANCH = "branch"


class ThreadCreate(BaseModel):
    parent_thread_id: Optional[str] = None
    branch_from_message_id: Optional[str] = None
    branch_context_text: Optional[str] = None
    branch_text_start_offset: Optional[int] = None
    branch_text_end_offset: Optional[int] = None
    is_fork: Optional[bool] = False  # Backward compatibility, will be converted to thread_type


class ThreadResponse(BaseModel):
    id: str
    parent_thread_id: Optional[str]
    depth: int
    created_at: datetime
    title: Optional[str]
    thread_type: ThreadType
    branch_from_message_id: Optional[str]
    branch_context_text: Optional[str]
    branch_text_start_offset: Optional[int] = None
    branch_text_end_offset: Optional[int] = None

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    content: str
    provider: Optional[str] = None
    model: Optional[str] = None
    background: Optional[bool] = False


class MessageResponse(BaseModel):
    id: str
    thread_id: str
    role: MessageRole
    content: str
    sequence: int
    timestamp: datetime
    model: Optional[str]
    provider: Optional[str]
    tokens_used: Optional[int]
    response_metadata: Optional[dict] = None
    has_branches: bool = False
    branch_count: int = 0
    has_forks: bool = False
    forks: Optional[list] = None

    class Config:
        from_attributes = True


class ThreadContextResponse(BaseModel):
    thread_id: str
    parent_summary: Optional[str]
    sibling_summary: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True


class ContextRegenerateRequest(BaseModel):
    regenerate_parent: bool = True
    regenerate_siblings: bool = False


class MessagesWithBranches(BaseModel):
    messages: List[MessageResponse]
    thread_info: ThreadResponse

