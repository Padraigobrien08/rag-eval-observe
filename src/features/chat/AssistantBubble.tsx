'use client'

import type { ChatMessage } from './types'
import ReactMarkdown from 'react-markdown'

export default function AssistantBubble({ message }: { message: ChatMessage }) {
  const meta = message.metadata ?? {}
  const latencyMs = typeof meta.latencyMs === 'number' ? meta.latencyMs : null
  const tokensTotal = typeof meta.tokensTotal === 'number' ? meta.tokensTotal : null
  const estimatedCostUsd = typeof meta.estimatedCostUsd === 'number' ? meta.estimatedCostUsd : null

  return (
    <div className="flex justify-start">
      <div>
        <div className="max-w-3xl rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm text-sm text-slate-900 prose prose-sm">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        {(latencyMs != null || tokensTotal != null || estimatedCostUsd != null) && (
          <div className="mt-1 text-[11px] text-slate-500">
            {latencyMs != null && <span>{latencyMs}ms</span>}
            {tokensTotal != null && (
              <>
                {latencyMs != null && ' • '}
                <span>{tokensTotal} tokens</span>
              </>
            )}
            {estimatedCostUsd != null && (
              <>
                {(latencyMs != null || tokensTotal != null) && ' • '}
                <span>${estimatedCostUsd.toFixed(4)}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
