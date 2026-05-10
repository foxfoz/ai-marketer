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
  general: 'Ты — профессиональный ИИ-маркетолог с глубокой экспертизой в digital-маркетинге, аналитике и стратегии. Давай конкретные, основанные на данных рекомендации.',
  audience: 'Ты — эксперт по целевой аудитории с 10-летним опытом. Помогаешь предпринимателям детально понимать своих клиентов. Используй методологии сегментации, психографику и поведенческие триггеры.',
  offer: 'Ты — копирайтер и стратег по офферам, который создаёт УТП для крупных брендов. Знаешь формулы продающих текстов, психологию принятия решений и техники повышения конверсии.',
  ads: 'Ты — сертифицированный специалист по Яндекс.Директ и контекстной рекламе. Знаешь все типы кампаний, стратегии назначения ставок, работу с семантикой и оптимизацию под KPI.',
  audit: 'Ты — аудитор рекламных кампаний с опытом работы с бюджетами от 1 млн ₽/мес. Анализируешь воронки, метрики, структуру аккаунтов и даёшь конкретный план действий.',
  report: 'Ты — маркетинговый аналитик. Составляешь медиапланы, отчёты по эффективности, прогнозируешь ROI. Работаешь с данными, строишь гипотезы и даёшь числовые обоснования.',
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
    general: 'Привет! Чем можешь помочь с маркетингом?',
    audience: 'Составь портрет целевой аудитории для моего бизнеса',
    offer: 'Создай УТП и сильный оффер для моего продукта',
    ads: 'Напиши объявления для Яндекс.Директ',
    audit: 'Проанализируй мою рекламную кампанию и дай рекомендации',
    report: 'Подготовь медиаплан на месяц',
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
  // Marketing-related keywords
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
    // No specific keywords found, return general knowledge
    const files = await prisma.knowledgeFile.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    return files.map(f => ({ filename: f.filename, content: f.content, isSystem: f.isSystem }))
  }

  // Search for files matching any keyword
  const results: {filename: string; content: string; score: number; isSystem: boolean}[] = []
  const allFiles = await prisma.knowledgeFile.findMany({
    orderBy: { createdAt: 'desc' },
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

  // Sort by relevance score and take top results
  results.sort((a, b) => b.score - a.score)
  return results.slice(0, 5).map(r => ({ filename: r.filename, content: r.content, isSystem: r.isSystem }))
}

// ============ OPENAI INTEGRATION ============

async function callOpenAI(systemPrompt: string, userMessage: string, history: {role: string; content: string}[]): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: userMessage },
    ]

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
        max_tokens: 2000,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('OpenAI error:', err)
      return null
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content || null
  } catch (err) {
    console.error('OpenAI call failed:', err)
    return null
  }
}

// ============ MAIN RESPONSE GENERATOR ============

export async function generateAIResponse(message: string, context: AIContext): Promise<string> {
  const { company, mode, history } = context

  // Build system prompt
  let systemPrompt = modePrompts[mode] || modePrompts.general
  systemPrompt += '\n\nОтвечай на русском языке. Будь конкретным, избегай общих фраз. Используй структурированный формат с маркдауном. Приводи примеры и цифры где уместно.'

  if (company) {
    systemPrompt += `\n\nДанные о компании:\n`
    systemPrompt += `Название: ${company.name}\n`
    systemPrompt += `Ниша: ${company.niche}\n`
    systemPrompt += `Продукты/услуги: ${company.products}\n`
    if (company.goals) systemPrompt += `Цели: ${company.goals}\n`
    if (company.audience) systemPrompt += `Текущая ЦА: ${company.audience}\n`
    if (company.campaigns) systemPrompt += `Кампании: ${company.campaigns}\n`
  }

  // Fetch RELEVANT knowledge base (system knowledge has priority)
  const relevantKnowledge = await findRelevantKnowledge(message, mode)
  if (relevantKnowledge.length > 0) {
    const systemKnowledge = relevantKnowledge.filter(k => k.isSystem)
    const userKnowledge = relevantKnowledge.filter(k => !k.isSystem)

    if (systemKnowledge.length > 0) {
      systemPrompt += '\n\n=== СИСТЕМНЫЕ ЗНАНИЯ (используй в первую очередь) ===\n'
      for (const item of systemKnowledge) {
        systemPrompt += `\n[${item.filename}]:\n${item.content.slice(0, 4000)}\n`
      }
    }
    if (userKnowledge.length > 0) {
      systemPrompt += '\n\n=== ДОПОЛНИТЕЛЬНЫЕ МАТЕРИАЛЫ ===\n'
      for (const item of userKnowledge) {
        systemPrompt += `\n[${item.filename}]:\n${item.content.slice(0, 2000)}\n`
      }
    }
  }

  // Try OpenAI first
  const openaiResponse = await callOpenAI(systemPrompt, message, history)
  if (openaiResponse) {
    return openaiResponse
  }

  // Fallback to local response
  return generateLocalResponse(message, systemPrompt, history)
}

// ============ LOCAL FALLBACK RESPONSES ============

