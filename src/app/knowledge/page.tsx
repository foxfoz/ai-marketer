'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { BookOpen, Plus, Trash2, Search, Loader2, FileText, Link2, RefreshCw, ExternalLink, Database } from 'lucide-react'

interface KnowledgeItem {
  id: string
  filename: string
  content: string
  source: string
  docUrl: string | null
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export default function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [filename, setFilename] = useState('')
  const [content, setContent] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const fetchItems = async () => {
    try {
      const url = search ? `/api/knowledge?q=${encodeURIComponent(search)}` : '/api/knowledge'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!filename.trim() || !content.trim()) return

    setSaving(true)
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content, source: 'manual', isSystem: true }),
      })

      if (res.ok) {
        setFilename('')
        setContent('')
        setShowForm(false)
        fetchItems()
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docUrl.trim()) return

    setImporting(true)
    try {
      const res = await fetch('/api/knowledge/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: docUrl, isSystem: true }),
      })

      const data = await res.json()
      if (res.ok) {
        setDocUrl('')
        setShowImport(false)
        fetchItems()
        alert(data.updated ? 'Документ обновлён!' : 'Документ импортирован!')
      } else {
        alert(data.error || 'Ошибка импорта')
      }
    } catch {
      alert('Ошибка соединения')
    } finally {
      setImporting(false)
    }
  }

  const handleSync = async (id: string) => {
    setSyncingId(id)
    try {
      const item = items.find(i => i.id === id)
      if (!item) return

      const res = await fetch('/api/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, content: item.content }),
      })

      if (res.ok) {
        fetchItems()
        alert('Синхронизация выполнена!')
      }
    } catch {
      alert('Ошибка синхронизации')
    } finally {
      setSyncingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту запись из базы знаний?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchItems()
      }
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-bg-sidebar">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-border shadow-sm">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-text-primary">База знаний</h1>
                  <p className="text-sm text-text-secondary">Глобальные знания для всех пользователей. ИИ использует их в ответах.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowImport(!showImport); setShowForm(false) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
                >
                  <Link2 className="w-4 h-4" />
                  Импорт Google Doc
                </button>
                <button
                  onClick={() => { setShowForm(!showForm); setShowImport(false) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по базе знаний..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {showImport && (
            <div className="p-6 border-b border-border bg-blue-50">
              <h3 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Импорт из Google Docs
              </h3>
              <form onSubmit={handleImport} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">Ссылка на Google Doc</label>
                  <input
                    type="url"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-blue-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="https://docs.google.com/document/d/..."
                  />
                  <p className="text-xs text-blue-600 mt-1">
                    Документ должен быть открыт для доступа по ссылке: Файл → Настройки доступа → Все, у кого есть ссылка
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={importing}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary-dark disabled:opacity-50 transition-colors"
                  >
                    {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                    Импортировать
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImport(false)}
                    className="px-6 py-2.5 rounded-lg border border-blue-200 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          )}

          {showForm && (
            <div className="p-6 border-b border-border bg-hover">
              <h3 className="text-sm font-medium text-text-primary mb-3">Новая запись в базу знаний</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Название</label>
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Например: Метрики эффективности рекламы"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Содержимое</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={8}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                    placeholder="Вставьте текст, который ИИ будет использовать..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary-dark disabled:opacity-50 transition-colors"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-2.5 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-hover transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="divide-y divide-border">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Database className="w-12 h-12 text-text-secondary/40 mb-3" />
                <p className="text-text-secondary text-sm">База знаний пуста</p>
                <p className="text-text-secondary/60 text-xs mt-1 max-w-sm">
                  Добавьте первую запись или импортируйте Google Doc. Эти знания будут доступны всем пользователям и ИИ.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className={`p-4 hover:bg-hover transition-colors group ${item.isSystem ? 'border-l-4 border-l-primary' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-text-primary">{item.filename}</h3>
                        {item.isSystem && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            Системное
                          </span>
                        )}
                        {item.source === 'google-doc' && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium flex items-center gap-1">
                            <Link2 className="w-3 h-3" />
                            Google Doc
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary line-clamp-3">{item.content}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-xs text-text-secondary/60">
                          Обновлено: {new Date(item.updatedAt).toLocaleDateString('ru-RU')}
                        </p>
                        {item.docUrl && (
                          <a
                            href={item.docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-0.5"
                          >
                            Открыть оригинал
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.source === 'google-doc' && (
                        <button
                          onClick={() => handleSync(item.id)}
                          disabled={syncingId === item.id}
                          className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Синхронизировать с Google Doc"
                        >
                          {syncingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="p-2 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Как работает база знаний?
            </h3>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>Знания глобальны — доступны всем пользователям</li>
              <li>ИИ ищет релевантные материалы перед каждым ответом</li>
              <li>Системные знания имеют приоритет в ответах</li>
            </ul>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-100 p-4">
            <h3 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Google Docs — как подключить?
            </h3>
            <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
              <li>Откройте Google Doc</li>
              <li>Файл → Настройки доступа → Все, у кого есть ссылка</li>
              <li>Скопируйте ссылку и вставьте в «Импорт Google Doc»</li>
              <li>Нажмите «Синхронизировать» чтобы обновить текст</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  )
}
