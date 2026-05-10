'use client'

import { AIMode } from '@/lib/ai'
import { MessageSquare, Users, Target, Megaphone, FileSearch, BarChart3, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface ModeSelectorProps {
  currentMode: AIMode
  onChange: (mode: AIMode) => void
}

const modes: { value: AIMode; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'general', label: 'Общий', icon: <MessageSquare className="w-4 h-4" />, description: 'Любые вопросы по маркетингу' },
  { value: 'audience', label: 'Целевая аудитория', icon: <Users className="w-4 h-4" />, description: 'Портреты, сегменты, боли' },
  { value: 'offer', label: 'Оффер', icon: <Target className="w-4 h-4" />, description: 'УТП, заголовки, выгоды' },
  { value: 'ads', label: 'Объявления', icon: <Megaphone className="w-4 h-4" />, description: 'Яндекс.Директ, тексты, ключи' },
  { value: 'audit', label: 'Аудит', icon: <FileSearch className="w-4 h-4" />, description: 'Анализ и оптимизация' },
  { value: 'report', label: 'Отчет', icon: <BarChart3 className="w-4 h-4" />, description: 'Медиапланы, метрики' },
]

export default function ModeSelector({ currentMode, onChange }: ModeSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = modes.find(m => m.value === currentMode) || modes[0]

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-text-primary hover:bg-hover transition-colors"
      >
        {current.icon}
        {current.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg border border-border shadow-lg py-1 z-50">
          {modes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => { onChange(mode.value); setOpen(false) }}
              className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                currentMode === mode.value ? 'bg-primary/5 text-primary' : 'hover:bg-hover text-text-primary'
              }`}
            >
              <div className="mt-0.5">{mode.icon}</div>
              <div>
                <p className="text-sm font-medium">{mode.label}</p>
                <p className="text-xs text-text-secondary">{mode.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
