'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, User, LogOut, BookOpen } from 'lucide-react'

export default function Header() {
  const router = useRouter()

  const handleLogout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.push('/login')
  }

  return (
    <header className="h-14 border-b border-border bg-white flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <Link href="/chat" className="flex items-center gap-2 text-primary font-semibold text-lg">
          <MessageSquare className="w-6 h-6" />
          <span>ИИ-Маркетолог</span>
        </Link>
      </div>
      <nav className="flex items-center gap-2">
        <Link
          href="/chat"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-hover transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Чат</span>
        </Link>
        <Link
          href="/knowledge"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-hover transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">База знаний</span>
        </Link>
        <Link
          href="/profile"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-hover transition-colors"
        >
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">Профиль</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-hover transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Выйти</span>
        </button>
      </nav>
    </header>
  )
}
