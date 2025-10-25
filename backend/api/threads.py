from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..schemas import ThreadCreate, ThreadResponse
from ..services.thread_service import ThreadService

router = APIRouter(prefix="/threads", tags=["threads"])


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
            branch_context_text=thread_data.branch_context_text
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

