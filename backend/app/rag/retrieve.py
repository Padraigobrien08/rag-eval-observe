from typing import List, Optional, Dict, Any
from dataclasses import dataclass
import structlog

from app.db.session import get_db_pool
from app.llm.openai_client import get_openai_client, OpenAIError

logger = structlog.get_logger()


@dataclass
class RetrievedChunk:
    """Retrieved chunk with metadata and similarity score."""

    chunk_id: str
    document_id: str
    title: Optional[str]
    source: str
    chunk_index: int
    content: str
    score: float
    """
    Score represents cosine similarity (1 - cosine_distance).
    Range: 0.0 to 1.0, where:
    - 1.0 = identical vectors (cosine distance = 0)
    - 0.0 = orthogonal vectors (cosine distance = 1)
    Higher scores indicate greater semantic similarity.
    """


class RetrieveError(Exception):
    """Base exception for retrieval errors."""

    pass


async def retrieve(
    query: str,
    top_k: int = 5,
    filters: Optional[Dict[str, Any]] = None,
) -> List[RetrievedChunk]:
    """
    Retrieve similar chunks using vector similarity search.

    Args:
        query: Search query text
        top_k: Number of results to return (default: 5)
        filters: Optional filters dict with keys:
            - source: Filter by exact source match
            - title: Filter by exact title match

    Returns:
        List of RetrievedChunk objects, sorted by similarity (highest first)

    Raises:
        RetrieveError: On retrieval errors
    """
    if top_k <= 0:
        raise ValueError("top_k must be positive")

    if top_k > 100:
        logger.warning(
            "Large top_k requested",
            top_k=top_k,
            max_recommended=100,
        )

    # Generate embedding for query
    try:
        openai_client = get_openai_client()
        embedding_response = await openai_client.create_embedding(query)
        query_embedding = embedding_response.embedding
    except OpenAIError as e:
        logger.error("Failed to generate query embedding", error=str(e))
        raise RetrieveError(f"Failed to generate embedding: {str(e)}") from e

    # Build query with optional filters
    pool = await get_db_pool()
    embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"

    # Base query with vector similarity
    base_query = """
        SELECT 
            c.id as chunk_id,
            c.document_id,
            c.chunk_index,
            c.content,
            d.title,
            d.source,
            1 - (c.embedding <=> $1::vector) as similarity
        FROM chunks c
        INNER JOIN documents d ON c.document_id = d.id
        WHERE c.embedding IS NOT NULL
    """

    params = [embedding_str]
    param_index = 2

    # Apply filters
    if filters:
        if "source" in filters:
            base_query += f" AND d.source = ${param_index}"
            params.append(filters["source"])
            param_index += 1

        if "title" in filters:
            if filters["title"] is None:
                base_query += " AND d.title IS NULL"
            else:
                base_query += f" AND d.title = ${param_index}"
                params.append(filters["title"])
                param_index += 1

    # Order by similarity (highest first) and limit
    base_query += f"""
        ORDER BY c.embedding <=> $1::vector
        LIMIT ${param_index}
    """

    params.append(top_k)

    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(base_query, *params)

            results = []
            for row in rows:
                results.append(
                    RetrievedChunk(
                        chunk_id=row["chunk_id"],
                        document_id=row["document_id"],
                        title=row["title"],
                        source=row["source"],
                        chunk_index=row["chunk_index"],
                        content=row["content"],
                        score=float(row["similarity"]),
                    )
                )

            logger.info(
                "Retrieval completed",
                query_length=len(query),
                top_k=top_k,
                results_count=len(results),
                filters=filters,
            )

            return results

    except Exception as e:
        logger.error(
            "Retrieval error",
            error=str(e),
            exc_info=True,
        )
        raise RetrieveError(f"Failed to retrieve chunks: {str(e)}") from e