function generateLocalResponse(message: string, systemPrompt: string, history: { role: string; content: string }[]): string {
  const lowerMsg = message.toLowerCase()

  // Extract company info from system prompt for contextual responses
  const companyName = extractFromPrompt(systemPrompt, 'Название:')
  const niche = extractFromPrompt(systemPrompt, 'Ниша:')
  const products = extractFromPrompt(systemPrompt, 'Продукты/услуги:')

  // Extract knowledge from system prompt
  const hasKnowledge = systemPrompt.includes('Используй следующие знания')

  // Audience mode responses
  if (lowerMsg.includes('целевую аудитори') || lowerMsg.includes('ца') || lowerMsg.includes('портрет')) {
    return `## Портрет целевой аудитории для ${companyName || 'вашего бизнеса'}

### Основной сегмент
- **Возраст:** 25-45 лет
- **Пол:** Женщины/Мужчины (зависит от ниши ${niche || ''})
- **Доход:** Средний и выше среднего
- **Локация:** Город с населением 500к+

### Боли и проблемы
1. Не хватает времени на ${products || 'решение задач'}
2. Сложно найти качественное решение в ${niche || 'нише'}
3. Боятся переплатить или получить низкое качество

### Триггеры покупки
- Срочная потребность (боль стала критичной)
- Рекомендация от знакомых
- Видел результат у конкурентов/друзей

### Где искать клиентов
- Яндекс.Директ по ключевым запросам
- ВКонтакте / Telegram (таргетированная реклама)
- Партнерские программы и коллаборации

${hasKnowledge ? '> 💡 **Использованы знания из вашей базы.** Добавьте больше материалов о ЦА в разделе «База знаний» — ответы станут точнее.' : '> 💡 Добавьте в «Базу знаний» методологии сегментации и примеры портретов ЦА — ИИ будет использовать их в ответах.'}

Хотите, чтобы я детальнее расписал какой-то сегмент или подготовил рекламные сообщения под эту ЦА?`
  }

  // Offer mode responses
  if (lowerMsg.includes('оффер') || lowerMsg.includes('утп') || lowerMsg.includes('предложен')) {
    return `## УТП и офферы для ${companyName || 'вашего бизнеса'}

### Уникальное торговое предложение (УТП)
> Мы ${niche ? `в ниши "${niche}"` : 'в вашей нише'} — единственные, кто [конкретное отличие], благодаря чему вы получите [конкретный результат] уже за [время].

### 5 вариантов заголовков
1. **"${products || 'Наш продукт'}: результат за 7 дней или вернем деньги"**
2. **"Устали от [боль клиента]? Мы знаем решение"**
3. **"${companyName || 'Компания'}: ${niche || 'профессионалы'} с опытом 10+ лет"**
4. **"Скидка 30% первым 10 клиентам этого месяца"**
5. **"Как сэкономить [сумма] на ${products || 'услугах'} без потери качества"**

### Структура оффера
- **Заголовок:** привлекает внимание
- **Подзаголовок:** раскрывает суть
- **Выгоды:** 3-5 конкретных плюсов
- **Гарантия:** снижает риск
- **Призыв к действию:** что делать прямо сейчас

${hasKnowledge ? '> 💡 **Использованы знания из вашей базы.** Добавьте формулы УТП и примеры успешных офферов в «Базу знаний».' : '> 💡 Добавьте в «Базу знаний» формулы продающих текстов и примеры УТП — ответы станут профессиональнее.'}

Какой вариант оффера хотите доработать?`
  }

  // Ads mode responses
  if (lowerMsg.includes('директ') || lowerMsg.includes('объявлен') || lowerMsg.includes('реклам')) {
    return `## Объявления для Яндекс.Директ — ${companyName || 'ваш бизнес'}

### Вариант 1 (Поиск)
**Заголовок:** ${products || 'Услуга'} от профессионалов | ${companyName || 'Компания'}
**Текст:** Опыт 10+ лет. Работаем по договору. Бесплатная консультация. Звоните!
**Быстрые ссылки:** Цены | Отзывы | Портфолио | Акции
**Уточнение:** Скидка 20% новым клиентам

### Вариант 2 (Поиск)
**Заголовок:** ${products || 'Продукт'} под ключ — от 5000₽
**Текст:** Индивидуальный подход. Гарантия качества. Рассрочка 0%. Рассчитаем стоимость.

### Ключевые слова (пример)
- ${products?.split(',')[0] || 'услуга'} заказать
- ${niche || 'ниша'} цена
- ${products?.split(',')[0] || 'услуга'} недорого
- лучшие ${niche || 'специалисты'} в городе

### Рекомендации по настройке
- **Стратегия:** Максимум конверсий (начало) → Ручное управление (оптимизация)
- **Ретаргетинг:** Настройте на посетителей сайта за 30 дней
- **UTM-метки:** Обязательно для аналитики

${hasKnowledge ? '> 💡 **Использованы знания из вашей базы.** Добавьте шаблоны объявлений и стратегии ставок в «Базу знаний».' : '> 💡 Добавьте в «Базу знаний» шаблоны объявлений, стратегии назначения ставок и чек-листы настройки — ответы станут детальнее.'}

Нужна помощь с настройкой РКЯ или баннерной кампанией?`
  }

  // Audit mode responses
  if (lowerMsg.includes('аудит') || lowerMsg.includes('анализ') || lowerMsg.includes('эффективност')) {
    return `## Аудит рекламной кампании

### Текущее состояние (по данным)
- **CTR:** _требуется загрузка данных_
- **CPC:** _требуется загрузка данных_
- **Конверсия:** _требуется загрузка данных_

### Частые проблемы в ${niche || 'нише'}
1. ❌ Слишком широкие ключевые слова → много нецелевых кликов
2. ❌ Нет минус-слов → бюджет утекает
3. ❌ Слабые объявления → низкий CTR
4. ❌ Плохая посадочная страница → низкая конверсия

### Рекомендации по оптимизации
**Немедленно:**
- Добавьте 20-30 минус-слов (бесплатно, дешево, скачать)
- Разбейте кампании по типам запросов (инфо, транзакционные, бренд)
- Напишите 3+ варианта объявления на каждую группу

**В течение недели:**
- Настройте цели в Метрике
- Подключите коллтрекинг
- Создайте посадочную страницу под ключевые запросы

**Месячный план:**
- А/Б тестирование объявлений
- Оптимизация ставок по конверсиям
- Масштабирование работающих кампаний

${hasKnowledge ? '> 💡 **Использованы знания из вашей базы.** Добавьте чек-листы аудита и формулы расчёта метрик в «Базу знаний».' : '> 💡 Добавьте в «Базу знаний» чек-листы аудита, формулы расчёта CTR/CPC/CPL и примеры оптимизации — ответы станут экспертными.'}

Хотите, чтобы я подготовил чек-лист аудита или помог с конкретной настройкой?`
  }

  // Report mode responses
  if (lowerMsg.includes('отчет') || lowerMsg.includes('медиаплан') || lowerMsg.includes('метрик')) {
    return `## Маркетинговый отчет / Медиаплан

### Медиаплан на месяц — ${companyName || 'ваш бизнес'}

| Канал | Бюджет | Цель | KPI |
|-------|--------|------|-----|
| Яндекс.Директ (поиск) | 30 000₽ | Заявки | CPL < 800₽ |
| Яндекс.Директ (РСЯ) | 15 000₽ | Охват | CTR > 1% |
| VK Реклама | 20 000₽ | Лиды | CPL < 600₽ |
| SEO-контент | 10 000₽ | Трафик | +500 посетителей |
| **Итого** | **75 000₽** | | |

### Ключевые метрики для отслеживания
1. **ROI** — окупаемость инвестиций (цель: > 300%)
2. **CPL** — стоимость лида (цель: зависит от маржинальности)
3. **CR** — конверсия в продажу (цель: > 10%)
4. **LTV** — пожизненная ценность клиента
5. **CAC** — стоимость привлечения клиента

### Структура еженедельного отчета
- Потрачено / Запланировано
- Получено лидов / Целевых лидов
- Средняя стоимость клика / лида
- Что работает / что нет
- План корректировок на следующую неделю

${hasKnowledge ? '> 💡 **Использованы знания из вашей базы.** Добавьте шаблоны медиапланов и методологии расчёта метрик в «Базу знаний».' : '> 💡 Добавьте в «Базу знаний» шаблоны медиапланов, формулы ROI/CAC/LTV и примеры отчётов — ответы станут точнее.'}

Хотите скачать шаблон медиаплана в Excel или настроить автоматическую аналитику?`
  }

  // Default contextual response
  return `## Анализ запроса

На основе данных о вашей компании ${companyName ? `**"${companyName}"**` : ''}${niche ? ` в нише **${niche}**` : ''}:

### Рекомендации
1. **Сосредоточьтесь на конкретике.** Вместо "лучшие услуги" используйте конкретные цифры и результаты.
2. **Сегментируйте аудиторию.** Не пытайтесь продать всем — выделите 2-3 ключевых сегмента.
3. **Тестируйте гипотезы.** Запускайте минимальные версии кампаний для проверки.

### Следующие шаги
- Если нужна **целевая аудитория** → напишите "Составить ЦА"
- Если нужен **оффер** → напишите "Создать оффер"
- Если нужны **объявления** → напишите "Сделать объявления для Директа"
- Если нужен **аудит** → загрузите данные кампании и напишите "Проанализировать"

${hasKnowledge ? '> 💡 **Использованы знания из вашей базы.** Чем больше материалов в «Базе знаний» — тем точнее и экспертнее ответы.' : '> 💡 Добавьте в «Базу знаний» свои методологии, кейсы, метрики и примеры — ИИ начнёт использовать их в ответах вместо шаблонов.'}

Чем конкретно могу помочь дальше?`
}

function extractFromPrompt(prompt: string, key: string): string {
  const match = prompt.match(new RegExp(`${key}\\s*(.+?)(?:\\n|$)`))
  return match ? match[1].trim() : ''
}
