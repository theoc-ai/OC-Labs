'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils/cn'
import {
  PROJECT_CHAT_TIMEOUT_MESSAGE,
  shouldResetProjectChatSession,
  toFriendlyProjectChatError,
} from '@/lib/chat/errors'
import { useSpinnerVerb } from '@/lib/chat/use-spinner-verb'
import type { ChatMessage } from '@/types'

function WaitingIndicator({ active }: { active: boolean }) {
  const verb = useSpinnerVerb(active)
  return (
    <span
      aria-live="polite"
      className="inline-flex min-h-[1.25rem] items-baseline gap-0.5 leading-5"
    >
      <span className="bg-[linear-gradient(110deg,#a1a1aa_35%,#e4e4e7_50%,#a1a1aa_65%)] bg-[length:220%_100%] bg-clip-text text-transparent motion-safe:animate-[chat-verb-shimmer_1.6s_linear_infinite] dark:bg-[linear-gradient(110deg,#71717a_35%,#e4e4e7_50%,#71717a_65%)]">
        {verb}
      </span>
      <span className="text-zinc-400">...</span>
    </span>
  )
}

interface ProjectChatProps {
  projectId: string
  initialMessages: ChatMessage[]
  onMessagesChange?: (messages: ChatMessage[]) => void
}

export function ProjectChat({ projectId, initialMessages, onMessagesChange }: ProjectChatProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  function updateMessages(updater: (prev: ChatMessage[]) => ChatMessage[]) {
    setMessages((prev) => {
      const next = updater(prev)
      onMessagesChange?.(next)
      return next
    })
  }
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleResetSession() {
    if (streaming) return
    setInput('')
    updateMessages(() => [])
    textareaRef.current?.focus()
  }

  function handleRequestResetSession() {
    if (streaming || messages.length === 0) return
    const confirmed = window.confirm(
      'Are you sure you want to start a new session? This will clear the current conversation.'
    )
    if (!confirmed) return
    handleResetSession()
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || streaming) return

    const shouldStartFresh = shouldAutoStartFreshSession(messages)
    const historyForRequest = shouldStartFresh ? [] : messages
    if (shouldStartFresh) {
      updateMessages(() => [])
    }

    setInput('')
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      project_id: projectId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    updateMessages((prev) => [...prev, userMsg])
    setStreaming(true)

    const assistantId = crypto.randomUUID()
    updateMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        project_id: projectId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      },
    ])

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyForRequest.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok || !res.body) {
        const errorText = await extractErrorMessage(res)
        updateMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: errorText } : m
          )
        )
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        const snap = accumulated
        updateMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: snap } : m))
        )
      }

      // Refresh server component data so any agent writes (update_project,
      // post_update, create_tasks, etc.) are reflected immediately.
      router.refresh()
    } catch (err) {
      const fallback =
        err instanceof Error && err.message
          ? toFriendlyChatError(err.message)
          : 'Something went wrong while reaching the project agent.'
      updateMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: fallback } : m
        )
      )
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden px-4">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pt-4 pb-4">
        {messages.length === 0 && (
          <div className="py-16 text-center text-sm text-zinc-400">
            Ask anything about this project.
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-xl px-4 py-2.5 text-sm',
                msg.role === 'user'
                  ? 'bg-[#007AFF] text-white'
                  : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
              )}
            >
              {msg.role === 'assistant' && msg.content ? (
                <div
                  className={cn(
                    '[&_h1]:mb-1 [&_h1]:text-base [&_h1]:font-semibold',
                    '[&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold',
                    '[&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-medium',
                    '[&_p]:mb-2 [&_p]:last:mb-0',
                    '[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4',
                    '[&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4',
                    '[&_li]:mb-0.5',
                    '[&_code]:rounded [&_code]:bg-zinc-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs dark:[&_code]:bg-zinc-700',
                    '[&_pre]:mb-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-zinc-200 [&_pre]:p-3 dark:[&_pre]:bg-zinc-700',
                    '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
                    '[&_strong]:font-semibold',
                    '[&_blockquote]:border-l-2 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-500 dark:[&_blockquote]:border-zinc-600',
                  )}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content || <WaitingIndicator active={streaming} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="py-4">
        <div className="relative flex items-end rounded-lg border border-zinc-200 bg-zinc-50 focus-within:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">
          <button
            type="button"
            onClick={handleRequestResetSession}
            disabled={streaming || messages.length === 0}
            className={cn(
              'absolute bottom-2 right-12 inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60',
              (streaming || messages.length === 0)
                ? 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500'
                : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-700'
            )}
            aria-label="Start a new session"
            title="Start a new session"
          >
            New session
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this project…"
            rows={3}
            disabled={streaming}
            className="flex-1 resize-none bg-transparent px-3 py-2.5 pr-36 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none disabled:opacity-60 dark:text-zinc-100"
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className={cn(
              'absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg transition-all',
              (streaming || !input.trim())
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-500'
                : 'bg-zinc-900 text-white cursor-pointer hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300'
            )}
            aria-label="Send"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const data = (await res.json()) as { error?: string }
      if (data?.error?.trim()) return toFriendlyChatError(data.error, res.status)
    }

    const text = (await res.text()).replace(/\s+/g, ' ').trim()
    if (text) return toFriendlyChatError(text, res.status)
  } catch {
    // Fall through to status fallback.
  }

  if (res.status === 504 || res.status === 524) return PROJECT_CHAT_TIMEOUT_MESSAGE
  if (res.status >= 500) return toFriendlyChatError('service unavailable', res.status)
  return `Request failed (${res.status}).`
}

function toFriendlyChatError(raw: string, status?: number): string {
  return toFriendlyProjectChatError(raw, status)
}

function findLastAssistantMessage(messages: ChatMessage[]): ChatMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'assistant') return messages[i]
  }
  return undefined
}

function shouldAutoStartFreshSession(messages: ChatMessage[]): boolean {
  const lastAssistant = findLastAssistantMessage(messages)
  return Boolean(lastAssistant && shouldResetProjectChatSession(lastAssistant.content))
}
