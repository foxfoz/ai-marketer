import { prisma } from './prisma'

export type AIMode = 'general' | 'audience' | 'offer' | 'ads' | 'audit' | 'report'

interface AIContext {
  company?: {
    name: string
    niche: string
    products: string
    goals?: string | null
    audience?: string | null
    campaigns?: string | null
  } | null
  mode: AIMode
  history: { role: string; content: string }[]
}

const modePrompts: Record<AIMode, string> = {
  general: `Ты — Алексей Воронов, старший стратег по digital-маркетингу с 12-летним опытом. Работал с брендами разного масштаба — от локального бизнеса до федеральных сетей. Твой стиль: конкретика, цифры, практичность. Никогда не пишешь воды.`,
  audience: `Ты — Екатерина Морозова, эксперт по целевой аудитории и consumer insights. Провела более 200 исследований ЦА. Знаешь методологии Jobs-to-be-Done, психографические сегментации, поведенческие триггеры. Даёшь глубокий анализ, а не поверхностные описания.`,
  offer: `Ты — Дмитрий Соловьёв, копирайтер и стратег по офферам высшего класса. Создавал УТП для компаний, которые увеличивали конверсию на 200-400%. Знаешь нейромаркетинг, психологию принятия решений, формулы прямого отклика.`,
  ads: `Ты — Игорь Петров, сертифицированный специалист Яндекс.Директ (Pro) и Google Ads. Управлял рекламными бюджетами от 50 тыс. до 15 млн ₽/мес. Знаешь все типы кампаний, автостратегии, работу с семантикой, A/B-тестирование.`,
  audit: `Ты — Анна Кузнецова, аудитор рекламных кампаний с опытом работы с 500+ аккаунтами. Специализируешься на диагностике «слабых мест» и быстрых победах (quick wins). Даёшь конкретный план с приоритетами.`,
  report: `Ты — Сергей Волков, маркетинговый аналитик и финансовый директор по маркетингу. Строишь медиапланы, считаешь unit-экономику, прогнозируешь ROI. Все выводы — только на основе цифр и метрик.`,
}

const promptTemplates: Record<string, string[]> = {
  audience: [
    'Составь портрет целевой аудитории для {company}',
    'Какие боли и проблемы у клиентов {niche}?',
    'Определи сегменты ЦА для {products}',
  ],
  offer: [
    'Создай УТП для {company}',
    'Сформируй 5 вариантов заголовков для {products}',
    'Какие гарантии и выгоды предложить клиентам {niche}?',
  ],
  ads: [
    'Напиши объявление Яндекс.Директ для {company}',
    'Подбери ключевые слова для {products}',
    'Составь 3 варианта объявлений с разными УТП',
  ],
  audit: [
    'Проанализируй эффективность рекламной кампании',
    'Что можно улучшить в текущем маркетинге {company}?',
    'Оцени структуру воронки продаж',
  ],
  report: [
    'Подготовь отчет по маркетинговой активности',
    'Составь медиаплан на месяц для {company}',
    'Какие метрики отслеживать для {niche}?',
  ],
}

export function getDefaultPrompt(mode: AIMode): string {
  const defaults: Record<AIMode, string> = {
    general: 'Проанализируй мою ситуацию и предложи стратегию маркетинга на ближайшие 3 месяца',
    audience: 'Составь детальный портрет целевой аудитории с психографикой, болями и триггерами покупки',
    offer: 'Создай 3 варианта УТП и офферов, адаптированных под мою нишу и продукт',
    ads: 'Напиши готовые объявления для Яндекс.Директ (поиск + РСЯ) с ключевыми словами',
    audit: 'Проведи аудит маркетинга: что работает, что нет, приоритеты на ближайший месяц',
    report: 'Подготовь медиаплан на месяц с распределением бюджета по каналам и KPI',
  }
  return defaults[mode] || defaults.general
}

export function getPromptTemplates(mode: AIMode, company?: AIContext['company']): string[] {
  if (mode === 'general' || !promptTemplates[mode]) return []
  const templates = promptTemplates[mode]
  if (!company) return templates
  return templates.map(t =>
    t
      .replace('{company}', company.name)
      .replace('{niche}', company.niche)
      .replace('{products}', company.products)
  )
}

