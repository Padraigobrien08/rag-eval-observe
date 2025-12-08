import 'dotenv/config'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { db } from './connection'

interface Migration {
  version: number
  name: string
  filename: string
}

async function getAppliedMigrations(): Promise<number[]> {
  try {
    const result = await db.query<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version'
    )
    return result.rows.map((row) => row.version)
  } catch (error) {
    return []
  }
}

async function ensureMigrationsTable(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    )
  `)
}

function loadMigrations(): Migration[] {
  const migrationsDir = join(__dirname, 'migrations')
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  return files.map((filename) => {
    const match = filename.match(/^(\d+)_(.+)\.sql$/)
    if (!match) {
      throw new Error(`Invalid migration filename: ${filename}`)
    }
    return {
      version: parseInt(match[1], 10),
      name: match[2],
      filename,
    }
  })
}

async function applyMigration(migration: Migration): Promise<void> {
  const migrationsDir = join(__dirname, 'migrations')
  const sql = readFileSync(join(migrationsDir, migration.filename), 'utf-8')

  const client = await db.getPool().connect()
  try {
    await client.query('BEGIN')
    
    await client.query(sql)
    await client.query(
      'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
      [migration.version, migration.name]
    )
    
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function runMigrations() {
  try {
    console.log('Running migrations...')

    await ensureMigrationsTable()
    const appliedMigrations = await getAppliedMigrations()
    const allMigrations = loadMigrations()

    const pendingMigrations = allMigrations.filter(
      (m) => !appliedMigrations.includes(m.version)
    )

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations')
      return
    }

    console.log(`Found ${pendingMigrations.length} pending migration(s)`)

    for (const migration of pendingMigrations) {
      console.log(`Applying migration ${migration.version}: ${migration.name}`)
      await applyMigration(migration)
      console.log(`✓ Applied migration ${migration.version}`)
    }

    console.log('All migrations completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await db.close()
  }
}

runMigrations()

