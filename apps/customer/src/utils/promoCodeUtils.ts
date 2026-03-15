/**
 * Promo Code URL utilities with alias support
 */

// Code aliases for redirects
const CODE_ALIASES: Record<string, string> = {
  'OLD_SUMMER': 'SUMMER2024',
  'SUMMER_OLD': 'SUMMER2024',
  'SUM24': 'SUMMER2024',
  // Add more aliases as needed
}

/**
 * Get canonical promo code (resolve aliases)
 */
export const getCanonicalCode = (code: string): string => {
  return CODE_ALIASES[code.toUpperCase()] || code.toUpperCase()
}

/**
 * Generate promo URL using code
 */
export const generatePromoCodeUrl = (code: string): string => {
  const canonicalCode = getCanonicalCode(code)
  return `/promotions/${canonicalCode}`
}

/**
 * Parse promo code from URL
 */
export const parsePromoCodeFromUrl = (path: string): string | null => {
  const match = path.match(/\/promotions\/([A-Z0-9_]+)$/i)
  if (!match) return null

  return getCanonicalCode(match[1])
}

/**
 * Add new code alias
 */
export const addCodeAlias = (oldCode: string, newCode: string): void => {
  CODE_ALIASES[oldCode.toUpperCase()] = newCode.toUpperCase()
}

/**
 * Validate promo code format
 */
export const isValidPromoCode = (code: string): boolean => {
  // Allow A-Z, 0-9, underscore, 4-20 characters
  return /^[A-Z0-9_]{4,20}$/i.test(code)
}