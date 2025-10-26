from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..schemas import MessageCreate, MessageResponse, MessagesWithBranches
from ..models import Message, MessageRole, ThreadContext
from ..services.thread_service import ThreadService
from ..services.provider_factory import ProviderFactory

router = APIRouter(prefix="/threads", tags=["messages"])


@router.get("/{thread_id}/messages")
async def get_thread_messages(
    thread_id: str,
    db: Session = Depends(get_db)
):
    """Get all messages in a thread with branch information"""
    service = ThreadService(db)
    
    # Verify thread exists
    thread = service.get_thread(thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    messages = service.get_messages_with_branches(thread_id)
    
    return {
        "thread_info": thread,
        "messages": messages
    }


@router.post("/{thread_id}/messages", response_model=MessageResponse)
async def send_message(
    thread_id: str,
    message_data: MessageCreate,
    db: Session = Depends(get_db)
):
    """
    Send a user message and get LLM response
    
    This endpoint:
    1. Saves the user message
    2. Assembles context (parent summary + thread history)
    3. Calls LLM
    4. Saves and returns assistant response
    """
    service = ThreadService(db)
    
    # Verify thread exists
    thread = service.get_thread(thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Get next sequence number
    last_message = db.query(Message).filter(
        Message.thread_id == thread_id
    ).order_by(Message.sequence.desc()).first()
    
    next_sequence = (last_message.sequence + 1) if last_message else 1
    
    # Save user message
    user_message = Message(
        thread_id=thread_id,
        role=MessageRole.USER,
        content=message_data.content,
        sequence=next_sequence
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)
    
    # Update thread title if this is the first user message
    if next_sequence == 1:
        await service.update_thread_title(thread_id)
    
    # Assemble context for LLM
    messages_for_llm = await _assemble_llm_context(thread_id, message_data.provider, db)
    
    # Get previous response ID for OpenAI Responses API
    previous_response_id = None
    if message_data.provider == "openai":
        # First, check if there are any assistant messages in this thread
        last_assistant_msg = db.query(Message).filter(
            Message.thread_id == thread_id,
            Message.role == MessageRole.ASSISTANT,
            Message.openai_response_id.isnot(None)
        ).order_by(Message.sequence.desc()).first()
        
        if last_assistant_msg:
            # Continue from last assistant message in this thread
            previous_response_id = last_assistant_msg.openai_response_id
        elif thread.parent_thread_id and thread.branch_from_message_id:
            # This is a child thread with no messages yet - branch from parent
            branch_from_msg = db.query(Message).filter(
                Message.id == thread.branch_from_message_id
            ).first()
            
            if branch_from_msg and branch_from_msg.openai_response_id:
                previous_response_id = branch_from_msg.openai_response_id
    
    # Get LLM provider
    provider_name = message_data.provider
    model = message_data.model
    
    try:
        provider = ProviderFactory.get_provider(provider_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Call LLM
    try:
        response_content, tokens_used, metadata = await provider.send_message(
            messages_for_llm,
            model=model,
            previous_response_id=previous_response_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM API error: {str(e)}")
    
    # Save assistant message
    assistant_message = Message(
        thread_id=thread_id,
        role=MessageRole.ASSISTANT,
        content=response_content,
        sequence=next_sequence + 1,
        model=metadata.get("model"),
        provider=provider.provider_name,
        tokens_used=tokens_used,
        response_metadata=metadata,
        openai_response_id=metadata.get("response_id")  # Store for branching
    )
    db.add(assistant_message)
    db.commit()
    db.refresh(assistant_message)
    
    return assistant_message


async def _assemble_llm_context(thread_id: str, provider: str, db: Session) -> List[dict]:
    """
    Assemble context for LLM call
    
    Args:
        thread_id: Thread ID
        provider: Provider name (openai, anthropic, etc.)
        db: Database session
    
    Returns:
        List of message dicts for LLM
    """
    messages = []
    
    # 1. System message
    messages.append({
        "role": "system",
        "content": "You are a helpful thought partner, assisting the user in learning and exploring topics deeply. "
                  "Provide clear, thoughtful responses that encourage further inquiry."
    })
    
    # 2. Parent context (if exists and summarization is enabled)
    # Note: For OpenAI Responses API with previous_response_id, the parent context
    # is already maintained by OpenAI via previous_response_id
    # Summaries are only needed if enable_summarization=True (for other providers)
    from ..config import settings
    
    if settings.enable_summarization:
        context = db.query(ThreadContext).filter(
            ThreadContext.thread_id == thread_id
        ).first()
        
        if context and context.parent_summary:
            messages.append({
                "role": "system",
                "content": f"Context from previous discussion:\n{context.parent_summary}"
            })
    
    # 3. Current thread messages
    thread_messages = db.query(Message).filter(
        Message.thread_id == thread_id
    ).order_by(Message.sequence).all()
    
    for msg in thread_messages:
        messages.append({
            "role": msg.role.value,
            "content": msg.content
        })
    
    return messages