// ============ KNOWLEDGE BASE SEARCH ============

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase()
  const marketingTerms = [
    'целевая аудитория', 'ца', 'аудитория', 'сегмент', 'портрет', 'демография', 'психография',
    'оффер', 'утп', 'заголовок', 'продающий', 'копирайтинг', 'гарантия', 'выгода', 'триггер',
    'директ', 'яндекс', 'реклама', 'объявление', 'ключевое слово', 'ставка', 'ctr', 'cpc', 'cpm',
    'аудит', 'анализ', 'эффективность', 'метрика', 'воронка', 'конверсия', 'кампания',
    'отчет', 'медиаплан', 'бюджет', 'roi', 'romi', 'cpl', 'cpa', 'ltv', 'cac',
    'маркетинг', 'продвижение', 'продажи', 'лид', 'заявка', 'звонок',
  ]
  return marketingTerms.filter(term => lower.includes(term))
}

async function findRelevantKnowledge(message: string, mode: AIMode): Promise<{filename: string; content: string; isSystem: boolean}[]> {
  const keywords = extractKeywords(message)
  const modeKeywords: Record<AIMode, string[]> = {
    general: ['маркетинг', 'продвижение', 'стратегия'],
    audience: ['аудитория', 'ца', 'сегмент', 'портрет', 'психография', 'демография'],
    offer: ['оффер', 'утп', 'заголовок', 'продающий', 'копирайтинг', 'триггер'],
    ads: ['директ', 'реклама', 'объявление', 'ключевое', 'ставка', 'ctr', 'cpc'],
    audit: ['аудит', 'анализ', 'метрика', 'воронка', 'конверсия', 'эффективность'],
    report: ['отчет', 'медиаплан', 'бюджет', 'roi', 'cpl', 'cpa'],
  }

  const allKeywords = [...new Set([...keywords, ...modeKeywords[mode]])]

  if (allKeywords.length === 0) {
    const files = await prisma.knowledgeFile.findMany({
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    })
    return files.map(f => ({ filename: f.filename, content: f.content, isSystem: f.isSystem }))
  }

  const results: {filename: string; content: string; score: number; isSystem: boolean}[] = []
  const allFiles = await prisma.knowledgeFile.findMany({
    orderBy: [{ isSystem: 'desc' }, { updatedAt: 'desc' }],
  })

  for (const file of allFiles) {
    let score = 0
    const fileText = (file.filename + ' ' + file.content).toLowerCase()
    for (const kw of allKeywords) {
      if (fileText.includes(kw)) score += 1
    }
    if (score > 0) {
      results.push({ filename: file.filename, content: file.content, score, isSystem: file.isSystem })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, 5).map(r => ({ filename: r.filename, content: r.content, isSystem: r.isSystem }))
}

// ============ OPENAI INTEGRATION ============

async function callOpenAI(systemPrompt: string, userMessage: string, history: {role: string; content: string}[]): Promise<string | null> {
  // Try Polza.ai first (Russian proxy, compatible API)
  const polzaKey = process.env.POLZA_API_KEY
  if (polzaKey) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        { role: 'user', content: userMessage },
      ]

      console.log('[PolzaAI] Sending request...')

      const res = await fetch('https://api.polza.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${polzaKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.85,
          max_tokens: 4000,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        console.error('[PolzaAI] API error:', err)
      } else {
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content
        console.log('[PolzaAI] Response received, length:', content?.length || 0)
        if (content) return content
      }
    } catch (err) {
      console.error('[PolzaAI] Call failed:', err)
    }
  }

  // Try vsegpt.ru (Russian proxy, compatible API)
  const vseGptKey = process.env.VSEGPT_API_KEY
  if (vseGptKey) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        { role: 'user', content: userMessage },
      ]

      console.log('[VseGPT] Sending request...')

      const res = await fetch('https://api.vsegpt.ru/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vseGptKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages,
          temperature: 0.85,
          max_tokens: 4000,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        console.error('[VseGPT] API error:', err)
      } else {
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content
        console.log('[VseGPT] Response received, length:', content?.length || 0)
        if (content) return content
      }
    } catch (err) {
      console.error('[VseGPT] Call failed:', err)
    }
  }

  // Fallback to OpenAI direct
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: userMessage },
    ]

    console.log('[OpenAI] Sending request with system prompt length:', systemPrompt.length)

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.85,
        max_tokens: 4000,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[OpenAI] API error:', err)
      return null
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    console.log('[OpenAI] Response received, length:', content?.length || 0)
    return content || null
  } catch (err) {
    console.error('[OpenAI] Call failed:', err)
    return null
  }
}

// ============ MAIN RESPONSE GENERATOR ============

