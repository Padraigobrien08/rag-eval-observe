'use client'

import type { UseChatHelpers } from '@ai-sdk/react'
import { motion } from 'framer-motion'
import { memo } from 'react'
import { DEMO_EXAMPLE_QUERIES } from '@/lib/demo-example-queries'
import type { ChatMessage } from '@/lib/types'
import { Suggestion } from './elements/suggestion'

type SuggestedActionsProps = {
  chatId: string
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage']
}

function PureSuggestedActions({ chatId, sendMessage }: SuggestedActionsProps) {
  const suggestedActions = DEMO_EXAMPLE_QUERIES.slice(0, 4)

  return (
    <div className="grid w-full gap-2 sm:grid-cols-2" data-testid="suggested-actions">
      {suggestedActions.map((action, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          key={action.id}
          transition={{ delay: 0.05 * index }}
        >
          <Suggestion
            className="h-auto w-full whitespace-normal p-3 text-left"
            onClick={() => {
              window.history.replaceState({}, '', `/chat/${chatId}`)
              sendMessage({
                role: 'user',
                parts: [{ type: 'text', text: action.prompt }],
              })
            }}
            suggestion={action.label}
          >
            {action.label}
          </Suggestion>
        </motion.div>
      ))}
    </div>
  )
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prev, next) => prev.chatId === next.chatId
)
