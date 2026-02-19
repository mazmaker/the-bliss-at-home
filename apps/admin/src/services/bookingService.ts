import { supabase } from '../lib/supabase'

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
export type PaymentMethod = 'cash' | 'credit_card' | 'promptpay' | 'bank_transfer' | 'other'
export type ServiceCategory = 'massage' | 'nail' | 'spa'

export interface Booking {
  id: string
  booking_number: string
  customer_id: string | null
  hotel_id: string | null
  staff_id: string | null
  service_id: string

  // Booking details
  booking_date: string
  booking_time: string
  duration: number
  recipient_count?: number
  service_format?: string | null
  promotion_id?: string | null

  // Location
  is_hotel_booking: boolean
  hotel_room_number?: string | null
  address: string
  latitude?: number | null
  longitude?: number | null

  // Pricing
  base_price: number
  discount_amount: number
  final_price: number

  // Status
  status: BookingStatus
  payment_status: PaymentStatus
  payment_method?: PaymentMethod | null

  // Staff earnings
  staff_earnings: number

  // Notes
  customer_notes?: string | null
  staff_notes?: string | null
  admin_notes?: string | null

  // Timestamps
  confirmed_at?: string | null
  started_at?: string | null
  completed_at?: string | null
  cancelled_at?: string | null
  created_at: string
  updated_at: string

  // Cancellation details
  cancellation_reason?: string | null
  cancelled_by?: string | null

  // Refund details
  refund_status?: 'none' | 'pending' | 'processing' | 'completed' | 'failed' | null
  refund_amount?: number | null
  refund_percentage?: number | null

  // Relations
  customer?: {
    id: string
    full_name: string
    phone: string
  } | null
  hotel?: {
    id: string
    name_th: string
  } | null
  staff?: {
    id: string
    name_th: string
    phone: string
  } | null
  service?: {
    id: string
    name_th: string
    name_en: string
    category: string
    duration: number
    base_price: number
  }
  promotion?: {
    id: string
    name_th: string
    name_en: string
    code: string
    discount_type: string
    discount_value: number
  } | null
  booking_services?: Array<{
    id: string
    service_id: string
    duration: number
    price: number
    recipient_index: number
    recipient_name: string | null
    service?: {
      id: string
      name_th: string
      name_en: string
      category: string
    }
  }>
}

export interface BookingFilters {
  status?: BookingStatus | 'all'
  payment_status?: PaymentStatus | 'all'
  category?: ServiceCategory | 'all'
  booking_type?: 'customer' | 'hotel' | 'all'
  date_filter?: 'all' | 'today' | 'week' | 'month'
  search?: string
}

class BookingService {
  private async fetchBookingServices(bookingIds: string[]): Promise<Record<string, Booking['booking_services']>> {
    if (bookingIds.length === 0) return {}
    try {
      const { data, error } = await supabase
        .from('booking_services')
        .select('id, booking_id, service_id, duration, price, recipient_index, recipient_name, service:services(id, name_th, name_en, category)')
        .in('booking_id', bookingIds)
        .order('recipient_index', { ascending: true })

      if (error) {
        console.warn('booking_services not available:', error.message)
        return {}
      }

      const map: Record<string, Booking['booking_services']> = {}
      for (const row of data || []) {
        const bid = (row as any).booking_id
        if (!map[bid]) map[bid] = []
        map[bid]!.push(row as any)
      }
      return map
    } catch {
      return {}
    }
  }

  async getAllBookings(filters?: BookingFilters): Promise<Booking[]> {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          customer:customers(id, full_name, phone),
          hotel:hotels(id, name_th),
          staff(id, name_th, phone),
          service:services(id, name_th, name_en, category, duration, base_price),
          promotion:promotions(id, name_th, name_en, code, discount_type, discount_value)
        `)
        .order('created_at', { ascending: false })

      // Apply status filter
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      // Apply payment status filter
      if (filters?.payment_status && filters.payment_status !== 'all') {
        query = query.eq('payment_status', filters.payment_status)
      }

      // Apply booking type filter
      if (filters?.booking_type && filters.booking_type !== 'all') {
        if (filters.booking_type === 'hotel') {
          query = query.not('hotel_id', 'is', null)
        } else {
          query = query.is('hotel_id', null)
        }
      }

      // Note: Category filter is applied client-side because Supabase doesn't support filtering on nested relations

      // Apply date filter
      if (filters?.date_filter && filters.date_filter !== 'all') {
        const today = new Date()
        let startDate: Date

        switch (filters.date_filter) {
          case 'today':
            startDate = new Date(today.setHours(0, 0, 0, 0))
            query = query.gte('booking_date', startDate.toISOString().split('T')[0])
            query = query.lte('booking_date', new Date(today.setHours(23, 59, 59, 999)).toISOString().split('T')[0])
            break
          case 'week':
            startDate = new Date(today)
            startDate.setDate(today.getDate() - today.getDay()) // Start of week
            query = query.gte('booking_date', startDate.toISOString().split('T')[0])
            break
          case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1)
            query = query.gte('booking_date', startDate.toISOString().split('T')[0])
            break
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching bookings:', error)
        throw error
      }

      // Apply client-side category filter (Supabase doesn't support nested relation filtering)
      let filteredData = (data as Booking[]) || []
      if (filters?.category && filters.category !== 'all') {
        filteredData = filteredData.filter(booking =>
          booking.service?.category === filters.category
        )
      }

      // Fetch booking_services for couple bookings
      const coupleBookingIds = filteredData
        .filter(b => (b.recipient_count || 1) > 1)
        .map(b => b.id)
      if (coupleBookingIds.length > 0) {
        const bsMap = await this.fetchBookingServices(coupleBookingIds)
        filteredData = filteredData.map(b => ({
          ...b,
          booking_services: bsMap[b.id] || undefined,
        }))
      }

      return filteredData
    } catch (error) {
      console.error('Error in getAllBookings:', error)
      throw error
    }
  }

  async getBookingById(id: string): Promise<Booking | null> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers(id, full_name, phone),
          hotel:hotels(id, name_th),
          staff(id, name_th, phone),
          service:services(id, name_th, name_en, category, duration, base_price),
          promotion:promotions(id, name_th, name_en, code, discount_type, discount_value)
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching booking:', error)
        throw error
      }

      const booking = data as Booking

      // Fetch booking_services if couple booking
      if ((booking.recipient_count || 1) > 1) {
        const bsMap = await this.fetchBookingServices([booking.id])
        booking.booking_services = bsMap[booking.id] || undefined
      }

      return booking
    } catch (error) {
      console.error('Error in getBookingById:', error)
      return null
    }
  }

  async updateBookingStatus(id: string, status: BookingStatus): Promise<Booking | null> {
    try {
      const updateData: Record<string, any> = { status }

      // Set timestamps based on status
      switch (status) {
        case 'confirmed':
          updateData.confirmed_at = new Date().toISOString()
          break
        case 'in_progress':
          updateData.started_at = new Date().toISOString()
          break
        case 'completed':
          updateData.completed_at = new Date().toISOString()
          break
        case 'cancelled':
          updateData.cancelled_at = new Date().toISOString()
          break
      }

      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          customer:customers(id, full_name, phone),
          hotel:hotels(id, name_th),
          staff(id, name_th, phone),
          service:services(id, name_th, name_en, category, duration, base_price),
          promotion:promotions(id, name_th, name_en, code, discount_type, discount_value)
        `)
        .single()

