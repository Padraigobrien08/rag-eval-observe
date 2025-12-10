import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import asyncpg

from app.rag.ingest import (
    ingest_document,
    DocumentTooLargeError,
    IngestError,
    MAX_DOCUMENT_SIZE,
)
from app.db.session import get_db_pool


@pytest.mark.asyncio
async def test_ingest_document_integration():
    """Integration test for document ingestion."""
    # Mock database pool
    mock_pool = AsyncMock()
    mock_conn = AsyncMock()

    # Mock connection context manager
    mock_pool.acquire = AsyncMock(return_value=mock_conn)
    mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_conn.__aexit__ = AsyncMock(return_value=None)

    # Mock transaction
    mock_transaction = AsyncMock()
    mock_transaction.__aenter__ = AsyncMock(return_value=None)
    mock_transaction.__aexit__ = AsyncMock(return_value=None)
    mock_conn.transaction = MagicMock(return_value=mock_transaction)

    # Mock database queries
    # find_existing_document returns None (new document)
    mock_conn.fetchrow = AsyncMock(return_value=None)

    # Mock document insert
    mock_conn.execute = AsyncMock()

    with (
        patch("app.rag.ingest.get_db_pool", return_value=mock_pool),
        patch("app.rag.ingest.get_openai_client") as mock_openai,
    ):
        # Mock OpenAI client
        mock_client = AsyncMock()
        mock_openai.return_value = mock_client

        # Mock embedding response
        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = [0.1, 0.2, 0.3] * 512  # 1536 dims
        mock_client.create_embeddings = AsyncMock(return_value=[mock_embedding_response])

        # Test data
        source = "test-source"
        title = "Test Document"
        text = "This is a test document. " * 50  # ~1000 chars

        result = await ingest_document(
            source=source,
            title=title,
            text=text,
            is_markdown=False,
        )

        # Verify result
        assert "document_id" in result
        assert "chunks_created" in result
        assert result["chunks_created"] > 0

        # Verify database calls
        # Should have called execute for document insert
        assert mock_conn.execute.call_count > 0

        # Verify OpenAI was called
        mock_client.create_embeddings.assert_called_once()


@pytest.mark.asyncio
async def test_ingest_document_too_large():
    """Test that overly large documents are rejected."""
    large_text = "A" * (MAX_DOCUMENT_SIZE + 1)

    with pytest.raises(DocumentTooLargeError) as exc_info:
        await ingest_document(
            source="test-source",
            title="Large Document",
            text=large_text,
        )

    assert "exceeds maximum" in str(exc_info.value)


@pytest.mark.asyncio
async def test_ingest_idempotency():
    """Test that ingesting the same document creates a new version."""
    mock_pool = AsyncMock()
    mock_conn = AsyncMock()

    mock_pool.acquire = AsyncMock(return_value=mock_conn)
    mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_conn.__aexit__ = AsyncMock(return_value=None)

    mock_transaction = AsyncMock()
    mock_transaction.__aenter__ = AsyncMock(return_value=None)
    mock_transaction.__aexit__ = AsyncMock(return_value=None)
    mock_conn.transaction = MagicMock(return_value=mock_transaction)

    # First call: no existing document
    # Second call: existing document found
    existing_doc = {
        "id": "test-source-test-document",
        "source": "test-source",
        "title": "Test Document",
    }

    mock_conn.fetchrow = AsyncMock(return_value=existing_doc)

    # Mock version counting - return one existing version
    version_row = MagicMock()
    version_row.source = "test-source (v1)"
    mock_conn.fetch = AsyncMock(return_value=[version_row])

    mock_conn.execute = AsyncMock()

    with (
        patch("app.rag.ingest.get_db_pool", return_value=mock_pool),
        patch("app.rag.ingest.get_openai_client") as mock_openai,
    ):
        mock_client = AsyncMock()
        mock_openai.return_value = mock_client

        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = [0.1, 0.2, 0.3] * 512
        mock_client.create_embeddings = AsyncMock(return_value=[mock_embedding_response])

        text = "This is a test document. " * 50

        result = await ingest_document(
            source="test-source",
            title="Test Document",
            text=text,
        )

        # Verify version 2 was created
        assert "v2" in result["document_id"] or "v2" in str(mock_conn.execute.call_args_list)


