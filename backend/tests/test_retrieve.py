import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import asyncpg

from app.rag.retrieve import retrieve, RetrievedChunk, RetrieveError


class TestRetrieveBasic:
    """Test basic retrieval functionality."""

    @pytest.mark.asyncio
    async def test_retrieve_basic(self):
        """Test basic retrieval without filters."""
        # Mock OpenAI client
        mock_openai_client = AsyncMock()
        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = [0.1, 0.2, 0.3] * 512  # 1536 dims
        mock_openai_client.create_embedding = AsyncMock(return_value=mock_embedding_response)

        # Mock database
        mock_pool = AsyncMock()
        mock_conn = AsyncMock()
        mock_pool.acquire = AsyncMock(return_value=mock_conn)
        mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_conn.__aexit__ = AsyncMock(return_value=None)

        # Mock query results
        mock_row1 = MagicMock()
        mock_row1.chunk_id = "chunk-1"
        mock_row1.document_id = "doc-1"
        mock_row1.title = "Test Doc"
        mock_row1.source = "test-source"
        mock_row1.chunk_index = 0
        mock_row1.content = "Test content"
        mock_row1.similarity = 0.95

        mock_row2 = MagicMock()
        mock_row2.chunk_id = "chunk-2"
        mock_row2.document_id = "doc-1"
        mock_row2.title = "Test Doc"
        mock_row2.source = "test-source"
        mock_row2.chunk_index = 1
        mock_row2.content = "More content"
        mock_row2.similarity = 0.85

        mock_conn.fetch = AsyncMock(return_value=[mock_row1, mock_row2])

        with (
            patch("app.rag.retrieve.get_openai_client", return_value=mock_openai_client),
            patch("app.rag.retrieve.get_db_pool", return_value=mock_pool),
        ):
            results = await retrieve("test query", top_k=5)

            assert len(results) == 2
            assert results[0].chunk_id == "chunk-1"
            assert results[0].score == 0.95
            assert results[1].score == 0.85
            # Verify scores are in descending order
            assert results[0].score >= results[1].score

    @pytest.mark.asyncio
    async def test_retrieve_with_filters(self):
        """Test retrieval with source and title filters."""
        mock_openai_client = AsyncMock()
        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = [0.1, 0.2, 0.3] * 512
        mock_openai_client.create_embedding = AsyncMock(return_value=mock_embedding_response)

        mock_pool = AsyncMock()
        mock_conn = AsyncMock()
        mock_pool.acquire = AsyncMock(return_value=mock_conn)
        mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_conn.__aexit__ = AsyncMock(return_value=None)

        mock_row = MagicMock()
        mock_row.chunk_id = "chunk-1"
        mock_row.document_id = "doc-1"
        mock_row.title = "Filtered Doc"
        mock_row.source = "filtered-source"
        mock_row.chunk_index = 0
        mock_row.content = "Content"
        mock_row.similarity = 0.90

        mock_conn.fetch = AsyncMock(return_value=[mock_row])

        with (
            patch("app.rag.retrieve.get_openai_client", return_value=mock_openai_client),
            patch("app.rag.retrieve.get_db_pool", return_value=mock_pool),
        ):
            filters = {"source": "filtered-source", "title": "Filtered Doc"}
            results = await retrieve("test query", top_k=5, filters=filters)

            assert len(results) == 1
            assert results[0].source == "filtered-source"
            assert results[0].title == "Filtered Doc"

            # Verify filter parameters were used in query
            call_args = mock_conn.fetch.call_args
            assert "filtered-source" in str(call_args)

    @pytest.mark.asyncio
    async def test_retrieve_with_source_filter_only(self):
        """Test retrieval with only source filter."""
        mock_openai_client = AsyncMock()
        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = [0.1, 0.2, 0.3] * 512
        mock_openai_client.create_embedding = AsyncMock(return_value=mock_embedding_response)

        mock_pool = AsyncMock()
        mock_conn = AsyncMock()
        mock_pool.acquire = AsyncMock(return_value=mock_conn)
        mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_conn.__aexit__ = AsyncMock(return_value=None)

        mock_conn.fetch = AsyncMock(return_value=[])

        with (
            patch("app.rag.retrieve.get_openai_client", return_value=mock_openai_client),
            patch("app.rag.retrieve.get_db_pool", return_value=mock_pool),
        ):
            filters = {"source": "test-source"}
            results = await retrieve("test query", top_k=5, filters=filters)

            assert len(results) == 0

    @pytest.mark.asyncio
    async def test_retrieve_with_title_filter_none(self):
        """Test retrieval with title filter set to None."""
        mock_openai_client = AsyncMock()
        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = [0.1, 0.2, 0.3] * 512
        mock_openai_client.create_embedding = AsyncMock(return_value=mock_embedding_response)

        mock_pool = AsyncMock()
        mock_conn = AsyncMock()
        mock_pool.acquire = AsyncMock(return_value=mock_conn)
        mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_conn.__aexit__ = AsyncMock(return_value=None)

        mock_row = MagicMock()
        mock_row.chunk_id = "chunk-1"
        mock_row.document_id = "doc-1"
        mock_row.title = None
        mock_row.source = "test-source"
        mock_row.chunk_index = 0
        mock_row.content = "Content"
        mock_row.similarity = 0.90

        mock_conn.fetch = AsyncMock(return_value=[mock_row])

        with (
            patch("app.rag.retrieve.get_openai_client", return_value=mock_openai_client),
            patch("app.rag.retrieve.get_db_pool", return_value=mock_pool),
        ):
            filters = {"title": None}
            results = await retrieve("test query", top_k=5, filters=filters)

            assert len(results) == 1
            assert results[0].title is None


