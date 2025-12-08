from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str

    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_CHAT_MODEL: str = "gpt-4-turbo-preview"
    EMBEDDING_DIMENSION: int = 1536

    # OpenAI API settings
    OPENAI_MAX_RETRIES: int = 3
    OPENAI_TIMEOUT: int = 60  # seconds

    # Request limits
    MAX_INGEST_PAYLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    MAX_QUERY_LENGTH: int = 5000  # characters
    MAX_CONTEXT_CHARS: int = 50000  # characters for retrieved context
    MAX_CONTEXT_TOKENS: int = 12000  # tokens for context (approximate)

    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100  # requests per window
    RATE_LIMIT_WINDOW: int = 60  # seconds

    # Legacy support (for backward compatibility)
    @property
    def EMBEDDING_MODEL(self) -> str:
        """Legacy property for backward compatibility."""
        return self.OPENAI_EMBEDDING_MODEL

    @property
    def LLM_MODEL(self) -> str:
        """Legacy property for backward compatibility."""
        return self.OPENAI_CHAT_MODEL

    # Chunking
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    # CORS (comma-separated string, will be parsed to list)
    # Supports both CORS_ORIGINS (legacy) and CORS_ALLOW_ORIGINS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    CORS_ALLOW_ORIGINS: str = ""  # Override CORS_ORIGINS if set

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS origins as a list."""
        # Use CORS_ALLOW_ORIGINS if set, otherwise fall back to CORS_ORIGINS
        origins_str = self.CORS_ALLOW_ORIGINS.strip() or self.CORS_ORIGINS
        # Always include localhost:3000 and localhost:3001 for development
        origins = [origin.strip() for origin in origins_str.split(",") if origin.strip()]
        for default_origin in ["http://localhost:3000", "http://localhost:3001"]:
            if default_origin not in origins:
                origins.append(default_origin)
        return origins


settings = Settings()

