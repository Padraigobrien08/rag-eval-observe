import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url().optional(),
  PORT: z.string().default('3000'),
  OPENAI_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  LLM_MODEL: z.string().default('gpt-4-turbo-preview'),
  CHUNK_SIZE: z.string().default('1000'),
  CHUNK_OVERLAP: z.string().default('200'),
  EMBEDDING_DIMENSION: z.string().default('1536'),
})

type EnvConfig = z.infer<typeof envSchema>

export interface Config extends Omit<EnvConfig, 'EMBEDDING_DIMENSION' | 'DATABASE_URL'> {
  DATABASE_URL: string
  EMBEDDING_DIMENSION: number
}

function loadConfig(): Config {
  try {
    const parsed = envSchema.parse(process.env)
    const databaseUrl =
      parsed.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rag_eval'
    const embeddingDimension = parseInt(parsed.EMBEDDING_DIMENSION, 10)

    if (isNaN(embeddingDimension) || embeddingDimension <= 0) {
      throw new Error('EMBEDDING_DIMENSION must be a positive integer')
    }

    return {
      ...parsed,
      DATABASE_URL: databaseUrl,
      EMBEDDING_DIMENSION: embeddingDimension,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid environment variables:')
      error.errors.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`)
      })
      throw new Error('Invalid environment configuration')
    }
    throw error
  }
}

export const config = loadConfig()
