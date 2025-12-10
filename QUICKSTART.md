# Quick Start Guide

## Prerequisites

- Docker and Docker Compose
- OpenAI API key

## Quick Start with Docker Compose

1. **Clone and set up environment:**

   ```bash
   git clone <repo-url>
   cd rag-eval-observability
   cp .env.example .env
   ```

2. **Edit `.env` file:**

   ```bash
   # Set your OpenAI API key (required)
   OPENAI_API_KEY=your-actual-api-key-here
   ```

3. **Start everything:**

   ```bash
   docker compose up -d
   ```

4. **Verify it's working:**

   ```bash
   curl http://localhost:8000/api/v1/health
   ```

   You should see:

   ```json
   {
     "status": "healthy",
     "database": "connected",
     "version": "0.1.0"
   }
   ```

5. **Test the API:**

   ```bash
   # Ingest a document
   curl -X POST http://localhost:8000/api/v1/ingest \
     -H "Content-Type: application/json" \
     -d '{
       "source": "test-doc",
       "title": "Test Document",
       "text": "This is a test document about RAG systems."
     }'

   # Query the system
   curl -X POST http://localhost:8000/api/v1/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": "What is RAG?",
       "top_k": 5
     }'
   ```

## Troubleshooting

### API won't start

1. **Check if PostgreSQL is running:**

   ```bash
   docker compose ps
   ```

2. **Check API logs:**

   ```bash
   docker compose logs api
   ```

3. **Check if OPENAI_API_KEY is set:**
   ```bash
   docker compose exec api env | grep OPENAI_API_KEY
   ```

### Database connection errors

1. **Wait for PostgreSQL to be ready:**

   ```bash
   docker compose up -d postgres
   # Wait 5-10 seconds
   docker compose up -d api
   ```

2. **Check PostgreSQL logs:**
   ```bash
   docker compose logs postgres
   ```

### Missing tables

The database schema is automatically created by the init scripts in `docker/init/`. If tables are missing:

1. **Check init scripts ran:**

   ```bash
   docker compose exec postgres psql -U postgres -d ragdb -c "\dt"
   ```

2. **Manually run schema:**
   ```bash
   docker compose exec postgres psql -U postgres -d ragdb -f /docker-entrypoint-initdb.d/02-create-schema.sql
   ```

## Next Steps

- See `README.md` for full documentation
- See `backend/README.md` for API details
- Check API docs at http://localhost:8000/docs
