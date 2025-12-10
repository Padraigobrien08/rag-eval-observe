import uuid
import json
from typing import Optional, Dict, Any, List
import structlog

from app.core.config import settings
from app.db.session import get_db_pool
from app.rag.chunking import TextChunker, Chunk
from app.llm.openai_client import get_openai_client, OpenAIError

logger = structlog.get_logger()

# Maximum document size (10MB in characters, roughly)
MAX_DOCUMENT_SIZE = 10 * 1024 * 1024


class IngestError(Exception):
    """Base exception for ingestion errors."""

    pass


class DocumentTooLargeError(IngestError):
    """Document exceeds maximum size."""

    pass


async def find_existing_document(source: str, title: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Find existing document by source and title.

    Args:
        source: Document source
        title: Document title

    Returns:
        Document dict if found, None otherwise
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        if title:
            row = await conn.fetchrow(
                """
                SELECT id, source, title, created_at
                FROM documents
                WHERE source = $1 AND title = $2
                ORDER BY created_at DESC
                LIMIT 1
                """,
                source,
                title,
            )
        else:
            row = await conn.fetchrow(
                """
                SELECT id, source, title, created_at
                FROM documents
                WHERE source = $1 AND title IS NULL
                ORDER BY created_at DESC
                LIMIT 1
                """,
                source,
            )

        if row:
            return dict(row)
        return None


def generate_document_id(source: str, title: Optional[str], version: int = 1) -> str:
    """
    Generate a unique document ID.

    Args:
        source: Document source
        title: Document title
        version: Version number (for idempotency)

    Returns:
        Unique document ID
    """
    if version > 1:
        # Include version in the ID for new versions
        base_id = f"{source}-{title or 'untitled'}-v{version}".lower()
        # Replace invalid characters
        base_id = "".join(c if c.isalnum() or c in "-_" else "-" for c in base_id)
        return base_id
    else:
        # Original document ID
        base_id = f"{source}-{title or 'untitled'}".lower()
        base_id = "".join(c if c.isalnum() or c in "-_" else "-" for c in base_id)
        return base_id


def generate_versioned_source(source: str, version: int) -> str:
    """
    Generate versioned source string.

    Args:
        source: Original source
        version: Version number

    Returns:
        Versioned source string
    """
    if version > 1:
        return f"{source} (v{version})"
    return source


async def ingest_document(
    source: str,
    title: Optional[str],
    text: str,
    is_markdown: bool = False,
) -> Dict[str, Any]:
    """
    Ingest a document into the database.

    This function is idempotent: if a document with the same (source, title)
    already exists, it creates a new version with a versioned source.

    Args:
        source: Document source
        title: Document title (optional)
        text: Document text content
        is_markdown: Whether the text is markdown

    Returns:
        Dict with document_id and chunks_created

    Raises:
        DocumentTooLargeError: If document exceeds maximum size
        IngestError: On other ingestion errors
    """
    # Validate document size
    if len(text) > MAX_DOCUMENT_SIZE:
        raise DocumentTooLargeError(
            f"Document size ({len(text)} chars) exceeds maximum ({MAX_DOCUMENT_SIZE} chars)"
        )

    # Check for existing document
    existing = await find_existing_document(source, title)
    version = 1
    if existing:
        # Find the highest version number
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Count existing versions with same base source
            # Look for documents with same base source (before version suffix)
            version_rows = await conn.fetch(
                """
                SELECT source
                FROM documents
                WHERE source = $1 OR source LIKE $1 || ' (v%'
                ORDER BY created_at DESC
                """,
                source,
            )
            # Extract version numbers
            versions = []
            for row in version_rows:
                source_str = row["source"]
                if source_str == source:
                    versions.append(1)  # Original version
                elif " (v" in source_str:
                    try:
                        v = int(source_str.split(" (v")[1].rstrip(")"))
                        versions.append(v)
                    except (ValueError, IndexError):
                        pass
            version = max(versions) + 1 if versions else 2

        logger.info(
            "Document already exists, creating new version",
            source=source,
            title=title,
            version=version,
        )

    # Generate document ID and versioned source
    document_id = generate_document_id(source, title, version)
    versioned_source = generate_versioned_source(source, version)

    # Chunk the text
    chunker = TextChunker(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
    )
    chunks = chunker.chunk(text, is_markdown=is_markdown)

    if not chunks:
        raise IngestError("No chunks generated from document")

    logger.info(
        "Chunked document",
        document_id=document_id,
        chunks_count=len(chunks),
    )

    # Get embeddings for all chunks (batched)
    openai_client = get_openai_client()
    chunk_texts = [chunk.content for chunk in chunks]

    try:
        embedding_responses = await openai_client.create_embeddings(chunk_texts)
    except OpenAIError as e:
        logger.error("Failed to generate embeddings", error=str(e))
        raise IngestError(f"Failed to generate embeddings: {str(e)}") from e

    if len(embedding_responses) != len(chunks):
        raise IngestError(
            f"Embedding count mismatch: expected {len(chunks)}, got {len(embedding_responses)}"
        )

    # Insert document and chunks in a transaction
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            try:
                # Insert document
                await conn.execute(
                    """
                    INSERT INTO documents (id, source, title)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (id) DO UPDATE
                    SET source = EXCLUDED.source,
                        title = EXCLUDED.title
                    """,
                    document_id,
                    versioned_source,
                    title,
                )

                # Insert chunks
                for i, (chunk, embedding_response) in enumerate(zip(chunks, embedding_responses)):
                    embedding = embedding_response.embedding
                    embedding_str = "[" + ",".join(map(str, embedding)) + "]"

                    chunk_id = f"{document_id}-{i}"

                    # Convert metadata dict to JSON string for JSONB column
                    metadata_json = json.dumps(chunk.metadata) if chunk.metadata else "{}"

                    await conn.execute(
                        """
                        INSERT INTO chunks (
                            id, document_id, chunk_index, content, metadata, embedding
                        )
                        VALUES ($1, $2, $3, $4, $5::jsonb, $6::vector)
                        ON CONFLICT (id) DO UPDATE
                        SET content = EXCLUDED.content,
                            metadata = EXCLUDED.metadata,
                            embedding = EXCLUDED.embedding
                        """,
                        chunk_id,
                        document_id,
                        chunk.chunk_index,
                        chunk.content,
                        metadata_json,
                        embedding_str,
                    )

                logger.info(
                    "Successfully ingested document",
                    document_id=document_id,
                    chunks_created=len(chunks),
                )

                return {
                    "document_id": document_id,
                    "chunks_created": len(chunks),
                }

            except Exception as e:
                logger.error(
                    "Failed to ingest document",
                    document_id=document_id,
                    error=str(e),
                    exc_info=True,
                )
                raise IngestError(f"Failed to ingest document: {str(e)}") from e
