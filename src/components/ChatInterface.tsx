'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Download, User, Bot } from 'lucide-react'
import { AIMode } from '@/lib/ai'
import ModeSelector from './ModeSelector'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatInterfaceProps {
  conversationId?: string
  initialMessages?: Message[]
  initialMode?: AIMode
  autoPrompt?: string
  onConversationCreated?: () => void
}

export default function ChatInterface({ conversationId, initialMessages = [], initialMode = 'general', autoPrompt, onConversationCreated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<AIMode>(initialMode)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autoSentRef = useRef(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
    }
  }, [input])

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    setMessages(initialMessages)
    autoSentRef.current = false
  }, [initialMessages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          mode,
        }),
      })

      if (!res.ok) throw new Error('Ошибка запроса')

      const data = await res.json()
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
      }
      setMessages(prev => [...prev, assistantMessage])

      if (!conversationId && onConversationCreated) {
        onConversationCreated()
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Произошла ошибка. Попробуйте еще раз.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, conversationId, mode, onConversationCreated])

  useEffect(() => {
    if (autoPrompt && !autoSentRef.current && messages.length === 0) {
      autoSentRef.current = true
      sendMessage(autoPrompt)
    }
  }, [autoPrompt, messages.length, sendMessage])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    await sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleExport = () => {
    const text = messages.map(m => `${m.role === 'user' ? 'Пользователь' : 'ИИ-Маркетолог'}:\n${m.content}\n---\n`).join('\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `диалог-${conversationId || 'новый'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full bg-bg-chat">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-border bg-white flex-shrink-0">
        <ModeSelector currentMode={mode} onChange={setMode} />
        {messages.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm text-text-secondary hover:bg-hover transition-colors"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Экспорт</span>
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {messages.length === 0 && !autoPrompt ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
              <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-text-primary mb-2">ИИ-Маркетолог</h2>
            <p className="text-sm sm:text-base text-text-secondary mb-4 sm:mb-6 max-w-md">
              Ваш помощник в маркетинге. Задавайте вопросы о целевой аудитории, офферах, рекламе и аналитике.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-w-lg w-full px-2">
              <button onClick={() => { setMode('audience'); setInput('Составь портрет целевой аудитории') }} className="p-2.5 sm:p-3 rounded-lg border border-border hover:bg-hover text-left text-sm text-text-secondary transition-colors">
                Составить портрет целевой аудитории
              </button>
              <button onClick={() => { setMode('offer'); setInput('Создай УТП для моего бизнеса') }} className="p-2.5 sm:p-3 rounded-lg border border-border hover:bg-hover text-left text-sm text-text-secondary transition-colors">
                Создать УТП и оффер
              </button>
              <button onClick={() => { setMode('ads'); setInput('Напиши объявление для Яндекс.Директ') }} className="p-2.5 sm:p-3 rounded-lg border border-border hover:bg-hover text-left text-sm text-text-secondary transition-colors">
                Написать объявление для Директа
              </button>
              <button onClick={() => { setMode('audit'); setInput('Проанализируй эффективность рекламы') }} className="p-2.5 sm:p-3 rounded-lg border border-border hover:bg-hover text-left text-sm text-text-secondary transition-colors">
                Аудит рекламной кампании
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`animate-fade-in ${msg.role === 'user' ? 'bg-white' : 'bg-hover'}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-5 flex gap-2.5 sm:gap-4">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    msg.role === 'user' ? 'bg-gray-200' : 'bg-primary/10'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                    ) : (
                      <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-xs sm:text-sm font-medium text-text-primary mb-1">
                      {msg.role === 'user' ? 'Вы' : 'ИИ-Маркетолог'}
                    </p>
                    <div
                      className="markdown text-xs sm:text-sm text-text-primary break-words"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="bg-hover">
                <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-5 flex gap-2.5 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-1 pt-2">
                    <div className="w-2 h-2 rounded-full bg-primary typing-dot" />
                    <div className="w-2 h-2 rounded-full bg-primary typing-dot" />
                    <div className="w-2 h-2 rounded-full bg-primary typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-white p-2 sm:p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-1.5 sm:gap-2 rounded-xl border border-border bg-white shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Спросите о маркетинге..."
              rows={1}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-transparent resize-none outline-none text-sm text-text-primary placeholder:text-text-secondary/60 max-h-[150px]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="m-1 sm:m-2 p-2 rounded-lg bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors flex-shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] sm:text-xs text-text-secondary/60 text-center mt-1.5 sm:mt-2">
            ИИ может ошибаться. Проверяйте важные данные.
          </p>
        </form>
      </div>
    </div>
  )
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.*$)/gim, '<h3 class="text-base sm:text-lg font-semibold mt-3 mb-1.5">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg sm:text-xl font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl sm:text-2xl font-bold mt-5 mb-2.5">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^> (.*$)/gim, '<blockquote class="border-l-2 border-primary pl-3 my-2 text-text-secondary text-xs sm:text-sm">$1</blockquote>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-[11px] sm:text-xs font-mono">$1</code>')
    .replace(/\n/g, '<br>')
}
