from typing import List, Optional
import asyncpg
import json
import structlog

from app.core.config import settings
from app.db.session import get_db_pool

logger = structlog.get_logger()


async def get_document_by_id(document_id: str) -> Optional[dict]:
    """Get a document by ID."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, source, title, created_at FROM documents WHERE id = $1",
            document_id,
        )
        if row:
            return dict(row)
        return None


async def search_chunks(
    query_embedding: List[float],
    top_k: int = 5,
    document_id: Optional[str] = None,
) -> List[dict]:
    """Search for similar chunks using vector similarity."""
    pool = await get_db_pool()
    embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"

    if document_id:
        query = """
            SELECT 
                id,
                document_id,
                chunk_index,
                content,
                metadata,
                1 - (embedding <=> $1::vector) as similarity
            FROM chunks
            WHERE embedding IS NOT NULL AND document_id = $2
            ORDER BY embedding <=> $1::vector
            LIMIT $3
        """
        params = [embedding_str, document_id, top_k]
    else:
        query = """
            SELECT 
                id,
                document_id,
                chunk_index,
                content,
                metadata,
                1 - (embedding <=> $1::vector) as similarity
            FROM chunks
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> $1::vector
            LIMIT $2
        """
        params = [embedding_str, top_k]

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
        return [
            {
                "id": row["id"],
                "document_id": row["document_id"],
                "chunk_index": row["chunk_index"],
                "content": row["content"],
                "metadata": json.loads(row["metadata"]) if row["metadata"] else {},
                "similarity": float(row["similarity"]),
            }
            for row in rows
        ]


async def get_chunks_by_document_id(document_id: str) -> List[dict]:
    """Get all chunks for a document."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, document_id, chunk_index, content, metadata, created_at
            FROM chunks
            WHERE document_id = $1
            ORDER BY chunk_index
            """,
            document_id,
        )
        return [
            {
                "id": row["id"],
                "document_id": row["document_id"],
                "chunk_index": row["chunk_index"],
                "content": row["content"],
                "metadata": json.loads(row["metadata"]) if row["metadata"] else {},
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            }
            for row in rows
        ]


async def list_documents(limit: int = 100, offset: int = 0) -> List[dict]:
    """List documents with pagination."""
    import time
    import asyncio
    
    start_time = time.time()
    logger.info("list_documents called", limit=limit, offset=offset)
    
    try:
        pool = await get_db_pool()
        pool_acquire_time = time.time()
        logger.info("Pool acquired", elapsed_ms=(pool_acquire_time - start_time) * 1000)
        
        # Use context manager for proper connection handling
        async with pool.acquire() as conn:
            conn_acquire_time = time.time()
            logger.info("Connection acquired", elapsed_ms=(conn_acquire_time - pool_acquire_time) * 1000)
            
            # Add timeout for query execution (10 seconds)
            rows = await asyncio.wait_for(
                conn.fetch(
                    """
                    SELECT id, source, title, created_at
                    FROM documents
                    LIMIT $1 OFFSET $2
                    """,
                    limit,
                    offset,
                ),
                timeout=10.0,
            )
            query_time = time.time()
            logger.info("Query executed", elapsed_ms=(query_time - conn_acquire_time) * 1000, row_count=len(rows))
            
            result = [
                {
                    "id": row["id"],
                    "source": row["source"],
                    "title": row["title"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                }
                for row in rows
            ]
            processing_time = time.time()
            
            logger.info(
                "list_documents completed",
                pool_acquire_ms=(pool_acquire_time - start_time) * 1000,
                conn_acquire_ms=(conn_acquire_time - pool_acquire_time) * 1000,
                query_ms=(query_time - conn_acquire_time) * 1000,
                processing_ms=(processing_time - query_time) * 1000,
                total_ms=(processing_time - start_time) * 1000,
                document_count=len(result),
            )
            
            return result
    except asyncio.TimeoutError as e:
        logger.error("Database operation timed out", error=str(e))
        raise RuntimeError(f"Database query timed out: {str(e)}")
    except Exception as e:
        logger.error("list_documents error", error=str(e), exc_info=True)
        raise


async def count_documents() -> int:
    """Get total document count."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM documents")
        return count or 0


async def delete_document(document_id: str) -> bool:
    """Delete a document and all its chunks (chunks are deleted via CASCADE)."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Delete the document (chunks will be automatically deleted via CASCADE)
        result = await conn.execute(
            "DELETE FROM documents WHERE id = $1",
            document_id,
        )
        # Check if any rows were deleted
        return result == "DELETE 1"
