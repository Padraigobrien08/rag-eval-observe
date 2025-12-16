# RAG Eval Observability

A comprehensive platform for evaluating and observing Retrieval-Augmented Generation (RAG) systems.

## Overview

This application provides a complete solution for building, testing, and monitoring RAG systems. It includes:

- **RAG Pipeline**: Complete implementation of chunking, embedding, retrieval, and answer generation
- **Multiple RAG Models**: Vector Similarity Search, Hybrid Search (Vector + BM25), Reranking, and Multi-Query RAG
- **Interactive Chat Interface**: ChatGPT-style UI with citations, document preview, and structured answers
- **Document Management**: Upload, preview, and delete documents (supports text, PDF, DOCX)
- **Evaluation Framework**: Offline evaluation harness for testing RAG performance
- **Observability**: Logging, metrics collection, and health checks for monitoring system behavior
- **Database**: PostgreSQL with pgvector for vector similarity search
- **Frontend**: Next.js 14+ App Router with TypeScript and shadcn/ui
- **Backend API**: FastAPI backend with async endpoints, rate limiting, and distributed rate limiting (Redis)

## Architecture

```
┌─────────────────┐
│   Next.js App   │
│   (App Router)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│  RAG  │ │   API   │
│ Core  │ │ Routes  │
└───┬───┘ └─────────┘
    │
┌───▼──────────────┐
│   PostgreSQL     │
│   + pgvector     │
└──────────────────┘
```

### Key Components

**Frontend:**

- **`src/app/`**: Next.js App Router pages (home, metrics)
- **`src/features/console/`**: Main console UI (sidebar, chat panel, document management)
- **`src/features/chat/`**: Chat components (message bubbles, citations, layout)
- **`src/features/settings/`**: User settings and RAG configuration
- **`src/lib/api/`**: API client for backend communication
- **`src/components/ui/`**: shadcn/ui components

**Backend:**

- **`backend/app/`**: FastAPI application
- **`backend/app/api/`**: API routes and endpoints
- **`backend/app/rag/`**: RAG pipeline (chunking, retrieval strategies, answer generation)
- **`backend/app/db/`**: Database queries and session management
- **`backend/app/core/`**: Configuration, logging, metrics, rate limiting
- **`backend/app/llm/`**: OpenAI client integration
- **`backend/tests/`**: Backend test suite

**Shared:**

- **`docker/init/`**: Database schema initialization scripts
- **`backend/eval/`**: Offline evaluation harness

## Local Setup

### Prerequisites

