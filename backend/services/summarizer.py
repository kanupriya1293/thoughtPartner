from typing import Optional, Tuple
from sqlalchemy.orm import Session
from backend.models import Thread, Message, ThreadContext
from backend.services.provider_factory import ProviderFactory
from backend.config import settings


class Summarizer:
    """Service for generating conversation summaries"""
    
    def __init__(self, db: Session):
        self.db = db
        self.provider = ProviderFactory.get_provider(settings.summarization_provider)
    
    async def generate_parent_summary(
        self, 
        parent_thread_id: str,
        up_to_message_id: Optional[str] = None
    ) -> Tuple[str, int]:
        """
        Generate summary of parent thread up to a specific message
        
        Args:
            parent_thread_id: ID of parent thread
            up_to_message_id: Optional message ID to stop at (for branching from specific message)
        
        Returns:
            Tuple of (summary, tokens_used)
        """
        # Get parent thread messages
        query = self.db.query(Message).filter(
            Message.thread_id == parent_thread_id
        ).order_by(Message.sequence)
        
        # If branching from specific message, only include messages up to that point
        if up_to_message_id:
            branch_message = self.db.query(Message).filter(
                Message.id == up_to_message_id
            ).first()
            if branch_message:
                query = query.filter(Message.sequence <= branch_message.sequence)
        
        messages = query.all()
        
        if not messages:
            return "", 0
        
        # Format conversation for summarization
        conversation_text = self._format_messages_for_summary(messages)
        
        # Generate summary
        summary, tokens = await self.provider.summarize(
            conversation_text,
            model=settings.summarization_model
        )
        
        return summary, tokens
    
    async def generate_sibling_summary(
        self, 
        thread_id: str
    ) -> Tuple[str, int]:
        """
        Generate summary of all sibling threads
        
        Args:
            thread_id: ID of current thread
        
        Returns:
            Tuple of (summary, tokens_used)
        """
        # Get current thread to find parent
        thread = self.db.query(Thread).filter(Thread.id == thread_id).first()
        if not thread or not thread.parent_thread_id:
            return "", 0
        
        # Get all sibling threads (same parent, different id)
        siblings = self.db.query(Thread).filter(
            Thread.parent_thread_id == thread.parent_thread_id,
            Thread.id != thread_id
        ).all()
        
        if not siblings:
            return "", 0
        
        # Collect all sibling conversations
        sibling_texts = []
        for sibling in siblings:
            messages = self.db.query(Message).filter(
                Message.thread_id == sibling.id
            ).order_by(Message.sequence).all()
            
            if messages:
                title = sibling.title or f"Thread {sibling.id[:8]}"
                conv_text = self._format_messages_for_summary(messages)
                sibling_texts.append(f"### {title}\n{conv_text}")
        
        if not sibling_texts:
            return "", 0
        
        combined_text = "\n\n".join(sibling_texts)
        
        # Generate combined summary
        summary, tokens = await self.provider.summarize(
            f"Multiple parallel conversations:\n\n{combined_text}",
            model=settings.summarization_model
        )
        
        return summary, tokens
    
    def _format_messages_for_summary(self, messages: list) -> str:
        """Format messages into readable conversation text"""
        lines = []
        for msg in messages:
            role = msg.role.value.upper()
            lines.append(f"{role}: {msg.content}")
        return "\n".join(lines)
    
    async def save_context(
        self, 
        thread_id: str, 
        parent_summary: Optional[str] = None,
        sibling_summary: Optional[str] = None
    ):
        """Save or update thread context"""
        context = self.db.query(ThreadContext).filter(
            ThreadContext.thread_id == thread_id
        ).first()
        
        if context:
            if parent_summary is not None:
                context.parent_summary = parent_summary
            if sibling_summary is not None:
                context.sibling_summary = sibling_summary
        else:
            context = ThreadContext(
                thread_id=thread_id,
                parent_summary=parent_summary,
                sibling_summary=sibling_summary
            )
            self.db.add(context)
        
        self.db.commit()

