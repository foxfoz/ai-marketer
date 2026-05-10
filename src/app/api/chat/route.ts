import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generateAIResponse, AIMode } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    console.log('[Chat API] Request started')

    const token = request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1]
    if (!token) {
      console.log('[Chat API] No token')
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      console.log('[Chat API] Invalid token')
      return NextResponse.json({ error: 'Неверный токен' }, { status: 401 })
    }

    const { message, conversationId, mode = 'general' } = await request.json()
    console.log('[Chat API] Message:', message?.slice(0, 50), 'Mode:', mode)

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 })
    }

    console.log('[Chat API] Fetching user...')
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { company: true },
    })

    if (!user) {
      console.log('[Chat API] User not found')
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }
    console.log('[Chat API] User found:', user.email, 'Company:', user.company?.name || 'none')

    let conversation = conversationId
      ? await prisma.conversation.findFirst({
          where: { id: conversationId, userId: user.id },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        })
      : null

    if (!conversation) {
      console.log('[Chat API] Creating new conversation...')
      conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          mode: mode as string,
        },
        include: { messages: true },
      })
    }
    console.log('[Chat API] Conversation ID:', conversation.id)

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    })

    const history = conversation.messages.map(m => ({ role: m.role, content: m.content }))
    console.log('[Chat API] History length:', history.length)
    console.log('[Chat API] Calling generateAIResponse...')

    let response: string
    try {
      response = await generateAIResponse(message, {
        company: user.company,
        mode: mode as AIMode,
        history,
      })
      console.log('[Chat API] AI response length:', response?.length || 0)
    } catch (aiError: any) {
      console.error('[Chat API] AI generation failed:', aiError?.message || aiError)
      // Ultimate fallback
      response = `Извините, произошла техническая ошибка при генерации ответа.\n\nВозможные причины:\n1. Проблема с API нейросети (проверьте баланс Polza.ai / vsegpt.ru / OpenAI)\n2. Временная ошибка сервера\n\nПопробуйте обновить страницу или повторить запрос через минуту.`
    }

    if (!response || response.trim().length === 0) {
      console.log('[Chat API] Empty response from AI, using fallback')
      response = `Я получил ваш запрос, но не смог сформировать ответ. Попробуйте переформулировать вопрос или проверьте настройки API в переменных окружения.`
    }

    // Save assistant message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: response,
      },
    })

    // Update conversation title if it's the first message
    if (conversation.messages.length === 0) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: message.slice(0, 50) + (message.length > 50 ? '...' : '') },
      })
    }

    console.log('[Chat API] Success, returning response')
    return NextResponse.json({ response, conversationId: conversation.id })
  } catch (error: any) {
    console.error('[Chat API] CRITICAL ERROR:', error?.message || error)
    console.error('[Chat API] Stack:', error?.stack)
    return NextResponse.json({ error: 'Ошибка сервера: ' + (error?.message || 'Неизвестная ошибка') }, { status: 500 })
  }
}