      if (error) {
        console.error('Error updating booking status:', error)
        throw error
      }

      // When admin manually confirms a booking, trigger job creation + notifications
      if (status === 'confirmed') {
        try {
          const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'
          const res = await fetch(`${serverUrl}/api/notifications/booking-confirmed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: id }),
          })
          const result = await res.json()
          if (result.success) {
            console.log(`📋 Booking ${id} notifications sent:`, result)
          } else {
            console.warn(`⚠️ Booking ${id} notification partial:`, result)
          }
        } catch (notifError) {
          // Non-blocking: notification failure should not affect booking update
          console.error('⚠️ Failed to send booking notifications:', notifError)
        }
      }

      return data as Booking
    } catch (error) {
      console.error('Error in updateBookingStatus:', error)
      return null
    }
  }

  async updateBookingPaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<Booking | null> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ payment_status: paymentStatus })
        .eq('id', id)
        .select(`
          *,
          customer:customers(id, full_name, phone),
          hotel:hotels(id, name_th),
          staff(id, name_th, phone),
          service:services(id, name_th, name_en, category, duration, base_price),
          promotion:promotions(id, name_th, name_en, code, discount_type, discount_value)
        `)
        .single()

      if (error) {
        console.error('Error updating payment status:', error)
        throw error
      }

      return data as Booking
    } catch (error) {
      console.error('Error in updateBookingPaymentStatus:', error)
      return null
    }
  }

  async assignStaff(bookingId: string, staffId: string): Promise<Booking | null> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ staff_id: staffId })
        .eq('id', bookingId)
        .select(`
          *,
          customer:customers(id, full_name, phone),
          hotel:hotels(id, name_th),
          staff(id, name_th, phone),
          service:services(id, name_th, name_en, category, duration, base_price),
          promotion:promotions(id, name_th, name_en, code, discount_type, discount_value)
        `)
        .single()

      if (error) {
        console.error('Error assigning staff:', error)
        throw error
      }

      return data as Booking
    } catch (error) {
      console.error('Error in assignStaff:', error)
      return null
    }
  }

  async searchBookings(query: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers(id, full_name, phone),
          hotel:hotels(id, name_th),
          staff(id, name_th, phone),
          service:services(id, name_th, name_en, category, duration, base_price),
          promotion:promotions(id, name_th, name_en, code, discount_type, discount_value)
        `)
        .or(`booking_number.ilike.%${query}%,customer.full_name.ilike.%${query}%,customer.phone.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error searching bookings:', error)
        throw error
      }

      return (data as Booking[]) || []
    } catch (error) {
      console.error('Error in searchBookings:', error)
      return []
    }
  }

  async getBookingStats(): Promise<{
    total: number
    pending: number
    confirmed: number
    in_progress: number
    completed: number
    cancelled: number
    total_revenue: number
  }> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('status, final_price')

      if (error) {
        console.error('Error fetching booking stats:', error)
        throw error
      }

      const stats = {
        total: data?.length || 0,
        pending: data?.filter(b => b.status === 'pending').length || 0,
        confirmed: data?.filter(b => b.status === 'confirmed').length || 0,
        in_progress: data?.filter(b => b.status === 'in_progress').length || 0,
        completed: data?.filter(b => b.status === 'completed').length || 0,
        cancelled: data?.filter(b => b.status === 'cancelled').length || 0,
        total_revenue: data?.reduce((sum, b) => sum + (Number(b.final_price) || 0), 0) || 0,
      }

      return stats
    } catch (error) {
      console.error('Error in getBookingStats:', error)
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        total_revenue: 0,
      }
    }
  }
}

export const bookingService = new BookingService()
