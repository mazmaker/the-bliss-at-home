/**
 * Global Discount Utilities
 * Controls campaign-wide discount functionality via environment variables
 */

/**
 * Check if global discount is enabled
 */
export function isGlobalDiscountEnabled(): boolean {
  return import.meta.env.VITE_GLOBAL_DISCOUNT_ENABLED === 'true'
}

/**
 * Get global discount percentage
 */
export function getGlobalDiscountPercentage(): number {
  const percentage = parseInt(import.meta.env.VITE_GLOBAL_DISCOUNT_PERCENTAGE || '0')
  return Math.max(0, Math.min(100, percentage)) // Clamp between 0-100
}

/**
 * Calculate discounted price
 */
export function calculateDiscountedPrice(originalPrice: number): number {
  if (!isGlobalDiscountEnabled()) return originalPrice

  const discountPercentage = getGlobalDiscountPercentage()
  const discountAmount = originalPrice * (discountPercentage / 100)
  return Math.round(originalPrice - discountAmount)
}

/**
 * Get discount savings amount
 */
export function getDiscountSavings(originalPrice: number): number {
  if (!isGlobalDiscountEnabled()) return 0

  const discountedPrice = calculateDiscountedPrice(originalPrice)
  return originalPrice - discountedPrice
}

/**
 * Check if price should show discount UI
 */
export function shouldShowDiscount(originalPrice: number): boolean {
  return isGlobalDiscountEnabled() && originalPrice > 0 && getGlobalDiscountPercentage() > 0
}