'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import ChatInterface from '@/components/ChatInterface'
import { AIMode } from '@/lib/ai'

interface Conversation {
  id: string
  title: string
  mode: string
  updatedAt: string
}

function ChatPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentId, setCurrentId] = useState<string | undefined>(searchParams.get('id') || undefined)
  const [messages, setMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string }[]>([])
  const [mode, setMode] = useState<AIMode>('general')
  const [autoPrompt, setAutoPrompt] = useState<string | undefined>(undefined)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (currentId) {
      const fetchMessages = async () => {
        try {
          const res = await fetch(`/api/conversations/${currentId}`)
          if (res.ok) {
            const data = await res.json()
            setMessages(data.messages || [])
            setMode(data.mode as AIMode)
          }
        } catch {
          // ignore
        }
      }
      fetchMessages()
    } else {
      setMessages([])
      setMode('general')
    }
  }, [currentId])

  const handleNewChat = (newMode?: string, prompt?: string) => {
    setCurrentId(undefined)
    setMessages([])
    setMode((newMode as AIMode) || 'general')
    setAutoPrompt(prompt)
    router.push('/chat')
  }

  const handleSelectConversation = (id: string) => {
    setCurrentId(id)
    setAutoPrompt(undefined)
    router.push(`/chat?id=${id}`)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} menuOpen={sidebarOpen} />
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          conversations={conversations}
          currentId={currentId}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-hidden w-full">
          <ChatInterface
            conversationId={currentId}
            initialMessages={messages}
            initialMode={mode}
            autoPrompt={autoPrompt}
            onConversationCreated={fetchConversations}
          />
        </main>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <ChatPageContent />
    </Suspense>
  )
}