- Node.js 18+ and pnpm
- Python 3.11+ and [uv](https://github.com/astral-sh/uv)
- Docker and Docker Compose (for database)
- OpenAI API key (for embeddings and LLM)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd rag-eval-observability
```

2. Install dependencies:

```bash
# Frontend dependencies
pnpm install

# Backend dependencies
cd backend && uv sync && cd ..
```

3. Set up environment variables:

```bash
# Copy example file (if it exists) or create .env manually
# See Environment Variables section below for required variables
```

4. Start the database:

```bash
make db
# or
docker compose up -d postgres
```

The database schema is automatically initialized via `docker/init/` scripts when PostgreSQL starts.

5. Start the development servers:

```bash
# Start FastAPI backend (in one terminal)
make api-dev

# Start Next.js frontend (in another terminal)
make dev
```

The frontend will be available at `http://localhost:3000` and the API at `http://localhost:8000`.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required Variables

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ragdb

# OpenAI API (required for embeddings and LLM)
OPENAI_API_KEY=your-api-key-here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
EMBEDDING_DIMENSION=1536
```

### Optional Variables

```env
# Environment
ENVIRONMENT=development

# CORS (comma-separated list of allowed origins)
CORS_ALLOW_ORIGINS=http://localhost:3000,http://localhost:3001
# or legacy format
CORS_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Redis (for distributed rate limiting in production)
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=false

# Chunking Configuration
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Request Limits
MAX_INGEST_PAYLOAD_SIZE=10485760  # 10MB
MAX_QUERY_LENGTH=5000
MAX_CONTEXT_CHARS=50000
MAX_CONTEXT_TOKENS=12000

# OpenAI API Settings
OPENAI_MAX_RETRIES=3
OPENAI_TIMEOUT=60
```

### Frontend Environment Variables (for Vercel/deployment)

```env
# Set in Vercel environment variables or .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

See `DEPLOYMENT.md` for production environment variable configuration.

## Features

### RAG Models

The system supports multiple RAG retrieval strategies:

- **Vector Similarity Search**: Semantic search using cosine similarity on embeddings
- **Hybrid Search**: Combines vector search with BM25 keyword matching for better recall
- **Reranking**: Uses a reranking model to improve retrieval accuracy
- **Multi-Query**: Generates multiple query variations for better coverage

Select the RAG model in the Settings dialog.

### Document Management

- **Upload Documents**: Support for text, PDF, and DOCX files
- **Document Preview**: Click any document to view its chunks
- **Delete Documents**: Remove documents with confirmation dialog
- **Document List**: View all ingested documents in the sidebar

### Chat Interface

- **ChatGPT-style UI**: Modern, responsive chat interface
- **Structured Answers**: Summary and expandable full answer sections
- **Citations**: Interactive citation dropdowns with document references
- **Inline Citations**: Clickable citation markers in answer text
- **Metadata Display**: Cost, latency, and RAG model information per response
- **Example Queries**: Quick-start example questions

### Observability

- **Metrics Dashboard**: View system metrics at `/metrics`
- **Health Checks**: `/api/v1/health` endpoint for monitoring
- **Structured Logging**: Request IDs and detailed error logging
- **Rate Limiting**: Configurable per-IP rate limits with Redis support for distributed deployments

## Evaluation Instructions

### Running Evaluations

The evaluation harness allows you to test RAG system performance offline:

```bash
make eval
```

This will:

1. Load test cases from `backend/eval/dataset.jsonl`
2. Execute each query through the RAG pipeline (directly, not via HTTP)
3. Calculate retrieval metrics (Hit@K, MRR)
4. Optionally run LLM-judge for correctness/faithfulness (if `EVAL_USE_LLM_JUDGE=true`)
5. Generate `backend/eval/report.md` with summary and failure examples

### Evaluation Metrics

**Retrieval Metrics:**

- **Hit@K**: Whether any expected source appears in top K retrieved results
- **MRR (Mean Reciprocal Rank)**: Average reciprocal rank of first relevant result

**LLM Judge Metrics** (optional, requires `EVAL_USE_LLM_JUDGE=true`):

- **Correctness**: Does the answer correctly address the question?
- **Faithfulness**: Is the answer grounded in context, not hallucinated?

### Adding Test Cases

Edit `backend/eval/dataset.jsonl` to add test cases (one JSON object per line):

```json
{
  "query": "Your question here",
  "expected_sources": ["source-id"],
  "expected_answer_contains": ["keyword1", "keyword2"]
}
```

### Environment Variables

- `EVAL_USE_LLM_JUDGE`: Set to `true` to enable LLM-judge evaluation (default: `false`)

## Quick Start

### Local Development

1. **Start PostgreSQL:**

   ```bash
   make db
   # or
   docker compose up -d postgres
   ```

2. **Run migrations:**

   ```bash
   make migrate
   ```

3. **Seed database (optional):**

   ```bash
   make seed
   ```

4. **Start API backend:**

   ```bash
   make api-dev
   ```

5. **Start frontend (separate terminal):**
   ```bash
   make dev
   ```

### Using Docker Compose

Start everything with one command:

```bash
docker compose up -d
```

This starts:

- PostgreSQL with pgvector
- FastAPI backend API

Access:

- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Environment Variables

See `.env.example` for all required variables. Key variables:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ragdb

# OpenAI (required for embeddings and chat)
OPENAI_API_KEY=your-api-key-here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
```

## API Endpoints

### Health Check

```bash
curl http://localhost:8000/api/v1/health
```

### Query RAG System

```bash
curl -X POST http://localhost:8000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is RAG?",
    "top_k": 8,
    "rag_model": "vector-similarity"
  }'
```

**Available RAG models**: `vector-similarity`, `hybrid-search`, `reranking`, `multi-query`

### Ingest Document

```bash
# Text ingestion
curl -X POST http://localhost:8000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source": "docs",
    "title": "RAG Guide",
    "text": "Retrieval-Augmented Generation is..."
  }'

# File upload (multipart/form-data)
curl -X POST http://localhost:8000/api/v1/ingest \
  -F "file=@document.pdf" \
  -F "source=docs" \
  -F "title=Document Title"
