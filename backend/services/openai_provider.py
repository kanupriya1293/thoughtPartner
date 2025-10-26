from typing import List, Dict, Optional, Tuple
from openai import AsyncOpenAI
from .llm_provider import LLMProvider
from ..config import settings
import logging

logger = logging.getLogger(__name__)


class OpenAIProvider(LLMProvider):
    """OpenAI API provider implementation"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.default_model = settings.default_openai_model
    
    async def send_message(
        self, 
        messages: List[Dict[str, str]], 
        model: Optional[str] = None,
        previous_response_id: Optional[str] = None,
        background: Optional[bool] = False,
        **kwargs
    ) -> Tuple[str, int, Dict]:
        """Send messages to OpenAI Responses API"""
        model_to_use = model or self.default_model
        
        # Separate system messages (instructions) from user/assistant messages
        system_messages = []
        conversation_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_messages.append(msg["content"])
            else:
                conversation_messages.append(msg)
        
        # Combine system messages into instructions
        instructions = "\n\n".join(system_messages) if system_messages else None
        
        # Get the last user message as input (for Responses API)
        # The previous context is handled via previous_response_id
        input_message = conversation_messages[-1]["content"] if conversation_messages else ""
        
        # Build request parameters
        request_params = {
            "model": model_to_use,
            "input": input_message,
            "background": background,
        }
        
        if instructions:
            request_params["instructions"] = instructions
        
        if previous_response_id:
            request_params["previous_response_id"] = previous_response_id
        
        # Add other kwargs if provided
        if "temperature" in kwargs:
            request_params["temperature"] = kwargs["temperature"]
        if "max_tokens" in kwargs:
            request_params["max_output_tokens"] = kwargs["max_tokens"]
        
        # Call Responses API
        response = await self.client.responses.create(**request_params)
        
        # Handle background requests: poll until completion
        if background and response.status in ["in_progress", "queued"]:
            import asyncio
            import time
            max_wait_time = 300  # 5 minutes max
            check_interval = 1  # Poll every 1 second
            start_time = time.time()
            
            while response.status in ["in_progress", "queued"]:
                if time.time() - start_time > max_wait_time:
                    raise TimeoutError("Background request did not complete within timeout")
                await asyncio.sleep(check_interval)
                response = await self.client.responses.retrieve(response.id)
        
        # Extract content from response
        content = response.output_text if hasattr(response, 'output_text') else ""
        if not content and response.output:
            # Fallback: extract from output array
            for item in response.output:
                if item.get("type") == "message" and item.get("role") == "assistant":
                    for content_item in item.get("content", []):
                        if content_item.get("type") == "output_text":
                            content = content_item.get("text", "")
                            break
        
        # Safely get token usage (might not be available for incomplete responses)
        tokens_used = response.usage.total_tokens if hasattr(response, 'usage') and response.usage else 0
        
        metadata = {
            "model": response.model,
            "status": response.status,
            "response_id": response.id,  # Store the response ID for branching
            "input_tokens": response.usage.input_tokens if hasattr(response, 'usage') and hasattr(response.usage, 'input_tokens') else 0,
            "output_tokens": response.usage.output_tokens if hasattr(response, 'usage') and hasattr(response.usage, 'output_tokens') else 0,
            "background": background,
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

