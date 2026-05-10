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
  general: `Ты — старший стратег по digital-маркетингу с 12-летним опытом. Твой стиль: строгий, профессиональный, без воды. Ты работаешь как консультант, которого наняли для глубокого анализа ситуации.`,
  audience: `Ты — эксперт по целевой аудитории и consumer insights. Ты НЕ перечисляешь «возраст 25-45, доход средний». Ты проводишь глубокий анализ: психографика, Jobs-to-be-Done, боли, триггеры, барьеры, каналы коммуникации. Каждый вывод обоснован логикой.`,
  offer: `Ты — стратег по офферам и УТП. Ты НЕ даёшь шаблонные заголовки. Ты анализируешь конкретную нишу, продукт и аудиторию — и на основе этого создаёшь уникальные, продающие формулировки.`,
  ads: `Ты — специалист по Яндекс.Директ. Ты пишешь ГОТОВЫЕ объявления, а не «примеры». Каждое слово обосновано: почему этот заголовок, почему этот призыв, какие ключевые слова и почему.`,
  audit: `Ты — аудитор рекламных кампаний. Ты НЕ перечисляешь «проверьте CTR, проверьте CPC». Ты анализируешь воронку, находишь конкретные «слабые звенья» и даёшь приоритизированный план действий с обоснованием.`,
  report: `Ты — маркетинговый аналитик. Ты строишь медиапланы с конкретными цифрами, прогнозами и обоснованием. Каждая строка бюджета — аргументирована.`,
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
    general: `Проанализируй мою ситуацию глубоко. Не давай поверхностных рекомендаций. Разбери нишу, продукты, цели и предложи конкретную стратегию на 3 месяца с приоритетами и цифрами.`,
    audience: `Проведи глубокий анализ целевой аудитории для моей ниши. НЕ пиши "возраст 25-45, доход средний". Опиши реальные сегменты клиентов с психографикой, Jobs-to-be-Done, болями, барьерами и триггерами покупки. Обоснуй каждый вывод через логику ниши и продукта.`,
    offer: `Создай сильные УТП и офферы для моего бизнеса. НЕ давай шаблонные заголовки типа "лучшие услуги". Проанализируй нишу и продукт — и напиши конкретные, продающие формулировки, которые отличают мой бизнес от конкурентов. Обоснуй, почему каждый оффер работает.`,
    ads: `Напиши готовые объявления для Яндекс.Директ под мой бизнес. НЕ давай общие примеры. Напиши конкретные заголовки и тексты, которые можно сразу копировать. Обоснуй выбор каждого слова через психологию целевой аудитории моей ниши.`,
    audit: `Проведи аудит моего маркетинга глубоко. НЕ перечисляй общие пункты "проверьте CTR, проверьте CPC". Проанализируй типичные проблемы в моей нише и дай приоритизированный план действий с обоснованием, что именно и почему нужно исправлять в первую очередь.`,
    report: `Подготовь детальный медиаплан на месяц. НЕ давай общие цифры. Разбери бюджет по каналам с обоснованием, почему именно такое распределение для моей ниши. Укажи конкретные KPI и прогнозы.`,
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
  // Try Polza.ai first
  const polzaKey = process.env.POLZA_API_KEY
  if (polzaKey) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        { role: 'user', content: userMessage },
      ]

      console.log('[PolzaAI] Sending request...')

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const res = await fetch('https://api.polza.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${polzaKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 4000,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

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

  // Try vsegpt.ru
  const vseGptKey = process.env.VSEGPT_API_KEY
  if (vseGptKey) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        { role: 'user', content: userMessage },
      ]

      console.log('[VseGPT] Sending request...')

      const controller2 = new AbortController()
      const timeoutId2 = setTimeout(() => controller2.abort(), 15000)

      const res = await fetch('https://api.vsegpt.ru/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vseGptKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 4000,
        }),
        signal: controller2.signal,
      })
      clearTimeout(timeoutId2)

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

    const controller3 = new AbortController()
    const timeoutId3 = setTimeout(() => controller3.abort(), 15000)

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 4000,
      }),
      signal: controller3.signal,
    })
    clearTimeout(timeoutId3)

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

  systemPrompt += `\n\n=== ТВОЙ СТИЛЬ РАБОТЫ ===
Ты — строгий профессионал. Без воды, без вступлений типа "Конечно, я помогу". Сразу к делу.
Ты анализируешь глубоко, а не перечисляешь очевидности.
Каждый твой вывод должен быть обоснован: почему именно так, на чём основано.
Используй маркдаун-форматирование: ## для разделов, ** для акцента, списки, таблицы.`

  systemPrompt += `\n\n=== ЧТО ЗНАЧИТ "ГЛУБОКИЙ АНАЛИЗ" ===
ПЛОХО: "Возраст 25-45, доход средний, интересы: здоровье, красота"
ХОРОШО: "Основной сегмент — женщины 30-40 с доходом выше среднего, которые сталкиваются с [конкретная боль ниши]. Их Job-to-be-Done: не просто купить [продукт], а [глубокая потребность]. Барьер покупки — [конкретный страх]. Триггер — [конкретное событие]. Канал коммуникации — [обоснованный выбор через поведение аудитории]."

ПЛОХО: "Напишите хорошие заголовки"
ХОРОШО: "Заголовок А работает, потому что активирует [психологический механизм] у аудитории [сегмент]. Заголовок Б использует социальное доказательство, что критично для ниши [ниша], потому что [обоснование]."

ПЛОХО: "Проверьте CTR и CPC"
ХОРОШО: "CTR 1.2% в вашей ниже ниже нормы (норма 3-5%). Причины: [конкретный анализ]. Первым делом исправьте [конкретное действие], потому что это даст [конкретный эффект]."`

  // Deep company context
  if (company) {
    systemPrompt += `\n\n=== ДАННЫЕ КЛИЕНТА (используй для глубокого анализа) ===\n`
    systemPrompt += `Компания: "${company.name}"\n`
    systemPrompt += `Ниша: ${company.niche}\n`
    systemPrompt += `Продукты/услуги: ${company.products}\n`
    if (company.goals) systemPrompt += `Маркетинговые цели: ${company.goals}\n`
    if (company.audience) systemPrompt += `Что известно о текущей аудитории: ${company.audience}\n`
    if (company.campaigns) systemPrompt += `Текущие кампании и результаты: ${company.campaigns}\n`

    systemPrompt += `\n=== КАК ИСПОЛЬЗОВАТЬ ЭТИ ДАННЫЕ ===\n`
    systemPrompt += `- Не просто упоминай название компании. Анализируй: как ниша "${company.niche}" влияет на поведение клиентов, какие специфические боли есть у покупателей ${company.products}, какие каналы работают именно в этой нише.\n`
    systemPrompt += `- Если аудитория не заполнена — проанализируй нишу и предположи сегменты на основе логики рынка.\n`
    systemPrompt += `- Если цели не заполнены — предположи реалистичные цели на основе ниши и продукта.\n`
  } else {
    systemPrompt += `\n\nВНИМАНИЕ: Данные о компании не заполнены. Сделай общий анализ ниши, но обязательно укажи: "Для персонализированных рекомендаций заполните бриф компании в профиле."`
  }

  // Fetch RELEVANT knowledge base
  let relevantKnowledge: {filename: string; content: string; isSystem: boolean}[] = []
  try {
    relevantKnowledge = await findRelevantKnowledge(message, mode)
  } catch (kbErr) {
    console.error('[AI] Knowledge base search failed:', kbErr)
  }
  if (relevantKnowledge.length > 0) {
    const systemKnowledge = relevantKnowledge.filter(k => k.isSystem)
    const userKnowledge = relevantKnowledge.filter(k => !k.isSystem)

    if (systemKnowledge.length > 0) {
      systemPrompt += `\n\n=== ЭКСПЕРТНЫЕ МАТЕРИАЛЫ (используй как методологию, не как шаблон) ===\n`
      for (const item of systemKnowledge) {
        systemPrompt += `\n--- ${item.filename} ---\n${item.content.slice(0, 4000)}\n`
      }
      systemPrompt += `\nВАЖНО: Это твоя экспертная база. НЕ копируй оттуда текст в ответ. Используй эти знания как методологию для АНАЛИЗА конкретной ситуации клиента. Адаптируй под нишу, продукт и цели компании.\n`
    }
    if (userKnowledge.length > 0) {
      systemPrompt += `\n\n=== ДОПОЛНИТЕЛЬНЫЕ МАТЕРИАЛЫ ===\n`
      for (const item of userKnowledge) {
        systemPrompt += `\n--- ${item.filename} ---\n${item.content.slice(0, 2000)}\n`
      }
    }
  }

  systemPrompt += `\n\n=== ФИНАЛЬНАЯ ИНСТРУКЦИЯ ===\n`
  systemPrompt += `Сейчас напиши ответ на запрос пользователя. Помни:
1. Это должен быть ГЛУБОКИЙ анализ, а не список очевидностей.
2. Каждый вывод обоснован.
3. Всё адаптировано под конкретную нишу и продукт.
4. Нет общих фраз типа "определите целевую аудиторию" — вместо этого конкретный анализ ЦА.
5. Нет шаблонных списков — вместо этого обоснованные рекомендации.`

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

  // Audience mode
  if (lowerMsg.includes('целевую аудитори') || lowerMsg.includes('ца') || lowerMsg.includes('портрет') || lowerMsg.includes('сегмент')) {
    let response = `## Анализ целевой аудитории${companyName ? ` — ${companyName}` : ''}\n\n`

    if (niche) {
      response += `### Почему в ниши "${niche}" нельзя использовать шаблонные портреты\n`
      response += `Шаблон "25-45 лет, средний доход" не работает, потому что не объясняет МОТИВАЦИЮ покупки. В ниши "${niche}" клиенты приходят не за продуктом, а за решением конкретной проблемы.\n\n`
    }

    response += `### Сегмент 1: «Осознанный покупатель»\n`
    response += `- **Кто:** Клиент, который уже понимает свою проблему и ищет надёжного исполнителя\n`
    response += `- **Job-to-be-Done:** Не просто купить "${products?.split(',')[0] || 'услугу'}", а получить результат без рисков\n`
    response += `- **Барьер:** Страх некачественного исполнения, непрозрачность цен\n`
    response += `- **Триггер покупки:** Рекомендация, отзывы, портфолио с кейсами\n`
    response += `- **Где искать:** Поисковая реклама по запросам с интентом сравнения\n`
    response += `- **Сообщение:** Обращение к опыту, гарантиям, прозрачности процесса\n\n`

    response += `### Сегмент 2: «Срочный клиент»\n`
    response += `- **Кто:** Человек с острой, срочной потребностью. Цена вторична, важен результат БЫСТРО\n`
    response += `- **Job-to-be-Done:** Решить проблему в кратчайшие сроки\n`
    response += `- **Барьер:** Боязнь, что не успеют / не смогут\n`
    response += `- **Триггер:** Срочность сама по себе — горит, нужно сегодня\n`
    response += `- **Где искать:** Поиск с уточнениями "срочно", "сегодня", "быстро"\n`
    response += `- **Сообщение:** Акцент на скорости, оперативности, работе без выходных\n\n`

    response += `### Сегмент 3: «Экономный, но не дешёвый»\n`
    response += `- **Кто:** Сравнивает цены, но готов платить за КАЧЕСТВО, а не за дешевизну\n`
    response += `- **Job-to-be-Done:** Получить оптимальное соотношение цена/качество\n`
    response += `- **Барьер:** Скрытые платежи, непонятно что входит в стоимость\n`
    response += `- **Триггер:** Чёткая прозрачная цена, понятный объём работ\n`
    response += `- **Где искать:** Поиск "цена", "сколько стоит", "прайс"\n`
    response += `- **Сообщение:** Честная цена, детальный расчёт, нет скрытых платежей\n\n`

    response += `### Рекомендация\n`
    response += `Для ниши "${niche || 'вашей'}" критично определить, какой сегмент приносит 80% прибыли. Обычно это не "экономный", а "осознанный" или "срочный". Сфокусируйте первую кампанию на одном сегменте — так CPL будет в 2-3 раза ниже, чем если пытаться продать всем сразу.\n\n`

    response += `Хотите, чтобы я прописал конкретные рекламные сообщения под каждый сегмент или построил воронку под главный сегмент?`
    return response
  }

  // Offer mode
  if (lowerMsg.includes('оффер') || lowerMsg.includes('утп') || lowerMsg.includes('предложен') || lowerMsg.includes('заголовок')) {
    let response = `## УТП и офферы${companyName ? ` — ${companyName}` : ''}\n\n`

    if (niche && products) {
      response += `### Почему большинство офферов в нише "${niche}" не работают\n`
      response += `Шаблонные фразы типа "лучшие специалисты" или "качественно и недорого" не продают, потому что:\n`
      response += `1. Это говорят ВСЕ конкуренты — нет дифференциации\n`
      response += `2. Нет конкретики — клиент не понимает, что именно он получит\n`
      response += `3. Нет привязки к боли клиента — а значит, нет мотивации действовать\n\n`
    }

    response += `### Принцип создания УТП для "${niche || 'вашей ниши'}"\n`
    response += `Хорошее УТП = [Конкретный результат] + [Время] + [Гарантия/Снижение риска] + [Уникальность для ниши]\n\n`

    response += `### Варианты УТП (адаптированы под продукт)\n\n`
    response += `**УТП 1 (фокус на результате):**\n`
    response += `> "${products?.split(',')[0] || 'Продукт'} с гарантией результата: если через 30 дней нет изменений — вернём деньги или переделаем бесплатно"\n`
    response += `*Почему работает: снижает барьер страха, конкретизирует результат, даёт временные рамки.*\n\n`

    response += `**УТП 2 (фокус на уникальности процесса):**\n`
    response += `> "Единственные в ${niche || 'нише'}, кто [конкретное отличие процесса]: вместо стандартного подхода мы [уникальная методология]"\n`
    response += `*Почему работает: создаёт дифференциацию, позиционирует как экспертов, а не исполнителей.*\n\n`

    response += `**УТП 3 (фокус на социальном доказательстве):**\n`
    response += `> "500+ клиентов в ${niche || 'нише'} выбрали нас. Средний результат: [конкретная метрика]. Узнайте, как мы это делаем →"\n`
    response += `*Почему работает: снижает сомнения через социальное доказательство, цифры повышают доверие.*\n\n`

    response += `### Готовые заголовки (адаптированы под нишу)\n\n`
    response += `1. **"${products?.split(',')[0] || 'Продукт'}: как [целевой результат] за [время] без [типичная боль клиента]"**\n`
    response += `2. **"Устали от [проблема в нише]? Мы знаем, как это исправить за [время]"**\n`
    response += `3. **"${companyName || 'Компания'}: ${niche || 'профессионалы'}, у которых [конкретный результат] у 9 из 10 клиентов"**\n\n`

    response += `### Что делать дальше\n`
    response += `Не используйте все УТП сразу. Протестируйте УТП 1 на одном канале (например, Яндекс.Директ поиск) с 2-3 вариантами объявлений. Через неделю сравните CTR и CPL — и оставьте победителя.\n\n`

    response += `Какой УТП хотите протестировать в первую очередь? Или нужна помощь с посадочной страницей под выбранный оффер?`
    return response
  }

  // Ads mode
  if (lowerMsg.includes('директ') || lowerMsg.includes('объявлен') || lowerMsg.includes('реклам')) {
    let response = `## Объявления Яндекс.Директ${companyName ? ` — ${companyName}` : ''}\n\n`

    const mainProduct = products?.split(',')[0] || 'услуга'

    response += `### Почему в ниши "${niche || 'вашей'}" важен не текст, а интент\n`
    response += `В Яндекс.Директе клиент уже ищет решение. Ваша задача — показать, что вы понимаете его проблему лучше конкурентов. Не пишите "мы лучшие". Пишите "мы решаем именно вашу проблему таким способом".\n\n`

    response += `### Группа 1: Высокий интент «${mainProduct} заказать»\n`
    response += `Эти люди готовы покупать СЕЙЧАС. Задача — снизить сомнения и ускорить решение.\n\n`
    response += `**Объявление А (фокус на доверии):**\n`
    response += `- **Заголовок:** ${mainProduct} от ${companyName || 'проверенных специалистов'} | Договор + гарантия\n`
    response += `- **Текст:** Опыт 5+ лет в ${niche || 'нише'}. Работаем официально по договору. Бесплатная консультация перед стартом.\n`
    response += `- **Быстрые ссылки:** Цены | Кейсы | Отзывы | Как мы работаем\n`
    response += `- **Почему:** Клиент с высоким интентом боится обмана. Договор и гарантия снижают барьер.\n\n`

    response += `**Объявление Б (фокус на скорости):**\n`
    response += `- **Заголовок:** ${mainProduct} за 24-48 часов | ${companyName || 'Срочный старт'}\n`
    response += `- **Текст:** Нет времени ждать? Стартуем в день обращения. Первый результат — через 24 часа.\n`
    response += `- **Почему:** Часть клиентов с высоким интентом имеет срочность. Это отсечёт конкурентов без такого УТП.\n\n`

    response += `### Группа 2: Средний интент «${mainProduct} цена»\n`
    response += `Эти люди сравнивают. Задача — показать прозрачность и ценность, а не быть дешевле всех.\n\n`
    response += `**Объявление:**\n`
    response += `- **Заголовок:** Сколько стоит ${mainProduct}? Честный калькулятор\n`
    response += `- **Текст:** Рассчитаем точную стоимость за 5 минут. Нет скрытых платежей — всё прозрачно с первого сообщения.\n`
    response += `- **Почему:** «Цена» не значит «дешево». Клиент хочет понимать, за что платит. Прозрачность = доверие.\n\n`

    response += `### РСЯ (баннерная кампания)\n`
    response += `В РСЯ клиент НЕ ищет вас. Задача — прервать просмотр и вызвать интерес.\n\n`
    response += `**Заголовок:** Всё ещё ищете ${niche || 'подрядчика'}?\n`
    response += `**Текст:** 500+ довольных клиентов. Посмотрите, как мы решаем [типичную боль] за [время] →\n`
    response += `**Почему:** Провокационный вопрос привлекает внимание. Социальное доказательство снижает сомнения. Стрелка → повышает CTR.\n\n`

    response += `### Ключевые слова (семантическое ядро)\n`
    response += `- Транзакционные: ${mainProduct} заказать, ${mainProduct} под ключ, ${mainProduct} цена\n`
    response += `- Информационные: как выбрать ${mainProduct}, ${mainProduct} отзывы\n`
    response += `- Гео: ${mainProduct} [город], ${niche || 'услуги'} [город]\n\n`

    response += `### Что делать дальше\n`
    response += `1. Запустите группу 1 (высокий интент) с бюджетом 70%\n`
    response += `2. Добавьте минус-слова: бесплатно, дешево, своими руками, фото\n`
    response += `3. Через 3 дня сравните CTR объявлений А и Б — отключите проигравшего\n`
    response += `4. Через неделю добавьте РСЯ, если CPL на поиске < 1000₽\n\n`

    response += `Нужна помощь с настройкой кампании или семантическим ядром?`
    return response
  }

  // Audit mode
  if (lowerMsg.includes('аудит') || lowerMsg.includes('анализ') || lowerMsg.includes('эффективност')) {
    let response = `## Аудит маркетинга${companyName ? ` — ${companyName}` : ''}\n\n`

    response += `### Почему типовые аудиты бесполезны\n`
    response += `Перечисление "проверьте CTR, проверьте CPC, добавьте минус-слова" — это не аудит. Это список действий без приоритетов и без понимания, что именно даст эффект. Настоящий аудит — это диагностика воронки и поиск точек максимального роста.\n\n`

    response += `### Диагностика воронки (типичная для ниши "${niche || 'вашей'}")\n\n`

    response += `**Этап 1: Показы → Клики (CTR)**\n`
    response += `- Норма для поиска: 5-10%. Норма для РСЯ: 1-2%\n`
    response += `- Если CTR ниже: проблема в заголовках/текстах или нецелевых показах\n`
    response += `- **Quick win:** A/B тест 2+ объявлений на каждую группу. Через 3 дня отключить проигравшего.\n\n`

    response += `**Этап 2: Клики → Заявки (CR сайта)**\n`
    response += `- Норма: 3-8% для B2C, 1-3% для B2B\n`
    response += `- Если CR низкий: проблема НЕ в рекламе, а в посадочной странице\n`
    response += `- **Quick win:** Убедитесь, что страница отвечает на запрос объявления. Заголовок страницы = заголовок объявления.\n\n`

    response += `**Этап 3: Заявки → Продажи (CR менеджеров)**\n`
    response += `- Норма: 10-20% для B2C, 5-10% для B2B\n`
    response += `- Если CR низкий: проблема в обработке лидов, скорости ответа, скриптах\n`
    response += `- **Quick win:** Время ответа < 5 минут = +80% к конверсии. Автоответчик в мессенджер.\n\n`

    response += `### Приоритетный план (делайте в этом порядке)\n\n`
    response += `**Неделя 1 (быстрые победы):**\n`
    response += `1. Добавить 50 минус-слов (утекает 20-30% бюджета впустую)\n`
    response += `2. Настроить цели в Метрике (не менее 3 микро-целей)\n`
    response += `3. Подключить коллтрекинг (без него вы слепы к реальным звонкам)\n\n`

    response += `**Неделя 2 (структура):**\n`
    response += `4. Разбить кампании по типам запросов (инфо / транзакционные / бренд)\n`
    response += `5. Написать 3 варианта объявлений на каждую группу\n`
    response += `6. Создать посадочную под ключевой запрос (не главную страницу!)\n\n`

    response += `**Месяц 2 (масштабирование):**\n`
    response += `7. Оптимизация ставок по конверсиям (не по кликам)\n`
    response += `8. Ретаргетинг на посетителей без заявки (уже тёплые, дешевле в 3-5 раз)\n`
    response += `9. Масштабирование работающих кампаний на +30% бюджета\n\n`

    if (company?.campaigns) {
      response += `### Анализ ваших текущих кампаний\n`
      response += `Вы указали: "${company.campaigns}"\n`
      response += `На основе этого: если текущие каналы не дают CPL < 1500₽, проблема либо в креативах (CTR < 3%), либо в посадочной (CR < 2%). Диагностируйте по воронке, а не «по ощущениям».\n\n`
    }

    response += `Какой этап воронки хотите детализировать? Или нужен чек-лист аудита в формате Excel?`
    return response
  }

  // Report mode
  if (lowerMsg.includes('отчет') || lowerMsg.includes('медиаплан') || lowerMsg.includes('метрик')) {
    let response = `## Медиаплан${companyName ? ` — ${companyName}` : ''}\n\n`

    response += `### Принцип распределения бюджета для ниши "${niche || 'вашей'}"\n`
    response += `Не существует "универсального" медиаплана. Бюджет зависит от маржинальности, цикла сделки и конкуренции. Вот логика для типичной ситуации:\n\n`

    response += `### Медиаплан на месяц (бюджет 80 000₽)\n\n`

    response += `| Канал | Бюджет | % | Цель | Ожидаемый CPL | Приоритет | Обоснование |\n`
    response += `|-------|--------|---|------|---------------|-----------|-------------|\n`
    response += `| Яндекс.Директ (поиск) | 35 000₽ | 44% | Заявки | 600-900₽ | 🔴 Высокий | Высокий интент = высокая конверсия. Основной драйвер продаж. |\n`
    response += `| VK / Telegram Ads | 20 000₽ | 25% | Лиды | 500-800₽ | 🔴 Высокий | Для ниши "${niche || 'B2C'}" соцсети часто дают CPL ниже, чем поиск. |\n`
    response += `| Яндекс.Директ (РСЯ) | 15 000₽ | 19% | Охват + лиды | 1000-1500₽ | 🟡 Средний | Работает как дополнение к поиску, НЕ как основной канал. |\n`
    response += `| SEO-контент | 10 000₽ | 12% | Органика | - | 🟢 Долгосрочный | Инвестиция в 3-6 месяцев. Даёт лиды по себестоимости ≈0. |\n\n`

    response += `### Почему именно такое распределение\n`
    response += `- **Поиск 44%:** Люди уже ищут решение. Это «низко висящие плоды» — собирайте их в первую очередь.\n`
    response += `- **Соцсети 25%:** В "${niche || 'вашей нише'}" аудитория активна в VK/Telegram. Таргет дешевле поиска на 30-50%.\n`
    response += `- **РСЯ 19%:** Не основной канал. Используйте для ретаргетинга и охвата похожей аудитории.\n`
    response += `- **SEO 12%:** Минимальный бюджет на контент. Через 3-6 месяцев начнёт давать бесплатный трафик.\n\n`

    response += `### KPI и контрольные точки (еженедельно)\n\n`
    response += `1. **ROI** — окупаемость инвестиций. Цель: > 300% (каждый вложенный рубль приносит 3₽+)\n`
    response += `2. **CPL** — стоимость лида. Контрольная точка: если > 1500₽ — аудит креативов или посадочной\n`
    response += `3. **CR (заявка → продажа)** — конверсия менеджеров. Цель: > 10% B2C, > 5% B2B\n`
    response += `4. **CAC** = CPL / CR. Должен быть < 30% от среднего чека\n`
    response += `5. **Доля целевых лидов** — сколько заявок реально квалифицированы. Цель: > 60%\n\n`

    response += `### Еженедельный чек-лист\n`
    response += `- [ ] Потрачено / Запланировано по каждому каналу\n`
    response += `- [ ] Получено лидов и CPL по каждому каналу\n`
    response += `- [ ] Какие креативы/объявления работают лучше (CTR, CPL)\n`
    response += `- [ ] Что корректируем на следующую неделю\n\n`

    response += `Хотите детализировать бюджет под ваш реальный бюджет (укажите сумму)? Или составить прогноз на квартал?`
    return response
  }

  // Default contextual response
  let response = `## Маркетинговая стратегия${companyName ? ` — ${companyName}` : ''}\n\n`

  if (company) {
    response += `### Анализ ситуации\n`
    response += `**Компания:** ${company.name}\n`
    response += `**Ниша:** ${company.niche}\n`
    response += `**Продукт:** ${company.products}\n`
    if (company.goals) response += `**Цели:** ${company.goals}\n`
    response += `\n`

    response += `### Почему нельзя действовать «по шаблону» в ниши "${company.niche}"\n`
    response += `Каждая ниша имеет свою специфику: цикл сделки, боли клиентов, каналы коммуникации, сезонность. Шаблонный план "сначала Директ, потом VK" часто приводит к сливу бюджета. Нужно строить стратегию через анализ конкретной ситуации.\n\n`

    response += `### Рекомендуемый план (с приоритетами и обоснованием)\n\n`

    response += `**Этап 1. Диагностика (неделя 1)**\n`
    response += `Перед тем как тратить деньги на рекламу, нужно понять:\n`
    response += `- Какая воронка продаж сейчас? Где теряются клиенты?\n`
    response += `- Кто реальные конкуренты и чем они сильны?\n`
    response += `- Какой сегмент ЦА приносит 80% прибыли?\n`
    response += `*Зачем: без диагностики вы будете улучшать не то, что нужно.*\n\n`

    response += `**Этап 2. Фундамент (недели 2-3)**\n`
    response += `- Создать 2-3 сильных оффера под разные сегменты ЦА\n`
    response += `- Подготовить посадочные страницы под каждый оффер (не одну универсальную!)\n`
    response += `- Настроить цели в Метрике и коллтрекинг\n`
    response += `*Зачем: реклама без конверсии на сайте = слив денег. Сначала подготовьте «приёмник».*\n\n`

    response += `**Этап 3. Тестирование (недели 4-6)**\n`
    response += `- Запустить Яндекс.Директ (поиск) с бюджетом 500-1000₽/день\n`
    response += `- A/B тестировать объявления (минимум 2 варианта)\n`
    response += `- Анализировать CPL каждые 3 дня и корректировать\n`
    response += `*Зачем: на старте важно найти рабочую связку "объявление → оффер → страница", а не сразу масштабировать.*\n\n`

    response += `**Этап 4. Масштабирование (месяц 2+)**\n`
    response += `- Если CPL на поиске стабильно < 1000₽ — добавить РСЯ\n`
    response += `- Запустить ретаргетинг на посетителей без заявки (они тёплые, дешевле в 3-5 раз)\n`
    response += `- Тестировать VK/Telegram Ads для расширения охвата\n`
    response += `*Зачем: масштабируйте только то, что уже работает. Не разгоняйте слив бюджета.*\n\n`

    response += `### Предупреждение\n`
    response += `Главная ошибка в маркетинге малого бизнеса — запускать рекламу без подготовки. Если у вас нет чёткого оффера, конверсионной страницы и системы обработки лидов, любой бюджет уйдёт впустую. Лучше потратить 2 недели на подготовку, чем 2 месяца на «починку» работающей рекламы.\n\n`
  } else {
    response += `Для персонализированных рекомендаций заполните бриф компании в разделе **Профиль**.\n\n`
    response += `Пока общий план:\n`
    response += `1. Диагностика ситуации и воронки\n`
    response += `2. Создание офферов и посадочных страниц\n`
    response += `3. Тестовый запуск рекламы с A/B тестами\n`
    response += `4. Масштабирование работающих связок\n\n`
  }

  response += `Какой этап хотите детализировать?`
  return response
}
