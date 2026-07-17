const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/node_modules/', '<rootDir>/.claude/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/rag/(.*)$': '<rootDir>/rag/$1',
    '^@/observability/(.*)$': '<rootDir>/observability/$1',
    '^@/db/(.*)$': '<rootDir>/db/$1',
    '^@/eval/(.*)$': '<rootDir>/eval/$1',
    '^@/tests/(.*)$': '<rootDir>/tests/$1',
  },
  // Unit coverage targets the logic layer (src/lib); UI behaviour is covered by
  // Playwright E2E (incl. axe-core). db (Drizzle) and api (fetch wrappers) are
  // integration-tested, not unit-tested, so they're excluded from this gate.
  collectCoverageFrom: [
    'src/lib/**/*.{ts,tsx}',
    '!src/lib/db/**',
    '!src/lib/api/**',
    '!src/lib/**/*.d.ts',
    '!src/lib/types.ts', // type-only module — no runtime to exercise
    '!src/lib/constants.ts', // auth/env bootstrap (bcrypt, NODE_ENV) — covered by integration/e2e
  ],
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
  // json-summary feeds the self-hosted coverage badge (scripts/coverage-badge.mjs in CI).
  coverageReporters: ['text', 'lcov', 'json-summary'],
}

module.exports = createJestConfig(customJestConfig)