```

### List Documents

```bash
curl http://localhost:8000/api/v1/documents
```

### Get Document Chunks

```bash
curl http://localhost:8000/api/v1/documents/{document_id}/chunks
```

### Delete Document

```bash
curl -X DELETE http://localhost:8000/api/v1/documents/{document_id}
```

### Get Metrics

```bash
curl http://localhost:8000/api/v1/metrics
```

See `backend/README.md` for complete API documentation.

## Deployment

### Quick Deploy

**Frontend (Vercel):**

1. Connect your repository to Vercel
2. Set `NEXT_PUBLIC_API_BASE_URL` environment variable
3. Deploy automatically

**Backend (Docker):**

```bash
# Production deployment
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Production Features

- **Distributed Rate Limiting**: Optional Redis-based rate limiting for multi-instance deployments
- **Health Checks**: Built-in health check endpoints for container orchestration
- **Automatic Migrations**: Database schema initialized automatically via Docker init scripts
- **Production Docker Compose**: Optimized configuration with workers and health checks

### Production Considerations

1. **Environment Variables**: Set production values (see `DEPLOYMENT.md`)
2. **Database**: Use managed PostgreSQL service or persistent volumes
3. **Rate Limiting**:
   - Single instance: In-memory rate limiter (default)
   - Multiple instances: Enable Redis (`REDIS_ENABLED=true`, `REDIS_URL=...`)
4. **Metrics**: In-memory by default; integrate external service for aggregation
5. **CORS**: Set `CORS_ALLOW_ORIGINS` to your production frontend URLs
6. **HTTPS**: Use TLS/SSL for all production traffic

See `DEPLOYMENT.md` for comprehensive production deployment guide.

## Makefile Targets

### Frontend (Next.js)

- `make dev` - Start Next.js development server
- `make lint` - Run ESLint and Prettier checks
- `make test` - Run test suite
- `make typecheck` - Run TypeScript type checking
- `make format` - Format code with Prettier

### Backend (FastAPI)

- `make api` - Start FastAPI production server
- `make api-dev` - Start FastAPI development server (with reload)
- `make api-test` - Run backend tests

### Database

- `make db` - Start PostgreSQL database (Docker)
- `make migrate` - Run database migrations
- `make seed` - Seed database with sample data

### Evaluation

- `make eval` - Run evaluation harness (Python backend)

## Development

### Project Structure

```
rag-eval-observability/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx             # Home page
│   │   ├── metrics/             # Metrics page
│   │   └── globals.css           # Global styles
│   ├── features/
│   │   ├── console/             # Main console UI
│   │   │   ├── ConsoleLayout.tsx
│   │   │   ├── Sidebar.tsx       # Documents, chats, settings
│   │   │   ├── ChatPanel.tsx     # Chat interface
│   │   │   ├── IngestDialog.tsx  # Document upload
│   │   │   └── DocumentPreviewDialog.tsx
│   │   ├── chat/                # Chat components
│   │   │   ├── ChatLayout.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── CitationsDropdown.tsx
│   │   │   └── CitationDetailDialog.tsx
│   │   └── settings/             # Settings hooks
│   ├── components/ui/            # shadcn/ui components
│   └── lib/
│       └── api/                 # API client
├── backend/
│   ├── app/
│   │   ├── api/                 # API routes
│   │   ├── rag/                 # RAG pipeline
│   │   │   ├── retrieval_strategies.py
│   │   │   ├── chunking.py
│   │   │   ├── retrieve.py
│   │   │   └── answer.py
│   │   ├── core/                # Config, logging, rate limiting
│   │   ├── db/                  # Database queries
│   │   └── llm/                 # OpenAI client
│   ├── eval/                    # Evaluation harness
│   └── Dockerfile
├── docker/
│   └── init/                    # Database init scripts
├── docker-compose.yml           # Development
├── docker-compose.prod.yml      # Production override
└── DEPLOYMENT.md                # Production guide
```

### Code Quality

- **Linting**: ESLint with TypeScript and Prettier integration
- **Formatting**: Prettier with consistent style
- **Type Safety**: Strict TypeScript configuration
- **Testing**: Jest for frontend, pytest for backend

## Documentation

- **`README.md`** (this file): Overview and quick start
- **`DEPLOYMENT.md`**: Comprehensive production deployment guide
- **`backend/README.md`**: Backend API documentation
- **`QUICKSTART.md`**: Quick start guide

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT
