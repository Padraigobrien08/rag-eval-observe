import asyncio
import json
from collections.abc import AsyncIterator

import structlog
from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse

from app.core.config import settings
from app.core.metrics import get_metrics
from app.db.queries import (
    count_documents,
    delete_document,
    get_chunks_by_document_id,
    get_document_by_id,
    list_documents,
    log_query,
    search_chunks,
)
from app.db.session import check_db_connection
from app.llm.openai_client import OpenAIRateLimitError
from app.rag.answer import AnswerError, generate_answer_stream
from app.rag.types import RetrievedChunk, RetrieveError
from app.schemas import (
    ChunkResponse,
    CitationResponse,
    DocumentListResponse,
    DocumentResponse,
    HealthResponse,
    IngestRequest,
    IngestResponse,
    QueryRequest,
    QueryResponse,
    SearchRequest,
    SearchResponse,
)

logger = structlog.get_logger()
router = APIRouter()


async def _prepare_rag_retrieval(
    query_request: QueryRequest,
    request_id: str,
) -> tuple[str | None, list[RetrievedChunk], str]:
    """Meta-query detection, optional document list context, and chunk retrieval."""
    from app.rag.retrieve import retrieve

    query_lower = query_request.query.lower()
    is_meta_query = any(
        phrase in query_lower
        for phrase in [
            "what documents",
            "which documents",
            "list documents",
            "show documents",
            "documents have been",
            "documents are",
            "documents available",
            "documents in",
            "documents stored",
            "documents ingested",
        ]
    )

    document_list_context = None
    if is_meta_query:
        logger.info(
            "Meta-query detected",
            request_id=request_id,
            query=query_request.query,
        )
        try:
            documents = await list_documents(limit=100, offset=0)
            if documents:
                doc_list = []
                for doc in documents:
                    doc_info = f"- {doc.get('title') or doc.get('source', 'Untitled')}"
                    if doc.get("source") and doc.get("title") != doc.get("source"):
                        doc_info += f" (source: {doc['source']})"
                    doc_list.append(doc_info)
                document_list_context = (
                    f"Available documents in the system ({len(documents)} total):\n"
                    + "\n".join(doc_list)
                )
                logger.info(
                    "Document list context created",
                    request_id=request_id,
                    document_count=len(documents),
                    context_length=len(document_list_context),
                    context_preview=document_list_context[:200],
                )
            else:
                logger.warning(
                    "No documents found for meta-query",
                    request_id=request_id,
                )
        except Exception as e:
            logger.warning(
                "Failed to fetch document list for meta-query",
                request_id=request_id,
                error=str(e),
                exc_info=True,
            )
    else:
        logger.debug(
            "Not a meta-query",
            request_id=request_id,
            query=query_request.query,
        )

    rag_model = query_request.rag_model or "vector-similarity"
    logger.info(
        "Retrieving chunks",
        request_id=request_id,
        rag_model=rag_model,
        query_request_rag_model=query_request.rag_model,
    )
    retrieved_chunks = await retrieve(
        query=query_request.query,
        top_k=query_request.top_k,
        filters=query_request.filters,
        rag_model=rag_model,
    )
    return document_list_context, retrieved_chunks, rag_model


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    """Health check endpoint with database connectivity."""
    request_id = getattr(request.state, "request_id", "unknown")
    db_connected = await check_db_connection()

    if not db_connected:
        logger.warning(
            "Health check failed",
            request_id=request_id,
            database_connected=False,
        )

    return HealthResponse(
        ok=db_connected,
        db=db_connected,
        version="0.1.0",
    )


