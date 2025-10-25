from typing import List, Dict, Optional, Tuple
from anthropic import AsyncAnthropic
from .llm_provider import LLMProvider
from ..config import settings


class AnthropicProvider(LLMProvider):
    """Anthropic Claude API provider implementation"""
    
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.default_model = settings.default_anthropic_model
    
    async def send_message(
        self, 
        messages: List[Dict[str, str]], 
        model: Optional[str] = None,
        **kwargs
    ) -> Tuple[str, int, Dict]:
        """Send messages to Anthropic API"""
        model_to_use = model or self.default_model
        
        # Separate system messages from other messages
        system_message = None
        chat_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                # Combine all system messages
                if system_message is None:
                    system_message = msg["content"]
                else:
                    system_message += "\n\n" + msg["content"]
            else:
                chat_messages.append(msg)
        
        # Prepare API call parameters
        api_params = {
            "model": model_to_use,
            "messages": chat_messages,
            "max_tokens": kwargs.get("max_tokens", 4096),
        }
        
        if system_message:
            api_params["system"] = system_message
        
        # Add other kwargs if provided
        if "temperature" in kwargs:
            api_params["temperature"] = kwargs["temperature"]
        
        response = await self.client.messages.create(**api_params)
        
        content = response.content[0].text
        
        # Calculate tokens (Anthropic provides input/output tokens)
        tokens_used = response.usage.input_tokens + response.usage.output_tokens
        
        metadata = {
            "model": model_to_use,
            "stop_reason": response.stop_reason,
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        }
        
        return content, tokens_used, metadata
    
    async def summarize(
        self, 
        text: str, 
        model: Optional[str] = None
    ) -> Tuple[str, int]:
        """Generate summary using Anthropic"""
        model_to_use = model or self.default_model
        
        system_message = (
            "You are a helpful assistant that creates concise summaries of conversations. "
            "Capture the key points, topics discussed, and main conclusions. "
            "Keep the summary brief but informative."
        )
        
        messages = [
            {
                "role": "user",
                "content": f"Please summarize the following conversation:\n\n{text}"
            }
        ]
        
        response = await self.client.messages.create(
            model=model_to_use,
            system=system_message,
            messages=messages,
            max_tokens=2048,
            temperature=0.3
        )
        
        summary = response.content[0].text
        tokens_used = response.usage.input_tokens + response.usage.output_tokens
        
        return summary, tokens_used
    
    @property
    def provider_name(self) -> str:
        return "anthropic"

