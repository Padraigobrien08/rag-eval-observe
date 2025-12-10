import uuid
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog

from app.api.routes import router
from app.core.config import settings
from app.core.logging import setup_logging, log_request
from app.core.metrics import get_metrics
from app.core.rate_limit import get_rate_limiter
from app.db.session import close_db_pool, init_db_pool

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    setup_logging()
    logger.info("Starting application", environment=settings.ENVIRONMENT)
    await init_db_pool()
    yield
    logger.info("Shutting down application")
    await close_db_pool()


app = FastAPI(
    title="RAG Eval Observability API",
    description="FastAPI backend for RAG evaluation and observability",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware."""
    # Skip rate limiting for health, metrics endpoints, and OPTIONS (CORS preflight)
    if (
        request.url.path in ["/api/v1/health", "/api/v1/metrics", "/"]
        or request.method == "OPTIONS"
    ):
        return await call_next(request)

    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    # Try to get real IP from proxy headers
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()

    # Check rate limit
    rate_limiter = get_rate_limiter()
    is_allowed, remaining = rate_limiter.is_allowed(client_ip)

    if not is_allowed:
        logger.warning(
            "Rate limit exceeded",
            client_ip=client_ip,
            path=request.url.path,
        )
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded",
                "message": f"Too many requests. Limit: {rate_limiter.max_requests} per {rate_limiter.window_seconds}s",
            },
            headers={"Retry-After": str(rate_limiter.window_seconds)},
        )

    # Process request
    response = await call_next(request)

    # Add rate limit headers
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Limit"] = str(rate_limiter.max_requests)
    return response


@app.middleware("http")
async def add_request_id_and_timing(request: Request, call_next):
    """Add request ID and timing to all requests."""
    # Get or generate request ID
    request_id = request.headers.get("X-Request-ID")
    if not request_id:
        request_id = str(uuid.uuid4())

    request.state.request_id = request_id
    request.state.start_time = time.time()

    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)

    # Process request
    response = await call_next(request)

    # Calculate latency
    latency_ms = int((time.time() - request.state.start_time) * 1000)

    # Add request ID to response
    response.headers["X-Request-ID"] = request_id

    # Extract route path
    route = request.url.path
    # Try to get route from FastAPI's scope if available
    if hasattr(request, "scope") and request.scope:
        route_obj = request.scope.get("route")
        if route_obj and hasattr(route_obj, "path"):
            route = route_obj.path

    log_request(
        request_id=request_id,
        route=route,
        method=request.method,
        status_code=response.status_code,
        latency_ms=latency_ms,
    )

    # Record metrics
    metrics = get_metrics()
    metrics.record_request(
        route=route,
        status_code=response.status_code,
        latency_ms=latency_ms,
    )

    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with structured logging."""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(
        "Unhandled exception",
        request_id=request_id,
        path=request.url.path,
        method=request.method,
        error=str(exc),
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "request_id": request_id,
        },
    )


app.include_router(router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "RAG Eval Observability API", "version": "0.1.0"}