class TestRetrieveOrdering:
    """Test retrieval ordering with known embeddings."""

    @pytest.mark.asyncio
    async def test_retrieve_ordering_by_similarity(self):
        """Test that results are ordered by similarity (highest first)."""
        # Create test embeddings that we can reason about
        # Query embedding: [1, 0, 0, ...]
        # Chunk 1: [1, 0, 0, ...] - should have similarity ~1.0
        # Chunk 2: [0.5, 0.5, 0, ...] - should have lower similarity
        # Chunk 3: [0, 1, 0, ...] - should have similarity ~0.0

        mock_openai_client = AsyncMock()
        # Query embedding: mostly 1s in first dimension
        query_embedding = [1.0] + [0.0] * 1535
        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = query_embedding
        mock_openai_client.create_embedding = AsyncMock(return_value=mock_embedding_response)

        mock_pool = AsyncMock()
        mock_conn = AsyncMock()
        mock_pool.acquire = AsyncMock(return_value=mock_conn)
        mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_conn.__aexit__ = AsyncMock(return_value=None)

        # Mock results with decreasing similarity
        mock_row1 = MagicMock()
        mock_row1.chunk_id = "chunk-1"
        mock_row1.document_id = "doc-1"
        mock_row1.title = "Doc 1"
        mock_row1.source = "source-1"
        mock_row1.chunk_index = 0
        mock_row1.content = "Most similar"
        mock_row1.similarity = 0.99

        mock_row2 = MagicMock()
        mock_row2.chunk_id = "chunk-2"
        mock_row2.document_id = "doc-2"
        mock_row2.title = "Doc 2"
        mock_row2.source = "source-2"
        mock_row2.chunk_index = 0
        mock_row2.content = "Less similar"
        mock_row2.similarity = 0.75

        mock_row3 = MagicMock()
        mock_row3.chunk_id = "chunk-3"
        mock_row3.document_id = "doc-3"
        mock_row3.title = "Doc 3"
        mock_row3.source = "source-3"
        mock_row3.chunk_index = 0
        mock_row3.content = "Least similar"
        mock_row3.similarity = 0.50

        mock_conn.fetch = AsyncMock(return_value=[mock_row1, mock_row2, mock_row3])

        with (
            patch("app.rag.retrieve.get_openai_client", return_value=mock_openai_client),
            patch("app.rag.retrieve.get_db_pool", return_value=mock_pool),
        ):
            results = await retrieve("test query", top_k=5)

            assert len(results) == 3
            # Verify descending order by score
            assert results[0].score == 0.99
            assert results[1].score == 0.75
            assert results[2].score == 0.50
            assert results[0].score >= results[1].score >= results[2].score

    @pytest.mark.asyncio
    async def test_retrieve_top_k_limit(self):
        """Test that top_k limits the number of results."""
        mock_openai_client = AsyncMock()
        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = [0.1, 0.2, 0.3] * 512
        mock_openai_client.create_embedding = AsyncMock(return_value=mock_embedding_response)

        mock_pool = AsyncMock()
        mock_conn = AsyncMock()
        mock_pool.acquire = AsyncMock(return_value=mock_conn)
        mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_conn.__aexit__ = AsyncMock(return_value=None)

        # Create 10 mock rows
        mock_rows = []
        for i in range(10):
            mock_row = MagicMock()
            mock_row.chunk_id = f"chunk-{i}"
            mock_row.document_id = f"doc-{i}"
            mock_row.title = f"Doc {i}"
            mock_row.source = f"source-{i}"
            mock_row.chunk_index = 0
            mock_row.content = f"Content {i}"
            mock_row.similarity = 0.9 - (i * 0.01)
            mock_rows.append(mock_row)

        mock_conn.fetch = AsyncMock(return_value=mock_rows)

        with (
            patch("app.rag.retrieve.get_openai_client", return_value=mock_openai_client),
            patch("app.rag.retrieve.get_db_pool", return_value=mock_pool),
        ):
            # Request top_k=3, but mock returns 10
            # The LIMIT in SQL should handle this, but we test the function behavior
            results = await retrieve("test query", top_k=3)

            # Verify the query was called with LIMIT 3
            call_args = mock_conn.fetch.call_args
            # The last parameter should be top_k (3)
            assert 3 in call_args[0] or "LIMIT 3" in str(call_args)


