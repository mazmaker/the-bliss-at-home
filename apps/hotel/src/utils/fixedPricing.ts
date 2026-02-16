// Fixed pricing utility functions for hotel app
// Replaces dynamic calculation with fixed prices from database

export interface Service {
  id: string
  name_th: string
  name_en: string
  base_price: number
  price_60: number | null
  price_90: number | null
  price_120: number | null
  hotel_price: number
  duration: number
  duration_options: number[] | null
  category: string
  is_active: boolean
}

export interface PriceResult {
  price: number
  source: 'fixed' | 'calculated' | 'fallback'
}

/**
 * Get service price for specific duration using fixed pricing first,
 * fallback to calculation if fixed price not available
 */
export function getServicePrice(service: Service, duration: number): PriceResult {
  // Try to get fixed price first
  switch (duration) {
    case 60:
      if (service.price_60 !== null) {
        return { price: service.price_60, source: 'fixed' }
      }
      break
    case 90:
      if (service.price_90 !== null) {
        return { price: service.price_90, source: 'fixed' }
      }
      break
    case 120:
      if (service.price_120 !== null) {
        return { price: service.price_120, source: 'fixed' }
      }
      break
  }

  // Fallback to calculation using base_price (backward compatibility)
  const calculatedPrice = calculatePriceFromBase(service.base_price, duration)
  return { price: calculatedPrice, source: 'calculated' }
}

/**
 * Get hotel-specific price (same logic but using hotel_price as base)
 */
export function getHotelServicePrice(service: Service, duration: number): PriceResult {
  // For hotel pricing, we prioritize fixed prices but use hotel_price for calculation fallback
  const fixedResult = getServicePrice(service, duration)

  if (fixedResult.source === 'fixed') {
    return fixedResult
  }

  // Calculate from hotel_price instead of base_price
  const calculatedPrice = calculatePriceFromBase(service.hotel_price, duration)
  return { price: calculatedPrice, source: 'calculated' }
}

/**
 * Fallback calculation logic (from original pricingUtils.ts)
 */
function calculatePriceFromBase(basePrice: number, duration: number): number {
  let multiplier = 1.0

  switch (duration) {
    case 60:
      multiplier = 1.0
      break
    case 90:
      multiplier = 1.435
      break
    case 120:
      multiplier = 1.855
      break
    default:
      // Linear interpolation for other durations
      if (duration < 60) {
        multiplier = duration / 60
      } else if (duration > 120) {
        const extraMinutes = duration - 120
        multiplier = 1.855 + (extraMinutes / 60) * 0.4
      } else {
        multiplier = 1.0 + ((duration - 60) / 60) * 0.855
      }
  }

  return Math.round(basePrice * multiplier)
}

/**
 * Get all available prices for a service
 */
export function getAllServicePrices(service: Service): { [duration: number]: PriceResult } {
  const durations = service.duration_options || [60, 90, 120]
  const prices: { [duration: number]: PriceResult } = {}

  durations.forEach(duration => {
    prices[duration] = getServicePrice(service, duration)
  })

  return prices
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return `฿${price.toLocaleString()}`
}

/**
 * Get price display with source indication (for debugging)
 */
export function getPriceDisplay(service: Service, duration: number, showSource = false): string {
  const result = getServicePrice(service, duration)
  const formattedPrice = formatPrice(result.price)

  if (showSource) {
    const sourceText = {
      fixed: '(ราคาคงที่)',
      calculated: '(คำนวณ)',
      fallback: '(สำรอง)'
    }
    return `${formattedPrice} ${sourceText[result.source]}`
  }

  return formattedPrice
}