/**
 * Get default image URL based on service category
 * Uses different Unsplash images for each category (Hotel App version)
 */
export function getCategoryDefaultImage(category: string): string {
  const categoryDefaults: Record<string, string> = {
    massage: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80', // Thai massage scene
    nail: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', // Nail spa treatment
    spa: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80'   // Spa stones & candles
  }

  return categoryDefaults[category] || categoryDefaults.massage
}

/**
 * Get service image with category-based fallback
 */
export function getServiceImage(imageUrl: string | null, category: string): string {
  return imageUrl || getCategoryDefaultImage(category)
}