import { NextRequest, NextResponse } from 'next/server'

// Backend URL - server-side only (no NEXT_PUBLIC_ prefix needed)
const base = process.env.AZURE_API_BASE_URL || 'http://localhost:8000'

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path)
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path)
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path)
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  try {
    // Reconstruct the backend path
    const path = pathSegments.join('/')
    const url = `${base}/${path}`

    // Get query string if present
    const searchParams = request.nextUrl.searchParams.toString()
    const fullUrl = searchParams ? `${url}?${searchParams}` : url

    // Get request body for POST/DELETE
    let body: string | undefined
    const method = request.method
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const requestBody = await request.json()
        body = JSON.stringify(requestBody)
      } catch {
        // Try text if JSON parsing fails
        try {
          body = await request.text()
        } catch {
          // No body
        }
      }
    }

    // Forward specific headers (matching Pages Router pattern)
    const headers: HeadersInit = {
      ...(request.headers.get('authorization')
        ? { authorization: request.headers.get('authorization')! }
        : {}),
      'content-type': request.headers.get('content-type') || 'application/json',
    }

    // Make request to backend
    const upstream = await fetch(fullUrl, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : body,
    })

    // Get response text
    const text = await upstream.text()

    // Create response with same status
    const response = new NextResponse(text, {
      status: upstream.status,
    })

    // Copy content-type header if present
    const contentType = upstream.headers.get('content-type')
    if (contentType) {
      response.headers.set('content-type', contentType)
    }

    return response
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
