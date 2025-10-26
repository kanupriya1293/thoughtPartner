from typing import Optional, List, Dict
from sqlalchemy.orm import Session
import uuid
from ..models import Thread, Message, ThreadContext, MessageRole, ThreadType
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
        branch_context_text: Optional[str] = None,
        branch_text_start_offset: Optional[int] = None,
        branch_text_end_offset: Optional[int] = None,
        is_fork: bool = False
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
        
        # Determine thread type, depth, and ID
        if is_fork:
            thread_type = ThreadType.FORK
            depth = parent_thread.depth + 1
            thread_id = str(uuid.uuid4())
        elif parent_thread_id:
            thread_type = ThreadType.BRANCH
            depth = parent_thread.depth + 1
            thread_id = None  # Let SQLAlchemy generate
        else:
            thread_type = ThreadType.ROOT
            depth = 0
            thread_id = str(uuid.uuid4())
        
        # Create thread
        thread = Thread(
            id=thread_id,
            parent_thread_id=parent_thread_id,
            depth=depth,
            thread_type=thread_type,
            branch_from_message_id=branch_from_message_id,
            branch_context_text=branch_context_text if not is_fork else None,
            branch_text_start_offset=branch_text_start_offset if not is_fork else None,
            branch_text_end_offset=branch_text_end_offset if not is_fork else None
        )
        
        self.db.add(thread)
        self.db.commit()
        self.db.refresh(thread)
        
        # For forks: duplicate messages from parent thread
        if is_fork and parent_thread_id and branch_from_message_id:
            fork_message = self.db.query(Message).filter(
                Message.id == branch_from_message_id
            ).first()
            
            if fork_message:
                # Get all messages up to and including the fork point
                messages_to_duplicate = self.db.query(Message).filter(
                    Message.thread_id == parent_thread_id,
                    Message.sequence <= fork_message.sequence
                ).order_by(Message.sequence).all()
                
                # Duplicate each message
                for msg in messages_to_duplicate:
                    new_message = Message(
                        id=str(uuid.uuid4()),
                        thread_id=thread.id,
                        role=msg.role,
                        content=msg.content,
                        sequence=msg.sequence,
                        timestamp=msg.timestamp,
                        model=msg.model,
                        provider=msg.provider,
                        tokens_used=msg.tokens_used,
                        response_metadata=msg.response_metadata,
                        openai_response_id=msg.openai_response_id  # Keep same for OpenAI API
                    )
                    self.db.add(new_message)
                
                # Set initial fork title (temporary until user sends first message)
                if parent_thread.title:
                    thread.title = f"Fork | {parent_thread.title}"
                else:
                    thread.title = "Fork | New Thread"
                
                self.db.commit()
        
        # Generate parent summary if this is a branch and summarization is enabled
        # OpenAI Responses API doesn't need this (uses previous_response_id)
        # But useful for other providers or analysis purposes
        from ..config import settings
        if parent_thread_id and settings.enable_summarization:
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
    
    def get_threads_by_depth(self, depth: Optional[int] = None) -> List[Thread]:
        """
        Get threads, optionally filtered by depth
        
        Args:
            depth: Filter by depth (e.g., 0 for root threads). If None, returns all threads.
        
        Returns:
            List of Thread objects
        """
        query = self.db.query(Thread)
        if depth is not None:
            query = query.filter(Thread.depth == depth)
        return query.order_by(Thread.created_at.desc()).all()
    
    def get_threads_by_types(self, types: List[ThreadType]) -> List[Thread]:
        """
        Get threads filtered by thread types
        
        Args:
            types: List of thread types to include
        
        Returns:
            List of Thread objects
        """
        return self.db.query(Thread).filter(
            Thread.thread_type.in_(types)
        ).order_by(Thread.created_at.desc()).all()
    
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
        
        # Augment messages with branch and fork info
        result = []
        for msg in messages:
            # Separate branches (highlight-based) from forks
            highlight_branches = [c for c in message_branches.get(msg.id, []) if c.thread_type != ThreadType.FORK]
            forks = [c for c in message_branches.get(msg.id, []) if c.thread_type == ThreadType.FORK]
            
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
                "has_branches": len(highlight_branches) > 0,
                "branch_count": len(highlight_branches),
                "branches": [
                    {
                        "thread_id": child.id,
                        "title": child.title,
                        "branch_context_text": child.branch_context_text,
                        "branch_text_start_offset": child.branch_text_start_offset,
                        "branch_text_end_offset": child.branch_text_end_offset
                    }
                    for child in highlight_branches
                ],
                "has_forks": len(forks) > 0,
                "forks": [
                    {
                        "thread_id": fork.id,
                        "title": fork.title
                    }
                    for fork in forks
                ]
            }
            result.append(msg_dict)
        
        return result
    
    async def generate_thread_title(self, thread_id: str, from_last_user_message: bool = False) -> str:
        """
        Generate title from user message
        
        Args:
            thread_id: Thread ID
            from_last_user_message: If True, use last user message (for forks); otherwise use first
        
        Returns:
            Generated title
        """
        # Get user message(s)
        if from_last_user_message:
            # For forks: use the last user message (the first NEW message in the fork)
            message = self.db.query(Message).filter(
                Message.thread_id == thread_id,
                Message.role == MessageRole.USER
            ).order_by(Message.sequence.desc()).first()
        else:
            # For new threads: use the first user message
            message = self.db.query(Message).filter(
                Message.thread_id == thread_id,
                Message.role == MessageRole.USER
            ).order_by(Message.sequence).first()
        
        if not message:
            return "New Thread"
        
        # Simple title generation: truncate message
        content = message.content.strip()
        if len(content) <= 50:
            return content
        else:
            return content[:47] + "..."
    
    async def update_thread_title(self, thread_id: str, force: bool = False, from_last_user_message: bool = False):
        """
        Update thread title
        
        Args:
            thread_id: Thread ID
            force: If True, update title even if it's already set (for forks)
            from_last_user_message: If True, use last user message for title generation (for forks)
        """
        thread = self.get_thread(thread_id)
        if thread:
            if force or not thread.title:
                title = await self.generate_thread_title(thread_id, from_last_user_message=from_last_user_message)
                thread.title = title
                self.db.commit()

