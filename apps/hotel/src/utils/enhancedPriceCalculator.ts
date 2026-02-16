/**
 * Enhanced Price Calculator with Hotel-Specific Discounts
 *
 * คำนวณราคาบริการที่มีส่วนลดของโรงแรมแยกตามเวลา
 * แต่ละระยะเวลาจะได้ราคาที่ลดแล้วแยกต่างหาก
 */

import { Service, ServiceSelection, BookingMode, ServiceFormat } from '../types/booking'
import { PriceCalculator } from './priceCalculator'

export class EnhancedPriceCalculator {
  /**
   * Calculate discounted price for a specific duration
   * @param originalPrice - Original price for specific duration
   * @param discountRate - Hotel discount rate percentage
   * @returns Discounted price
   */
  private static calculateDiscountedPrice(originalPrice: number, discountRate: number): number {
    const discountAmount = originalPrice * (discountRate / 100)
    return Math.round(originalPrice - discountAmount)
  }

  /**
   * Get base rate per minute using original service price
   * @param service - The service object
   * @returns Rate per minute in baht (before discount)
   */
  private static getOriginalBaseRatePerMinute(service: Service): number {
    const originalPrice = service.original_price || service.hotel_price
    return originalPrice / service.duration
  }

  /**
   * Calculate original price for a specific duration (before discount)
   * Uses admin-set prices (price_60, price_90, price_120) when available
   * @param service - The service object
   * @param duration - Selected duration in minutes
   * @returns Original price before discount
   */
  private static calculateOriginalPriceForDuration(service: Service, duration: number): number {
    // Use admin-set prices when available
    if (duration === 60 && service.price_60) {
      return service.price_60
    }
    if (duration === 90 && service.price_90) {
      return service.price_90
    }
    if (duration === 120 && service.price_120) {
      return service.price_120
    }

    // Fallback to proportional calculation
    const baseRatePerMinute = this.getOriginalBaseRatePerMinute(service)
    return Math.round(baseRatePerMinute * duration)
  }

  /**
   * Calculate discounted price for a service with specific duration
   * @param service - The service object (may include discount info)
   * @param duration - Selected duration in minutes
   * @param discountRate - Hotel discount rate percentage
   * @param mode - Booking mode (single/couple) - currently not affecting price
   * @returns Discounted price in baht
   */
  static calculateServicePriceWithDiscount(
    service: Service,
    duration: number,
    discountRate: number,
    _mode: BookingMode = 'single'
  ): number {
    // Get original price for this duration
    const originalPrice = this.calculateOriginalPriceForDuration(service, duration)

    // Apply hotel discount
    const discountedPrice = this.calculateDiscountedPrice(originalPrice, discountRate)

    return discountedPrice
  }

  /**
   * Get all available duration options with discounted prices
   * @param service - The service object
   * @param discountRate - Hotel discount rate percentage
   * @param mode - Booking mode
   * @returns Array of duration options with discounted prices
   */
  static getDurationOptionsWithDiscountedPrices(
    service: Service,
    discountRate: number,
    mode: BookingMode = 'single'
  ): Array<{
    duration: number
    label: string
    originalPrice: number
    discountedPrice: number
    savings: number
    isDefault: boolean
  }> {
    const options = service.duration_options && Array.isArray(service.duration_options) && service.duration_options.length > 0
      ? service.duration_options
      : [service.duration]

    return options
      .sort((a, b) => a - b)
      .map(duration => {
        const originalPrice = this.calculateOriginalPriceForDuration(service, duration)
        const discountedPrice = this.calculateDiscountedPrice(originalPrice, discountRate)
        const savings = originalPrice - discountedPrice

        return {
          duration,
          label: `${duration} นาที`,
          originalPrice,
          discountedPrice,
          savings,
          isDefault: duration === service.duration
        }
      })
  }

  /**
   * Calculate total price for all service selections with discounts
   * @param selections - Array of service selections (already with discounted prices)
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
    return PriceCalculator.calculateTotalDuration(selections, format)
  }

  /**
   * Format price for display with discount info
   * @param originalPrice - Original price
   * @param discountedPrice - Discounted price
   * @returns Formatted price string with savings
   */
  static formatPriceWithDiscount(originalPrice: number, discountedPrice: number): string {
    const savings = originalPrice - discountedPrice
    return `฿${discountedPrice.toLocaleString()} (ประหยัด ฿${savings.toLocaleString()})`
  }

  /**
   * Backward compatibility: Use enhanced calculation if discount available
   * @param service - The service object
   * @param duration - Selected duration in minutes
   * @param discountRate - Hotel discount rate (optional)
   * @param mode - Booking mode
   * @returns Calculated price
   */
  static calculateServicePrice(
    service: Service,
    duration: number,
    discountRate?: number,
    mode: BookingMode = 'single'
  ): number {
    if (discountRate && discountRate > 0) {
      return this.calculateServicePriceWithDiscount(service, duration, discountRate, mode)
    }

    // Fallback to original calculator
    return PriceCalculator.calculateServicePrice(service, duration, mode)
  }
}

// Export default instance for convenience
export const enhancedPriceCalculator = {
  calculateServicePriceWithDiscount: EnhancedPriceCalculator.calculateServicePriceWithDiscount.bind(EnhancedPriceCalculator),
  getDurationOptionsWithDiscountedPrices: EnhancedPriceCalculator.getDurationOptionsWithDiscountedPrices.bind(EnhancedPriceCalculator),
  calculateTotalPrice: EnhancedPriceCalculator.calculateTotalPrice.bind(EnhancedPriceCalculator),
  calculateTotalDuration: EnhancedPriceCalculator.calculateTotalDuration.bind(EnhancedPriceCalculator),
  calculateServicePrice: EnhancedPriceCalculator.calculateServicePrice.bind(EnhancedPriceCalculator),
  formatPriceWithDiscount: EnhancedPriceCalculator.formatPriceWithDiscount.bind(EnhancedPriceCalculator)
}