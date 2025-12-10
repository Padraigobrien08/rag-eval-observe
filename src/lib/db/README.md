# Database Schema

## Tables

### documents

- `id` (TEXT, PRIMARY KEY): Unique document identifier
- `source` (TEXT, NOT NULL): Source of the document
- `title` (TEXT): Document title
- `created_at` (TIMESTAMP WITH TIME ZONE): Creation timestamp

### chunks

- `id` (TEXT, PRIMARY KEY): Unique chunk identifier
- `document_id` (TEXT, FOREIGN KEY): Reference to parent document
- `chunk_index` (INTEGER, NOT NULL): Index of chunk within document
- `content` (TEXT, NOT NULL): Chunk text content
- `metadata` (JSONB): Additional metadata
- `embedding` (vector(1536)): Vector embedding (dimension configurable via EMBEDDING_DIMENSION)
- `created_at` (TIMESTAMP WITH TIME ZONE): Creation timestamp

## Indexes

### Vector Search Index

- **HNSW Index**: `chunks_embedding_hnsw_idx` - High-performance vector similarity search
  - Uses cosine distance for similarity
  - Optimized for fast approximate nearest neighbor search

### B-tree Indexes

- `chunks_document_id_idx`: Fast filtering by document
- `chunks_created_at_idx`: Time-based queries
- `chunks_document_created_idx`: Composite index for document + time queries
- `documents_source_idx`: Filter documents by source
- `documents_created_at_idx`: Time-based document queries

## Embedding Dimension

The schema uses `vector(1536)` by default, which matches OpenAI's `text-embedding-3-small` model.

To use a different dimension:

1. Update `EMBEDDING_DIMENSION` in your `.env` file
2. Modify the schema.sql to use the correct dimension
3. Re-run migrations

Common dimensions:

- `1536`: OpenAI text-embedding-3-small, text-embedding-ada-002
- `3072`: OpenAI text-embedding-3-large
- `384`: sentence-transformers all-MiniLM-L6-v2
- `768`: sentence-transformers all-mpnet-base-v2
