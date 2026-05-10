import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { extractGoogleDocId, fetchGoogleDocText, detectUrlType } from '@/lib/googleDocs'

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

    const { url, isSystem = true } = await request.json()

    if (!url?.trim()) {
      return NextResponse.json({ error: 'Укажите ссылку на Google Doc' }, { status: 400 })
    }

    const docId = extractGoogleDocId(url)
    if (!docId) {
      return NextResponse.json({ 
        error: 'Не удалось извлечь ID документа из ссылки. Поддерживаемые форматы:\n• https://docs.google.com/document/d/ID/edit\n• https://drive.google.com/file/d/ID/view' 
      }, { status: 400 })
    }

    const urlType = detectUrlType(url)
    const docData = await fetchGoogleDocText(docId)
    
    if (!docData) {
      return NextResponse.json({ 
        error: 'Не удалось получить содержимое документа. Возможные причины:\n1. Документ не открыт для доступа по ссылке (Файл → Настройки доступа → Все, у кого есть ссылка)\n2. Это не Google Doc, а PDF или Word-файл\n3. Ссылка устарела или недействительна' 
      }, { status: 400 })
    }

    // If it's not a Google Doc (PDF/Word), we still save it but with a warning note
    if (!docData.isGoogleDoc) {
      return NextResponse.json({ 
        error: docData.text,
        isPdfOrWord: true,
      }, { status: 400 })
    }

    // Check if already imported
    const existing = await prisma.knowledgeFile.findFirst({
      where: { docUrl: url.trim() },
    })

    if (existing) {
      const updated = await prisma.knowledgeFile.update({
        where: { id: existing.id },
        data: {
          content: docData.text.slice(0, 50000),
          filename: docData.title,
          updatedAt: new Date(),
        },
      })
      return NextResponse.json({ ...updated, updated: true })
    }

    const knowledgeFile = await prisma.knowledgeFile.create({
      data: {
        filename: docData.title,
        content: docData.text.slice(0, 50000),
        source: urlType === 'google-drive-file' ? 'google-drive' : 'google-doc',
        docUrl: url.trim(),
        isSystem,
      },
    })

    return NextResponse.json(knowledgeFile)
  } catch (err: any) {
    console.error('Import error:', err)
    return NextResponse.json({ error: 'Ошибка импорта: ' + (err.message || 'Неизвестная ошибка') }, { status: 500 })
  }
}
