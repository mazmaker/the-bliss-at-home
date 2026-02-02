import { supabase } from './supabase'

export interface Hotel {
  id: string
  name_th: string
  name_en: string
  contact_person: string
  email: string
  phone: string
  address: string
  latitude: number | null
  longitude: number | null
  commission_rate: number
  status: 'active' | 'pending' | 'inactive' | 'suspended' | 'banned'
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  tax_id?: string
  description?: string
  website?: string
  rating: number
  created_at: string
  updated_at: string
}

export interface HotelInvoice {
  id: string
  invoice_number: string
  hotel_id: string
  period_start: string
  period_end: string
  period_type: 'weekly' | 'monthly'
  total_bookings: number
  total_revenue: number
  commission_rate: number
  commission_amount: number
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'
  issued_date: string
  due_date: string
  paid_date?: string
  created_at: string
}

export interface HotelPayment {
  id: string
  hotel_id: string
  invoice_id?: string
  invoice_number?: string
  transaction_ref: string
  amount: number
  payment_method: 'bank_transfer' | 'cash' | 'cheque' | 'online'
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  payment_date: string
  verified_by?: string
  verified_date?: string
  notes?: string
  created_at: string
}

export interface HotelBooking {
  id: string
  booking_number: string
  hotel_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  service_name: string
  service_category: string
  staff_name?: string
  booking_date: string
  service_date: string
  service_time: string
  duration: number
  total_price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
  payment_status: 'paid' | 'pending' | 'refunded'
  room_number?: string
  notes?: string
  created_by_hotel: boolean
  created_at: string
}

// ==================== HOTELS ====================

export const getAllHotels = async () => {
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Hotel[]
}

export const getHotelById = async (id: string) => {
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Hotel
}

export const createHotel = async (hotelData: Partial<Hotel>) => {
  const { data, error } = await supabase
    .from('hotels')
    .insert([hotelData])
    .select()
    .single()

  if (error) throw error
  return data as Hotel
}

export const updateHotel = async (id: string, hotelData: Partial<Hotel>) => {
  const { data, error } = await supabase
    .from('hotels')
    .update(hotelData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Hotel
}

export const updateHotelStatus = async (id: string, status: Hotel['status']) => {
  const { data, error } = await supabase
    .from('hotels')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Hotel
}

// ==================== INVOICES ====================

export const getHotelInvoices = async (hotelId: string) => {
  const { data, error } = await supabase
    .from('hotel_invoices')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('issued_date', { ascending: false })

  if (error) throw error
  return data as HotelInvoice[]
}

export const createInvoice = async (invoiceData: Partial<HotelInvoice>) => {
  const { data, error } = await supabase
    .from('hotel_invoices')
    .insert([invoiceData])
    .select()
    .single()

  if (error) throw error
  return data as HotelInvoice
}

export const updateInvoice = async (id: string, invoiceData: Partial<HotelInvoice>) => {
  const { data, error } = await supabase
    .from('hotel_invoices')
    .update(invoiceData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as HotelInvoice
}

// ==================== PAYMENTS ====================

export const getHotelPayments = async (hotelId: string) => {
  const { data, error } = await supabase
    .from('hotel_payments')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('payment_date', { ascending: false })

  if (error) throw error
  return data as HotelPayment[]
}

export const createPayment = async (paymentData: Partial<HotelPayment>) => {
  const { data, error } = await supabase
    .from('hotel_payments')
    .insert([paymentData])
    .select()
    .single()

  if (error) throw error
  return data as HotelPayment
}

export const updatePayment = async (id: string, paymentData: Partial<HotelPayment>) => {
  const { data, error } = await supabase
    .from('hotel_payments')
    .update(paymentData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as HotelPayment
}

// ==================== BOOKINGS ====================

export const getHotelBookings = async (hotelId: string) => {
  const { data, error } = await supabase
    .from('hotel_bookings')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('created_by_hotel', true)
    .order('service_date', { ascending: false })

  if (error) throw error
  return data as HotelBooking[]
}

export const createBooking = async (bookingData: Partial<HotelBooking>) => {
  const { data, error } = await supabase
    .from('hotel_bookings')
    .insert([bookingData])
    .select()
    .single()

  if (error) throw error
  return data as HotelBooking
}

export const updateBooking = async (id: string, bookingData: Partial<HotelBooking>) => {
  const { data, error } = await supabase
    .from('hotel_bookings')
    .update(bookingData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as HotelBooking
}

// ==================== STATS ====================

export const getHotelStats = async (hotelId: string) => {
  // Get total bookings count
  const { count: totalBookings } = await supabase
    .from('hotel_bookings')
    .select('*', { count: 'exact', head: true })
    .eq('hotel_id', hotelId)

  // Get monthly revenue (sum of paid invoices this month)
  const firstDayOfMonth = new Date()
  firstDayOfMonth.setDate(1)
  const { data: monthlyInvoices } = await supabase
    .from('hotel_invoices')
    .select('total_revenue')
    .eq('hotel_id', hotelId)
    .eq('status', 'paid')
    .gte('period_start', firstDayOfMonth.toISOString().split('T')[0])

  const monthlyRevenue = monthlyInvoices?.reduce((sum, inv) => sum + Number(inv.total_revenue), 0) || 0

  return {
    totalBookings: totalBookings || 0,
    monthlyRevenue,
  }
}

export const getTotalMonthlyRevenue = async () => {
  // Get total revenue across all hotels (sum of all paid invoices)
  const { data: paidInvoices, error } = await supabase
    .from('hotel_invoices')
    .select('total_revenue')
    .eq('status', 'paid')

  if (error) throw error

  const totalRevenue = paidInvoices?.reduce((sum, inv) => sum + Number(inv.total_revenue), 0) || 0
  return totalRevenue
}
