import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM Provider API Keys
    openai_api_key: Optional[str] = None
    
    # Default provider and model
    default_provider: str = "openai"
    default_openai_model: str = "gpt-4"
    
    # Summarization settings
    # Set to True to enable parent thread summarization for child threads
    # OpenAI Responses API doesn't need summaries (uses previous_response_id)
    enable_summarization: bool = False
    summarization_provider: str = "openai"
    summarization_model: str = "gpt-4"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