@router.post("/search", response_model=SearchResponse)
async def search_chunks_endpoint(
    request: Request,
    search_request: SearchRequest,
):
    """Search for similar chunks using vector similarity."""
    request_id = getattr(request.state, "request_id", "unknown")

    try:
        # Generate embedding for the query
        from app.llm.openai_client import get_openai_client

        openai_client = get_openai_client()
        embedding_response = await openai_client.create_embedding(search_request.query)
        query_embedding = embedding_response.embedding

        # Search for similar chunks
        chunks = await search_chunks(
            query_embedding=query_embedding,
            top_k=search_request.top_k,
            document_id=search_request.document_id,
        )

        logger.info(
            "Search completed",
            request_id=request_id,
            query=search_request.query,
            results_count=len(chunks),
        )

        return SearchResponse(
            query=search_request.query,
            chunks=[
                ChunkResponse(
                    id=chunk["id"],
                    document_id=chunk["document_id"],
                    chunk_index=chunk["chunk_index"],
                    content=chunk["content"],
                    metadata=chunk["metadata"],
                    similarity=chunk["similarity"],
                )
                for chunk in chunks
            ],
            total=len(chunks),
        )

    except ValueError as e:
        # Validation errors are 4xx
        logger.warning(
            "Validation error",
            request_id=request_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    except Exception as e:
        from app.llm.openai_client import OpenAIError

        if isinstance(e, OpenAIError):
            logger.error(
                "OpenAI API error",
                request_id=request_id,
                error=str(e),
            )
            raise HTTPException(
                status_code=503,
                detail="Failed to generate embedding",
            )

        logger.error(
            "Search error",
            request_id=request_id,
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error",
        )


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents_endpoint(
    request: Request,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    include_total: bool = Query(False, description="Include total count (slower)"),
):
    """List documents with pagination."""
    import time
    endpoint_start = time.time()
    request_id = getattr(request.state, "request_id", "unknown")

    try:
        # Fetch documents first (no ordering for faster query)
        list_start = time.time()
        documents = await list_documents(limit=limit, offset=offset)
        list_time = (time.time() - list_start) * 1000

        # Only fetch total count if explicitly requested (frontend doesn't need it)
        count_time = 0
        if include_total:
            count_start = time.time()
            total = await count_documents()
            count_time = (time.time() - count_start) * 1000
        else:
            # Use a lightweight approximation - if we got fewer than limit, that's the total
            # Otherwise, we don't know the exact total without counting
            total = len(documents) if len(documents) < limit else len(documents) + offset

        response_start = time.time()
        response = DocumentListResponse(
            documents=[
                DocumentResponse(
                    id=doc["id"],
                    source=doc["source"],
                    title=doc["title"],
                    created_at=doc["created_at"],
                )
                for doc in documents
            ],
            total=total,
            limit=limit,
            offset=offset,
        )
        response_time = (time.time() - response_start) * 1000
        total_time = (time.time() - endpoint_start) * 1000

        logger.info(
            "list_documents_endpoint timing",
            request_id=request_id,
            list_documents_ms=list_time,
            count_ms=count_time,
            response_build_ms=response_time,
            total_ms=total_time,
            document_count=len(documents),
            include_total=include_total,
        )

        return response
    except Exception as e:
        logger.error(
            "List documents error",
            request_id=request_id,
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error",
        )


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document_endpoint(
    request: Request,
    document_id: str,
):
    """Get a document by ID."""
    document = await get_document_by_id(document_id)
    if not document:
        raise HTTPException(
            status_code=404,
            detail=f"Document {document_id} not found",
        )

    return DocumentResponse(
        id=document["id"],
        source=document["source"],
        title=document["title"],
        created_at=document["created_at"].isoformat() if document["created_at"] else None,
    )


@router.get("/documents/{document_id}/chunks", response_model=list[ChunkResponse])
async def get_document_chunks_endpoint(
    request: Request,
    document_id: str,
):
    """Get all chunks for a document."""
    request_id = getattr(request.state, "request_id", "unknown")

    # Verify document exists
    document = await get_document_by_id(document_id)
    if not document:
        raise HTTPException(
            status_code=404,
            detail=f"Document {document_id} not found",
        )

    try:
        chunks = await get_chunks_by_document_id(document_id)
        return [
            ChunkResponse(
                id=chunk["id"],
                document_id=chunk["document_id"],
                chunk_index=chunk["chunk_index"],
                content=chunk["content"],
                metadata=chunk["metadata"],
                created_at=chunk["created_at"],
            )
            for chunk in chunks
        ]
    except Exception as e:
        logger.error(
            "Get document chunks error",
            request_id=request_id,
            document_id=document_id,
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error",
        )


@router.delete("/documents/{document_id}")
async def delete_document_endpoint(
    request: Request,
    document_id: str,
):
    """Delete a document and all its chunks."""
    request_id = getattr(request.state, "request_id", "unknown")

    # Verify document exists
    document = await get_document_by_id(document_id)
    if not document:
        raise HTTPException(
            status_code=404,
            detail=f"Document {document_id} not found",
        )

    try:
        deleted = await delete_document(document_id)
        if not deleted:
            raise HTTPException(
                status_code=500,
                detail="Failed to delete document",
            )

        logger.info(
            "Document deleted",
            request_id=request_id,
            document_id=document_id,
        )

        return JSONResponse(
            status_code=200,
            content={
                "message": "Document deleted successfully",
                "document_id": document_id,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Delete document error",
            request_id=request_id,
            document_id=document_id,
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error",
        )


@router.post("/ingest", response_model=IngestResponse)
async def ingest_document_endpoint(
    request: Request,
    ingest_request: IngestRequest,
):
    """Ingest a document into the database."""
    request_id = getattr(request.state, "request_id", "unknown")

    # Validate payload size
    payload_size = len(ingest_request.text)
    if payload_size > settings.MAX_INGEST_PAYLOAD_SIZE:
        logger.warning(
            "Ingest payload too large",
            request_id=request_id,
            payload_size=payload_size,
            max_size=settings.MAX_INGEST_PAYLOAD_SIZE,
        )
        raise HTTPException(
            status_code=413,
            detail=f"Payload size ({payload_size} chars) exceeds maximum ({settings.MAX_INGEST_PAYLOAD_SIZE} chars)",
        )

    if not ingest_request.source.strip():
        raise HTTPException(
            status_code=400,
            detail="Source cannot be empty",
        )

    if not ingest_request.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Text content cannot be empty",
        )

    try:
        from app.rag.ingest import (
            DocumentTooLargeError,
            IngestError,
            ingest_document,
        )

        result = await ingest_document(
            source=ingest_request.source,
            title=ingest_request.title,
            text=ingest_request.text,
            is_markdown=ingest_request.is_markdown,
        )

        logger.info(
            "Document ingested successfully",
            request_id=request_id,
            document_id=result["document_id"],
            chunks_created=result["chunks_created"],
        )

        return IngestResponse(
            document_id=result["document_id"],
            chunks_created=result["chunks_created"],
        )

    except DocumentTooLargeError as e:
        logger.warning(
            "Document too large",
            request_id=request_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=413,
            detail=str(e),
        )

    except IngestError as e:
        logger.error(
            "Ingestion error",
            request_id=request_id,
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )

    except Exception as e:
        logger.error(
            "Unexpected ingestion error",
            request_id=request_id,
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error during ingestion",
        )


@router.post("/extract-text")
async def extract_text_endpoint(
    request: Request,
    file: UploadFile = File(...),
):
    """Extract text from PDF or DOCX files."""
    request_id = getattr(request.state, "request_id", "unknown")

    # Validate file type
    file_extension = file.filename.split(".")[-1].lower() if file.filename else ""
    if file_extension not in ["pdf", "docx"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Only PDF and DOCX files are supported.",
        )

    try:
        # Read file content
        file_content = await file.read()

        # Extract text based on file type
        from io import BytesIO

        if file_extension == "pdf":
            try:
                import PyPDF2

                pdf_file = BytesIO(file_content)
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n\n"
                text = text.strip()
            except ImportError:
                # Fallback to pdfplumber if PyPDF2 is not available
                try:
                    import pdfplumber

                    with pdfplumber.open(BytesIO(file_content)) as pdf:
                        text = "\n\n".join([page.extract_text() or "" for page in pdf.pages])
                    text = text.strip()
                except ImportError:
                    raise HTTPException(
                        status_code=500,
                        detail="PDF extraction library not installed. Please install PyPDF2 or pdfplumber.",
                    )
        elif file_extension == "docx":
            try:
                from docx import Document

                docx_file = BytesIO(file_content)
                doc = Document(docx_file)
                text = "\n\n".join([paragraph.text for paragraph in doc.paragraphs])
                text = text.strip()
            except ImportError:
                raise HTTPException(
                    status_code=500,
                    detail="DOCX extraction library not installed. Please install python-docx.",
                )

        if not text:
            raise HTTPException(
                status_code=400,
                detail="No text could be extracted from the file.",
            )

        logger.info(
            "Text extracted successfully",
            request_id=request_id,
            filename=file.filename,
            file_type=file_extension,
            text_length=len(text),
        )

        return JSONResponse(content={"text": text})

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Text extraction error",
            request_id=request_id,
            filename=file.filename,
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract text from file: {str(e)}",
        )


