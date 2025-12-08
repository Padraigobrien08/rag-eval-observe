import { Pool, QueryResult } from 'pg'
import { config } from '../../../config'

class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly query?: string
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

class DatabaseConnection {
  private pool: Pool

  constructor() {
    this.pool = new Pool({
      connectionString: config.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
    })
  }

  async query<T = unknown>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    try {
      const result = await this.pool.query<T>(text, params)
      return result
    } catch (error) {
      const pgError = error as { code?: string; message: string }
      throw new DatabaseError(
        pgError.message || 'Database query failed',
        pgError.code,
        text
      )
    }
  }

  async queryOne<T = unknown>(
    text: string,
    params?: unknown[]
  ): Promise<T | null> {
    const result = await this.query<T>(text, params)
    return result.rows[0] || null
  }

  async queryMany<T = unknown>(
    text: string,
    params?: unknown[]
  ): Promise<T[]> {
    const result = await this.query<T>(text, params)
    return result.rows
  }

  async transaction<T>(
    callback: (query: (text: string, params?: unknown[]) => Promise<QueryResult>) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const queryFn = (text: string, params?: unknown[]) => client.query(text, params)
      const result = await callback(queryFn)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }

  getPool(): Pool {
    return this.pool
  }
}

export const db = new DatabaseConnection()
export { DatabaseError }

