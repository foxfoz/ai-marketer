'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Building2, Target, Users, Megaphone } from 'lucide-react'

interface CompanyData {
  name: string
  niche: string
  products: string
  goals: string
  audience: string
  campaigns: string
}

export default function CompanyBriefForm() {
  const router = useRouter()
  const [data, setData] = useState<CompanyData>({
    name: '',
    niche: '',
    products: '',
    goals: '',
    audience: '',
    campaigns: '',
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchCompany = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/profile')
        if (res.ok) {
          const company = await res.json()
          if (company) {
            setData({
              name: company.name || '',
              niche: company.niche || '',
              products: company.products || '',
              goals: company.goals || '',
              audience: company.audience || '',
              campaigns: company.campaigns || '',
            })
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchCompany()
  }, [])

  const handleChange = (field: keyof CompanyData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }))
    setSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Ошибка сохранения')
      setSuccess(true)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Бриф компании</h2>
          <p className="text-sm text-text-secondary">Заполните данные — они помогут ИИ давать точные рекомендации</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Название компании *</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            placeholder="ООО Ромашка"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Ниша / Отрасль *</label>
          <input
            type="text"
            value={data.niche}
            onChange={(e) => handleChange('niche', e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            placeholder="Стоматология, доставка еды, IT..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Продукты / Услуги *</label>
        <textarea
          value={data.products}
          onChange={(e) => handleChange('products', e.target.value)}
          required
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          placeholder="Опишите, что вы продаете: услуги, товары, их особенности"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Маркетинговые цели</h3>
        </div>
        <textarea
          value={data.goals}
          onChange={(e) => handleChange('goals', e.target.value)}
          rows={2}
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          placeholder="Увеличить продажи на 30%, запустить рекламу, снизить стоимость лида..."
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Текущая аудитория</h3>
        </div>
        <textarea
          value={data.audience}
          onChange={(e) => handleChange('audience', e.target.value)}
          rows={2}
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          placeholder="Кто сейчас ваши клиенты: возраст, пол, интересы, доход"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Текущие кампании</h3>
        </div>
        <textarea
          value={data.campaigns}
          onChange={(e) => handleChange('campaigns', e.target.value)}
          rows={2}
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          placeholder="Какие рекламные каналы используете, бюджет, результаты"
        />
      </div>

      {success && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">
          Данные успешно сохранены!
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          <Save className="w-4 h-4" />
          Сохранить
        </button>
        <button
          type="button"
          onClick={() => router.push('/chat')}
          className="px-6 py-2.5 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-hover transition-colors"
        >
          Перейти в чат
        </button>
      </div>
    </form>
  )
}
