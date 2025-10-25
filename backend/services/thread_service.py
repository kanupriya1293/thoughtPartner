from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from ..models import Thread, Message, ThreadContext, MessageRole
from .summarizer import Summarizer


class ThreadService:
    """Business logic for thread operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.summarizer = Summarizer(db)
    
    async def create_thread(
        self,
        parent_thread_id: Optional[str] = None,
        branch_from_message_id: Optional[str] = None,
        branch_context_text: Optional[str] = None
    ) -> Thread:
        """
        Create a new thread (root or branch)
        
        Args:
            parent_thread_id: Parent thread ID if branching
            branch_from_message_id: Message ID that spawned this branch
            branch_context_text: Selected text context for branch
        
        Returns:
            Created Thread object
        """
        # Validate parent thread exists if provided
        parent_thread = None
        if parent_thread_id:
            parent_thread = self.db.query(Thread).filter(
                Thread.id == parent_thread_id
            ).first()
            if not parent_thread:
                raise ValueError(f"Parent thread {parent_thread_id} not found")
        
        # Validate branch message exists if provided
        if branch_from_message_id:
            branch_message = self.db.query(Message).filter(
                Message.id == branch_from_message_id
            ).first()
            if not branch_message:
                raise ValueError(f"Branch message {branch_from_message_id} not found")
            if parent_thread_id and branch_message.thread_id != parent_thread_id:
                raise ValueError("Branch message must belong to parent thread")
        
        # Determine root and depth
        if parent_thread:
            root_id = parent_thread.root_id
            depth = parent_thread.depth + 1
            thread_id = None  # Let SQLAlchemy generate
        else:
            # For root threads, pre-generate ID so root_id can equal id
            import uuid
            thread_id = str(uuid.uuid4())
            root_id = thread_id  # Root thread's root_id is itself
            depth = 0
        
        # Create thread
        thread = Thread(
            id=thread_id,  # Pre-generated for root, None for child
            parent_thread_id=parent_thread_id,
            root_id=root_id,
            depth=depth,
            branch_from_message_id=branch_from_message_id,
            branch_context_text=branch_context_text
        )
        
        self.db.add(thread)
        self.db.commit()
        self.db.refresh(thread)
        
        # Generate parent summary if this is a branch
        if parent_thread_id:
            parent_summary, _ = await self.summarizer.generate_parent_summary(
                parent_thread_id,
                up_to_message_id=branch_from_message_id
            )
            await self.summarizer.save_context(
                thread.id,
                parent_summary=parent_summary
            )
        
        return thread
    
    def get_thread(self, thread_id: str) -> Optional[Thread]:
        """Get thread by ID"""
        return self.db.query(Thread).filter(Thread.id == thread_id).first()
    
    def get_children(self, thread_id: str) -> List[Thread]:
        """Get all child threads of a thread"""
        return self.db.query(Thread).filter(
            Thread.parent_thread_id == thread_id
        ).order_by(Thread.created_at).all()
    
    def get_messages_with_branches(self, thread_id: str) -> List[Dict]:
        """
        Get messages for a thread with branch information
        
        Returns:
            List of message dicts with branch metadata
        """
        messages = self.db.query(Message).filter(
            Message.thread_id == thread_id
        ).order_by(Message.sequence).all()
        
        # Get all child threads
        children = self.get_children(thread_id)
        
        # Build map of message_id -> list of child threads
        message_branches = {}
        for child in children:
            if child.branch_from_message_id:
                if child.branch_from_message_id not in message_branches:
                    message_branches[child.branch_from_message_id] = []
                message_branches[child.branch_from_message_id].append(child)
        
        # Augment messages with branch info
        result = []
        for msg in messages:
            msg_dict = {
                "id": msg.id,
                "thread_id": msg.thread_id,
                "role": msg.role,
                "content": msg.content,
                "sequence": msg.sequence,
                "timestamp": msg.timestamp,
                "model": msg.model,
                "provider": msg.provider,
                "tokens_used": msg.tokens_used,
                "response_metadata": msg.response_metadata,
                "has_branches": msg.id in message_branches,
                "branch_count": len(message_branches.get(msg.id, [])),
                "branches": [
                    {
                        "thread_id": child.id,
                        "title": child.title,
                        "branch_context_text": child.branch_context_text
                    }
                    for child in message_branches.get(msg.id, [])
                ]
            }
            result.append(msg_dict)
        
        return result
    
    async def generate_thread_title(self, thread_id: str) -> str:
        """
        Generate title from first user message
        
        Args:
            thread_id: Thread ID
        
        Returns:
            Generated title
        """
        # Get first user message
        first_message = self.db.query(Message).filter(
            Message.thread_id == thread_id,
            Message.role == MessageRole.USER
        ).order_by(Message.sequence).first()
        
        if not first_message:
            return "New Thread"
        
        # Simple title generation: truncate first message
        content = first_message.content.strip()
        if len(content) <= 50:
            return content
        else:
            return content[:47] + "..."
    
    async def update_thread_title(self, thread_id: str):
        """Update thread title if not already set"""
        thread = self.get_thread(thread_id)
        if thread and not thread.title:
            title = await self.generate_thread_title(thread_id)
            thread.title = title
            self.db.commit()

