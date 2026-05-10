'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, Plus, Users, Target, Megaphone, FileSearch, BarChart3, Settings, BookOpen } from 'lucide-react'
import { AIMode, getDefaultPrompt } from '@/lib/ai'

interface Conversation {
  id: string
  title: string
  mode: string
  updatedAt: string
}

interface SidebarProps {
  conversations: Conversation[]
  currentId?: string
  onNewChat: (mode?: string, prompt?: string) => void
  onSelectConversation: (id: string) => void
}

const modeIcons: Record<string, React.ReactNode> = {
  general: <MessageSquare className="w-4 h-4" />,
  audience: <Users className="w-4 h-4" />,
  offer: <Target className="w-4 h-4" />,
  ads: <Megaphone className="w-4 h-4" />,
  audit: <FileSearch className="w-4 h-4" />,
  report: <BarChart3 className="w-4 h-4" />,
}

const modeLabels: Record<string, string> = {
  general: 'Общий',
  audience: 'Целевая аудитория',
  offer: 'Оффер',
  ads: 'Объявления',
  audit: 'Аудит',
  report: 'Отчет',
}

export default function Sidebar({ conversations, currentId, onNewChat, onSelectConversation }: SidebarProps) {
  const pathname = usePathname()

  const quickModes: { mode: AIMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'audience', label: 'Составить ЦА', icon: <Users className="w-4 h-4" /> },
    { mode: 'offer', label: 'Создать оффер', icon: <Target className="w-4 h-4" /> },
    { mode: 'ads', label: 'Объявления Директ', icon: <Megaphone className="w-4 h-4" /> },
    { mode: 'audit', label: 'Аудит кампании', icon: <FileSearch className="w-4 h-4" /> },
    { mode: 'report', label: 'Отчет / Медиаплан', icon: <BarChart3 className="w-4 h-4" /> },
  ]

  return (
    <aside className="w-64 bg-bg-sidebar border-r border-border flex flex-col h-full">
      <div className="p-3">
        <button
          onClick={() => onNewChat()}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-lg border border-border bg-white hover:bg-hover transition-colors text-sm font-medium text-text-primary"
        >
          <Plus className="w-4 h-4" />
          Новый чат
        </button>
      </div>

      <div className="px-3 pb-2">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-3 py-2">Быстрые режимы</p>
        <div className="space-y-1">
          {quickModes.map((item) => (
            <button
              key={item.mode}
              onClick={() => onNewChat(item.mode, getDefaultPrompt(item.mode))}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-hover transition-colors text-left"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-3 py-2">История</p>
        <div className="space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left truncate ${
                currentId === conv.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-text-secondary hover:bg-hover'
              }`}
            >
              {modeIcons[conv.mode] || <MessageSquare className="w-4 h-4" />}
              <span className="truncate">{conv.title}</span>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-text-secondary px-3 py-2">Нет диалогов</p>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-border space-y-1">
        <Link
          href="/knowledge"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === '/knowledge' ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-hover'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          База знаний
        </Link>
        <Link
          href="/profile"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === '/profile' ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-hover'
          }`}
        >
          <Settings className="w-4 h-4" />
          Настройки компании
        </Link>
      </div>
    </aside>
  )
}
