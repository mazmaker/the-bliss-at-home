import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@bliss/supabase'

export type BookingStatus =
  | 'PENDING'
  | 'PAYMENT_REQUIRED'
  | 'CONFIRMED'
  | 'STAFF_MATCHING'
  | 'ASSIGNED'
  | 'STAFF_PREPARING'
  | 'STAFF_EN_ROUTE'
  | 'STAFF_NEARBY'
  | 'STAFF_ARRIVED'
  | 'SERVICE_STARTING'
  | 'SERVICE_IN_PROGRESS'
  | 'SERVICE_PAUSED'
  | 'SERVICE_COMPLETED'
  | 'PAYMENT_PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_STAFF_AVAILABLE'

export interface StateTransition {
  id: string
  booking_id: string
  from_state: BookingStatus | null
  to_state: BookingStatus
  triggered_by: string | null
  trigger_source: string
  metadata: any
  created_at: string
}

interface BookingStateMachine {
  currentState: BookingStatus | null
  isLoading: boolean
  error: string | null
  stateHistory: StateTransition[]
  canTransitionTo: (newState: BookingStatus) => boolean
  transitionTo: (newState: BookingStatus, metadata?: any) => Promise<{ success: boolean; message?: string }>
}

export const useBookingStateMachine = (bookingId: string, userId?: string): BookingStateMachine => {
  const [currentState, setCurrentState] = useState<BookingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stateHistory, setStateHistory] = useState<StateTransition[]>([])

  // Load current state and history
  useEffect(() => {
    if (!bookingId) return

    const loadBookingState = async () => {
      try {
        // Get current booking state
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .select('status')
          .eq('id', bookingId)
          .single()

        if (bookingError) {
          throw new Error(bookingError.message)
        }

        setCurrentState(booking.status)

        // Get state history
        const { data: transitions, error: historyError } = await supabase
          .from('booking_state_transitions')
          .select('*')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: true })

        if (historyError) {
          console.warn('Could not load state history:', historyError)
        } else {
          setStateHistory(transitions || [])
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดสถานะการจองได้')
      }
    }

    loadBookingState()
  }, [bookingId])

  // Subscribe to real-time state changes
  useEffect(() => {
    if (!bookingId) return

    const channel = supabase
      .channel(`booking_state:${bookingId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'booking_state_transitions',
        filter: `booking_id=eq.${bookingId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const transition = payload.new as StateTransition
          setCurrentState(transition.to_state)
          setStateHistory(prev => [...prev, transition])
        }
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [bookingId])

  const canTransitionTo = useCallback((newState: BookingStatus): boolean => {
    if (!currentState) return false

    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      'PENDING': ['PAYMENT_REQUIRED', 'CONFIRMED', 'CANCELLED'],
      'PAYMENT_REQUIRED': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['STAFF_MATCHING', 'CANCELLED'],
      'STAFF_MATCHING': ['ASSIGNED', 'NO_STAFF_AVAILABLE', 'CANCELLED'],
      'ASSIGNED': ['STAFF_PREPARING', 'STAFF_EN_ROUTE', 'CANCELLED'],
      'STAFF_PREPARING': ['STAFF_EN_ROUTE', 'CANCELLED'],
      'STAFF_EN_ROUTE': ['STAFF_NEARBY', 'STAFF_ARRIVED', 'CANCELLED'],
      'STAFF_NEARBY': ['STAFF_ARRIVED', 'STAFF_EN_ROUTE', 'CANCELLED'],
      'STAFF_ARRIVED': ['SERVICE_STARTING', 'SERVICE_IN_PROGRESS', 'CANCELLED'],
      'SERVICE_STARTING': ['SERVICE_IN_PROGRESS', 'CANCELLED'],
      'SERVICE_IN_PROGRESS': ['SERVICE_PAUSED', 'SERVICE_COMPLETED', 'CANCELLED'],
      'SERVICE_PAUSED': ['SERVICE_IN_PROGRESS', 'CANCELLED'],
      'SERVICE_COMPLETED': ['PAYMENT_PROCESSING'],
      'PAYMENT_PROCESSING': ['COMPLETED', 'PAYMENT_REQUIRED'],
      'NO_STAFF_AVAILABLE': ['STAFF_MATCHING', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': []
    }

    return (validTransitions[currentState] || []).includes(newState)
  }, [currentState])

  const transitionTo = useCallback(async (
    newState: BookingStatus,
    metadata: any = {}
  ): Promise<{ success: boolean; message?: string }> => {
    if (!bookingId) {
      return { success: false, message: 'ไม่พบ booking ID' }
    }

    if (!canTransitionTo(newState)) {
      return {
        success: false,
        message: `ไม่สามารถเปลี่ยนจาก ${currentState} เป็น ${newState} ได้`
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data: transition, error: transitionError } = await supabase.rpc('transition_booking_state', {
        p_booking_id: bookingId,
        p_to_state: newState,
        p_triggered_by: userId || null,
        p_trigger_source: 'STAFF_APP',
        p_metadata: metadata
      })

      if (transitionError) {
        throw new Error(transitionError.message)
      }

      // State will be updated via real-time subscription
      return {
        success: true,
        message: `เปลี่ยนสถานะเป็น ${getStateDisplayName(newState)} แล้ว`
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนสถานะได้'
      setError(errorMessage)
      return { success: false, message: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [bookingId, userId, canTransitionTo, currentState])

  return {
    currentState,
    isLoading,
    error,
    stateHistory,
    canTransitionTo,
    transitionTo
  }
}

// Helper function to get display names for states
export const getStateDisplayName = (state: BookingStatus): string => {
  const displayNames: Record<BookingStatus, string> = {
    'PENDING': 'รอดำเนินการ',
    'PAYMENT_REQUIRED': 'รอการชำระเงิน',
    'CONFIRMED': 'ยืนยันแล้ว',
    'STAFF_MATCHING': 'กำลังหาพนักงาน',
    'ASSIGNED': 'มอบหมายพนักงานแล้ว',
    'STAFF_PREPARING': 'พนักงานเตรียมตัว',
    'STAFF_EN_ROUTE': 'พนักงานกำลังเดินทาง',
    'STAFF_NEARBY': 'พนักงานใกล้ถึง',
    'STAFF_ARRIVED': 'พนักงานมาถึงแล้ว',
    'SERVICE_STARTING': 'กำลังเริ่มบริการ',
    'SERVICE_IN_PROGRESS': 'กำลังให้บริการ',
    'SERVICE_PAUSED': 'หยุดพักชั่วคราว',
    'SERVICE_COMPLETED': 'บริการเสร็จสิ้น',
    'PAYMENT_PROCESSING': 'ประมวลผลการชำระเงิน',
    'COMPLETED': 'เสร็จสมบูรณ์',
    'CANCELLED': 'ยกเลิก',
    'NO_STAFF_AVAILABLE': 'ไม่มีพนักงานว่าง'
  }

  return displayNames[state] || state
}

// Helper function to get state colors
export const getStateColor = (state: BookingStatus): string => {
  const stateColors: Record<BookingStatus, string> = {
    'PENDING': 'gray',
    'PAYMENT_REQUIRED': 'amber',
    'CONFIRMED': 'blue',
    'STAFF_MATCHING': 'purple',
    'ASSIGNED': 'blue',
    'STAFF_PREPARING': 'cyan',
    'STAFF_EN_ROUTE': 'purple',
    'STAFF_NEARBY': 'indigo',
    'STAFF_ARRIVED': 'green',
    'SERVICE_STARTING': 'emerald',
    'SERVICE_IN_PROGRESS': 'emerald',
    'SERVICE_PAUSED': 'orange',
    'SERVICE_COMPLETED': 'green',
    'PAYMENT_PROCESSING': 'yellow',
    'COMPLETED': 'violet',
    'CANCELLED': 'red',
    'NO_STAFF_AVAILABLE': 'red'
  }

  return stateColors[state] || 'gray'
}