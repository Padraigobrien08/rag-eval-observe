from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


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
    metadata: Dict[str, Any] = Field(default_factory=dict)
    similarity: Optional[float] = None
    created_at: Optional[str] = None


class DocumentResponse(BaseModel):
    """Document response model."""

    id: str
    source: str
    title: Optional[str] = None
    created_at: Optional[str] = None


class DocumentListResponse(BaseModel):
    """Document list response with pagination."""

    documents: List[DocumentResponse]
    total: int
    limit: int
    offset: int


class SearchRequest(BaseModel):
    """Search request model."""

    query: str = Field(..., description="Search query text")
    top_k: int = Field(5, ge=1, le=100, description="Number of results to return")
    document_id: Optional[str] = Field(None, description="Filter by document ID")


class SearchResponse(BaseModel):
    """Search response model."""

    query: str
    chunks: List[ChunkResponse]
    total: int


class IngestRequest(BaseModel):
    """Document ingestion request model."""

    source: str = Field(..., description="Document source identifier")
    title: Optional[str] = Field(None, description="Document title")
    text: str = Field(..., description="Document text content")
    is_markdown: bool = Field(False, description="Whether text is markdown")


class IngestResponse(BaseModel):
    """Document ingestion response model."""

    document_id: str
    chunks_created: int


class QueryRequest(BaseModel):
    """Query request model."""

    query: str = Field(..., description="Query text")
    top_k: int = Field(8, ge=1, le=100, description="Number of chunks to retrieve")
    filters: Optional[Dict[str, Any]] = Field(None, description="Optional filters (source, title)")
    debug: bool = Field(False, description="Include debug information in response")


class CitationResponse(BaseModel):
    """Citation response model."""

    chunk_id: str
    document_id: str
    title: Optional[str]
    source: str
    chunk_index: int


class QueryResponse(BaseModel):
    """Query response model."""

    answer: str
    citations: List[CitationResponse]
    used_chunk_ids: List[str]
    latency_ms: int
    token_usage: Optional[Dict[str, int]] = None
    debug: Optional[Dict[str, Any]] = None
