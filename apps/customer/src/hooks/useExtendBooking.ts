/**
 * Customer App - useExtendBooking Hook
 * Manages extension status and booking extension functionality
 */

import { useState, useEffect, useCallback } from 'react'
import {
  BookingWithExtensions,
  ExtensionStatus,
  ExtendBookingRequest,
  ExtendBookingResponse,
  ExtensionOption,
  EXTENSION_BUSINESS_RULES
} from '../types/extendService'

export function useExtensionStatus(booking: BookingWithExtensions): ExtensionStatus {
  const [status, setStatus] = useState<ExtensionStatus>({
    canExtend: false,
    hasExtensions: false,
    extensionCount: 0,
    maxExtensionsReached: false,
    lastExtendedAt: undefined,
    reasonIfCannot: undefined
  })

  useEffect(() => {
    if (!booking) {
      setStatus(prev => ({
        ...prev,
        canExtend: false,
        extendableBooking: false
      }))
      return
    }

    // Check if booking is eligible for extension
    const isEligible = checkExtensionEligibility(booking)
    const extensionCount = booking.extension_count || 0
    const maxExtensionsReached = extensionCount >= EXTENSION_BUSINESS_RULES.MAX_EXTENSIONS_PER_BOOKING

    setStatus(prev => ({
      ...prev,
      canExtend: isEligible && !maxExtensionsReached,
      hasExtensions: extensionCount > 0,
      extensionCount,
      maxExtensionsReached,
      lastExtendedAt: booking.last_extended_at,
      reasonIfCannot: !isEligible ? getIneligibilityReason(booking) : undefined
    }))
  }, [booking])

  return status
}

function checkExtensionEligibility(booking: BookingWithExtensions): boolean {
  if (!booking) return false

  // Check booking status - use business rules
  if (!EXTENSION_BUSINESS_RULES.ALLOWED_STATUSES.includes(booking.status)) {
    console.log('❌ Booking status not eligible:', booking.status)
    return false
  }

  // Check max extensions
  if (booking.extension_count >= EXTENSION_BUSINESS_RULES.MAX_EXTENSIONS_PER_BOOKING) {
    console.log('❌ Max extensions reached:', booking.extension_count)
    return false
  }

  console.log('✅ Booking eligible for extension')
  return true
}

function getIneligibilityReason(booking: BookingWithExtensions): string {
  if (!booking) return 'ไม่พบข้อมูลการจอง'

  if (!EXTENSION_BUSINESS_RULES.ALLOWED_STATUSES.includes(booking.status)) {
    return 'ไม่สามารถเพิ่มเวลาได้ในสถานะปัจจุบัน'
  }

  if (booking.extension_count >= EXTENSION_BUSINESS_RULES.MAX_EXTENSIONS_PER_BOOKING) {
    return `เพิ่มเวลาได้สูงสุด ${EXTENSION_BUSINESS_RULES.MAX_EXTENSIONS_PER_BOOKING} ครั้งต่อการจอง`
  }

  return 'ไม่สามารถเพิ่มเวลาได้ในขณะนี้'
}

export function useExtendBooking() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extensionOptions, setExtensionOptions] = useState<ExtensionOption[]>([])

  const loadExtensionOptions = useCallback(async (bookingId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Extension options based on actual service rates (10 บาท/นาที)
      const extensionRatePerMinute = 10 // บาทต่อนาที

      const options: ExtensionOption[] = [
        {
          duration: 30,
          price: 30 * extensionRatePerMinute, // 300 บาท
          totalNewDuration: 30,
          totalNewPrice: 30 * extensionRatePerMinute,
          isAvailable: true,
          description: 'เพิ่มเวลา 30 นาที (+300 บาท)'
        },
        {
          duration: 60,
          price: 60 * extensionRatePerMinute, // 600 บาท
          totalNewDuration: 60,
          totalNewPrice: 60 * extensionRatePerMinute,
          isAvailable: true,
          description: 'เพิ่มเวลา 60 นาที (+600 บาท)'
        },
        {
          duration: 90,
          price: 90 * extensionRatePerMinute, // 900 บาท
          totalNewDuration: 90,
          totalNewPrice: 90 * extensionRatePerMinute,
          isAvailable: true,
          description: 'เพิ่มเวลา 90 นาท (+900 บาท)'
        }
      ]
      setExtensionOptions(options)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load extension options'
      setError(errorMessage)
      console.error('❌ Failed to load extension options:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const extendBooking = useCallback(async (request: ExtendBookingRequest): Promise<ExtendBookingResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      // TODO: Implement API endpoint for booking extension
      // For now, simulate success response with realistic data
      const extensionPrice = request.additionalDuration * 10 // 10 บาทต่อนาที

      const response = {
        ok: true,
        json: async () => ({
          success: true,
          newBookingService: {
            id: `extension-${Date.now()}`,
            duration: request.additionalDuration,
            service_id: 'extension-service',
            booking_id: request.bookingId,
            is_extension: true
          },
          pricing: {
            extensionPrice,
            newTotalPrice: 1500 + extensionPrice, // สมมติราคาเดิม 1500
            originalPrice: 1500
          },
          timing: {
            newTotalDuration: 120 + request.additionalDuration,
            originalDuration: 120,
            estimatedEndTime: new Date(Date.now() + (120 + request.additionalDuration) * 60 * 1000).toISOString()
          },
          paymentStatus: {
            requiresPayment: true,
            paymentUrl: `/payment?type=extension&booking=${request.bookingId}&amount=${extensionPrice}&ref=EXT-${Date.now()}`,
            paymentReference: `EXT-${Date.now()}`
          },
          metadata: {
            extensionCount: 1,
            timestamp: new Date(),
            message: `เพิ่มเวลา ${request.additionalDuration} นาที สำเร็จ! ราคา ${extensionPrice} บาท`
          }
        })
      }

      // Mock response is always ok, skip error check for now

      const result: ExtendBookingResponse = await response.json()
      console.log('✅ Booking extended successfully (mock):', result)

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('❌ Extension failed:', errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    extendBooking,
    loading: isLoading,
    error,
    extensionOptions,
    loadExtensionOptions,
    clearError
  }
}