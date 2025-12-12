'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@/features/chat/useChat'
import { useRagSettings } from '@/features/settings/useRagSettings'
import { health } from '@/lib/api/client'
import { createNewSessionId } from '@/lib/storage/chatSessions'
import Header from './Header'
import MessageList from './MessageList'
import InputBar from './InputBar'
import SettingsDialog from './SettingsDialog'

interface ChatPanelProps {
  sessionId?: string
  onSessionSwitch?: (sessionId: string) => void
  settingsDialogOpen: boolean
  onSettingsDialogClose: () => void
}

export default function ChatPanel({
  sessionId,
  onSessionSwitch,
  settingsDialogOpen,
  onSettingsDialogClose,
}: ChatPanelProps) {
  const router = useRouter()
  const { settings } = useRagSettings()
  const {
    messages,
    isLoading,
    error: _error,
    sendMessage,
    resetChat,
    retryLastMessage,
    sessionId: currentSessionId,
  } = useChat(sessionId)
  const [connectionStatus, setConnectionStatus] = useState<{ ok: boolean; db?: boolean } | null>(
    null
  )
  const [inputValue, setInputValue] = useState('')

  // Sync session switching with parent
  useEffect(() => {
    if (onSessionSwitch && currentSessionId && currentSessionId !== sessionId) {
      onSessionSwitch(currentSessionId)
    }
  }, [currentSessionId, sessionId, onSessionSwitch])

  // Check connection status
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthData = await health()
        setConnectionStatus({ ok: healthData.ok, db: healthData.db })
      } catch {
        setConnectionStatus({ ok: false, db: false })
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleNewChat = useCallback(() => {
    resetChat()
    if (onSessionSwitch) {
      onSessionSwitch(createNewSessionId())
    }
  }, [resetChat, onSessionSwitch])

  const handleSendMessage = useCallback(
    (text: string) => {
      sendMessage(text, {
        topK: settings.topK,
        filters: settings.filters,
        debug: settings.debug,
      })
      setInputValue('')
    },
    [sendMessage, settings]
  )

  const handleExamplePrompt = useCallback((prompt: string) => {
    setInputValue(prompt)
    setTimeout(() => setInputValue(''), 100)
  }, [])

  return (
    <>
      <div className="h-full grid grid-rows-[auto,1fr,auto]">
        {/* Row 1: Header */}
        <Header
          connectionStatus={connectionStatus}
          onMetricsClick={() => router.push('/metrics')}
          onNewChat={handleNewChat}
        />

        {/* Row 2: Messages */}
        <MessageList
          messages={messages}
          isLoading={isLoading}
          error={_error || null}
          onRetry={retryLastMessage}
          onExamplePrompt={handleExamplePrompt}
        />

        {/* Row 3: Input Bar */}
        <InputBar
          onSend={handleSendMessage}
          isLoading={isLoading}
          disabled={isLoading}
          initialValue={inputValue}
        />
      </div>

      {/* Settings Dialog */}
      <SettingsDialog isOpen={settingsDialogOpen} onClose={onSettingsDialogClose} />
    </>
  )
}