@router.post("/query", response_model=QueryResponse)
async def query_endpoint(
    request: Request,
    query_request: QueryRequest,
):
    """Query the RAG system with natural language question."""
    request_id = getattr(request.state, "request_id", "unknown")

    # Validate query length
    if len(query_request.query) > settings.MAX_QUERY_LENGTH:
        logger.warning(
            "Query too long",
            request_id=request_id,
            query_length=len(query_request.query),
            max_length=settings.MAX_QUERY_LENGTH,
        )
        raise HTTPException(
            status_code=400,
            detail=f"Query exceeds maximum length of {settings.MAX_QUERY_LENGTH} characters",
        )

    if not query_request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Query cannot be empty",
        )

    try:
        from app.rag.answer import generate_answer

        document_list_context, retrieved_chunks, rag_model = await _prepare_rag_retrieval(
            query_request,
            request_id,
        )

        # Generate answer from retrieved chunks (with document list context if meta-query)
        answer_response = await generate_answer(
            query=query_request.query,
            retrieved_chunks=retrieved_chunks,
            document_list_context=document_list_context,
        )

        # Build response
        response_data = {
            "answer": answer_response.answer,
            "citations": [
                CitationResponse(
                    chunk_id=citation["chunk_id"],
                    document_id=citation["document_id"],
                    title=citation["title"],
                    source=citation["source"],
                    chunk_index=citation["chunk_index"],
                )
                for citation in answer_response.citations
            ],
            "used_chunk_ids": answer_response.used_chunk_ids,
            "latency_ms": answer_response.latency_ms,
            "token_usage": answer_response.token_usage,
            "rag_model": rag_model,
            "retrieved_chunk_count": len(retrieved_chunks),
        }

        # Log response data for debugging
        logger.info(
            "Response data built",
            request_id=request_id,
            answer_length=len(answer_response.answer) if answer_response.answer else 0,
            answer_preview=answer_response.answer[:100] if answer_response.answer else None,
            answer_is_empty=not answer_response.answer or len(answer_response.answer.strip()) == 0,
        )

        # Add debug information if requested
        if query_request.debug:
            response_data["debug"] = {
                "retrieved": [
                    {
                        "chunk_id": chunk.chunk_id,
                        "document_id": chunk.document_id,
                        "title": chunk.title,
                        "source": chunk.source,
                        "chunk_index": chunk.chunk_index,
                        "content_snippet": chunk.content[:200]
                        + ("..." if len(chunk.content) > 200 else ""),
                        "score": chunk.score,
                    }
                    for chunk in retrieved_chunks
                ],
            }

        logger.info(
            "Query completed",
            request_id=request_id,
            query_length=len(query_request.query),
            retrieved_count=len(retrieved_chunks),
            citations_count=len(answer_response.citations),
            latency_ms=answer_response.latency_ms,
        )

        # Log query to database (non-blocking - errors are logged but don't affect response)
        try:
            # Get client IP and user agent
            client_ip = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")

            # Log query asynchronously (fire and forget)
            # We don't await this to avoid blocking the response
            asyncio.create_task(
                log_query(
                    query_text=query_request.query,
                    rag_model=rag_model,
                    top_k=query_request.top_k,
                    request_id=request_id,
                    client_ip=client_ip,
                    user_agent=user_agent,
                    latency_ms=answer_response.latency_ms,
                    token_usage=answer_response.token_usage,
                    citations_count=len(answer_response.citations),
                    answer_length=len(answer_response.answer) if answer_response.answer else None,
                )
            )
        except Exception as e:
            # Log error but don't fail the query response
            logger.warning(
                "Failed to schedule query logging",
                request_id=request_id,
                error=str(e),
            )

        return QueryResponse(**response_data)

    except RetrieveError as e:
        # Check if the underlying error is a rate limit error
        # Only treat as rate limit if it's explicitly an OpenAIRateLimitError
        # Don't check error string as it might contain "rate limit" in other contexts
        is_rate_limit = isinstance(e.__cause__, OpenAIRateLimitError) if e.__cause__ else False

        if is_rate_limit:
            logger.error(
                "OpenAI rate limit error",
                request_id=request_id,
                query=query_request.query,
                error=str(e),
                error_type=type(e.__cause__).__name__ if e.__cause__ else None,
            )
            raise HTTPException(
                status_code=429,
                detail="OpenAI API rate limit exceeded. Please wait a moment and try again.",
            )

        # Log the actual error for debugging
        logger.error(
            "Retrieval error",
            request_id=request_id,
            query=query_request.query,
            query_length=len(query_request.query),
            error=str(e),
            error_type=type(e).__name__,
            cause_type=type(e.__cause__).__name__ if e.__cause__ else None,
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Retrieval error: {str(e)}",
        )

    except AnswerError as e:
        # Check if the underlying error is a rate limit error
        is_rate_limit = isinstance(e.__cause__, OpenAIRateLimitError) if e.__cause__ else False

        if is_rate_limit:
            logger.error(
                "OpenAI rate limit error during answer generation",
                request_id=request_id,
                query=query_request.query,
                error=str(e),
                error_type=type(e.__cause__).__name__ if e.__cause__ else None,
            )
            raise HTTPException(
                status_code=429,
                detail="OpenAI API rate limit exceeded. Please wait a moment and try again.",
            )

        logger.error(
            "Answer generation error",
            request_id=request_id,
            query=query_request.query,
            query_length=len(query_request.query),
            error=str(e),
            error_type=type(e).__name__,
            cause_type=type(e.__cause__).__name__ if e.__cause__ else None,
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Answer generation error: {str(e)}",
        )

    except Exception as e:
        logger.error(
            "Unexpected query error",
            request_id=request_id,
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error during query",
        )


