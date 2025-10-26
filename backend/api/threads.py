from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..schemas import ThreadCreate, ThreadResponse
from ..services.thread_service import ThreadService

router = APIRouter(prefix="/threads", tags=["threads"])


@router.get("", response_model=List[ThreadResponse])
async def get_threads(
    depth: Optional[int] = Query(None, description="Filter threads by depth (e.g., 0 for root threads)"),
    db: Session = Depends(get_db)
):
    """Get all threads, optionally filtered by depth"""
    service = ThreadService(db)
    threads = service.get_threads_by_depth(depth)
    return threads


@router.post("", response_model=ThreadResponse, status_code=201)
async def create_thread(
    thread_data: ThreadCreate,
    db: Session = Depends(get_db)
):
    """Create a new thread (root or branch)"""
    service = ThreadService(db)
    
    try:
        thread = await service.create_thread(
            parent_thread_id=thread_data.parent_thread_id,
            branch_from_message_id=thread_data.branch_from_message_id,
            branch_context_text=thread_data.branch_context_text,
            branch_text_start_offset=thread_data.branch_text_start_offset,
            branch_text_end_offset=thread_data.branch_text_end_offset
        )
        return thread
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{thread_id}", response_model=ThreadResponse)
async def get_thread(
    thread_id: str,
    db: Session = Depends(get_db)
):
    """Get thread metadata"""
    service = ThreadService(db)
    thread = service.get_thread(thread_id)
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    return thread


@router.get("/{thread_id}/children", response_model=List[ThreadResponse])
async def get_thread_children(
    thread_id: str,
    db: Session = Depends(get_db)
):
    """Get all child threads of a thread"""
    service = ThreadService(db)
    
    # Verify parent thread exists
    thread = service.get_thread(thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    children = service.get_children(thread_id)
    return children


@router.delete("/{thread_id}")
async def delete_thread(
    thread_id: str,
    db: Session = Depends(get_db)
):
    """Delete a thread, all its messages, and all child branches (cascade delete)"""
    from ..models import Thread, Message, ThreadContext
    
    # Verify thread exists
    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Recursively delete all child branches
    def delete_branch_and_children(thread_id_to_delete):
        # Get all child threads
        child_threads = db.query(Thread).filter(
            Thread.parent_thread_id == thread_id_to_delete
        ).all()
        
        # Recursively delete each child branch
        for child_thread in child_threads:
            delete_branch_and_children(child_thread.id)
        
        # Delete all messages in this thread
        db.query(Message).filter(Message.thread_id == thread_id_to_delete).delete()
        
        # Delete thread context
        db.query(ThreadContext).filter(ThreadContext.thread_id == thread_id_to_delete).delete()
        
        # Delete the thread itself
        thread_to_delete = db.query(Thread).filter(Thread.id == thread_id_to_delete).first()
        if thread_to_delete:
            db.delete(thread_to_delete)
    
    # Delete the thread and all its children
    delete_branch_and_children(thread_id)
    
    db.commit()
    
    return {"message": "Thread and all child branches deleted successfully"}

