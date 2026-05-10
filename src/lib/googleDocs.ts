/**
 * Extract Google Doc ID from various URL formats:
 * - https://docs.google.com/document/d/DOC_ID/edit
 * - https://docs.google.com/document/d/DOC_ID
 * - https://docs.google.com/document/d/DOC_ID/view
 * - https://drive.google.com/open?id=DOC_ID
 */
export function extractGoogleDocId(url: string): string | null {
  // Format: /document/d/DOC_ID/
  const match1 = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  if (match1) return match1[1]

  // Format: open?id=DOC_ID
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (match2) return match2[1]

  return null
}

/**
 * Fetch text content from a publicly shared Google Doc
 */
export async function fetchGoogleDocText(docId: string): Promise<{ title: string; text: string } | null> {
  try {
    // Try to fetch as plain text export
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`
    const res = await fetch(exportUrl, { redirect: 'follow' })

    if (!res.ok) {
      // If text export fails, try HTML export
      const htmlRes = await fetch(`https://docs.google.com/document/d/${docId}/export?format=html`, { redirect: 'follow' })
      if (!htmlRes.ok) return null
      const html = await htmlRes.text()
      return { title: extractTitleFromHtml(html), text: htmlToText(html) }
    }

    const text = await res.text()
    return { title: 'Google Doc', text }
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