export async function generateAIResponse(message: string, context: AIContext): Promise<string> {
  const { company, mode, history } = context

  // Build MASTER system prompt
  let systemPrompt = modePrompts[mode] || modePrompts.general

  systemPrompt += `\n\n=== КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА ===
1. Ты отвечаешь КОНКРЕТНОМУ предпринимателю — никаких общих фраз.
2. Каждый совет должен быть адаптирован под его нишу, продукты и цели.
3. Если просят составить ЦА — не пиши "25-45 лет, средний доход". Опиши РЕАЛЬНЫЕ сегменты для этой ниши.
4. Если просят оффер — придумай конкретные заголовки для ЭТОГО бизнеса, не шаблоны.
5. Если просят объявления — напиши ГОТОВЫЕ тексты, которые можно сразу копировать.
6. Всегда используй маркдаун-форматирование (##, **, списки, таблицы).
7. Задавай уточняющие вопросы, если не хватает данных для точного ответа.
8. Никогда не начинай с "Конечно!", "Без проблем!" — сразу к делу.`

  // Deep company context
  if (company) {
    systemPrompt += `\n\n=== ДАННЫЕ КЛИЕНТА (используй во всех ответах) ===\n`
    systemPrompt += `Компания: "${company.name}"\n`
    systemPrompt += `Ниша: ${company.niche}\n`
    systemPrompt += `Продукты/услуги: ${company.products}\n`
    if (company.goals) systemPrompt += `Маркетинговые цели: ${company.goals}\n`
    if (company.audience) systemPrompt += `Что известно о текущей аудитории: ${company.audience}\n`
    if (company.campaigns) systemPrompt += `Текущие кампании и результаты: ${company.campaigns}\n`

    systemPrompt += `\n=== КАК ИСПОЛЬЗОВАТЬ ЭТИ ДАННЫЕ ===\n`
    systemPrompt += `- Все примеры, кейсы, офферы и объявления должны быть про "${company.name}" и нишу "${company.niche}"\n`
    systemPrompt += `- Если ниша "${company.niche}", используй специфику этой отрасли: терминологию, боли клиентов, сезонность, каналы продвижения, которые работают в этой нише\n`
    systemPrompt += `- Продукт "${company.products}" должен быть центром всех рекомендаций\n`
  } else {
    systemPrompt += `\n\nВНИМАНИЕ: Данные о компании не заполнены. Попроси пользователя заполнить бриф в профиле для персонализированных ответов.`
  }

  // Fetch RELEVANT knowledge base
  const relevantKnowledge = await findRelevantKnowledge(message, mode)
  if (relevantKnowledge.length > 0) {
    const systemKnowledge = relevantKnowledge.filter(k => k.isSystem)
    const userKnowledge = relevantKnowledge.filter(k => !k.isSystem)

    if (systemKnowledge.length > 0) {
      systemPrompt += `\n\n=== БАЗА ЗНАНИЙ (экспертные материалы — используй как основу) ===\n`
      for (const item of systemKnowledge) {
        systemPrompt += `\n--- ${item.filename} ---\n${item.content.slice(0, 4000)}\n`
      }
    }
    if (userKnowledge.length > 0) {
      systemPrompt += `\n\n=== ДОПОЛНИТЕЛЬНЫЕ МАТЕРИАЛЫ ===\n`
      for (const item of userKnowledge) {
        systemPrompt += `\n--- ${item.filename} ---\n${item.content.slice(0, 2000)}\n`
      }
    }
  }

  systemPrompt += `\n\n=== ФИНАЛЬНАЯ ИНСТРУКЦИЯ ===\n`
  systemPrompt += `Сейчас напиши ответ на запрос пользователя. Помни: конкретика, персонализация, практичность. Это должен быть ответ, который предприниматель сразу может применить в своём бизнесе.`

  // Try OpenAI first
  const openaiResponse = await callOpenAI(systemPrompt, message, history)
  if (openaiResponse) {
    return openaiResponse
  }

  // Fallback to local response
  return generateLocalResponse(message, systemPrompt, history, company)
}

// ============ LOCAL FALLBACK RESPONSES ============

