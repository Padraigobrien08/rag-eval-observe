# RAG Eval Observability

A comprehensive platform for evaluating and observing Retrieval-Augmented Generation (RAG) systems.

## Overview

This application provides a complete solution for building, testing, and monitoring RAG systems. It includes:

- **RAG Pipeline**: Complete implementation of chunking, embedding, retrieval, and answer generation
- **Evaluation Framework**: Offline evaluation harness for testing RAG performance
- **Observability**: Logging and metrics collection for monitoring system behavior
- **Database**: PostgreSQL with pgvector for vector similarity search
- **Frontend**: Next.js 14+ App Router with TypeScript
- **Backend API**: FastAPI backend with async endpoints

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

- **`src/app/`**: Next.js App Router pages and API routes
- **`src/lib/`**: Core RAG logic and utilities
- **`rag/`**: RAG pipeline modules (chunk, embed, retrieve, answer)
- **`observability/`**: Logging and metrics collection
- **`tests/`**: Unit and integration tests

**Backend:**

- **`backend/app/`**: FastAPI application
- **`backend/app/api/`**: API routes and endpoints
- **`backend/app/db/`**: Database queries and session management
- **`backend/app/core/`**: Configuration and logging
- **`backend/tests/`**: Backend test suite

**Shared:**

- **`src/lib/db/`**: Database migrations and schema
- **`eval/`**: Offline evaluation harness

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
cp .env.example .env
# Edit .env with your configuration
```

4. Start the database:

```bash
make db
```

5. Run migrations:

```bash
make migrate
```

6. Seed the database:

```bash
make seed
```

7. Start the development servers:

```bash
# Start Next.js frontend (in one terminal)
make dev

# Start FastAPI backend (in another terminal)
make api-dev
```

The frontend will be available at `http://localhost:3000` and the API at `http://localhost:8000`.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rag_eval

# OpenAI API (required for embeddings and LLM)
OPENAI_API_KEY=your-api-key-here

# Model Configuration
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gpt-4-turbo-preview

# Chunking Configuration
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Embedding Configuration
EMBEDDING_DIMENSION=1536

# Server
PORT=3000
NODE_ENV=development
```

## API Endpoints

### POST `/api/rag/query`

Query the RAG system with a natural language question.

**Request Body:**

```json
{
  "query": "What is RAG?"
}
```

**Response:**

```json
{
  "query": "What is RAG?",
  "response": "Retrieval-Augmented Generation (RAG) is a technique...",
  "context": [
    {
      "id": "doc-1-0",
      "text": "...",
      "score": 0.95
    }
  ]
}
```

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

## API Endpoints Examples

### Health Check

```bash
curl http://localhost:8000/api/v1/health
```

### Ingest Document

```bash
curl -X POST http://localhost:8000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source": "docs",
    "title": "RAG Guide",
    "text": "Retrieval-Augmented Generation is..."
  }'
```

### Query RAG System

```bash
curl -X POST http://localhost:8000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is RAG?",
    "top_k": 8
  }'
```

### Search Chunks

```bash
curl -X POST http://localhost:8000/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "vector embeddings",
    "top_k": 5
  }'
```

See `backend/README.md` for complete API documentation.

## Deployment

### Container-Based Deployment

The project includes Dockerfiles and docker compose configuration for containerized deployment.

#### Building Images

```bash
# Build API image
docker build -f backend/Dockerfile -t rag-api:latest .
```

#### Running with Docker Compose

```bash
# Development
docker compose up -d

# Production (with override)
docker compose -f docker compose.yml -f docker compose.prod.yml up -d
```

#### Production Considerations

1. **Environment Variables**: Set production values in deployment environment
2. **Database**: Use managed PostgreSQL service or persistent volumes
3. **Scaling**: Rate limiting is per-instance; use shared limiter for multiple instances
4. **Metrics**: Metrics are in-memory; use external service for aggregation
5. **Health Checks**: Use `/api/v1/health` for container health checks

See `backend/README.md` for detailed deployment notes.

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
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   └── page.tsx      # Home page
│   └── lib/              # Core utilities
├── rag/                  # RAG pipeline
│   ├── chunk.ts
│   ├── embed.ts
│   ├── retrieve.ts
│   └── answer.ts
├── observability/        # Logging & metrics
│   ├── logging.ts
│   └── metrics.ts
├── db/                   # Database
│   ├── migrations/
│   └── seed.ts
├── eval/                 # Evaluation harness
├── tests/                # Test files
├── docker/               # Docker configs
└── config.ts             # Configuration
```

### Code Quality

- **Linting**: ESLint with TypeScript and Prettier integration
- **Formatting**: Prettier with consistent style
- **Type Safety**: Strict TypeScript configuration
- **Testing**: Jest for unit and integration tests

## License

MIT
