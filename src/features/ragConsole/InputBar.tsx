'use client'

import { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputBarProps {
  onSend: (text: string) => void
  isLoading: boolean
  disabled?: boolean
  initialValue?: string
}

export default function InputBar({ onSend, isLoading, disabled, initialValue }: InputBarProps) {
  const [inputText, setInputText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Handle initial value (from example prompts)
  useEffect(() => {
    if (initialValue) {
      setInputText(initialValue)
      setTimeout(() => {
        textareaRef.current?.focus()
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`
        }
      }, 0)
    }
  }, [initialValue])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isLoading) return

    const textToSend = inputText.trim()
    onSend(textToSend)
    setInputText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`
    }
  }

  return (
    <div className="border-t bg-white/80 backdrop-blur">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-3 flex items-end gap-3">
        <Textarea
          ref={textareaRef}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          rows={1}
          placeholder="Message RAG Eval..."
          disabled={isLoading || disabled}
          className={cn(
            'rounded-2xl resize-none min-h-[60px] max-h-[144px]',
            'focus-visible:ring-2 focus-visible:ring-blue-500/20'
          )}
          style={{ maxHeight: '144px' }}
        />
        <Button
          type="submit"
          disabled={isLoading || !inputText.trim() || disabled}
          size="icon"
          className="h-12 w-12 rounded-2xl flex-shrink-0"
          title="Send message (Ctrl+Enter / Cmd+Enter)"
        >
          {isLoading ? (
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </form>
    </div>
  )
}
