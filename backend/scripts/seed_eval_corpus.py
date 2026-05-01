#!/usr/bin/env python3
"""
Load minimal corpus into Postgres so eval/run_eval.py has documents to retrieve.

Requires DATABASE_URL, OPENAI_API_KEY, and schema from scripts/apply_init_sql.py.
Idempotent enough for CI: re-ingesting may create versioned sources per ingest rules.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

# noqa: E402 — path before app imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

from app.db.session import close_db_pool, init_db_pool
from app.rag.ingest import ingest_document

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

CORPUS = [
    {
        "source": "introduction-to-rag",
        "title": "Introduction to RAG",
        "text": """
Retrieval-Augmented Generation (RAG) combines retrieval of relevant information with
language model generation. The retrieval phase searches a knowledge base; the generation
phase synthesizes an answer. RAG improves accuracy, keeps answers up-to-date with
retrieved documents, and adds transparency by surfacing sources. RAG reduces
hallucinations by grounding responses in retrieved text. Phases include retrieval,
then generation with a language model. RAG is effective for question answering,
summarization, and chatbots.
""".strip(),
    },
    {
        "source": "vector-embeddings",
        "title": "Vector embeddings",
        "text": """
Vector embeddings map text into numerical vectors that capture semantic meaning.
Similar concepts have vectors with small angle between them; cosine similarity measures
the angle between vectors. Popular embedding APIs include OpenAI (e.g. 1536 or 3072
dimensions), sentence transformers, and Cohere. Embeddings enable semantic search in
retrieval pipelines.
""".strip(),
    },
    {
        "source": "chunking-strategies",
        "title": "Chunking strategies",
        "text": """
Chunking splits documents for indexing. Fixed-size chunking uses a fixed token or
character window with overlap between chunks so context is preserved across boundaries.
Sentence-based chunking groups by sentence boundaries. Paragraph-based chunking uses
paragraph breaks. Semantic chunking splits at semantic boundaries for coherence.
Overlap helps avoid cutting important phrases at chunk edges.
""".strip(),
    },
    {
        "source": "retrieval-methods",
        "title": "Retrieval methods",
        "text": """
Approximate nearest neighbor indexes include HNSW (hierarchical navigable small world)
and IVFFLAT (inverted file with compression). HNSW often offers strong query performance;
IVFFLAT can trade speed for memory. Hybrid retrieval combines dense vector search with
keyword or BM25 signals. Cosine similarity and distance metrics measure embedding
similarity.
""".strip(),
    },
    {
        "source": "evaluation-metrics",
        "title": "Evaluation metrics",
        "text": """
RAG evaluation uses retrieval metrics such as precision at K (precision among retrieved
items), recall, and mean reciprocal rank (MRR). Answer quality metrics include
faithfulness, relevance to the query, and overlap scores like BLEU. Context utilization
measures how well the model uses retrieved passages. Retrieval completeness relates to
recall of relevant documents.
""".strip(),
    },
]


async def main() -> None:
    if not os.environ.get("DATABASE_URL", "").strip():
        print("DATABASE_URL is required", file=sys.stderr)
        sys.exit(1)
    if not os.environ.get("OPENAI_API_KEY", "").strip():
        print("OPENAI_API_KEY is required for embedding ingestion", file=sys.stderr)
        sys.exit(1)

    await init_db_pool()
    try:
        for doc in CORPUS:
            result = await ingest_document(
                source=doc["source"],
                title=doc["title"],
                text=doc["text"],
                is_markdown=False,
            )
            print(f"ingested {doc['source']}: {result}")
    finally:
        await close_db_pool()


if __name__ == "__main__":
    asyncio.run(main())