class TestRetrieveErrors:
    """Test error handling."""

    @pytest.mark.asyncio
    async def test_retrieve_invalid_top_k(self):
        """Test that invalid top_k raises error."""
        with pytest.raises(ValueError, match="top_k must be positive"):
            await retrieve("test query", top_k=0)

        with pytest.raises(ValueError, match="top_k must be positive"):
            await retrieve("test query", top_k=-1)

    @pytest.mark.asyncio
    async def test_retrieve_embedding_error(self):
        """Test handling of embedding generation errors."""
        from app.llm.openai_client import OpenAIError

        mock_openai_client = AsyncMock()
        mock_openai_client.create_embedding = AsyncMock(side_effect=OpenAIError("API error"))

        with patch("app.rag.retrieve.get_openai_client", return_value=mock_openai_client):
            with pytest.raises(RetrieveError, match="Failed to generate embedding"):
                await retrieve("test query", top_k=5)

    @pytest.mark.asyncio
    async def test_retrieve_database_error(self):
        """Test handling of database errors."""
        mock_openai_client = AsyncMock()
        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = [0.1, 0.2, 0.3] * 512
        mock_openai_client.create_embedding = AsyncMock(return_value=mock_embedding_response)

        mock_pool = AsyncMock()
        mock_conn = AsyncMock()
        mock_pool.acquire = AsyncMock(return_value=mock_conn)
        mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_conn.__aexit__ = AsyncMock(return_value=None)

        mock_conn.fetch = AsyncMock(side_effect=Exception("Database error"))

        with (
            patch("app.rag.retrieve.get_openai_client", return_value=mock_openai_client),
            patch("app.rag.retrieve.get_db_pool", return_value=mock_pool),
        ):
            with pytest.raises(RetrieveError, match="Failed to retrieve chunks"):
                await retrieve("test query", top_k=5)


class TestRetrieveScoreMeaning:
    """Test score meaning and range."""

    @pytest.mark.asyncio
    async def test_score_range(self):
        """Test that scores are in valid range (0.0 to 1.0)."""
        mock_openai_client = AsyncMock()
        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = [0.1, 0.2, 0.3] * 512
        mock_openai_client.create_embedding = AsyncMock(return_value=mock_embedding_response)

        mock_pool = AsyncMock()
        mock_conn = AsyncMock()
        mock_pool.acquire = AsyncMock(return_value=mock_conn)
        mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_conn.__aexit__ = AsyncMock(return_value=None)

        # Test various score values
        mock_rows = []
        for score in [1.0, 0.95, 0.5, 0.1, 0.0]:
            mock_row = MagicMock()
            mock_row.chunk_id = f"chunk-{score}"
            mock_row.document_id = "doc-1"
            mock_row.title = "Test"
            mock_row.source = "test"
            mock_row.chunk_index = 0
            mock_row.content = "Content"
            mock_row.similarity = score
            mock_rows.append(mock_row)

        mock_conn.fetch = AsyncMock(return_value=mock_rows)

        with (
            patch("app.rag.retrieve.get_openai_client", return_value=mock_openai_client),
            patch("app.rag.retrieve.get_db_pool", return_value=mock_pool),
        ):
            results = await retrieve("test query", top_k=5)

            for result in results:
                assert 0.0 <= result.score <= 1.0

    @pytest.mark.asyncio
    async def test_score_meaning_documentation(self):
        """Test that score represents similarity (not distance)."""
        mock_openai_client = AsyncMock()
        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = [0.1, 0.2, 0.3] * 512
        mock_openai_client.create_embedding = AsyncMock(return_value=mock_embedding_response)

        mock_pool = AsyncMock()
        mock_conn = AsyncMock()
        mock_pool.acquire = AsyncMock(return_value=mock_conn)
        mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_conn.__aexit__ = AsyncMock(return_value=None)

        # High similarity should have high score
        mock_row = MagicMock()
        mock_row.chunk_id = "chunk-1"
        mock_row.document_id = "doc-1"
        mock_row.title = "Test"
        mock_row.source = "test"
        mock_row.chunk_index = 0
        mock_row.content = "Content"
        mock_row.similarity = 0.95  # High similarity

        mock_conn.fetch = AsyncMock(return_value=[mock_row])

        with (
            patch("app.rag.retrieve.get_openai_client", return_value=mock_openai_client),
            patch("app.rag.retrieve.get_db_pool", return_value=mock_pool),
        ):
            results = await retrieve("test query", top_k=5)

            assert len(results) == 1
            # High similarity = high score (not distance)
            assert results[0].score == 0.95
            assert results[0].score > 0.5  # Clearly similar, not distant


