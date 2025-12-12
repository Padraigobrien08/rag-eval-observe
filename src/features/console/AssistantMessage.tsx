'use client'

import type { ChatMessage } from '@/features/chat/types'
import ReactMarkdown from 'react-markdown'

export default function AssistantMessage({ message }: { message: ChatMessage }) {
  const meta = message.metadata ?? {}

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-start">
        <div className="inline-block max-w-xl rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-900 whitespace-pre-wrap break-words">
          <div className="prose prose-sm max-w-none text-slate-900">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>

      {(meta.latencyMs != null || meta.tokensTotal != null || meta.estimatedCostUsd != null) && (
        <div className="ml-2 mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
          {meta.latencyMs != null && <span>Latency: {meta.latencyMs}ms</span>}
          {meta.tokensTotal != null && <span>Tokens: {meta.tokensTotal}</span>}
          {meta.estimatedCostUsd != null && <span>Cost: ${meta.estimatedCostUsd.toFixed(4)}</span>}
        </div>
      )}

      {Array.isArray(meta.citations) && meta.citations.length > 0 && (
        <div className="ml-2 mt-1 text-[11px] text-slate-700">
          <span className="font-medium">Citations ({meta.citations.length}): </span>
          {meta.citations.map((c: any, i: number) => (
            <span key={i} className="mr-2">
              {c.title ?? c.source ?? 'Source'}
              {c.chunk_index != null ? ` · chunk ${c.chunk_index}` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
