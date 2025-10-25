from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import ThreadContextResponse, ContextRegenerateRequest
from ..models import ThreadContext
from ..services.thread_service import ThreadService
from ..services.summarizer import Summarizer

router = APIRouter(prefix="/threads", tags=["context"])


@router.get("/{thread_id}/context", response_model=ThreadContextResponse)
async def get_thread_context(
    thread_id: str,
    db: Session = Depends(get_db)
):
    """Get computed context summaries for a thread"""
    service = ThreadService(db)
    
    # Verify thread exists
    thread = service.get_thread(thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Get context
    context = db.query(ThreadContext).filter(
        ThreadContext.thread_id == thread_id
    ).first()
    
    if not context:
        # Return empty context if none exists
        return ThreadContextResponse(
            thread_id=thread_id,
            parent_summary=None,
            sibling_summary=None,
            updated_at=thread.created_at
        )
    
    return context


@router.post("/{thread_id}/context/regenerate", response_model=ThreadContextResponse)
async def regenerate_context(
    thread_id: str,
    request: ContextRegenerateRequest,
    db: Session = Depends(get_db)
):
    """Regenerate parent and/or sibling summaries"""
    service = ThreadService(db)
    summarizer = Summarizer(db)
    
    # Verify thread exists
    thread = service.get_thread(thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    parent_summary = None
    sibling_summary = None
    
    # Regenerate parent summary if requested
    if request.regenerate_parent and thread.parent_thread_id:
        parent_summary, _ = await summarizer.generate_parent_summary(
            thread.parent_thread_id,
            up_to_message_id=thread.branch_from_message_id
        )
    
    # Regenerate sibling summary if requested
    if request.regenerate_siblings:
        sibling_summary, _ = await summarizer.generate_sibling_summary(thread_id)
    
    # Save context
    await summarizer.save_context(
        thread_id,
        parent_summary=parent_summary,
        sibling_summary=sibling_summary
    )
    
    # Return updated context
    context = db.query(ThreadContext).filter(
        ThreadContext.thread_id == thread_id
    ).first()
    
    return context