function generateLocalResponse(message: string, systemPrompt: string, history: { role: string; content: string }[], company?: AIContext['company'] | null): string {
  const lowerMsg = message.toLowerCase()
  const companyName = company?.name || ''
  const niche = company?.niche || ''
  const products = company?.products || ''
  const hasKnowledge = systemPrompt.includes('БАЗА ЗНАНИЙ')

  // Audience mode
  if (lowerMsg.includes('целевую аудитори') || lowerMsg.includes('ца') || lowerMsg.includes('портрет') || lowerMsg.includes('сегмент')) {
    let response = `## Портрет целевой аудитории${companyName ? ` — ${companyName}` : ''}\n\n`

    if (niche) {
      response += `### Анализ ниши "${niche}"\n`
      response += `Для ниши "${niche}" характерны специфические сегменты клиентов. Вот ключевые группы:\n\n`
    }

    response += `### Сегмент 1: «Осознанный покупатель»\n`
    response += `- **Профиль:** Ищет качественное решение, готов платить больше за надёжность\n`
    response += `- **Боли:** Боязнь некачественного сервиса, непрозрачность цен\n`
    response += `- **Где искать:** Поисковая реклама по запросам "${products?.split(',')[0] || 'услуга'} отзывы", "лучшие ${niche || 'специалисты'}"\n`
    response += `- **Сообщение:** "${companyName || 'Мы'} — проверенный выбор для тех, кто ценит качество"\n\n`

    response += `### Сегмент 2: «Срочный клиент»\n`
    response += `- **Профиль:** Нужно решение здесь и сейчас, цена вторична\n`
    response += `- **Боли:** Нехватка времени, срочная потребность\n`
    response += `- **Где искать:** Поиск "${products?.split(',')[0] || 'услуга'} срочно", "${products?.split(',')[0] || 'услуга'} сегодня"\n`
    response += `- **Сообщение:** "Решение за 24 часа. Работаем без выходных"\n\n`

    response += `### Сегмент 3: «Экономный»\n`
    response += `- **Профиль:** Сравнивает цены, ищет выгодные предложения\n`
    response += `- **Боли:** Переплата, скрытые платежи\n`
    response += `- **Где искать:** Поиск "${products?.split(',')[0] || 'услуга'} недорого", "${products?.split(',')[0] || 'услуга'} цена"\n`
    response += `- **Сообщение:** "Честная цена без скрытых платежей. Рассчитаем стоимость за 5 минут"\n\n`

    if (hasKnowledge) {
      response += `> 💡 **В ответе использованы ваши экспертные материалы из базы знаний.**\n\n`
    } else {
      response += `> 💡 Добавьте в «Базу знаний» методологии сегментации для ниши "${niche}" — ответы станут глубже.\n\n`
    }

    response += `Хотите, чтобы я прописал рекламные сообщения под каждый сегмент или подготовил воронку продаж?`
    return response
  }

  // Offer mode
  if (lowerMsg.includes('оффер') || lowerMsg.includes('утп') || lowerMsg.includes('предложен') || lowerMsg.includes('заголовок')) {
    let response = `## УТП и офферы${companyName ? ` — ${companyName}` : ''}\n\n`

    if (niche && products) {
      response += `### УТП для ниши "${niche}"\n`
      response += `> **${companyName || 'Компания'}** — ${niche}, где ${products?.split(',')[0]} делается не просто качественно, а с гарантией результата. Почему мы? Потому что [конкретное отличие от конкурентов].\n\n`
    }

    response += `### Готовые заголовки (можно сразу использовать)\n`
    response += `1. **"${products?.split(',')[0] || 'Наш продукт'}: как получить [результат] без [типичная боль]"**\n`
    response += `2. **"${niche || 'Бизнес'} под ключ — от ${companyName || 'профессионалов'} с гарантией"**\n`
    response += `3. **"Сэкономьте [сумма] на ${products?.split(',')[0] || 'услугах'} — проверенный способ"**\n`
    response += `4. **"Почему 500+ клиентов выбрали ${companyName || 'нас'}: честный разбор"**\n`
    response += `5. **"${products?.split(',')[0] || 'Продукт'} за 48 часов или вернём деньги"**\n\n`

    response += `### Структура продающего блока\n`
    response += `**Заголовок:** привлекает через боль или любопытство\n`
    response += `**Подзаголовок:** раскрывает механику (как именно работает)\n`
    response += `**Выгоды:** 3-5 конкретных плюсов с цифрами\n`
    response += `**Доказательства:** отзывы, кейсы, сертификаты\n`
    response += `**Призыв:** конкретное действие + снижение риска (гарантия/бесплатно)\n\n`

    if (hasKnowledge) {
      response += `> 💡 **Использованы знания из вашей базы.**\n\n`
    }

    response += `Какой заголовок хотите доработать под конкретный канал (сайт, Директ, соцсети)?`
    return response
  }

  // Ads mode
  if (lowerMsg.includes('директ') || lowerMsg.includes('объявлен') || lowerMsg.includes('реклам')) {
    let response = `## Объявления Яндекс.Директ${companyName ? ` — ${companyName}` : ''}\n\n`

    const mainProduct = products?.split(',')[0] || 'услуга'

    response += `### Группа 1: Поиск «${mainProduct} заказать»\n`
    response += `**Заголовок 1:** ${mainProduct} под ключ | ${companyName || 'Проверенные специалисты'}\n`
    response += `**Текст:** Работаем по договору. Опыт 5+ лет. Бесплатная консультация + расчёт стоимости.\n`
    response += `**Быстрые ссылки:** Цены | Портфолио | Отзывы | Акции\n\n`

    response += `**Заголовок 2:** ${mainProduct} от ${companyName || 'профессионалов'} — от 5000₽\n`
    response += `**Текст:** Индивидуальный подход. Гарантия результата. Рассрочка 0%. Звоните!\n\n`

    response += `### Группа 2: Поиск «${niche || 'услуги'} цена»\n`
    response += `**Заголовок:** Сколько стоит ${mainProduct}? Честный прайс\n`
    response += `**Текст:** Прозрачное ценообразование. Нет скрытых платежей. Рассчитаем точную стоимость за 5 минут.\n\n`

    response += `### Ключевые слова\n`
    response += `- ${mainProduct} заказать\n`
    response += `- ${mainProduct} цена\n`
    response += `- ${mainProduct} недорого\n`
    response += `- ${niche || 'специалисты'} с опытом\n`
    response += `- лучшие ${niche || 'услуги'} [город]\n\n`

    response += `### РСЯ (баннерная кампания)\n`
    response += `**Заголовок:** ${companyName || 'Вы'} ещё ищете ${niche || 'подрядчика'}?\n`
    response += `**Текст:** 500+ довольных клиентов. Посмотрите кейсы и отзывы →\n\n`

    if (hasKnowledge) {
      response += `> 💡 **Использованы ваши экспертные материалы.**\n\n`
    }

    response += `Нужна помощь с настройкой кампании или ретаргетингом?`
    return response
  }

  // Audit mode
  if (lowerMsg.includes('аудит') || lowerMsg.includes('анализ') || lowerMsg.includes('эффективност')) {
    let response = `## Аудит маркетинга${companyName ? ` — ${companyName}` : ''}\n\n`

    response += `### Чек-лист быстрой диагностики\n\n`

    response += `**🔴 Критично (исправить за 1-3 дня):**\n`
    response += `1. Проверьте, настроены ли цели в Яндекс.Метрике (не менее 3 микро- и 1 макро-цель)\n`
    response += `2. Есть ли коллтрекинг? Без него вы не знаете, откуда реальные звонки\n`
    response += `3. Минус-слова: добавьте минимум 50 слов (бесплатно, своими руками, скачать, фото)\n\n`

    response += `**🟡 Важно (исправить за неделю):**\n`
    response += `4. Структура кампаний: каждая группа = один продукт/услуга\n`
    response += `5. A/B тесты: минимум 2 объявления на группу\n`
    response += `6. Посадочные страницы: соответствуют ли они запросам?\n\n`

    response += `**🟢 Развитие (месячный план):**\n`
    response += `7. Автостратегии: если бюджет > 100к/мес, подключите ручное управление\n`
    response += `8. Ретаргетинг: настройте на посетителей сайта за 30-90 дней\n`
    response += `9. Расширение семантики: добавьте 20-30% новых ключей ежемесячно\n\n`

    if (company?.campaigns) {
      response += `### Анализ ваших текущих кампаний\n`
      response += `Вы упомянули: "${company.campaigns}"\n`
      response += `На основе этой информации:\n`
      response += `- Если каналы не дают CPL < 1500₽ — пересмотрите ставки или креативы\n`
      response += `- Если конверсия в продажу < 5% — проблема в обработке лидов, не в рекламе\n\n`
    }

    if (hasKnowledge) {
      response += `> 💡 **Использованы ваши экспертные материалы.**\n\n`
    }

    response += `Какой пункт хотите детализировать?`
    return response
  }

  // Report mode
  if (lowerMsg.includes('отчет') || lowerMsg.includes('медиаплан') || lowerMsg.includes('метрик')) {
    let response = `## Медиаплан${companyName ? ` — ${companyName}` : ''}\n\n`

    response += `### Структура бюджета на месяц (пример для ниши "${niche || 'вашей ниши'}")\n\n`

    response += `| Канал | Бюджет | Цель | Ожидаемый CPL | Приоритет |\n`
    response += `|-------|--------|------|---------------|-----------|\n`
    response += `| Яндекс.Директ (поиск) | 35 000₽ | Заявки | 600-900₽ | 🔴 Высокий |\n`
    response += `| Яндекс.Директ (РСЯ) | 15 000₽ | Охват + лиды | 1000-1500₽ | 🟡 Средний |\n`
    response += `| VK / Telegram Ads | 20 000₽ | Лиды | 500-800₽ | 🔴 Высокий |\n`
    response += `| SEO-контент | 10 000₽ | Органический трафик | - | 🟢 Долгосрочный |\n`
    response += `| **Итого** | **80 000₽** | | | |\n\n`

    response += `### KPI для отслеживания (еженедельно)\n`
    response += `1. **ROI** — окупаемость инвестиций (цель: > 300%)\n`
    response += `2. **CPL** — стоимость лида (контрольная точка: если > 1500₽ — аудит)\n`
    response += `3. **CR (заявка → продажа)** — конверсия в продажу (цель: > 10%)\n`
    response += `4. **CAC** — стоимость привлечения клиента = CPL / CR\n`
    response += `5. **Доля целевых лидов** — сколько из заявок реально квалифицированы\n\n`

    response += `### Еженедельный чек-лист\n`
    response += `- [ ] Потрачено / Запланировано по каждому каналу\n`
    response += `- [ ] Получено лидов и CPL по каждому каналу\n`
    response += `- [ ] Какие объявления/креативы работают лучше\n`
    response += `- [ ] Что корректируем на следующую неделю\n\n`

    if (hasKnowledge) {
      response += `> 💡 **Использованы ваши экспертные материалы.**\n\n`
    }

    response += `Хотите детализировать бюджет под конкретный канал или составить прогноз на квартал?`
    return response
  }

  // Default contextual response
  let response = `## Маркетинговая стратегия${companyName ? ` — ${companyName}` : ''}\n\n`

  if (company) {
    response += `### Анализ вашей ситуации\n`
    response += `**Компания:** ${company.name}\n`
    response += `**Ниша:** ${company.niche}\n`
    response += `**Продукт:** ${company.products}\n`
    if (company.goals) response += `**Цели:** ${company.goals}\n`
    response += `\n`

    response += `### Рекомендуемый план действий\n\n`
    response += `**Этап 1. Диагностика (неделя 1)**\n`
    response += `- Проверьте текущие метрики и воронку\n`
    response += `- Аудит существующих кампаний (если есть)\n`
    response += `- Опишите 2-3 сегмента ЦА для ниши "${company.niche}"\n\n`

    response += `**Этап 2. Фундамент (недели 2-3)**\n`
    response += `- Создайте 2-3 сильных оффера под разные сегменты\n`
    response += `- Подготовьте посадочные страницы под каждый оффер\n`
    response += `- Настройте цели в Метрике и коллтрекинг\n\n`

    response += `**Этап 3. Запуск и тестирование (недели 4-6)**\n`
    response += `- Запустите Яндекс.Директ (поиск) с бюджетом 500-1000₽/день\n`
    response += `- A/B тестируйте объявления (минимум 2 варианта)\n`
    response += `- Анализируйте CPL и корректируйте каждые 3 дня\n\n`

    response += `**Этап 4. Масштабирование (месяц 2+)**\n`
    response += `- Добавьте РСЯ при CPL < 1000₽ на поиске\n`
    response += `- Подключите ретаргетинг на посетителей сайта\n`
    response += `- Тестируйте VK/Telegram Ads для расширения охвата\n\n`
  } else {
    response += `Для персонализированных рекомендаций заполните бриф компании в разделе **Профиль**.\n\n`
    response += `Пока могу дать общий план:\n`
    response += `1. Определить целевую аудиторию\n`
    response += `2. Создать сильный оффер\n`
    response += `3. Настроить Яндекс.Директ\n`
    response += `4. Запустить и оптимизировать по метрикам\n\n`
  }

  if (hasKnowledge) {
    response += `> 💡 **В ответе использованы ваши экспертные материалы из базы знаний.**\n\n`
  } else {
    response += `> 💡 Добавьте в «Базу знаний» свои методологии, кейсы и чек-листы — ответы станут экспертными и персонализированными.\n\n`
  }

  response += `Какой этап хотите детализировать?`
  return response
}
