/**
 * API client for FastAPI backend
 */
import type {
  IngestRequest,
  IngestResponse,
  QueryRequest,
  QueryResponse,
  MetricsResponse,
  HealthResponse,
  ApiError,
} from './types'

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/v1`

// Configurable timeout (10-30s, default 30s)
const DEFAULT_TIMEOUT = 30000 // 30 seconds
const MIN_TIMEOUT = 10000 // 10 seconds
const MAX_TIMEOUT = 30000 // 30 seconds

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create an AbortController with timeout
 */
function createTimeoutController(timeoutMs: number = DEFAULT_TIMEOUT) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  return { controller, timeoutId }
}

/**
 * Normalize error response to consistent format
 */
async function normalizeError(response: Response): Promise<ApiError> {
  let errorData: any = {}
  try {
    errorData = await response.json()
  } catch {
    // If JSON parsing fails, use status text
  }

  // Extract message from various error formats
  let message = 'Unknown error'
  if (errorData.detail) {
    message = errorData.detail
  } else if (errorData.message) {
    message = errorData.message
  } else if (errorData.error) {
    message = errorData.error
  } else {
    message = response.statusText || `HTTP ${response.status}`
  }

  return {
    message,
    status: response.status,
    details: errorData,
  }
}

/**
 * Make API request with timeout and error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<T> {
  // Clamp timeout between min and max
  const clampedTimeout = Math.max(MIN_TIMEOUT, Math.min(MAX_TIMEOUT, timeoutMs))

  const { controller, timeoutId } = createTimeoutController(clampedTimeout)

  // Generate request ID
  const requestId = generateRequestId()

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        ...options.headers,
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await normalizeError(response)
      throw error
    }

    return (await response.json()) as T
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      throw {
        message: 'Request timeout',
        status: 408,
        details: { timeout: clampedTimeout },
      } as ApiError
    }

    // If it's already an ApiError, re-throw it
    if (error && typeof error === 'object' && 'status' in error) {
      throw error
    }

    // Otherwise, wrap it
    throw {
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      status: 0,
      details: error,
    } as ApiError
  }
}

/**
 * Ingest a document into the RAG system
 */
export async function ingestDoc(payload: IngestRequest): Promise<IngestResponse> {
  return apiRequest<IngestResponse>('/ingest', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Query the RAG system
 */
export async function queryRag(payload: QueryRequest): Promise<QueryResponse> {
  return apiRequest<QueryResponse>('/query', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Fetch application metrics
 */
export async function fetchMetrics(): Promise<MetricsResponse> {
  return apiRequest<MetricsResponse>('/metrics', {
    method: 'GET',
  })
}

/**
 * Check API health
 */
export async function health(): Promise<HealthResponse> {
  const data = await apiRequest<HealthResponse>('/health', {
    method: 'GET',
  })
  return data
}
