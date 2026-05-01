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
    let body: BodyInit | undefined
    const method = request.method
    const contentType = request.headers.get('content-type') || ''

    if (method !== 'GET' && method !== 'HEAD') {
      // Handle FormData (file uploads)
      if (contentType.includes('multipart/form-data')) {
        body = await request.formData()
      } else if (contentType.includes('application/json')) {
        // Handle JSON
        try {
          const requestBody = await request.json()
          body = JSON.stringify(requestBody)
        } catch {
          // Fallback to text if JSON parsing fails
          body = await request.text()
        }
      } else {
        // Handle other content types (text, etc.)
        try {
          body = await request.text()
        } catch {
          // No body
        }
      }
    }

    // Forward specific headers (matching Pages Router pattern)
    // Don't set content-type for FormData - fetch will set it automatically with boundary
    const headers: Record<string, string> = {
      ...(request.headers.get('authorization')
        ? { authorization: request.headers.get('authorization')! }
        : {}),
    }

    const backendApiKey = process.env.AZURE_API_BACKEND_KEY?.trim()
    if (backendApiKey) {
      headers['x-api-key'] = backendApiKey
    }

    // Only set content-type if it's not FormData
    if (!contentType.includes('multipart/form-data')) {
      headers['content-type'] = contentType || 'application/json'
    }

    // Make request to backend
    const upstream = await fetch(fullUrl, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : body,
    })

    const responseContentType = upstream.headers.get('content-type') ?? ''

    if (responseContentType.includes('text/event-stream') && upstream.body) {
      const outHeaders = new Headers()
      outHeaders.set('content-type', responseContentType)
      outHeaders.set('cache-control', 'no-cache')
      outHeaders.set('connection', 'keep-alive')
      const xrid = upstream.headers.get('x-request-id')
      if (xrid) outHeaders.set('x-request-id', xrid)
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: outHeaders,
      })
    }

    const text = await upstream.text()
    const response = new NextResponse(text, {
      status: upstream.status,
    })
    if (responseContentType) {
      response.headers.set('content-type', responseContentType)
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
