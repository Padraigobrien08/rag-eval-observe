from typing import List, Optional
import asyncpg
import json

from app.core.config import settings
from app.db.session import get_db_pool


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
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, source, title, created_at
            FROM documents
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            """,
            limit,
            offset,
        )
        return [
            {
                "id": row["id"],
                "source": row["source"],
                "title": row["title"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            }
            for row in rows
        ]


async def count_documents() -> int:
    """Get total document count."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM documents")
        return count or 0
