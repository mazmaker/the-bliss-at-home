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
import { getCustomerExtensionOptions, extendCustomerBooking } from '../services/extendBookingService'

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

  if (!EXTENSION_BUSINESS_RULES.ALLOWED_STATUSES.includes(booking.status)) {
    console.log('❌ Booking status not eligible:', booking.status)
    return false
  }

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
      const options = await getCustomerExtensionOptions(bookingId)
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
      const result = await extendCustomerBooking(request)
      console.log('✅ Booking extended successfully:', result)
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
