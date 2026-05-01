"""Tests for POST /api/v1/query/stream SSE endpoint."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_query_stream_returns_sse_events():
    async def fake_answer_stream(*args, **kwargs):
        yield {"type": "delta", "text": "Hello "}
        yield {"type": "delta", "text": "world"}
        yield {
            "type": "done",
            "answer": "Hello world",
            "citations": [],
            "used_chunk_ids": [],
            "latency_ms": 12,
            "token_usage": None,
            "rag_model": "vector-similarity",
            "retrieved_chunk_count": 0,
        }

    with (
        patch(
            "app.api.routes.generate_answer_stream",
            side_effect=fake_answer_stream,
        ),
        patch(
            "app.api.routes._prepare_rag_retrieval",
            new_callable=AsyncMock,
            return_value=(None, [], "vector-similarity"),
        ),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            async with client.stream(
                "POST",
                "/api/v1/query/stream",
                json={"query": "hi", "topK": 5},
            ) as response:
                assert response.status_code == 200
                raw = await response.aread()

    text = raw.decode()
    assert "delta" in text
    assert "done" in text
