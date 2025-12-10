import 'dotenv/config'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { db } from './connection'

// Note: This seed script now uses the Python backend API for ingestion
// Make sure the API is running before using this script
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'

interface DocumentFile {
  filename: string
  content: string
  title: string
}

function loadSampleDocuments(): DocumentFile[] {
  const docsDir = join(process.cwd(), 'data', 'sample_docs')

  if (!existsSync(docsDir)) {
    throw new Error(`data/sample_docs directory not found at ${docsDir}`)
  }

  try {
    const files = readdirSync(docsDir).filter(file => file.endsWith('.md'))

    return files.map(filename => {
      const filePath = join(docsDir, filename)
      const content = readFileSync(filePath, 'utf-8')

      const titleMatch = content.match(/^#\s+(.+)$/m)
      const title = titleMatch ? titleMatch[1] : filename.replace('.md', '')

      return {
        filename,
        content,
        title,
      }
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`data/sample_docs directory not found at ${docsDir}`)
    }
    throw error
  }
}

function generateDocumentId(filename: string): string {
  return filename
    .replace('.md', '')
    .replace(/[^a-z0-9-]/gi, '-')
    .toLowerCase()
}

// Note: Document creation is now handled by the API ingest endpoint
// This function is kept for compatibility but doesn't need to check/insert
async function seedDocument(_docId: string, _title: string, _source: string): Promise<boolean> {
  // The API will handle idempotency, so we always return true
  // to allow the ingest to proceed
  return true
}

async function seedDocumentViaAPI(source: string, title: string, content: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source,
        title,
        text: content,
        is_markdown: true,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    const result = await response.json()
    console.log(`  → Ingested via API: ${result.document_id} (${result.chunks_created} chunks)`)
  } catch (error) {
    console.error(`Failed to ingest document via API:`, error)
    throw error
  }
}

async function seed() {
  try {
    console.log('Loading sample documents...')
    const documents = loadSampleDocuments()

    if (documents.length === 0) {
      console.log('No sample documents found in data/sample_docs/')
      return
    }

    console.log(`Found ${documents.length} document(s) to seed`)

    let newDocs = 0
    let existingDocs = 0

    for (const doc of documents) {
      const docId = generateDocumentId(doc.filename)
      const source = 'sample_docs'

      console.log(`Processing: ${doc.title} (${docId})`)

      const isNew = await seedDocument(docId, doc.title, source)

      if (isNew) {
        newDocs++
        console.log(`  → Creating document: ${docId}`)
      } else {
        existingDocs++
        console.log(`  → Document already exists: ${docId}`)
      }

      console.log(`  → Ingesting via Python backend API...`)
      await seedDocumentViaAPI(source, doc.title, doc.content)
      console.log(`  ✓ Completed: ${docId}`)
    }

    console.log('\nSeeding completed:')
    console.log(`  - New documents: ${newDocs}`)
    console.log(`  - Existing documents: ${existingDocs}`)
    console.log(`  - Total documents: ${documents.length}`)
  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  } finally {
    await db.close()
  }
}

seed()
