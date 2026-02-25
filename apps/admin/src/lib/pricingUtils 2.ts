// Pricing utilities for duration-based pricing
// Base pricing logic: 60 minutes = base price, others calculated proportionally

export interface PricingResult {
  duration: number
  basePrice: number
  hotelPrice: number
  multiplier: number
  finalBasePrice: number
  finalHotelPrice: number
}

/**
 * Calculate price based on duration with realistic tiered pricing
 * Based on actual market pricing pattern:
 * 60 minutes = base price
 * 90 minutes = base + additional 30min fee
 * 120 minutes = base + additional 60min fee (with slight discount)
 */
export function calculatePrice(
  basePriceFor60Min: number,
  hotelPriceFor60Min: number,
  duration: number
): PricingResult {
  // Calculate realistic price increments based on the pattern:
  // 60min: 690 → 90min: 990 (+300) → 120min: 1,280 (+590 total)
  let multiplier = 1.0
  let additionalAmount = 0

  switch (duration) {
    case 60:
      multiplier = 1.0
      additionalAmount = 0
      break
    case 90:
      // Pattern: +300 baht for +30 minutes when base is 690
      // Ratio: 300/690 ≈ 0.435, so multiplier ≈ 1.435
      multiplier = 1.435 // 990/690
      break
    case 120:
      // Pattern: +590 baht for +60 minutes when base is 690
      // Ratio: 590/690 ≈ 0.855, so multiplier ≈ 1.855
      multiplier = 1.855 // 1,280/690
      break
    default:
      // Fallback for other durations - linear interpolation
      if (duration < 60) {
        multiplier = duration / 60
      } else if (duration > 120) {
        // Extend pattern beyond 120 minutes
        const extraMinutes = duration - 120
        multiplier = 1.855 + (extraMinutes / 60) * 0.4 // Gradual increase
      } else {
        // Linear interpolation between known points
        multiplier = 1.0 + ((duration - 60) / 60) * 0.855
      }
  }

  return {
    duration,
    basePrice: basePriceFor60Min,
    hotelPrice: hotelPriceFor60Min,
    multiplier: Math.round(multiplier * 1000) / 1000, // Round to 3 decimal places
    finalBasePrice: Math.round(basePriceFor60Min * multiplier),
    finalHotelPrice: Math.round(hotelPriceFor60Min * multiplier)
  }
}

/**
 * Calculate prices for all available duration options
 */
export function calculateAllDurationPrices(
  basePriceFor60Min: number,
  hotelPriceFor60Min: number,
  durationOptions: number[]
): PricingResult[] {
  return durationOptions.map(duration =>
    calculatePrice(basePriceFor60Min, hotelPriceFor60Min, duration)
  )
}

/**
 * Get price display string for a specific duration
 */
export function getPriceDisplay(
  basePriceFor60Min: number,
  hotelPriceFor60Min: number,
  duration: number,
  isHotelPrice: boolean = false
): string {
  const result = calculatePrice(basePriceFor60Min, hotelPriceFor60Min, duration)
  const price = isHotelPrice ? result.finalHotelPrice : result.finalBasePrice

  return `${price.toLocaleString()} บาท`
}

/**
 * Get duration label in Thai
 */
export function getDurationLabel(duration: number): string {
  const labelMap: Record<number, string> = {
    60: '60 นาที (1 ชั่วโมง)',
    90: '90 นาที (1.5 ชั่วโมง)',
    120: '120 นาที (2 ชั่วโมง)'
  }

  return labelMap[duration] || `${duration} นาที`
}

/**
 * Calculate discount percentage between base and hotel price
 */
export function calculateDiscountPercentage(basePrice: number, hotelPrice: number): number {
  if (basePrice <= 0) return 0
  return Math.round(((basePrice - hotelPrice) / basePrice) * 100)
}

/**
 * Example usage and validation
 * Test with real-world example: 60min=690, 90min=990, 120min=1280
 */
export function validatePricingLogic() {
  // Real-world example
  const realWorldExample = { base: 690, hotel: 550, duration: 60 }

  console.log('💰 Realistic Pricing Logic Examples (based on 690 baht base):')
  ;[60, 90, 120].forEach(duration => {
    const result = calculatePrice(realWorldExample.base, realWorldExample.hotel, duration)
    console.log(`${duration} นาที: ปกติ ${result.finalBasePrice} บาท | โรงแรม ${result.finalHotelPrice} บาท (${result.multiplier.toFixed(3)}x)`)
  })

  console.log('\n💰 Generic Examples (1000 baht base):')
  const examples = [
    { base: 1000, hotel: 800, duration: 60 },
    { base: 1000, hotel: 800, duration: 90 },
    { base: 1000, hotel: 800, duration: 120 }
  ]

  examples.forEach(({ base, hotel, duration }) => {
    const result = calculatePrice(base, hotel, duration)
    console.log(`${duration} นาที: ปกติ ${result.finalBasePrice} บาท | โรงแรม ${result.finalHotelPrice} บาท (${result.multiplier.toFixed(3)}x)`)
  })
}