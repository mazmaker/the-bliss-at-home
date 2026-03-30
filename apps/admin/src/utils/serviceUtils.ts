import { Database } from '@bliss/supabase'

type Service = Database['public']['Tables']['services']['Row']

/**
 * Get available durations for a service
 */
export function getAvailableDurations(service: Service): number[] {
  if (service.duration_options && Array.isArray(service.duration_options)) {
    return (service.duration_options as number[]).sort((a, b) => a - b)
  }
  // Fallback: use duration field (in minutes)
  return [service.duration || 60]
}

/**
 * Get price for a specific duration
 */
export function getPriceForDuration(service: Service, duration: number): number {
  // Use stored per-duration prices only
  if (duration === 60 && service.price_60) return service.price_60
  if (duration === 90 && service.price_90) return service.price_90
  if (duration === 120 && service.price_120) return service.price_120

  // If no stored price found, this is a configuration error
  console.error(`❌ Missing stored price for ${duration} min in service: ${service.name_th || service.id}`)

  // Fallback to base_price but log as error
  const fallbackPrice = Number(service.base_price || 0)
  console.error(`Using fallback price: ฿${fallbackPrice}`)
  return fallbackPrice
}

/**
 * Get minimum available duration and its price for display
 * This is the "starting from" price shown on cards
 */
export function getMinimumPriceInfo(service: Service): {
  duration: number
  price: number
  formattedText: string
} {
  const durations = getAvailableDurations(service)
  const minDuration = Math.min(...durations)
  const price = getPriceForDuration(service, minDuration)

  return {
    duration: minDuration,
    price,
    formattedText: `เริ่มต้น ${minDuration} นาที ฿${price.toLocaleString()}`
  }
}

/**
 * Format duration options for display
 */
export function formatDurationOptions(service: Service): string {
  const durations = getAvailableDurations(service)
  return durations.map(d => `${d} นาที`).join(', ')
}