@pytest.mark.asyncio
async def test_ingest_markdown():
    """Test ingesting markdown document."""
    mock_pool = AsyncMock()
    mock_conn = AsyncMock()

    mock_pool.acquire = AsyncMock(return_value=mock_conn)
    mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_conn.__aexit__ = AsyncMock(return_value=None)

    mock_transaction = AsyncMock()
    mock_transaction.__aenter__ = AsyncMock(return_value=None)
    mock_transaction.__aexit__ = AsyncMock(return_value=None)
    mock_conn.transaction = MagicMock(return_value=mock_transaction)

    mock_conn.fetchrow = AsyncMock(return_value=None)
    mock_conn.execute = AsyncMock()

    with (
        patch("app.rag.ingest.get_db_pool", return_value=mock_pool),
        patch("app.rag.ingest.get_openai_client") as mock_openai,
    ):
        mock_client = AsyncMock()
        mock_openai.return_value = mock_client

        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = [0.1, 0.2, 0.3] * 512
        mock_client.create_embeddings = AsyncMock(return_value=[mock_embedding_response])

        markdown_text = """# Title

Some content here.

## Section

More content.
"""

        result = await ingest_document(
            source="test-source",
            title="Markdown Document",
            text=markdown_text,
            is_markdown=True,
        )

        assert "document_id" in result
        assert result["chunks_created"] > 0


@pytest.mark.asyncio
async def test_ingest_transaction_rollback_on_error():
    """Test that transaction is rolled back on error."""
    mock_pool = AsyncMock()
    mock_conn = AsyncMock()

    mock_pool.acquire = AsyncMock(return_value=mock_conn)
    mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_conn.__aexit__ = AsyncMock(return_value=None)

    mock_transaction = AsyncMock()
    mock_transaction.__aenter__ = AsyncMock(return_value=None)
    # Simulate transaction rollback on error
    mock_transaction.__aexit__ = AsyncMock(return_value=None)
    mock_conn.transaction = MagicMock(return_value=mock_transaction)

    mock_conn.fetchrow = AsyncMock(return_value=None)

    # Make execute raise an error
    mock_conn.execute = AsyncMock(side_effect=Exception("Database error"))

    with (
        patch("app.rag.ingest.get_db_pool", return_value=mock_pool),
        patch("app.rag.ingest.get_openai_client") as mock_openai,
    ):
        mock_client = AsyncMock()
        mock_openai.return_value = mock_client

        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = [0.1, 0.2, 0.3] * 512
        mock_client.create_embeddings = AsyncMock(return_value=[mock_embedding_response])

        text = "This is a test document. " * 50

        with pytest.raises(IngestError):
            await ingest_document(
                source="test-source",
                title="Test Document",
                text=text,
            )

        # Verify transaction was used (rollback happens automatically)
        assert mock_conn.transaction.called


@pytest.mark.asyncio
async def test_ingest_empty_text():
    """Test that empty text raises an error."""
    mock_pool = AsyncMock()
    mock_conn = AsyncMock()

    mock_pool.acquire = AsyncMock(return_value=mock_conn)
    mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_conn.__aexit__ = AsyncMock(return_value=None)

    mock_transaction = AsyncMock()
    mock_transaction.__aenter__ = AsyncMock(return_value=None)
    mock_transaction.__aexit__ = AsyncMock(return_value=None)
    mock_conn.transaction = MagicMock(return_value=mock_transaction)

    mock_conn.fetchrow = AsyncMock(return_value=None)

    with patch("app.rag.ingest.get_db_pool", return_value=mock_pool):
        with pytest.raises(IngestError, match="No chunks generated"):
            await ingest_document(
                source="test-source",
                title="Empty Document",
                text="   ",  # Only whitespace
            )


@pytest.mark.asyncio
async def test_ingest_embedding_failure():
    """Test handling of embedding generation failure."""
    mock_pool = AsyncMock()
    mock_conn = AsyncMock()

    mock_pool.acquire = AsyncMock(return_value=mock_conn)
    mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_conn.__aexit__ = AsyncMock(return_value=None)

    mock_transaction = AsyncMock()
    mock_transaction.__aenter__ = AsyncMock(return_value=None)
    mock_transaction.__aexit__ = AsyncMock(return_value=None)
    mock_conn.transaction = MagicMock(return_value=mock_transaction)

    mock_conn.fetchrow = AsyncMock(return_value=None)

    with (
        patch("app.rag.ingest.get_db_pool", return_value=mock_pool),
        patch("app.rag.ingest.get_openai_client") as mock_openai,
    ):
        from app.llm.openai_client import OpenAIError

        mock_client = AsyncMock()
        mock_openai.return_value = mock_client
        mock_client.create_embeddings = AsyncMock(side_effect=OpenAIError("API error"))

        text = "This is a test document. " * 50

        with pytest.raises(IngestError, match="Failed to generate embeddings"):
            await ingest_document(
                source="test-source",
                title="Test Document",
                text=text,
            )
