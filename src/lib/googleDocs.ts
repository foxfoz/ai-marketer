/**
 * Extract Google Doc ID from various URL formats:
 * - https://docs.google.com/document/d/DOC_ID/edit
 * - https://docs.google.com/document/d/DOC_ID
 * - https://drive.google.com/file/d/DOC_ID/view
 * - https://drive.google.com/open?id=DOC_ID
 */
export function extractGoogleDocId(url: string): string | null {
  // Format: docs.google.com/document/d/DOC_ID/
  const match1 = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  if (match1) return match1[1]

  // Format: drive.google.com/file/d/DOC_ID/
  const match2 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (match2) return match2[1]

  // Format: open?id=DOC_ID
  const match3 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (match3) return match3[1]

  return null
}

/**
 * Detect URL type
 */
export function detectUrlType(url: string): 'google-doc' | 'google-drive-file' | 'unknown' {
  if (url.includes('docs.google.com/document')) return 'google-doc'
  if (url.includes('drive.google.com/file')) return 'google-drive-file'
  if (url.includes('drive.google.com/open')) return 'google-drive-file'
  return 'unknown'
}

/**
 * Fetch text content from a publicly shared Google Doc
 * Works for both Google Docs links and Drive file links (if the file is a Google Doc)
 */
export async function fetchGoogleDocText(docId: string): Promise<{ title: string; text: string; isGoogleDoc: boolean } | null> {
  try {
    // Strategy 1: Try Google Docs text export (works for native Google Docs)
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`
    const res = await fetch(exportUrl, { redirect: 'follow' })

    if (res.ok) {
      const text = await res.text()
      // If we got HTML instead of text (error page), it's not a Google Doc
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        // Not a Google Doc, might be a PDF or other file
        return await fetchDriveFile(docId)
      }
      return { title: 'Google Doc', text, isGoogleDoc: true }
    }

    // Strategy 2: Try HTML export to get title + content
    const htmlRes = await fetch(`https://docs.google.com/document/d/${docId}/export?format=html`, { redirect: 'follow' })
    if (htmlRes.ok) {
      const html = await htmlRes.text()
      return { title: extractTitleFromHtml(html), text: htmlToText(html), isGoogleDoc: true }
    }

    // Strategy 3: Try as a Drive file (PDF, Word, etc.)
    return await fetchDriveFile(docId)
  } catch {
    return null
  }
}

/**
 * Try to fetch a file from Google Drive
 * For PDFs and other files, we can only get metadata, not text content
 */
async function fetchDriveFile(fileId: string): Promise<{ title: string; text: string; isGoogleDoc: boolean } | null> {
  try {
    // Try to get file info from Google Drive API (no API key needed for basic info of public files)
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType&key=`, {
      redirect: 'follow',
    })

    if (res.ok) {
      const data = await res.json()
      const mimeType = data.mimeType || ''

      // If it's a Google Doc, we should have already fetched it above
      // If it's a PDF, we can't extract text without downloading
      if (mimeType.includes('pdf')) {
        return {
          title: data.name || 'PDF Document',
          text: `[Это PDF-файл: ${data.name}]. PDF-файлы нельзя автоматически импортировать как текст. Рекомендация: откройте PDF, скопируйте текст и вставьте вручную в базу знаний, или конвертируйте в Google Docs (Загрузите в Google Drive → ПКМ → Открыть в Google Docs).`,
          isGoogleDoc: false,
        }
      }

      if (mimeType.includes('msword') || mimeType.includes('wordprocessingml')) {
        return {
          title: data.name || 'Word Document',
          text: `[Это Word-документ: ${data.name}]. Документы Word нельзя автоматически импортировать как текст. Рекомендация: откройте файл в Google Docs (Загрузите в Google Drive → ПКМ → Открыть в Google Docs) и используйте ссылку Google Docs для импорта.`,
          isGoogleDoc: false,
        }
      }
    }

    return null
  } catch {
    return null
  }
}

function extractTitleFromHtml(html: string): string {
  const match = html.match(/<title>(.*?)<\/title>/i)
  return match ? match[1].replace(' - Google Docs', '').trim() : 'Google Doc'
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\s*\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}