@router.post("/query/stream")
async def query_stream_endpoint(
    request: Request,
    query_request: QueryRequest,
):
    """Stream RAG answer as Server-Sent Events (JSON lines in `data:` fields)."""
    request_id = getattr(request.state, "request_id", "unknown")

    if len(query_request.query) > settings.MAX_QUERY_LENGTH:
        logger.warning(
            "Query too long",
            request_id=request_id,
            query_length=len(query_request.query),
            max_length=settings.MAX_QUERY_LENGTH,
        )
        raise HTTPException(
            status_code=400,
            detail=f"Query exceeds maximum length of {settings.MAX_QUERY_LENGTH} characters",
        )

    if not query_request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Query cannot be empty",
        )

    try:
        document_list_context, retrieved_chunks, rag_model = await _prepare_rag_retrieval(
            query_request,
            request_id,
        )
    except RetrieveError as e:
        is_rate_limit = isinstance(e.__cause__, OpenAIRateLimitError) if e.__cause__ else False
        if is_rate_limit:
            logger.error(
                "OpenAI rate limit error",
                request_id=request_id,
                query=query_request.query,
                error=str(e),
                error_type=type(e.__cause__).__name__ if e.__cause__ else None,
            )
            raise HTTPException(
                status_code=429,
                detail="OpenAI API rate limit exceeded. Please wait a moment and try again.",
            )
        logger.error(
            "Retrieval error",
            request_id=request_id,
            query=query_request.query,
            error=str(e),
            error_type=type(e).__name__,
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Retrieval error: {str(e)}",
        )

    async def event_gen() -> AsyncIterator[str]:
        done_payload = None
        try:
            async for event in generate_answer_stream(
                query=query_request.query,
                retrieved_chunks=retrieved_chunks,
                document_list_context=document_list_context,
                rag_model=rag_model,
                retrieved_chunk_count=len(retrieved_chunks),
                include_debug=query_request.debug,
            ):
                if event.get("type") == "done":
                    done_payload = event
                yield f"data: {json.dumps(event)}\n\n"
        except AnswerError as e:
            err_body = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(err_body)}\n\n"
            done_payload = None
        finally:
            if done_payload:
                try:
                    client_ip = request.client.host if request.client else None
                    user_agent = request.headers.get("user-agent")
                    ans = done_payload.get("answer") or ""
                    citations = done_payload.get("citations") or []
                    asyncio.create_task(
                        log_query(
                            query_text=query_request.query,
                            rag_model=rag_model,
                            top_k=query_request.top_k,
                            request_id=request_id,
                            client_ip=client_ip,
                            user_agent=user_agent,
                            latency_ms=done_payload.get("latency_ms"),
                            token_usage=done_payload.get("token_usage"),
                            citations_count=len(citations),
                            answer_length=len(ans) if ans else None,
                        )
                    )
                except Exception as log_err:
                    logger.warning(
                        "Failed to schedule query logging",
                        request_id=request_id,
                        error=str(log_err),
                    )

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/metrics")
async def get_metrics_endpoint(request: Request):
    """Get application metrics."""
    request_id = getattr(request.state, "request_id", "unknown")

    try:
        metrics = get_metrics()
        metrics_data = metrics.get_metrics()

        logger.debug("Metrics retrieved", request_id=request_id)

        return metrics_data
    except Exception as e:
        logger.error(
            "Failed to get metrics",
            request_id=request_id,
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve metrics",
        )


@router.get("/metrics/prometheus", response_class=PlainTextResponse)
async def get_metrics_prometheus_endpoint(request: Request):
    """In-memory metrics in Prometheus text exposition format (single-process)."""
    request_id = getattr(request.state, "request_id", "unknown")
    try:
        metrics = get_metrics()
        return metrics.prometheus_text()
    except Exception as e:
        logger.error(
            "Failed to export Prometheus metrics",
            request_id=request_id,
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to export metrics",
        )
