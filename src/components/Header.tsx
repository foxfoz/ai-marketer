'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { MessageSquare, User, LogOut, BookOpen, Menu, X } from 'lucide-react'

interface HeaderProps {
  onMenuToggle?: () => void
  menuOpen?: boolean
}

export default function Header({ onMenuToggle, menuOpen }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.push('/login')
  }

  return (
    <header className="h-14 border-b border-border bg-white flex items-center justify-between px-3 sm:px-4 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 -ml-2 rounded-lg text-text-secondary hover:bg-hover transition-colors"
            aria-label="Меню"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
        <Link href="/chat" className="flex items-center gap-2 text-primary font-semibold text-base sm:text-lg">
          <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="hidden sm:inline">ИИ-Маркетолог</span>
          <span className="sm:hidden">ИИ-М</span>
        </Link>
      </div>
      <nav className="flex items-center gap-1 sm:gap-2">
        <Link
          href="/knowledge"
          className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === '/knowledge' ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-hover'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden md:inline">База знаний</span>
        </Link>
        <Link
          href="/profile"
          className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === '/profile' ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-hover'
          }`}
        >
          <User className="w-4 h-4" />
          <span className="hidden md:inline">Профиль</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-hover transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Выйти</span>
        </button>
      </nav>
    </header>
  )
}
