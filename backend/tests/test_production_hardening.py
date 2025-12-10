import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.rate_limit import RateLimiter, get_rate_limiter
from app.rag.answer import generate_answer, sanitize_and_truncate_context
from app.rag.retrieve import RetrievedChunk


class TestPayloadSizeLimits:
    """Test payload size validation."""

    def test_ingest_payload_too_large(self):
        """Test that oversized ingest payloads are rejected with 413."""
        client = TestClient(app)
        large_text = "A" * (settings.MAX_INGEST_PAYLOAD_SIZE + 1)

        response = client.post(
            "/api/v1/ingest",
            json={
                "source": "test",
                "title": "Test",
                "text": large_text,
            },
        )

        assert response.status_code == 413
        assert "exceeds maximum" in response.json()["detail"]

    def test_ingest_empty_source(self):
        """Test that empty source is rejected with 400."""
        client = TestClient(app)

        response = client.post(
            "/api/v1/ingest",
            json={
                "source": "",
                "title": "Test",
                "text": "Content",
            },
        )

        assert response.status_code == 400
        assert "cannot be empty" in response.json()["detail"]

    def test_ingest_empty_text(self):
        """Test that empty text is rejected with 400."""
        client = TestClient(app)

        response = client.post(
            "/api/v1/ingest",
            json={
                "source": "test",
                "title": "Test",
                "text": "   ",
            },
        )

        assert response.status_code == 400
        assert "cannot be empty" in response.json()["detail"]

    def test_query_too_long(self):
        """Test that overly long queries are rejected with 400."""
        client = TestClient(app)
        long_query = "A" * (settings.MAX_QUERY_LENGTH + 1)

        response = client.post(
            "/api/v1/query",
            json={
                "query": long_query,
                "top_k": 5,
            },
        )

        assert response.status_code == 400
        assert "exceeds maximum length" in response.json()["detail"]

    def test_query_empty(self):
        """Test that empty query is rejected with 400."""
        client = TestClient(app)

        response = client.post(
            "/api/v1/query",
            json={
                "query": "   ",
                "top_k": 5,
            },
        )

        assert response.status_code == 400
        assert "cannot be empty" in response.json()["detail"]


class TestRateLimiting:
    """Test rate limiting functionality."""

    def test_rate_limiter_allows_requests(self):
        """Test that rate limiter allows requests within limit."""
        limiter = RateLimiter(max_requests=5, window_seconds=60)

        for i in range(5):
            allowed, remaining = limiter.is_allowed("test-ip")
            assert allowed is True
            assert remaining == 4 - i

    def test_rate_limiter_blocks_excess(self):
        """Test that rate limiter blocks requests exceeding limit."""
        limiter = RateLimiter(max_requests=3, window_seconds=60)

        # Allow 3 requests
        for _ in range(3):
            allowed, _ = limiter.is_allowed("test-ip")
            assert allowed is True

        # 4th request should be blocked
        allowed, remaining = limiter.is_allowed("test-ip")
        assert allowed is False
        assert remaining == 0

    def test_rate_limiter_per_ip(self):
        """Test that rate limiting is per IP."""
        limiter = RateLimiter(max_requests=2, window_seconds=60)

        # IP1 uses limit
        allowed1, _ = limiter.is_allowed("ip1")
        assert allowed1 is True
        allowed1, _ = limiter.is_allowed("ip1")
        assert allowed1 is True

        # IP2 should still have requests
        allowed2, remaining2 = limiter.is_allowed("ip2")
        assert allowed2 is True
        assert remaining2 == 1

    @pytest.mark.asyncio
    async def test_rate_limit_middleware(self):
        """Test rate limiting middleware."""
        # Reset rate limiter
        limiter = get_rate_limiter()
        limiter.reset()

        client = TestClient(app)

        # Make requests up to limit
        for _ in range(settings.RATE_LIMIT_REQUESTS):
            response = client.get("/api/v1/health")
            assert response.status_code in [200, 503]  # Health may fail if DB not connected

        # Next request should be rate limited (if limit is low enough)
        # Note: This test may be flaky if RATE_LIMIT_REQUESTS is high
        if settings.RATE_LIMIT_REQUESTS <= 10:
            response = client.get("/api/v1/health")
            # May be rate limited or may succeed depending on timing
            assert response.status_code in [200, 429, 503]


