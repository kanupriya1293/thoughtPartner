from typing import List, Dict, Optional, Tuple
from openai import AsyncOpenAI
from .llm_provider import LLMProvider
from ..config import settings


class OpenAIProvider(LLMProvider):
    """OpenAI API provider implementation"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.default_model = settings.default_openai_model
    
    async def send_message(
        self, 
        messages: List[Dict[str, str]], 
        model: Optional[str] = None,
        **kwargs
    ) -> Tuple[str, int, Dict]:
        """Send messages to OpenAI API"""
        model_to_use = model or self.default_model
        
        response = await self.client.chat.completions.create(
            model=model_to_use,
            messages=messages,
            **kwargs
        )
        
        content = response.choices[0].message.content
        tokens_used = response.usage.total_tokens
        
        metadata = {
            "model": model_to_use,
            "finish_reason": response.choices[0].finish_reason,
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
        }
        
        return content, tokens_used, metadata
    
    async def summarize(
        self, 
        text: str, 
        model: Optional[str] = None
    ) -> Tuple[str, int]:
        """Generate summary using OpenAI"""
        model_to_use = model or self.default_model
        
        messages = [
            {
                "role": "system",
                "content": "You are a helpful assistant that creates concise summaries of conversations. "
                          "Capture the key points, topics discussed, and main conclusions. "
                          "Keep the summary brief but informative."
            },
            {
                "role": "user",
                "content": f"Please summarize the following conversation:\n\n{text}"
            }
        ]
        
        response = await self.client.chat.completions.create(
            model=model_to_use,
            messages=messages
        )
        
        summary = response.choices[0].message.content
        tokens_used = response.usage.total_tokens
        
        return summary, tokens_used
    
    @property
    def provider_name(self) -> str:
        return "openai"

