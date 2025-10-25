import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM Provider API Keys
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    
    # Default provider and model
    default_provider: str = "openai"
    default_openai_model: str = "gpt-4"
    default_anthropic_model: str = "claude-3-5-sonnet-20241022"
    
    # Summarization settings
    summarization_provider: str = "openai"
    summarization_model: str = "gpt-4"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

