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
        previous_response_id: Optional[str] = None,
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
        
        tokens_used = response.usage.total_tokens
        
        metadata = {
            "model": response.model,
            "status": response.status,
            "response_id": response.id,  # Store the response ID for branching
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
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