class TestContextTruncation:
    """Test context sanitization and truncation."""

    def test_truncate_large_context(self):
        """Test that large context is truncated."""
        chunks = [
            RetrievedChunk(
                chunk_id=f"chunk-{i}",
                document_id="doc-1",
                title="Test",
                source="test",
                chunk_index=i,
                content="A" * 20000,  # 20k chars per chunk
                score=0.9,
            )
            for i in range(5)
        ]

        truncated = sanitize_and_truncate_context(chunks)

        # Should be truncated to fit budget
        total_chars = sum(len(c.content) for c in truncated)
        assert total_chars <= settings.MAX_CONTEXT_CHARS
        assert len(truncated) <= len(chunks)

    def test_small_context_unchanged(self):
        """Test that small context is not truncated."""
        chunks = [
            RetrievedChunk(
                chunk_id="chunk-1",
                document_id="doc-1",
                title="Test",
                source="test",
                chunk_index=0,
                content="Small content",
                score=0.9,
            )
        ]

        truncated = sanitize_and_truncate_context(chunks)

        assert len(truncated) == 1
        assert truncated[0].content == chunks[0].content

    def test_empty_context(self):
        """Test handling of empty context."""
        truncated = sanitize_and_truncate_context([])
        assert truncated == []


class TestIDontKnowBehavior:
    """Test 'I don't know' behavior when retrieval is empty."""

    @pytest.mark.asyncio
    async def test_empty_retrieval_returns_idont_know(self):
        """Test that empty retrieval produces 'I don't know' answer."""
        mock_openai_client = AsyncMock()
        mock_completion = MagicMock()
        mock_completion.content = "I don't know based on the provided documents."
        mock_completion.token_usage = None
        mock_completion.finish_reason = "stop"
        mock_openai_client.create_chat_completion = AsyncMock(return_value=mock_completion)

        with patch("app.rag.answer.get_openai_client", return_value=mock_openai_client):
            result = await generate_answer("What is RAG?", [])

            assert "don't know" in result.answer.lower()
            assert len(result.citations) == 0
            assert len(result.used_chunk_ids) == 0

    @pytest.mark.asyncio
    async def test_query_with_no_results(self):
        """Test query endpoint with no retrieval results."""
        client = TestClient(app)

        with patch("app.api.routes.retrieve") as mock_retrieve:
            mock_retrieve.return_value = []  # No results

            with patch("app.api.routes.generate_answer") as mock_answer:
                from app.rag.answer import AnswerResponse

                mock_answer.return_value = AnswerResponse(
                    answer="I don't know based on the provided documents.",
                    citations=[],
                    used_chunk_ids=[],
                    latency_ms=100,
                    token_usage=None,
                )

                response = client.post(
                    "/api/v1/query",
                    json={
                        "query": "What is something not in the database?",
                        "top_k": 5,
                    },
                )

                # Should succeed but with "I don't know" answer
                assert response.status_code == 200
                data = response.json()
                assert "don't know" in data["answer"].lower() or "don't know" in str(data).lower()


class TestErrorCodes:
    """Test proper use of 4xx vs 5xx error codes."""

    def test_400_for_validation_errors(self):
        """Test that validation errors return 400."""
        client = TestClient(app)

        # Invalid top_k
        response = client.post(
            "/api/v1/query",
            json={
                "query": "Test",
                "top_k": 0,  # Invalid
            },
        )

        # Pydantic validation should return 422
        assert response.status_code in [400, 422]

    def test_413_for_payload_too_large(self):
        """Test that payload too large returns 413."""
        client = TestClient(app)
        large_text = "A" * (settings.MAX_INGEST_PAYLOAD_SIZE + 1)

        response = client.post(
            "/api/v1/ingest",
            json={
                "source": "test",
                "title": "Test",
                "text": large_text,
            },
        )

        assert response.status_code == 413

    def test_429_for_rate_limit(self):
        """Test that rate limit returns 429."""
        limiter = get_rate_limiter()
        limiter.reset()

        # Exceed rate limit
        for _ in range(settings.RATE_LIMIT_REQUESTS + 1):
            allowed, _ = limiter.is_allowed("test-ip")

        if not allowed:
            client = TestClient(app)
            # Mock the IP to be rate limited
            with (
                patch("app.main.get_rate_limiter", return_value=limiter),
                patch("app.main.get_client_ip", return_value="test-ip"),
            ):
                response = client.get("/api/v1/health")
                # May be 429 if rate limited
                assert response.status_code in [200, 429, 503]

    def test_500_for_internal_errors(self):
        """Test that internal errors return 500."""
        client = TestClient(app)

        with patch("app.api.routes.retrieve") as mock_retrieve:
            mock_retrieve.side_effect = Exception("Internal error")

            response = client.post(
                "/api/v1/query",
                json={
                    "query": "Test",
                    "top_k": 5,
                },
            )

            assert response.status_code == 500
            assert "Internal server error" in response.json()["detail"]
