import { Service, ServiceSelection, BookingMode, ServiceFormat } from '../types/booking'

/**
 * Price Calculator Utility
 *
 * Implements proportional pricing based on service duration.
 * Each service has a base rate per minute calculated from hotel_price / duration.
 * Final price = base_rate_per_minute × selected_duration
 */

export class PriceCalculator {
  /**
   * Calculate the base rate per minute for a service
   * @param service - The service object
   * @returns Rate per minute in baht
   */
  private static getBaseRatePerMinute(service: Service): number {
    return service.hotel_price / service.duration
  }

  /**
   * Calculate price for a service with specific duration
   * @param service - The service object
   * @param duration - Selected duration in minutes
   * @param mode - Booking mode (single/couple) - currently not affecting price
   * @returns Calculated price in baht
   */
  static calculateServicePrice(service: Service, duration: number, _mode: BookingMode = 'single'): number {
    const baseRatePerMinute = this.getBaseRatePerMinute(service)
    const calculatedPrice = baseRatePerMinute * duration

    // Round to nearest baht (no decimals)
    return Math.round(calculatedPrice)
  }

  /**
   * Calculate total price for all service selections
   * @param selections - Array of service selections
   * @returns Total price in baht
   */
  static calculateTotalPrice(selections: ServiceSelection[]): number {
    return selections.reduce((total, selection) => total + selection.price, 0)
  }

  /**
   * Calculate total duration based on service format
   * @param selections - Array of service selections
   * @param format - How services are executed (simultaneous/sequential)
   * @returns Total duration in minutes
   */
  static calculateTotalDuration(selections: ServiceSelection[], format: ServiceFormat): number {
    if (selections.length === 0) return 0

    switch (format) {
      case 'simultaneous':
        // All services happen at the same time, duration is the longest one
        return Math.max(...selections.map(s => s.duration))

      case 'sequential':
        // Services happen one after another, total is sum of all durations
        return selections.reduce((total, selection) => total + selection.duration, 0)

      case 'single':
      default:
        // For single service, return the duration
        return selections.length > 0 ? selections[0].duration : 0
    }
  }

  /**
   * Get all available duration options with calculated prices
   * @param service - The service object
   * @param mode - Booking mode
   * @returns Array of duration options with prices
   */
  static getDurationOptionsWithPrices(service: Service, mode: BookingMode = 'single'): Array<{
    duration: number
    label: string
    price: number
    isDefault: boolean
  }> {
    const options = service.duration_options && Array.isArray(service.duration_options) && service.duration_options.length > 0
      ? service.duration_options
      : [service.duration]

    return options
      .sort((a, b) => a - b)
      .map(duration => ({
        duration,
        label: `${duration} นาที`,
        price: this.calculateServicePrice(service, duration, mode),
        isDefault: duration === service.duration
      }))
  }

  /**
   * Validate that a price calculation is reasonable
   * @param service - The service object
   * @param duration - Selected duration
   * @param calculatedPrice - The calculated price
   * @returns True if price seems reasonable
   */
  static validatePrice(service: Service, duration: number, calculatedPrice: number): boolean {
    const baseRatePerMinute = this.getBaseRatePerMinute(service)
    const expectedPrice = baseRatePerMinute * duration

    // Allow for small rounding differences
    const tolerance = 1 // 1 baht
    return Math.abs(calculatedPrice - expectedPrice) <= tolerance
  }

  /**
   * Format price for display
   * @param price - Price in baht
   * @returns Formatted price string
   */
  static formatPrice(price: number): string {
    return `฿${price.toLocaleString()}`
  }

  /**
   * Calculate savings compared to base price
   * @param service - The service object
   * @param duration - Selected duration
   * @returns Object with savings amount and percentage
   */
  static calculateSavings(service: Service, duration: number): {
    amount: number
    percentage: number
  } {
    const hotelPrice = this.calculateServicePrice(service, duration)
    const baseRatePerMinute = service.base_price / service.duration
    const customerPrice = Math.round(baseRatePerMinute * duration)

    const savings = customerPrice - hotelPrice
    const percentage = customerPrice > 0 ? Math.round((savings / customerPrice) * 100) : 0

    return {
      amount: Math.max(0, savings),
      percentage: Math.max(0, percentage)
    }
  }
}

// Export default instance for convenience
export const priceCalculator = {
  calculateServicePrice: PriceCalculator.calculateServicePrice.bind(PriceCalculator),
  calculateTotalPrice: PriceCalculator.calculateTotalPrice.bind(PriceCalculator),
  calculateTotalDuration: PriceCalculator.calculateTotalDuration.bind(PriceCalculator),
  getDurationOptionsWithPrices: PriceCalculator.getDurationOptionsWithPrices.bind(PriceCalculator),
  validatePrice: PriceCalculator.validatePrice.bind(PriceCalculator),
  formatPrice: PriceCalculator.formatPrice.bind(PriceCalculator),
  calculateSavings: PriceCalculator.calculateSavings.bind(PriceCalculator)
}