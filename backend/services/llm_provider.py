from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Tuple


class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    async def send_message(
        self, 
        messages: List[Dict[str, str]], 
        model: Optional[str] = None,
        previous_response_id: Optional[str] = None,
        **kwargs
    ) -> Tuple[str, int, Dict]:
        """
        Send messages to the LLM and get response
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Optional model override
            previous_response_id: Optional previous response ID for stateful APIs (e.g., OpenAI Responses API)
            **kwargs: Additional provider-specific parameters
            
        Returns:
            Tuple of (response_content, tokens_used, metadata)
        """
        pass
    
    @abstractmethod
    async def summarize(
        self, 
        text: str, 
        model: Optional[str] = None
    ) -> Tuple[str, int]:
        """
        Generate a summary of the provided text
        
        Args:
            text: Text to summarize
            model: Optional model override
            
        Returns:
            Tuple of (summary, tokens_used)
        """
        pass
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider name"""
        pass

