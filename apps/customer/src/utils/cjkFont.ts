/**
 * Lazy CJK font loader for receipt/credit-note PDFs.
 *
 * The receipt PDF (receiptPdfGenerator.ts) bundles only the Sarabun font (Thai/Latin).
 * Chinese/Korean/Japanese glyphs are NOT in Sarabun, so for those languages we fetch a
 * Noto CJK font ON DEMAND (only when a cn/kr/jp receipt is downloaded) from public/fonts/.
 * The fonts are large (~10-18MB) but: (1) th/en users never fetch them, (2) the browser
 * caches them after the first download, and (3) jsPDF subsets the font when embedding, so
 * the OUTPUT PDF stays small (~200-300KB) regardless of the source font size.
 */
import type { PdfLanguage } from './pdfLabels'

// Self-hosted Noto variable fonts (glyf/TrueType outlines — jsPDF-compatible). One per script.
const CJK_FONT_URLS: Partial<Record<PdfLanguage, string>> = {
  cn: '/fonts/noto-sans-sc.ttf', // Simplified Chinese
  kr: '/fonts/noto-sans-kr.ttf', // Korean (Hangul + Hanja)
  jp: '/fonts/noto-sans-jp.ttf', // Japanese (Kana + Kanji)
}

// Cache the fetched+encoded font per URL so repeated downloads reuse it (no re-fetch/re-encode).
const cache = new Map<string, string>()

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000 // 32KB — stay under the String.fromCharCode argument limit
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/**
 * Fetch the CJK font for a receipt language and return it base64-encoded (for jsPDF's
 * addFileToVFS). Returns null for th/en (they use the bundled Sarabun font — no fetch).
 * Throws if the font asset is missing/unreachable so the caller can fall back gracefully.
 */
export async function loadCjkFontBase64(lang: PdfLanguage): Promise<string | null> {
  const url = CJK_FONT_URLS[lang]
  if (!url) return null

  const cached = cache.get(url)
  if (cached) return cached

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load CJK font ${url}: HTTP ${res.status}`)
  }
  const b64 = arrayBufferToBase64(await res.arrayBuffer())
  cache.set(url, b64)
  return b64
}
