'use client'

import type { ChatMessage } from './types'
import ReactMarkdown from 'react-markdown'

export default function AssistantBubble({ message }: { message: ChatMessage }) {
  const meta = message.metadata ?? {}

  return (
    <div className="flex justify-start">
      <div>
        <div className="max-w-3xl rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm text-sm text-slate-900 prose prose-sm">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        {(meta.latencyMs != null || meta.tokensTotal != null || meta.estimatedCostUsd != null) && (
          <div className="mt-1 text-[11px] text-slate-500">
            {meta.latencyMs != null && <span>{meta.latencyMs}ms</span>}
            {meta.tokensTotal != null && (
              <>
                {meta.latencyMs != null && ' • '}
                <span>{meta.tokensTotal} tokens</span>
              </>
            )}
            {meta.estimatedCostUsd != null && (
              <>
                {(meta.latencyMs != null || meta.tokensTotal != null) && ' • '}
                <span>${meta.estimatedCostUsd.toFixed(4)}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
