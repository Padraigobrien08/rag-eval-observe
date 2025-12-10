import type { Citation, RetrievedChunkDebug } from '@/lib/api/types'

export interface AssistantMessageMeta {
  citations?: Citation[]
  tokenUsage?: {
    total_tokens?: number
    prompt_tokens?: number
    completion_tokens?: number
  }
  latencyMs?: number
  debugRetrieved?: RetrievedChunkDebug[]
}

export interface BaseChatMessage {
  id: string
  createdAt: Date
  content: string
}

export interface UserChatMessage extends BaseChatMessage {
  role: 'user'
}

export interface AssistantChatMessage extends BaseChatMessage {
  role: 'assistant'
  meta?: AssistantMessageMeta
}

export type ChatMessage = UserChatMessage | AssistantChatMessage

export interface ChatOptions {
  topK?: number
  filters?: {
    source?: string
    title?: string
  }
  debug?: boolean
}
