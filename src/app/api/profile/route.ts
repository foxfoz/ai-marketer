import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const token = request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1]
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Неверный токен' }, { status: 401 })
    }

    const company = await prisma.company.findUnique({
      where: { userId: payload.userId },
    })

    return NextResponse.json(company)
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

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

    const { name, niche, products, goals, audience, campaigns } = await request.json()

    if (!name || !niche || !products) {
      return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 })
    }

    const company = await prisma.company.upsert({
      where: { userId: payload.userId },
      update: { name, niche, products, goals, audience, campaigns },
      create: {
        userId: payload.userId,
        name,
        niche,
        products,
        goals,
        audience,
        campaigns,
      },
    })

    return NextResponse.json(company)
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
