import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { extractGoogleDocId, fetchGoogleDocText } from '@/lib/googleDocs'

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

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const source = searchParams.get('source') || undefined

    const where: any = {}
    if (query) {
      where.OR = [
        { filename: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ]
    }
    if (source) {
      where.source = source
    }

    const knowledgeFiles = await prisma.knowledgeFile.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: [{ isSystem: 'desc' }, { updatedAt: 'desc' }],
    })

    return NextResponse.json(knowledgeFiles)
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

    const { filename, content, source = 'manual', docUrl, isSystem = false } = await request.json()

    if (!filename?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Название и содержимое обязательны' }, { status: 400 })
    }

    const knowledgeFile = await prisma.knowledgeFile.create({
      data: {
        filename: filename.trim(),
        content: content.trim(),
        source,
        docUrl: docUrl || null,
        isSystem,
      },
    })

    return NextResponse.json(knowledgeFile)
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const token = request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1]
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Неверный токен' }, { status: 401 })
    }

    const { id, content } = await request.json()
    if (!id || !content?.trim()) {
      return NextResponse.json({ error: 'ID и содержимое обязательны' }, { status: 400 })
    }

    // If it's a Google Doc, try to re-sync
    const existing = await prisma.knowledgeFile.findUnique({ where: { id } })
    if (existing?.source === 'google-doc' && existing.docUrl) {
      const docId = extractGoogleDocId(existing.docUrl)
      if (docId) {
        const docData = await fetchGoogleDocText(docId)
        if (docData) {
          const updated = await prisma.knowledgeFile.update({
            where: { id },
            data: {
              content: docData.text.slice(0, 50000),
              filename: docData.title,
              updatedAt: new Date(),
            },
          })
          return NextResponse.json(updated)
        }
      }
    }

    const updated = await prisma.knowledgeFile.update({
      where: { id },
      data: { content: content.trim(), updatedAt: new Date() },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
