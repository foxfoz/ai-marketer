import Link from 'next/link'
import { MessageSquare, Target, Users, BarChart3, ArrowRight, Sparkles } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative px-4 py-20 md:py-32 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            ИИ для малого бизнеса
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-text-primary mb-6 leading-tight">
            ИИ-Маркетолог
          </h1>
          <p className="text-lg md:text-xl text-text-secondary mb-8 max-w-2xl mx-auto leading-relaxed">
            Ваш персональный помощник в маркетинге. Определяйте целевую аудиторию, 
            создавайте офферы, готовьте рекламу для Яндекс.Директ и анализируйте 
            эффективность — всё в одном чате.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-white font-semibold text-base hover:bg-primary-dark transition-colors"
            >
              Начать бесплатно
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-xl border border-border text-text-primary font-semibold text-base hover:bg-hover transition-colors"
            >
              Войти
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 bg-bg-sidebar">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary text-center mb-12">
            Возможности ИИ-Маркетолога
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-white rounded-xl border border-border">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Целевая аудитория</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Детальные портреты клиентов, сегментация, боли и триггеры покупки
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-border">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Офферы и УТП</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Сильные предложения, заголовки, выгоды и призывы к действию
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-border">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Яндекс.Директ</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Объявления, ключевые слова, стратегии и настройки кампаний
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-border">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Аудит и отчеты</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Анализ кампаний, медиапланы, метрики и рекомендации
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
            Готовы улучшить свой маркетинг?
          </h2>
          <p className="text-text-secondary mb-8">
            Зарегистрируйтесь, заполните бриф компании и получите первые рекомендации за минуту.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-white font-semibold text-base hover:bg-primary-dark transition-colors"
          >
            Создать аккаунт
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-border text-center text-sm text-text-secondary">
        <p>© 2024 ИИ-Маркетолог. Все права защищены.</p>
      </footer>
    </div>
  )
}
