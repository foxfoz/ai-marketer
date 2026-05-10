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
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
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

      // If this was a new conversation, notify parent to refresh list
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

  // Auto-send prompt from sidebar quick buttons
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
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-white">
        <ModeSelector currentMode={mode} onChange={setMode} />
        {messages.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-hover transition-colors"
          >
            <Download className="w-4 h-4" />
            Экспорт
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !autoPrompt ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-text-primary mb-2">ИИ-Маркетолог</h2>
            <p className="text-text-secondary max-w-md mb-6">
              Ваш помощник в маркетинге. Задавайте вопросы о целевой аудитории, офферах, рекламе и аналитике.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
              <button onClick={() => { setMode('audience'); setInput('Составь портрет целевой аудитории') }} className="p-3 rounded-lg border border-border hover:bg-hover text-left text-sm text-text-secondary transition-colors">
                Составить портрет целевой аудитории
              </button>
              <button onClick={() => { setMode('offer'); setInput('Создай УТП для моего бизнеса') }} className="p-3 rounded-lg border border-border hover:bg-hover text-left text-sm text-text-secondary transition-colors">
                Создать УТП и оффер
              </button>
              <button onClick={() => { setMode('ads'); setInput('Напиши объявление для Яндекс.Директ') }} className="p-3 rounded-lg border border-border hover:bg-hover text-left text-sm text-text-secondary transition-colors">
                Написать объявление для Директа
              </button>
              <button onClick={() => { setMode('audit'); setInput('Проанализируй эффективность рекламы') }} className="p-3 rounded-lg border border-border hover:bg-hover text-left text-sm text-text-secondary transition-colors">
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
                <div className="max-w-3xl mx-auto px-4 py-5 flex gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-gray-200' : 'bg-primary/10'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-5 h-5 text-gray-600" />
                    ) : (
                      <Bot className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary mb-1">
                      {msg.role === 'user' ? 'Вы' : 'ИИ-Маркетолог'}
                    </p>
                    <div
                      className="markdown text-sm text-text-primary"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="bg-hover">
                <div className="max-w-3xl mx-auto px-4 py-5 flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-1">
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

      <div className="border-t border-border bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 rounded-xl border border-border bg-white shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Спросите о маркетинге..."
              rows={1}
              className="flex-1 px-4 py-3 bg-transparent resize-none outline-none text-sm text-text-primary placeholder:text-text-secondary/60 max-h-[200px]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="m-2 p-2 rounded-lg bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-text-secondary/60 text-center mt-2">
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
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}
