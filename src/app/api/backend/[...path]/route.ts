import { NextRequest, NextResponse } from 'next/server'

// Backend URL - server-side only (no NEXT_PUBLIC_ prefix needed)
const BACKEND_URL =
  process.env.AZURE_API_BASE_URL ||
  process.env.API_BASE_URL ||
  'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'POST')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'DELETE')
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    // Reconstruct the backend path - forward everything after /api/backend/
    const backendPath = `/${pathSegments.join('/')}`
    
    // Get query string if present
    const searchParams = request.nextUrl.searchParams.toString()
    const url = `${BACKEND_URL}${backendPath}${searchParams ? `?${searchParams}` : ''}`

    // Get request body for POST/PUT/PATCH
    let body: string | undefined
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      try {
        body = await request.text()
      } catch {
        // No body
      }
    }

    // Forward headers (excluding host and connection headers)
    const headers: HeadersInit = {}
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase()
      if (
        lowerKey !== 'host' &&
        lowerKey !== 'connection' &&
        lowerKey !== 'content-length'
      ) {
        headers[key] = value
      }
    })

    // Make request to backend
    const response = await fetch(url, {
      method,
      headers,
      body,
    })

    // Get response body
    const responseBody = await response.text()

    // Create response with same status and headers
    const proxiedResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
    })

    // Copy relevant headers from backend response
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase()
      if (
        lowerKey !== 'content-encoding' &&
        lowerKey !== 'transfer-encoding' &&
        lowerKey !== 'connection'
      ) {
        proxiedResponse.headers.set(key, value)
      }
    })

    return proxiedResponse
  } catch (error) {
    console.error('[API Proxy] Error proxying request:', error)
    return NextResponse.json(
      {
        error: 'Proxy error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

