<div align="center">

# RAG Eval Observability

**Chat over your documents — then persist offline evals, compare runs by `case_id`, and trace every answer in the query log. One repo you can deploy.**

[![Live demo](https://img.shields.io/badge/demo-pob--rag--chat.xyz-0b0b0f?style=flat-square&logo=vercel&logoColor=white)](https://pob-rag-chat.xyz/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178c6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776ab.svg?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)

![RAG Eval Observability — close the loop on RAG](./docs/images/social-preview.png)

### [Try the live demo →](https://pob-rag-chat.xyz/)

_The live deployment is seeded with sample RAG documents — click an example query to see retrieval, citations, and per-answer latency/cost immediately._

</div>

## Why this exists

Most RAG demos stop at chat. This one is built to **close the loop**: change the system → measure the same dataset → see **what regressed, why, and where to look in production traces**.

- **💬 Grounded chat** — answers cite their retrieved sources, with per-message latency, cost, tokens, and a link straight to the query-log trace.
- **🧪 Persisted eval runs** — every `eval/run_eval.py` completion lands in Postgres with a stable ID. List runs → drill into a run → **compare two runs keyed by `case_id`** (not fragile row order), with per-metric deltas and highlighted Hit@5 flips.
- **🔍 Query-log explorer** — live traffic and eval failures share one mental model via `query_log_id`, so a regression in CI points at the same rows you can inspect in production.
- **📤 Eval-as-code** — export JSON/CSV with `curl` patterns ([docs/EVAL_CI.md](./docs/EVAL_CI.md)) so pipelines can archive artifacts and gate merges.

Read the full product argument in **[docs/THESIS.md](./docs/THESIS.md)**.

## See it in action

|                                   Query-log explorer                                    |                                 System metrics                                 |
| :-------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------: |
| [![Query logs](./docs/images/live/query-logs.png)](https://pob-rag-chat.xyz/query-logs) | [![Metrics](./docs/images/live/metrics.png)](https://pob-rag-chat.xyz/metrics) |

_Screenshots from the live deployment. The chat streams from the FastAPI RAG backend; the observability pages read the same Postgres._

## Developer setup

See **[DEVELOPMENT.md](./DEVELOPMENT.md)** for the full local workflow (Postgres, migrate, seed, API, web, tests, Playwright, Alembic).

## Deep dives

| Doc                                                | Purpose                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| **[docs/THESIS.md](./docs/THESIS.md)**             | Sharp product story: **eval regression as a first-class workflow** |
| **[docs/BENCHMARKS.md](./docs/BENCHMARKS.md)**     | Reproducible harness procedure + case-study template               |
| **[docs/HARDENING.md](./docs/HARDENING.md)**       | **`API_KEY`**, rate limits, CORS, **multi-tenant posture**         |
| **[docs/RUNBOOK.md](./docs/RUNBOOK.md)**           | Health checks, incidents, rollback, escalation                     |
| **[docs/THREAT_MODEL.md](./docs/THREAT_MODEL.md)** | Assets, trust boundaries, mitigations                              |
| **[docs/SLOS.md](./docs/SLOS.md)**                 | Example availability / latency SLOs                                |
| **[docs/EVAL_CI.md](./docs/EVAL_CI.md)**           | **`curl` exports** and CI artifact patterns                        |

Automated **accessibility** checks (axe-core) and broader **eval / query-log E2E** run in CI via Playwright (`e2e/a11y-core-pages.spec.ts`, `e2e/eval-observability-mocked.spec.ts`).

## Overview

RAG Eval Observability is a full-stack platform designed to help developers and researchers build, test, and deploy production-ready RAG systems. It combines a modern web interface with a robust backend API, providing everything needed to ingest documents, query knowledge bases, and monitor system performance.

### Key Capabilities

- **Multiple RAG Strategies**: Compare vector similarity search, hybrid search, reranking, and multi-query approaches
- **Interactive Chat Interface**: ChatGPT-style UI with citations, document previews, and structured answers
- **Document Management**: Upload and manage documents (text, PDF, DOCX) with chunk visualization
- **Evaluation Framework**: Offline evaluation harness with retrieval metrics and LLM-judge support
- **Production Observability**: Real-time metrics, health checks, and structured logging
- **Enterprise Features**: Rate limiting, distributed deployments, and comprehensive error handling

## Why RAG Eval Observability?

Building production RAG systems requires more than just embedding and retrieval—you need tools to evaluate performance, monitor behavior, and iterate on improvements. This platform provides:

- **Complete RAG Pipeline**: End-to-end implementation from document ingestion to answer generation
- **Multiple Retrieval Strategies**: Experiment with different approaches to find what works best for your use case
- **Production-Ready**: Built with scalability, observability, and reliability in mind
- **Developer-Friendly**: Modern tech stack with TypeScript, FastAPI, and PostgreSQL
- **Open Source**: Fully open source with MIT license for maximum flexibility

## Features

### 🔍 Advanced Retrieval Strategies

Choose from multiple RAG models optimized for different scenarios:

- **Vector Similarity Search**: Semantic search using cosine similarity on embeddings
- **Hybrid Search**: Combines vector search with BM25 keyword matching for improved recall
- **Reranking**: Uses a reranking model to improve retrieval accuracy
- **Multi-Query RAG**: Generates multiple query variations for better coverage

### 💬 Modern Chat Interface

- **ChatGPT-Style UI**: Clean, responsive interface optimized for conversation
- **Structured Answers**: Summary sections with expandable full answers
- **Interactive Citations**: Clickable citation markers with document references
- **Document Preview**: View document chunks directly from the sidebar
- **Metadata Display**: Cost, latency, and RAG model information for each response

### 📚 Document Management

- **Multi-Format Support**: Upload text files, PDFs, and DOCX documents
- **Automatic Chunking**: Intelligent document chunking with configurable overlap
- **Chunk Visualization**: Preview how documents are split into chunks
- **Document Deletion**: Remove documents with confirmation dialogs

### 📊 Observability & Monitoring

- **Metrics Dashboard**: Real-time system metrics including uptime, request counts, latency, and token usage
- **Health Checks**: Built-in health endpoints for monitoring and orchestration
- **Structured Logging**: Request IDs and detailed error logging for debugging
- **Cost Tracking**: Monitor API costs with token usage breakdowns

### 🧪 Evaluation Framework

- **Offline Evaluation**: Test RAG performance without production traffic
- **Retrieval Metrics**: Hit@K and Mean Reciprocal Rank (MRR) calculations
- **LLM Judge**: Optional LLM-based evaluation for correctness and faithfulness
- **Report Generation**: Automated evaluation reports with failure examples

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│  (React, TypeScript, Tailwind CSS, shadcn/ui)           │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP/REST API
                     │
┌────────────────────▼────────────────────────────────────┐
│                  FastAPI Backend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ RAG Pipeline │  │   API Routes │  │  Rate Limit  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ PostgreSQL + pgvector
                     │
┌────────────────────▼────────────────────────────────────┐
│              Vector Database (PostgreSQL)                │
│         (Document storage + vector similarity)          │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend** (based on Vercel's [Next.js AI Chatbot](https://vercel.com/templates/next.js/chatbot) template):

- Next.js 15 (App Router), React 19
- TypeScript
- Tailwind CSS v4 + shadcn/ui + AI Elements
- AI SDK v5 (`useChat`) — streams from the FastAPI RAG backend; citations and
  per-message observability (latency, cost, tokens, retrieved chunks, query-log link)
- Auth.js (guest + email/password)
- Drizzle ORM (chat/auth tables in the same Postgres as the backend)

The RAG retrieval, generation, evaluation, and metrics all remain in the FastAPI
backend; the template UI adapts to it rather than calling an LLM directly.

**Backend:**

- FastAPI (Python 3.11+)
- PostgreSQL with pgvector extension
- OpenAI API (embeddings & chat completions)
- Redis (optional, for distributed rate limiting)

**Infrastructure:**

- Docker & Docker Compose (local development)
- Vercel — frontend hosting
- Render — FastAPI backend hosting
- Neon — managed Postgres + pgvector

> The live demo runs on Vercel + Render + Neon. The backend is portable — see [AZURE_DEPLOY.md](./AZURE_DEPLOY.md) for an Azure Container Apps path, or [DEPLOYMENT.md](./DEPLOYMENT.md) for Docker Compose.

## Quick Start

### Prerequisites

- Node.js 18+ and [pnpm](https://pnpm.io/)
- Python 3.11+ and [uv](https://github.com/astral-sh/uv)
- Docker and Docker Compose
- OpenAI API key

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/rag-eval-observability.git
   cd rag-eval-observability
   ```

2. **Install dependencies:**

   ```bash
   # Frontend
   pnpm install

   # Backend
   cd backend && uv sync && cd ..
   ```

3. **Set up environment variables:**

   ```bash
   # Copy example files
   cp .env.example .env.local
   cp backend/.env.example backend/.env

   # Edit backend/.env with your configuration
   # Required: DATABASE_URL, OPENAI_API_KEY
   ```

4. **Start the database:**

   ```bash
   docker compose up -d postgres
   ```

   The database schema is automatically initialized via Docker init scripts.

5. **Start development servers:**

   ```bash
   # Terminal 1: Backend API
   make api-dev

   # Terminal 2: Frontend
   make dev
   ```

6. **Access the application:**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs
   - Health Check: http://localhost:8000/api/v1/health

## Environment Variables

### Backend (Required)

```env
# Database (PostgreSQL with pgvector)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ragdb

# OpenAI API (required)
OPENAI_API_KEY=your-api-key-here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini
EMBEDDING_DIMENSION=1536
```

### Backend (Optional)

```env
# Environment
ENVIRONMENT=development
DEBUG=false

# CORS
CORS_ALLOW_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Redis (for distributed rate limiting)
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=false

# Chunking
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

### Frontend

```env
# Backend API URL (server-side proxy)
AZURE_API_BASE_URL=http://localhost:8000
```

See [ENV_VARS.md](./ENV_VARS.md) for complete environment variable documentation.

## Usage

### Ingesting Documents

Documents can be uploaded via the web interface or API:

**Web Interface:**

1. Click the "+" button in the Documents sidebar
2. Drag and drop files or click to browse
3. Enter source and title (optional)
4. Click "Ingest"

**API:**

```bash
curl -X POST http://localhost:8000/api/v1/ingest \
  -F "file=@document.pdf" \
  -F "source=docs" \
  -F "title=My Document"
```

### Querying the RAG System

**Web Interface:**

- Type questions in the chat interface
- Select RAG model in Settings
- View citations and metadata for each response

**API:**

```bash
curl -X POST http://localhost:8000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is RAG?",
    "top_k": 8,
    "rag_model": "vector-similarity"
  }'
```

**Available RAG Models:**

- `vector-similarity` - Semantic search using cosine similarity
- `hybrid-search` - Combines vector search with BM25
- `reranking` - Uses reranking model for improved accuracy
- `multi-query` - Generates multiple query variations

### Running Evaluations

Test your RAG system performance offline:

```bash
make eval
```

This runs the evaluation harness and generates a report with:

- Retrieval metrics (Hit@K, MRR)
- LLM-judge metrics (if enabled)
- Failure examples and analysis

See [Evaluation Instructions](#evaluation-framework) for details.

## API Documentation

### Core Endpoints

| Endpoint                        | Method | Description                            |
| ------------------------------- | ------ | -------------------------------------- |
| `/api/v1/health`                | GET    | Health check and database connectivity |
| `/api/v1/query`                 | POST   | Query the RAG system                   |
| `/api/v1/ingest`                | POST   | Ingest documents (text or file)        |
| `/api/v1/documents`             | GET    | List all documents                     |
| `/api/v1/documents/{id}`        | DELETE | Delete a document                      |
| `/api/v1/documents/{id}/chunks` | GET    | Get document chunks                    |
| `/api/v1/metrics`               | GET    | Get system metrics                     |
| `/api/v1/extract-text`          | POST   | Extract text from files                |

See [backend/README.md](./backend/README.md) and [docs/API_CONTRACT.md](./docs/API_CONTRACT.md) for complete API documentation.

## Deployment

The live demo runs on **Vercel (frontend) + Render (backend) + Neon (Postgres)**.

### Frontend (Vercel)

1. Connect your repository to Vercel
2. Set `AZURE_API_BASE_URL` to your backend's base URL (despite the name, this is just the FastAPI origin the Next.js proxy forwards to) and `POSTGRES_URL` / `AUTH_SECRET`
3. Deploy automatically

### Backend (Render, Azure, or any container host)

The FastAPI backend is a standard container — deploy it anywhere. See [AZURE_DEPLOY.md](./AZURE_DEPLOY.md) for an Azure Container Apps walkthrough, or [DEPLOYMENT.md](./DEPLOYMENT.md) for the general guide.

### Docker Compose

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guide.

## Evaluation Framework

The evaluation harness allows you to test RAG system performance offline:

### Running Evaluations

```bash
make eval
```

### Evaluation Metrics

**Retrieval Metrics:**

- **Hit@K**: Whether any expected source appears in top K retrieved results
- **MRR (Mean Reciprocal Rank)**: Average reciprocal rank of first relevant result

**LLM Judge Metrics** (optional):

- **Correctness**: Does the answer correctly address the question?
- **Faithfulness**: Is the answer grounded in context, not hallucinated?

### Adding Test Cases

Edit `backend/eval/dataset.jsonl`:

```json
{
  "query": "What is RAG?",
  "expected_sources": ["introduction-to-rag"],
  "expected_answer_contains": ["Retrieval-Augmented Generation"]
}
```

## Project Structure

```
rag-eval-observability/
├── src/                          # Frontend (Next.js)
│   ├── app/                     # App Router pages
│   ├── features/                # Feature modules
│   │   ├── console/             # Main console UI
│   │   ├── chat/                # Chat components
│   │   └── settings/            # User settings
│   ├── components/ui/           # UI components (shadcn/ui)
│   └── lib/                     # Utilities and API client
├── backend/                     # Backend (FastAPI)
│   ├── app/
│   │   ├── api/                 # API routes
│   │   ├── rag/                 # RAG pipeline
│   │   ├── core/                # Config, logging, metrics
│   │   ├── db/                  # Database queries
│   │   └── llm/                 # OpenAI client
│   ├── eval/                    # Evaluation harness
│   └── tests/                   # Backend tests
├── docker/                      # Docker configuration
│   └── init/                    # Database init scripts
└── docs/                        # Additional documentation
```

## Development

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint & Prettier**: Automated code formatting
- **Testing**: Jest (frontend) and pytest (backend)
- **Linting**: Automated linting on commit

### Makefile Commands

**Frontend:**

- `make dev` - Start development server
- `make lint` - Run linting
- `make test` - Run tests
- `make typecheck` - TypeScript type checking
- `make format` - Format code

**Backend:**

- `make api-dev` - Start development server
- `make api` - Start production server
- `make api-test` - Run backend tests

**Database:**

- `make db` - Start PostgreSQL
- `make migrate` - Run migrations
- `make seed` - Seed sample data

**Evaluation:**

- `make eval` - Run evaluation harness

## Documentation

- **[README.md](./README.md)** - This file (overview and quick start)
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide
- **[AZURE_DEPLOY.md](./AZURE_DEPLOY.md)** - Azure-specific deployment
- **[ENV_VARS.md](./ENV_VARS.md)** - Environment variables reference
- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start guide
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines
- **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)** - Code of conduct
- **[backend/README.md](./backend/README.md)** - Backend API documentation
- **[docs/API_CONTRACT.md](./docs/API_CONTRACT.md)** - API contract specification

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`make lint && make test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Security

**Important**: This project does not include authentication or authorization by default. The API endpoints are publicly accessible. For production deployments:

- Deploy behind a reverse proxy with authentication (e.g., nginx with basic auth, API gateway)
- Or implement authentication middleware (see [SECURITY.md](./SECURITY.md) for examples)
- Configure CORS to restrict origins
- Use HTTPS in production

See [SECURITY.md](./SECURITY.md) for comprehensive security considerations and recommendations.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/), [FastAPI](https://fastapi.tiangolo.com/), and [PostgreSQL](https://www.postgresql.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Vector search powered by [pgvector](https://github.com/pgvector/pgvector)
