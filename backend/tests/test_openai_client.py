import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from app.llm.openai_client import (
    OpenAIClient,
    OpenAIError,
    OpenAIRateLimitError,
    OpenAITransientError,
    EmbeddingResponse,
    ChatCompletionResponse,
    TokenUsage,
    get_openai_client,
    set_openai_client,
)


class TestOpenAIClientInitialization:
    """Test client initialization."""

    def test_init_with_defaults(self):
        """Test initialization with default settings."""
        with patch("app.llm.openai_client.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            mock_settings.OPENAI_EMBEDDING_MODEL = "test-embedding"
            mock_settings.OPENAI_CHAT_MODEL = "test-chat"
            mock_settings.OPENAI_MAX_RETRIES = 3
            mock_settings.OPENAI_TIMEOUT = 60

            client = OpenAIClient()
            assert client.api_key == "test-key"
            assert client.embedding_model == "test-embedding"
            assert client.chat_model == "test-chat"
            assert client.max_retries == 3
            assert client.timeout == 60

    def test_init_with_overrides(self):
        """Test initialization with parameter overrides."""
        with patch("app.llm.openai_client.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = "default-key"
            mock_settings.OPENAI_EMBEDDING_MODEL = "default-embedding"
            mock_settings.OPENAI_CHAT_MODEL = "default-chat"
            mock_settings.OPENAI_MAX_RETRIES = 3
            mock_settings.OPENAI_TIMEOUT = 60

            client = OpenAIClient(
                api_key="custom-key",
                embedding_model="custom-embedding",
                chat_model="custom-chat",
                max_retries=5,
                timeout=120,
            )
            assert client.api_key == "custom-key"
            assert client.embedding_model == "custom-embedding"
            assert client.chat_model == "custom-chat"
            assert client.max_retries == 5
            assert client.timeout == 120

    def test_init_without_api_key(self):
        """Test initialization fails without API key."""
        with patch("app.llm.openai_client.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = ""
            mock_settings.OPENAI_EMBEDDING_MODEL = "test-embedding"
            mock_settings.OPENAI_CHAT_MODEL = "test-chat"
            mock_settings.OPENAI_MAX_RETRIES = 3
            mock_settings.OPENAI_TIMEOUT = 60

            with pytest.raises(ValueError, match="OpenAI API key is required"):
                OpenAIClient()


class TestEmbeddings:
    """Test embedding functionality."""

    @pytest.mark.asyncio
    async def test_create_embedding_single(self):
        """Test creating a single embedding."""
        client = OpenAIClient(
            api_key="test-key",
            embedding_model="text-embedding-3-small",
        )

        mock_response = {
            "data": [{"embedding": [0.1, 0.2, 0.3]}],
            "usage": {"prompt_tokens": 5, "total_tokens": 5},
        }

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_response_obj = MagicMock()
            mock_response_obj.status_code = 200
            mock_response_obj.json.return_value = mock_response
            mock_client.request = AsyncMock(return_value=mock_response_obj)

            result = await client.create_embedding("test text")

            assert isinstance(result, EmbeddingResponse)
            assert result.embedding == [0.1, 0.2, 0.3]
            assert result.token_usage is not None
            assert result.token_usage.total_tokens == 5

    @pytest.mark.asyncio
    async def test_create_embeddings_batch(self):
        """Test creating embeddings in batch."""
        client = OpenAIClient(
            api_key="test-key",
            embedding_model="text-embedding-3-small",
        )

        mock_response = {
            "data": [
                {"embedding": [0.1, 0.2, 0.3]},
                {"embedding": [0.4, 0.5, 0.6]},
            ],
            "usage": {"prompt_tokens": 10, "total_tokens": 10},
        }

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_response_obj = MagicMock()
            mock_response_obj.status_code = 200
            mock_response_obj.json.return_value = mock_response
            mock_client.request = AsyncMock(return_value=mock_response_obj)

            results = await client.create_embeddings(["text1", "text2"])

            assert len(results) == 2
            assert results[0].embedding == [0.1, 0.2, 0.3]
            assert results[1].embedding == [0.4, 0.5, 0.6]
            assert all(r.token_usage.total_tokens == 10 for r in results)

    @pytest.mark.asyncio
    async def test_create_embeddings_empty_list(self):
        """Test creating embeddings with empty list."""
        client = OpenAIClient(api_key="test-key")
        results = await client.create_embeddings([])
        assert results == []

    @pytest.mark.asyncio
    async def test_create_embeddings_large_batch(self):
        """Test creating embeddings with large batch (triggers batching)."""
        client = OpenAIClient(
            api_key="test-key",
            embedding_model="text-embedding-3-small",
        )

        # Create 3000 texts to trigger batching (batch size is 2048)
        texts = [f"text {i}" for i in range(3000)]

        mock_response = {
            "data": [{"embedding": [0.1, 0.2, 0.3]} for _ in range(2048)],
            "usage": {"prompt_tokens": 100, "total_tokens": 100},
        }

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_response_obj = MagicMock()
            mock_response_obj.status_code = 200
            mock_response_obj.json.return_value = mock_response
            mock_client.request = AsyncMock(return_value=mock_response_obj)

            results = await client.create_embeddings(texts)

            # Should have made 2 requests (2048 + 952)
            assert mock_client.request.call_count == 2
            assert len(results) == 3000


class TestChatCompletions:
    """Test chat completion functionality."""

    @pytest.mark.asyncio
    async def test_create_chat_completion(self):
        """Test creating a chat completion."""
        client = OpenAIClient(
            api_key="test-key",
            chat_model="gpt-4",
        )

        mock_response = {
            "choices": [
                {
                    "message": {"content": "Hello, world!"},
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 5,
                "total_tokens": 15,
            },
        }

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_response_obj = MagicMock()
            mock_response_obj.status_code = 200
            mock_response_obj.json.return_value = mock_response
            mock_client.request = AsyncMock(return_value=mock_response_obj)

            messages = [{"role": "user", "content": "Hello"}]
            result = await client.create_chat_completion(messages)

            assert isinstance(result, ChatCompletionResponse)
            assert result.content == "Hello, world!"
            assert result.finish_reason == "stop"
            assert result.token_usage is not None
            assert result.token_usage.prompt_tokens == 10
            assert result.token_usage.completion_tokens == 5
            assert result.token_usage.total_tokens == 15

    @pytest.mark.asyncio
    async def test_create_chat_completion_with_params(self):
        """Test chat completion with custom parameters."""
        client = OpenAIClient(api_key="test-key", chat_model="gpt-4")

        mock_response = {
            "choices": [{"message": {"content": "Response"}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 5, "completion_tokens": 3, "total_tokens": 8},
        }

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_response_obj = MagicMock()
            mock_response_obj.status_code = 200
            mock_response_obj.json.return_value = mock_response
            mock_client.request = AsyncMock(return_value=mock_response_obj)

            messages = [{"role": "user", "content": "Test"}]
            result = await client.create_chat_completion(
                messages, temperature=0.9, max_tokens=100
            )

            # Verify parameters were passed
            call_args = mock_client.request.call_args
            json_data = call_args[1]["json"]
            assert json_data["temperature"] == 0.9
            assert json_data["max_tokens"] == 100


class TestRetryLogic:
    """Test retry logic with exponential backoff."""

    @pytest.mark.asyncio
    async def test_retry_on_429_rate_limit(self):
        """Test retry on 429 rate limit error."""
        client = OpenAIClient(api_key="test-key", max_retries=2)

        # First two calls return 429, third succeeds
        mock_response_429 = MagicMock()
        mock_response_429.status_code = 429
        mock_response_429.headers = {}
        mock_response_429.json.return_value = {"error": {"message": "Rate limit"}}

        mock_response_200 = MagicMock()
        mock_response_200.status_code = 200
        mock_response_200.json.return_value = {
            "data": [{"embedding": [0.1, 0.2, 0.3]}],
            "usage": {"total_tokens": 5},
        }

        with patch("httpx.AsyncClient") as mock_client_class, patch(
            "asyncio.sleep", new_callable=AsyncMock
        ) as mock_sleep:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.request = AsyncMock(
                side_effect=[mock_response_429, mock_response_429, mock_response_200]
            )

            result = await client.create_embedding("test")

            assert mock_client.request.call_count == 3
            assert mock_sleep.call_count == 2  # Two retries
            assert result.embedding == [0.1, 0.2, 0.3]

    @pytest.mark.asyncio
    async def test_retry_on_500_server_error(self):
        """Test retry on 500 server error."""
        client = OpenAIClient(api_key="test-key", max_retries=2)

        mock_response_500 = MagicMock()
        mock_response_500.status_code = 500
        mock_response_500.json.return_value = {"error": {"message": "Server error"}}

        mock_response_200 = MagicMock()
        mock_response_200.status_code = 200
        mock_response_200.json.return_value = {
            "data": [{"embedding": [0.1, 0.2, 0.3]}],
            "usage": {"total_tokens": 5},
        }

        with patch("httpx.AsyncClient") as mock_client_class, patch(
            "asyncio.sleep", new_callable=AsyncMock
        ) as mock_sleep:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.request = AsyncMock(
                side_effect=[mock_response_500, mock_response_200]
            )

            result = await client.create_embedding("test")

            assert mock_client.request.call_count == 2
            assert mock_sleep.call_count == 1
            assert result.embedding == [0.1, 0.2, 0.3]

    @pytest.mark.asyncio
    async def test_retry_on_timeout(self):
        """Test retry on timeout error."""
        client = OpenAIClient(api_key="test-key", max_retries=2)

        mock_response_200 = MagicMock()
        mock_response_200.status_code = 200
        mock_response_200.json.return_value = {
            "data": [{"embedding": [0.1, 0.2, 0.3]}],
            "usage": {"total_tokens": 5},
        }

        with patch("httpx.AsyncClient") as mock_client_class, patch(
            "asyncio.sleep", new_callable=AsyncMock
        ) as mock_sleep:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.request = AsyncMock(
                side_effect=[
                    httpx.TimeoutException("Timeout"),
                    mock_response_200,
                ]
            )

            result = await client.create_embedding("test")

            assert mock_client.request.call_count == 2
            assert mock_sleep.call_count == 1
            assert result.embedding == [0.1, 0.2, 0.3]

    @pytest.mark.asyncio
    async def test_max_retries_exceeded(self):
        """Test that max retries are respected."""
        client = OpenAIClient(api_key="test-key", max_retries=2)

        mock_response_429 = MagicMock()
        mock_response_429.status_code = 429
        mock_response_429.headers = {}
        mock_response_429.json.return_value = {"error": {"message": "Rate limit"}}

        with patch("httpx.AsyncClient") as mock_client_class, patch(
            "asyncio.sleep", new_callable=AsyncMock
        ):
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.request = AsyncMock(return_value=mock_response_429)

            with pytest.raises(OpenAIRateLimitError):
                await client.create_embedding("test")

            # Should have tried max_retries + 1 times (initial + retries)
            assert mock_client.request.call_count == 3

    @pytest.mark.asyncio
    async def test_retry_after_header(self):
        """Test that Retry-After header is respected."""
        client = OpenAIClient(api_key="test-key", max_retries=2)

        mock_response_429 = MagicMock()
        mock_response_429.status_code = 429
        mock_response_429.headers = {"Retry-After": "5"}
        mock_response_429.json.return_value = {"error": {"message": "Rate limit"}}

        mock_response_200 = MagicMock()
        mock_response_200.status_code = 200
        mock_response_200.json.return_value = {
            "data": [{"embedding": [0.1, 0.2, 0.3]}],
            "usage": {"total_tokens": 5},
        }

        with patch("httpx.AsyncClient") as mock_client_class, patch(
            "asyncio.sleep", new_callable=AsyncMock
        ) as mock_sleep:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.request = AsyncMock(
                side_effect=[mock_response_429, mock_response_200]
            )

            await client.create_embedding("test")

            # Verify sleep was called with Retry-After value
            assert mock_sleep.call_count == 1
            assert mock_sleep.call_args[0][0] == 5.0


class TestErrorHandling:
    """Test error handling."""

    @pytest.mark.asyncio
    async def test_400_client_error_no_retry(self):
        """Test that 400 errors don't trigger retries."""
        client = OpenAIClient(api_key="test-key", max_retries=3)

        mock_response_400 = MagicMock()
        mock_response_400.status_code = 400
        mock_response_400.json.return_value = {
            "error": {"message": "Invalid request"}
        }

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.request = AsyncMock(return_value=mock_response_400)

            with pytest.raises(OpenAIError, match="Invalid request"):
                await client.create_embedding("test")

            # Should not retry on 400
            assert mock_client.request.call_count == 1

    @pytest.mark.asyncio
    async def test_network_error_retry(self):
        """Test retry on network errors."""
        client = OpenAIClient(api_key="test-key", max_retries=2)

        mock_response_200 = MagicMock()
        mock_response_200.status_code = 200
        mock_response_200.json.return_value = {
            "data": [{"embedding": [0.1, 0.2, 0.3]}],
            "usage": {"total_tokens": 5},
        }

        with patch("httpx.AsyncClient") as mock_client_class, patch(
            "asyncio.sleep", new_callable=AsyncMock
        ):
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.request = AsyncMock(
                side_effect=[
                    httpx.RequestError("Network error"),
                    mock_response_200,
                ]
            )

            result = await client.create_embedding("test")

            assert mock_client.request.call_count == 2
            assert result.embedding == [0.1, 0.2, 0.3]


class TestTokenUsage:
    """Test token usage parsing."""

    @pytest.mark.asyncio
    async def test_token_usage_parsing(self):
        """Test that token usage is correctly parsed."""
        client = OpenAIClient(api_key="test-key")

        mock_response = {
            "data": [{"embedding": [0.1, 0.2, 0.3]}],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 0,
                "total_tokens": 10,
            },
        }

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_response_obj = MagicMock()
            mock_response_obj.status_code = 200
            mock_response_obj.json.return_value = mock_response
            mock_client.request = AsyncMock(return_value=mock_response_obj)

            result = await client.create_embedding("test")

            assert result.token_usage is not None
            assert result.token_usage.prompt_tokens == 10
            assert result.token_usage.completion_tokens == 0
            assert result.token_usage.total_tokens == 10

    @pytest.mark.asyncio
    async def test_missing_token_usage(self):
        """Test handling of missing token usage."""
        client = OpenAIClient(api_key="test-key")

        mock_response = {
            "data": [{"embedding": [0.1, 0.2, 0.3]}],
        }

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_response_obj = MagicMock()
            mock_response_obj.status_code = 200
            mock_response_obj.json.return_value = mock_response
            mock_client.request = AsyncMock(return_value=mock_response_obj)

            result = await client.create_embedding("test")

            assert result.token_usage is None


class TestGlobalClient:
    """Test global client functions."""

    def test_get_openai_client(self):
        """Test getting global client."""
        # Reset global client
        set_openai_client(None)

        with patch("app.llm.openai_client.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            mock_settings.OPENAI_EMBEDDING_MODEL = "test-embedding"
            mock_settings.OPENAI_CHAT_MODEL = "test-chat"
            mock_settings.OPENAI_MAX_RETRIES = 3
            mock_settings.OPENAI_TIMEOUT = 60

            # Import here to get fresh module state
            from app.llm.openai_client import _client as module_client

            # Reset module-level client
            import app.llm.openai_client as client_module
            client_module._client = None

            client1 = get_openai_client()
            client2 = get_openai_client()

            # Should return the same instance
            assert client1 is client2

    def test_set_openai_client(self):
        """Test setting global client."""
        # Reset global client first
        import app.llm.openai_client as client_module
        client_module._client = None

        custom_client = OpenAIClient(api_key="custom-key")
        set_openai_client(custom_client)

        assert get_openai_client() is custom_client

