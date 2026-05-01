from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    """Health check response."""

    ok: bool
    db: bool
    version: str = "0.1.0"


class ChunkResponse(BaseModel):
    """Chunk response model."""

    id: str
    document_id: str
    chunk_index: int
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    similarity: float | None = None
    created_at: str | None = None


class DocumentResponse(BaseModel):
    """Document response model."""

    id: str
    source: str
    title: str | None = None
    created_at: str | None = None


class DocumentListResponse(BaseModel):
    """Document list response with pagination."""

    documents: list[DocumentResponse]
    total: int
    limit: int
    offset: int


class SearchRequest(BaseModel):
    """Search request model."""

    query: str = Field(..., description="Search query text")
    top_k: int = Field(5, ge=1, le=100, description="Number of results to return")
    document_id: str | None = Field(None, description="Filter by document ID")


class SearchResponse(BaseModel):
    """Search response model."""

    query: str
    chunks: list[ChunkResponse]
    total: int


class IngestRequest(BaseModel):
    """Document ingestion request model."""

    source: str = Field(..., description="Document source identifier")
    title: str | None = Field(None, description="Document title")
    text: str = Field(..., description="Document text content")
    is_markdown: bool = Field(False, description="Whether text is markdown")


class IngestResponse(BaseModel):
    """Document ingestion response model."""

    document_id: str
    chunks_created: int


class QueryRequest(BaseModel):
    """Query request model."""

    model_config = ConfigDict(populate_by_name=True)

    query: str = Field(..., description="Query text")
    top_k: int = Field(8, ge=1, le=100, description="Number of chunks to retrieve", alias="topK")
    filters: dict[str, Any] | None = Field(None, description="Optional filters (source, title)")
    debug: bool = Field(False, description="Include debug information in response")
    rag_model: str = Field(
        "vector-similarity",
        description="RAG model to use: vector-similarity, hybrid-search, reranking, multi-query",
    )


class CitationResponse(BaseModel):
    """Citation response model."""

    chunk_id: str
    document_id: str
    title: str | None
    source: str
    chunk_index: int


class QueryResponse(BaseModel):
    """Query response model."""

    answer: str
    citations: list[CitationResponse]
    used_chunk_ids: list[str]
    latency_ms: int
    token_usage: dict[str, int] | None = None
    debug: dict[str, Any] | None = None
    rag_model: str | None = None
    retrieved_chunk_count: int = 0
