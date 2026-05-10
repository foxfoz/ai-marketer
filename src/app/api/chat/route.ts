import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generateAIResponse, AIMode } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    const token = request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1]
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Неверный токен' }, { status: 401 })
    }

    const { message, conversationId, mode = 'general' } = await request.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { company: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    let conversation = conversationId
      ? await prisma.conversation.findFirst({
          where: { id: conversationId, userId: user.id },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        })
      : null

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          mode: mode as string,
        },
        include: { messages: true },
      })
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    })

    const history = conversation.messages.map(m => ({ role: m.role, content: m.content }))
    const response = await generateAIResponse(message, {
      company: user.company,
      mode: mode as AIMode,
      history,
    })

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

    return NextResponse.json({ response, conversationId: conversation.id })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
