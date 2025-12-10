import { Pool } from 'pg'
import { config } from '../config'

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export const db = {
  query: async (text: string, params?: unknown[]) => {
    const result = await pool.query(text, params)
    return {
      rows: result.rows.map(row => ({
        ...row,
        embedding: row.embedding
          ? typeof row.embedding === 'string'
            ? JSON.parse(row.embedding)
            : row.embedding
          : null,
      })),
    }
  },
  end: () => pool.end(),
}
