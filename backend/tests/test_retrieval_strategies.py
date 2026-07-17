"""Tests for the four retrieval strategies the benchmark table measures.

These are the strategies `rag_model` selects between, and the ones docs/BENCHMARKS.md
publishes Hit@k / MRR / cost numbers for — so the logic that ranks and fuses results
is the load-bearing code in this repo. The interesting behaviour is not "did it call
Postgres" but the pure ranking logic layered on top:

* Hybrid  — Reciprocal Rank Fusion: a chunk found by *both* retrievers must outrank
  a chunk found by only one, and each retriever keeps its own bound-parameter list.
* Rerank  — the LLM returns indices; out-of-range ones must be dropped, and a garbage
  response must degrade to vector order rather than raise.
* Multi   — dedupe across variations keeps the *highest* score, and one failing
  variation must not sink the whole query.

The DB and the LLM are mocked: these assert ranking behaviour, which is deterministic
and worth pinning. End-to-end retrieval against real pgvector is covered by the eval
harness and the integration E2E workflow.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.llm.openai_client import OpenAIError
from app.rag.retrieval_strategies import (
    HybridSearchStrategy,
    MultiQueryStrategy,
    RerankingStrategy,
    VectorSimilarityStrategy,
    get_retrieval_strategy,
)
from app.rag.types import RetrieveError

MODULE = "app.rag.retrieval_strategies"


def _mock_pool_with_conn(mock_conn):
    """Pool.acquire() returns an async context manager (asyncpg-compatible)."""
    mock_pool = MagicMock()
    acm = MagicMock()
    acm.__aenter__ = AsyncMock(return_value=mock_conn)
    acm.__aexit__ = AsyncMock(return_value=None)
    mock_pool.acquire = MagicMock(return_value=acm)
    return mock_pool


def _vector_row(chunk_id: str, similarity: float, rank: int = 1) -> dict:
    return {
        "chunk_id": chunk_id,
        "document_id": f"doc-{chunk_id}",
        "chunk_index": 0,
        "content": f"content of {chunk_id}",
        "title": f"Title {chunk_id}",
        "source": f"source-{chunk_id}",
        "similarity": similarity,
        "vector_rank": rank,
    }


def _bm25_row(chunk_id: str, bm25_score: float, rank: int = 1) -> dict:
    return {
        "chunk_id": chunk_id,
        "document_id": f"doc-{chunk_id}",
        "chunk_index": 0,
        "content": f"content of {chunk_id}",
        "title": f"Title {chunk_id}",
        "source": f"source-{chunk_id}",
        "bm25_score": bm25_score,
        "bm25_rank": rank,
    }


def _embedding_client(dims: int = 1536) -> AsyncMock:
    client = AsyncMock()
    response = MagicMock()
    response.embedding = [0.1] * dims
    client.create_embedding = AsyncMock(return_value=response)
    return client


def _chat_client(content: str) -> AsyncMock:
    """An LLM client whose embedding works and whose chat returns `content`."""
    client = _embedding_client()
    completion = MagicMock()
    completion.content = content
    client.create_chat_completion = AsyncMock(return_value=completion)
    return client


class TestGetRetrievalStrategy:
    """The factory behind the `rag_model` request field."""

    @pytest.mark.parametrize(
        ("rag_model", "expected"),
        [
            ("vector-similarity", VectorSimilarityStrategy),
            ("hybrid-search", HybridSearchStrategy),
            ("reranking", RerankingStrategy),
            ("multi-query", MultiQueryStrategy),
        ],
    )
    def test_maps_every_documented_model(self, rag_model, expected):
        assert isinstance(get_retrieval_strategy(rag_model), expected)

    def test_unknown_model_raises_with_the_supported_list(self):
        with pytest.raises(ValueError, match="Unsupported RAG model") as exc:
            get_retrieval_strategy("bm25-only")
        # The message doubles as API-error copy, so it must name the alternatives.
        for supported in ("vector-similarity", "hybrid-search", "reranking", "multi-query"):
            assert supported in str(exc.value)


class TestVectorSimilarityStrategy:
    @pytest.mark.asyncio
    async def test_maps_rows_to_chunks_and_uses_similarity_as_score(self):
        conn = AsyncMock()
        conn.fetch = AsyncMock(return_value=[_vector_row("c1", 0.91), _vector_row("c2", 0.42)])

        with (
            patch(f"{MODULE}.get_llm_client", return_value=_embedding_client()),
            patch(f"{MODULE}.get_db_pool", AsyncMock(return_value=_mock_pool_with_conn(conn))),
        ):
            results = await VectorSimilarityStrategy().retrieve("what is rag?", top_k=5)

        assert [r.chunk_id for r in results] == ["c1", "c2"]
        assert results[0].score == pytest.approx(0.91)
        assert results[0].title == "Title c1"

    @pytest.mark.asyncio
    async def test_rejects_non_positive_top_k_before_spending_an_embedding_call(self):
        client = _embedding_client()
        with patch(f"{MODULE}.get_llm_client", return_value=client):
            with pytest.raises(ValueError, match="top_k must be positive"):
                await VectorSimilarityStrategy().retrieve("q", top_k=0)
        # An embedding call costs money; the guard must come first.
        client.create_embedding.assert_not_called()

    @pytest.mark.asyncio
    async def test_embedding_failure_becomes_retrieve_error(self):
        client = _embedding_client()
        client.create_embedding = AsyncMock(side_effect=OpenAIError("rate limited"))

        with patch(f"{MODULE}.get_llm_client", return_value=client):
            with pytest.raises(RetrieveError, match="Failed to generate embedding"):
                await VectorSimilarityStrategy().retrieve("q", top_k=5)

    @pytest.mark.asyncio
    async def test_database_failure_becomes_retrieve_error(self):
        conn = AsyncMock()
        conn.fetch = AsyncMock(side_effect=RuntimeError("connection reset"))

        with (
            patch(f"{MODULE}.get_llm_client", return_value=_embedding_client()),
            patch(f"{MODULE}.get_db_pool", AsyncMock(return_value=_mock_pool_with_conn(conn))),
        ):
            with pytest.raises(RetrieveError, match="Failed to retrieve chunks"):
                await VectorSimilarityStrategy().retrieve("q", top_k=5)

    @pytest.mark.asyncio
    async def test_source_and_title_filters_are_bound_as_parameters(self):
        """Filters must travel as $N parameters, never interpolated into the SQL.

        This is the property that makes the module's ruff S608 exemption honest.
        """
        conn = AsyncMock()
        conn.fetch = AsyncMock(return_value=[])

        with (
            patch(f"{MODULE}.get_llm_client", return_value=_embedding_client()),
            patch(f"{MODULE}.get_db_pool", AsyncMock(return_value=_mock_pool_with_conn(conn))),
        ):
            await VectorSimilarityStrategy().retrieve(
                "q", top_k=3, filters={"source": "docs.md", "title": "Intro"}
            )

        sql, *params = conn.fetch.call_args[0]
        assert "d.source = $2" in sql
        assert "d.title = $3" in sql
        # The values themselves are bound, not present in the statement text.
        assert "docs.md" not in sql
        assert "Intro" not in sql
        assert params[1:] == ["docs.md", "Intro", 3]

    @pytest.mark.asyncio
    async def test_null_title_filter_uses_is_null_and_binds_no_parameter(self):
        conn = AsyncMock()
        conn.fetch = AsyncMock(return_value=[])

        with (
            patch(f"{MODULE}.get_llm_client", return_value=_embedding_client()),
            patch(f"{MODULE}.get_db_pool", AsyncMock(return_value=_mock_pool_with_conn(conn))),
        ):
            await VectorSimilarityStrategy().retrieve("q", top_k=3, filters={"title": None})

        sql, *params = conn.fetch.call_args[0]
        assert "d.title IS NULL" in sql
        # `= NULL` would silently match nothing; and no placeholder is consumed,
        # so top_k stays at $2.
        assert "d.title = $" not in sql
        assert params[1:] == [3]


class TestHybridSearchRRF:
    """Reciprocal Rank Fusion — the part of hybrid search that is real logic."""

    @staticmethod
    async def _run(vector_rows, bm25_rows, top_k=5, filters=None):
        conn = AsyncMock()
        conn.fetch = AsyncMock(side_effect=[vector_rows, bm25_rows])
        with (
            patch(f"{MODULE}.get_llm_client", return_value=_embedding_client()),
            patch(f"{MODULE}.get_db_pool", AsyncMock(return_value=_mock_pool_with_conn(conn))),
        ):
            results = await HybridSearchStrategy().retrieve("q", top_k=top_k, filters=filters)
        return results, conn

    @pytest.mark.asyncio
    async def test_chunk_found_by_both_retrievers_outranks_single_source_hits(self):
        """The whole point of RRF: agreement between retrievers wins.

        `both` is only rank 2 in each list, while `vec_only` and `bm25_only` are
        rank 1 in their own list. Summing 1/(60+rank) still puts `both` on top.
        """
        vector_rows = [_vector_row("vec_only", 0.99, 1), _vector_row("both", 0.80, 2)]
        bm25_rows = [_bm25_row("bm25_only", 9.9, 1), _bm25_row("both", 8.0, 2)]

        results, _ = await self._run(vector_rows, bm25_rows)

        assert [r.chunk_id for r in results] == ["both", "vec_only", "bm25_only"]
        # 1/62 + 1/62 == 0.032258…, vs 1/61 == 0.016393… for the single-source hits.
        assert results[0].score == pytest.approx(1 / 62 + 1 / 62)
        assert results[1].score == pytest.approx(1 / 61)

    @pytest.mark.asyncio
    async def test_score_is_rank_based_not_similarity_based(self):
        """RRF deliberately ignores raw scores — only rank position matters.

        A chunk with a dismal similarity still beats a better-scoring one if it
        ranks higher, which is what makes fusing incomparable scales possible.
        """
        results, _ = await self._run([_vector_row("low_sim", 0.01, 1)], [])
        assert results[0].score == pytest.approx(1 / 61)

    @pytest.mark.asyncio
    async def test_deduplicates_by_chunk_id(self):
        vector_rows = [_vector_row("dup", 0.9, 1)]
        bm25_rows = [_bm25_row("dup", 5.0, 1)]

        results, _ = await self._run(vector_rows, bm25_rows)

        assert len(results) == 1
        assert results[0].score == pytest.approx(1 / 61 + 1 / 61)

    @pytest.mark.asyncio
    async def test_truncates_to_top_k_after_fusion_not_before(self):
        vector_rows = [_vector_row(f"v{i}", 0.9 - i / 100, i) for i in range(1, 6)]
        bm25_rows = [_bm25_row("v5", 9.0, 1)]

        results, _ = await self._run(vector_rows, bm25_rows, top_k=2)

        assert len(results) == 2
        # v5 is last by vector rank but is lifted by the BM25 agreement, so
        # truncating before fusion would have dropped it.
        assert "v5" in [r.chunk_id for r in results]

    @pytest.mark.asyncio
    async def test_bm25_only_chunks_survive_with_no_vector_score(self):
        results, _ = await self._run([], [_bm25_row("only_lexical", 7.7, 1)])

        assert [r.chunk_id for r in results] == ["only_lexical"]
        assert results[0].score == pytest.approx(1 / 61)

    @pytest.mark.asyncio
    async def test_no_matches_from_either_retriever_returns_empty(self):
        results, _ = await self._run([], [])
        assert results == []

    @pytest.mark.asyncio
    async def test_each_retriever_gets_its_own_parameter_list(self):
        """The vector and BM25 queries have different $1 ($1=embedding vs $1=query
        text), so their params must not be shared — mixing them would bind the
        embedding into the tsquery.
        """
        _, conn = await self._run([], [], top_k=4, filters={"source": "docs.md"})

        (vector_sql, *vector_params), (bm25_sql, *bm25_params) = (
            conn.fetch.call_args_list[0][0],
            conn.fetch.call_args_list[1][0],
        )
        # fetch_k = min(top_k * 2, 50) = 8 for both.
        assert vector_params == ["[" + ",".join(["0.1"] * 1536) + "]", "docs.md", 8]
        assert bm25_params == ["q", "docs.md", 8]
        assert "plainto_tsquery" in bm25_sql
        assert "plainto_tsquery" not in vector_sql
        assert "docs.md" not in vector_sql and "docs.md" not in bm25_sql

    @pytest.mark.asyncio
    async def test_fetch_k_is_capped_at_50_candidates_per_retriever(self):
        _, conn = await self._run([], [], top_k=40)
        # min(40 * 2, 50) == 50, not 80.
        assert conn.fetch.call_args_list[0][0][-1] == 50

    @pytest.mark.asyncio
    async def test_rejects_non_positive_top_k(self):
        with patch(f"{MODULE}.get_llm_client", return_value=_embedding_client()):
            with pytest.raises(ValueError, match="top_k must be positive"):
                await HybridSearchStrategy().retrieve("q", top_k=-1)

    @pytest.mark.asyncio
    async def test_embedding_failure_becomes_retrieve_error(self):
        client = _embedding_client()
        client.create_embedding = AsyncMock(side_effect=OpenAIError("boom"))
        with patch(f"{MODULE}.get_llm_client", return_value=client):
            with pytest.raises(RetrieveError, match="Failed to generate embedding"):
                await HybridSearchStrategy().retrieve("q", top_k=5)

    @pytest.mark.asyncio
    async def test_database_failure_becomes_retrieve_error(self):
        conn = AsyncMock()
        conn.fetch = AsyncMock(side_effect=RuntimeError("bad tsquery"))
        with (
            patch(f"{MODULE}.get_llm_client", return_value=_embedding_client()),
            patch(f"{MODULE}.get_db_pool", AsyncMock(return_value=_mock_pool_with_conn(conn))),
        ):
            with pytest.raises(RetrieveError, match="Failed to retrieve chunks"):
                await HybridSearchStrategy().retrieve("q", top_k=5)


class TestRerankingStrategy:
    """Reranking reorders vector candidates using an LLM-returned index list."""

    @staticmethod
    async def _run(llm_content: str, rows, top_k=3):
        conn = AsyncMock()
        conn.fetch = AsyncMock(return_value=rows)
        client = _chat_client(llm_content)
        with (
            patch(f"{MODULE}.get_llm_client", return_value=client),
            patch(f"{MODULE}.get_db_pool", AsyncMock(return_value=_mock_pool_with_conn(conn))),
        ):
            results = await RerankingStrategy().retrieve("q", top_k=top_k)
        return results, client

    @pytest.mark.asyncio
    async def test_reorders_candidates_to_the_llm_ranking(self):
        rows = [_vector_row("a", 0.9, 1), _vector_row("b", 0.8, 2), _vector_row("c", 0.7, 3)]

        results, _ = await self._run("[3, 1, 2]", rows)

        assert [r.chunk_id for r in results] == ["c", "a", "b"]

    @pytest.mark.asyncio
    async def test_parses_a_ranking_wrapped_in_prose(self):
        """The prompt asks for bare JSON; models add commentary anyway."""
        rows = [_vector_row("a", 0.9, 1), _vector_row("b", 0.8, 2)]

        results, _ = await self._run("Sure! Here you go:\n[2, 1]\nHope that helps.", rows)

        assert [r.chunk_id for r in results] == ["b", "a"]

    @pytest.mark.asyncio
    async def test_out_of_range_indices_are_dropped_not_wrapped(self):
        """A hallucinated index must not silently select the wrong chunk.

        Index 0 and 9 don't exist for a 2-candidate list; negative indices would
        wrap around to the end of the list in Python, which is the dangerous case.
        """
        rows = [_vector_row("a", 0.9, 1), _vector_row("b", 0.8, 2)]

        results, _ = await self._run("[9, 2, 0, -1, 1]", rows)

        assert [r.chunk_id for r in results] == ["b", "a"]

    @pytest.mark.asyncio
    async def test_truncates_to_top_k(self):
        rows = [_vector_row(c, 0.9, i) for i, c in enumerate("abcd", start=1)]

        results, _ = await self._run("[4, 3, 2, 1]", rows, top_k=2)

        assert [r.chunk_id for r in results] == ["d", "c"]

    @pytest.mark.asyncio
    async def test_unparseable_llm_response_falls_back_to_vector_order(self):
        """Reranking is an enhancement — its failure must degrade, not raise."""
        rows = [_vector_row("a", 0.9, 1), _vector_row("b", 0.8, 2)]

        results, _ = await self._run("I'm sorry, I can't do that.", rows, top_k=2)

        assert [r.chunk_id for r in results] == ["a", "b"]

    @pytest.mark.asyncio
    async def test_llm_error_falls_back_to_vector_order(self):
        conn = AsyncMock()
        conn.fetch = AsyncMock(return_value=[_vector_row("a", 0.9, 1), _vector_row("b", 0.8, 2)])
        client = _embedding_client()
        client.create_chat_completion = AsyncMock(side_effect=OpenAIError("upstream 500"))

        with (
            patch(f"{MODULE}.get_llm_client", return_value=client),
            patch(f"{MODULE}.get_db_pool", AsyncMock(return_value=_mock_pool_with_conn(conn))),
        ):
            results = await RerankingStrategy().retrieve("q", top_k=2)

        assert [r.chunk_id for r in results] == ["a", "b"]

    @pytest.mark.asyncio
    async def test_no_candidates_short_circuits_before_calling_the_reranker(self):
        results, client = await self._run("[1]", [])

        assert results == []
        # Reranking an empty list would be a pointless billed call.
        client.create_chat_completion.assert_not_called()

    @pytest.mark.asyncio
    async def test_fetches_extra_candidates_to_rerank_capped_at_50(self):
        conn = AsyncMock()
        conn.fetch = AsyncMock(return_value=[])
        with (
            patch(f"{MODULE}.get_llm_client", return_value=_chat_client("[1]")),
            patch(f"{MODULE}.get_db_pool", AsyncMock(return_value=_mock_pool_with_conn(conn))),
        ):
            await RerankingStrategy().retrieve("q", top_k=3)
        # candidate_k = min(top_k * 4, 50) — rerank needs a wider net than it returns.
        assert conn.fetch.call_args[0][-1] == 12

    @pytest.mark.asyncio
    async def test_prompt_truncates_chunks_to_the_documented_200_char_budget(self):
        """docs/BENCHMARKS.md explains this strategy's precision partly by the
        preview budget, so pin it: a change here should be a deliberate doc change.
        """
        long_row = _vector_row("long", 0.9, 1)
        long_row["content"] = "x" * 500

        _, client = await self._run("[1]", [long_row])

        prompt = client.create_chat_completion.call_args.kwargs["messages"][1]["content"]
        assert "x" * 200 in prompt
        assert "x" * 201 not in prompt


class TestMultiQueryStrategy:
    """Multi-query fans out to LLM-generated variations and merges the results."""

    @pytest.mark.asyncio
    async def test_queries_every_variation_plus_the_original(self):
        client = _chat_client('["rag definition", "what does rag mean", "rag explained"]')
        with (
            patch(f"{MODULE}.get_llm_client", return_value=client),
            patch(f"{MODULE}.VectorSimilarityStrategy") as strategy_cls,
        ):
            retrieve = AsyncMock(return_value=[])
            strategy_cls.return_value.retrieve = retrieve
            await MultiQueryStrategy().retrieve("what is rag?", top_k=5)

        queried = [call.args[0] for call in retrieve.call_args_list]
        assert queried == ["what is rag?", "rag definition", "what does rag mean", "rag explained"]

    @pytest.mark.asyncio
    async def test_dedupe_across_variations_keeps_the_highest_score(self):
        """The same chunk surfacing for several variations should keep its best
        score, not whichever variation happened to run last.
        """
        from app.rag.types import RetrievedChunk

        def chunk(chunk_id: str, score: float) -> RetrievedChunk:
            return RetrievedChunk(
                chunk_id=chunk_id,
                document_id="d",
                title="t",
                source="s",
                chunk_index=0,
                content="c",
                score=score,
            )

        client = _chat_client('["v1", "v2"]')
        with (
            patch(f"{MODULE}.get_llm_client", return_value=client),
            patch(f"{MODULE}.VectorSimilarityStrategy") as strategy_cls,
        ):
            strategy_cls.return_value.retrieve = AsyncMock(
                side_effect=[
                    [chunk("shared", 0.50)],
                    [chunk("shared", 0.95)],  # better hit on a later variation
                    [chunk("shared", 0.10)],  # worse hit must not overwrite it
                ]
            )
            results = await MultiQueryStrategy().retrieve("q", top_k=5)

        assert len(results) == 1
        assert results[0].score == pytest.approx(0.95)

    @pytest.mark.asyncio
    async def test_variation_generation_failure_degrades_to_the_original_query(self):
        client = _embedding_client()
        client.create_chat_completion = AsyncMock(side_effect=OpenAIError("no capacity"))

        with (
            patch(f"{MODULE}.get_llm_client", return_value=client),
            patch(f"{MODULE}.VectorSimilarityStrategy") as strategy_cls,
        ):
            retrieve = AsyncMock(return_value=[])
            strategy_cls.return_value.retrieve = retrieve
            await MultiQueryStrategy().retrieve("what is rag?", top_k=5)

        # Still answers, using the user's own query only.
        assert [call.args[0] for call in retrieve.call_args_list] == ["what is rag?"]

    @pytest.mark.asyncio
    async def test_one_failing_variation_does_not_sink_the_query(self):
        from app.rag.types import RetrievedChunk

        good = RetrievedChunk(
            chunk_id="survivor",
            document_id="d",
            title="t",
            source="s",
            chunk_index=0,
            content="c",
            score=0.7,
        )
        client = _chat_client('["v1", "v2", "v3"]')

        with (
            patch(f"{MODULE}.get_llm_client", return_value=client),
            patch(f"{MODULE}.VectorSimilarityStrategy") as strategy_cls,
        ):
            strategy_cls.return_value.retrieve = AsyncMock(
                side_effect=[
                    RetrieveError("variation 1 blew up"),
                    [good],
                    RetrieveError("variation 3 blew up"),
                    [],
                ]
            )
            results = await MultiQueryStrategy().retrieve("q", top_k=5)

        assert [r.chunk_id for r in results] == ["survivor"]

    @pytest.mark.asyncio
    async def test_results_are_sorted_by_score_and_truncated_to_top_k(self):
        from app.rag.types import RetrievedChunk

        def chunk(chunk_id: str, score: float) -> RetrievedChunk:
            return RetrievedChunk(
                chunk_id=chunk_id,
                document_id="d",
                title="t",
                source="s",
                chunk_index=0,
                content="c",
                score=score,
            )

        client = _chat_client('["v1"]')
        with (
            patch(f"{MODULE}.get_llm_client", return_value=client),
            patch(f"{MODULE}.VectorSimilarityStrategy") as strategy_cls,
            patch(f"{MODULE}.get_db_pool", AsyncMock()),
        ):
            strategy_cls.return_value.retrieve = AsyncMock(
                side_effect=[
                    [chunk("mid", 0.5), chunk("best", 0.9)],
                    [chunk("worst", 0.1)],
                ]
            )
            results = await MultiQueryStrategy().retrieve("q", top_k=2)

        assert [r.chunk_id for r in results] == ["best", "mid"]
