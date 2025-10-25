from .llm_provider import LLMProvider
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from ..config import settings


class ProviderFactory:
    """Factory for creating LLM provider instances"""
    
    _providers = {
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
    }
    
    @classmethod
    def get_provider(cls, provider_name: str = None) -> LLMProvider:
        """
        Get an instance of the specified provider
        
        Args:
            provider_name: Name of provider ('openai', 'anthropic', etc.)
                          If None, uses default from settings
        
        Returns:
            LLMProvider instance
        
        Raises:
            ValueError: If provider is not supported
        """
        if provider_name is None:
            provider_name = settings.default_provider
        
        provider_name = provider_name.lower()
        
        if provider_name not in cls._providers:
            raise ValueError(
                f"Provider '{provider_name}' not supported. "
                f"Available providers: {list(cls._providers.keys())}"
            )
        
        return cls._providers[provider_name]()
    
    @classmethod
    def list_providers(cls) -> list:
        """List all available providers"""
        return list(cls._providers.keys())

