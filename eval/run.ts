import 'dotenv/config'
// Note: This eval script should use the Python backend API
// For now, it's kept as a placeholder - use backend/eval/run_eval.py instead

interface EvaluationCase {
  id: string
  query: string
  expectedAnswer?: string
  metadata?: Record<string, unknown>
}

const testCases: EvaluationCase[] = [
  {
    id: 'test-1',
    query: 'What is RAG?',
    expectedAnswer: 'Retrieval-Augmented Generation',
  },
  {
    id: 'test-2',
    query: 'How do vector embeddings work?',
    expectedAnswer: 'numerical representations',
  },
]

async function runEvaluation() {
  console.log('This TypeScript evaluation script is deprecated.')
  console.log('Please use the Python evaluation harness instead:')
  console.log('  cd backend && python eval/run_eval.py')
  console.log('Or use: make eval')
  process.exit(1)
}

runEvaluation()