class TestRetrieveFilterValidation:
    """Test filter validation and application."""

    @pytest.mark.asyncio
    async def test_filter_source_exact_match(self):
        """Test that source filter uses exact match."""
        mock_openai_client = AsyncMock()
        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = [0.1, 0.2, 0.3] * 512
        mock_openai_client.create_embedding = AsyncMock(return_value=mock_embedding_response)

        mock_pool = AsyncMock()
        mock_conn = AsyncMock()
        mock_pool.acquire = AsyncMock(return_value=mock_conn)
        mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_conn.__aexit__ = AsyncMock(return_value=None)

        mock_row = MagicMock()
        mock_row.chunk_id = "chunk-1"
        mock_row.document_id = "doc-1"
        mock_row.title = "Test"
        mock_row.source = "exact-source"
        mock_row.chunk_index = 0
        mock_row.content = "Content"
        mock_row.similarity = 0.9

        mock_conn.fetch = AsyncMock(return_value=[mock_row])

        with (
            patch("app.rag.retrieve.get_openai_client", return_value=mock_openai_client),
            patch("app.rag.retrieve.get_db_pool", return_value=mock_pool),
        ):
            filters = {"source": "exact-source"}
            results = await retrieve("test query", top_k=5, filters=filters)

            assert len(results) == 1
            assert results[0].source == "exact-source"

            # Verify SQL query contains exact match
            call_args = mock_conn.fetch.call_args
            query_str = str(call_args)
            assert "exact-source" in query_str

    @pytest.mark.asyncio
    async def test_filter_title_exact_match(self):
        """Test that title filter uses exact match."""
        mock_openai_client = AsyncMock()
        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = [0.1, 0.2, 0.3] * 512
        mock_openai_client.create_embedding = AsyncMock(return_value=mock_embedding_response)

        mock_pool = AsyncMock()
        mock_conn = AsyncMock()
        mock_pool.acquire = AsyncMock(return_value=mock_conn)
        mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_conn.__aexit__ = AsyncMock(return_value=None)

        mock_row = MagicMock()
        mock_row.chunk_id = "chunk-1"
        mock_row.document_id = "doc-1"
        mock_row.title = "Exact Title"
        mock_row.source = "test"
        mock_row.chunk_index = 0
        mock_row.content = "Content"
        mock_row.similarity = 0.9

        mock_conn.fetch = AsyncMock(return_value=[mock_row])

        with (
            patch("app.rag.retrieve.get_openai_client", return_value=mock_openai_client),
            patch("app.rag.retrieve.get_db_pool", return_value=mock_pool),
        ):
            filters = {"title": "Exact Title"}
            results = await retrieve("test query", top_k=5, filters=filters)

            assert len(results) == 1
            assert results[0].title == "Exact Title"

    @pytest.mark.asyncio
    async def test_filter_combination(self):
        """Test combining source and title filters."""
        mock_openai_client = AsyncMock()
        mock_embedding_response = MagicMock()
        mock_embedding_response.embedding = [0.1, 0.2, 0.3] * 512
        mock_openai_client.create_embedding = AsyncMock(return_value=mock_embedding_response)

        mock_pool = AsyncMock()
        mock_conn = AsyncMock()
        mock_pool.acquire = AsyncMock(return_value=mock_conn)
        mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_conn.__aexit__ = AsyncMock(return_value=None)

        mock_row = MagicMock()
        mock_row.chunk_id = "chunk-1"
        mock_row.document_id = "doc-1"
        mock_row.title = "Combined Title"
        mock_row.source = "combined-source"
        mock_row.chunk_index = 0
        mock_row.content = "Content"
        mock_row.similarity = 0.9

        mock_conn.fetch = AsyncMock(return_value=[mock_row])

        with (
            patch("app.rag.retrieve.get_openai_client", return_value=mock_openai_client),
            patch("app.rag.retrieve.get_db_pool", return_value=mock_pool),
        ):
            filters = {"source": "combined-source", "title": "Combined Title"}
            results = await retrieve("test query", top_k=5, filters=filters)

            assert len(results) == 1
            assert results[0].source == "combined-source"
            assert results[0].title == "Combined Title"
