'use client'

/**
 * Backend API client — aggregates every resource module under `src/lib/api/`.
 *
 * This file is the public entry point (`@/lib/api/client`); the modules below
 * hold the implementations, split by resource so that each one mirrors the
 * same-named file in the backend's `app/api/routes/` package:
 *
 *   rag.ts           -> routes/query.py      (query + SSE stream)
 *   documents.ts     -> routes/documents.py, routes/ingest.py
 *   chat.ts          -> routes/chat.py       (Postgres thread store)
 *   observability.ts -> routes/metrics.py, routes/analytics.py
 *   eval.ts          -> routes/eval.py       (persisted harness runs)
 *   files.ts         -> routes/documents.py  (extract-text) + browser helpers
 *   health.ts        -> routes/health.py
 *   http.ts          -> shared plumbing (base URL, error shaping, guards)
 *
 * Re-exporting from one barrel keeps `@/lib/api/client` stable for callers, the
 * same way `routes/__init__.py` aggregates the backend's sub-routers.
 */

// Only `formatApiErrorDetail` was ever public here. The rest of http.ts
// (API_BASE_URL, ensureBrowser, combineAbortSignals, encodePathSegment,
// messageFromErrorResponse, throwForStatus) stays internal to src/lib/api —
// splitting the file shouldn't widen its public surface.
export { formatApiErrorDetail } from './http'

export { ragQuery, ragQueryStream } from './rag'

export {
  deleteDocument,
  documentOriginalUrl,
  getDocument,
  getDocumentChunks,
  ingestDocument,
  listDocuments,
  type DocumentDetailPayload,
  type IngestChunkingSummary,
  type IngestPreprocessingSummary,
  type IngestResponsePayload,
} from './documents'

export {
  appendChatMessage,
  createChatThread,
  deleteAllChatThreads,
  deleteChatThread,
  listChatMessages,
  listChatThreads,
  updateChatThread,
  type ChatThreadSummary,
  type PersistedChatMessage,
} from './chat'

export {
  fetchQueryLogDetail,
  fetchQueryLogsList,
  getMetrics,
  type QueryLogDetail,
} from './observability'

export {
  fetchEvalRunDetail,
  fetchEvalRunsList,
  type EvalCaseResult,
  type EvalRunDetail,
  type EvalRunSummary,
} from './eval'

export { extractTextFromFile, fileToBase64 } from './files'

export { checkHealth } from './health'
