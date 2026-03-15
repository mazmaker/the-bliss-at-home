/**
 * Generate URL-friendly slug from English text
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')        // Remove leading/trailing hyphens
}

/**
 * Generate promotion URL with ID + slug for safety
 */
export const generatePromotionUrl = (id: string, nameEn: string): string => {
  const slug = generateSlug(nameEn)
  return `/promotions/${id}-${slug}`
}

/**
 * Parse promotion URL to extract ID and slug
 */
export const parsePromotionUrl = (url: string): { id: string; slug: string } | null => {
  const match = url.match(/\/promotions\/(.+?)(?:-(.+))?$/)
  if (!match) return null

  const [, idSlug] = match
  const parts = idSlug.split('-')
  const id = parts[0]
  const slug = parts.slice(1).join('-')

  return { id, slug }
}

/**
 * Validate if promotion matches the URL slug
 */
export const validatePromotionSlug = (promotion: any, expectedSlug: string): boolean => {
  const currentSlug = generateSlug(promotion.name_en)
  return currentSlug === expectedSlug
}