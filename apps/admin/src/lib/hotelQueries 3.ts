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

// ==================== INVOICES (Using monthly_bills table) ====================

export const getHotelInvoices = async (hotelId: string) => {
  const { data, error } = await supabase
    .from('monthly_bills') // ✅ ใช้ existing table
    .select('*')
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as HotelInvoice[]
}

export const createInvoice = async (invoiceData: Partial<HotelInvoice>) => {
  // แปลงข้อมูลให้เข้ากับโครงสร้าง monthly_bills
  const billData = {
    hotel_id: invoiceData.hotel_id,
    bill_number: invoiceData.invoice_number,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    period_start: invoiceData.period_start,
    period_end: invoiceData.period_end,
    total_bookings: invoiceData.total_bookings || 0,
    total_amount: invoiceData.total_revenue || 0,
    status: invoiceData.status === 'paid' ? 'paid' : 'pending',
    due_date: invoiceData.due_date
  }

  const { data, error } = await supabase
    .from('monthly_bills') // ✅ ใช้ existing table
    .insert([billData])
    .select()
    .single()

  if (error) throw error
  return data as any
}

export const updateInvoice = async (id: string, invoiceData: Partial<HotelInvoice>) => {
  const { data, error } = await supabase
    .from('monthly_bills') // ✅ ใช้ existing table
    .update({
      status: invoiceData.status === 'paid' ? 'paid' : 'pending',
      total_amount: invoiceData.total_revenue
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as any
}

// ==================== PAYMENTS (Using bookings payment data) ====================

export const getHotelPayments = async (hotelId: string) => {
  // ใช้ข้อมูล payment จาก bookings table
  const { data, error } = await supabase
    .from('bookings') // ✅ ใช้ existing table
    .select(`
      id,
      booking_number,
      final_price,
      payment_status,
      payment_method,
      created_at,
      completed_at,
      customer_id
    `)
    .eq('hotel_id', hotelId)
    .eq('payment_status', 'paid')
    .order('completed_at', { ascending: false })

  if (error) throw error

  // แปลงข้อมูลให้เข้ากับ HotelPayment interface
  const payments = data?.map(booking => ({
    id: booking.id,
    hotel_id: hotelId,
    transaction_ref: booking.booking_number,
    amount: booking.final_price,
    payment_method: booking.payment_method || 'cash',
    status: 'completed',
    payment_date: booking.completed_at || booking.created_at,
    created_at: booking.created_at
  })) || []

  return payments as HotelPayment[]
}

export const createPayment = async (paymentData: Partial<HotelPayment>) => {
  // สำหรับการสร้าง payment ใหม่ - อัพเดตผ่าน bookings
  const { data, error } = await supabase
    .from('bookings') // ✅ ใช้ existing table
    .update({
      payment_status: 'paid',
      completed_at: new Date().toISOString()
    })
    .eq('booking_number', paymentData.transaction_ref)
    .eq('hotel_id', paymentData.hotel_id)
    .select()
    .single()

  if (error) throw error
  return data as any
}

export const updatePayment = async (id: string, paymentData: Partial<HotelPayment>) => {
  const { data, error } = await supabase
    .from('bookings') // ✅ ใช้ existing table
    .update({
      payment_status: paymentData.status === 'completed' ? 'paid' : 'pending'
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as any
}

// ==================== BOOKINGS (Using existing bookings table) ====================

export const getHotelBookings = async (hotelId: string) => {
  const { data, error } = await supabase
    .from('bookings') // ✅ ใช้ existing table
    .select(`
      *,
      customer:customers(full_name, phone, email),
      service:services(name_th, name_en, category),
      staff:staff(name_th, name_en)
    `)
    .eq('hotel_id', hotelId)
    .eq('is_hotel_booking', true) // ✅ เฉพาะการจองของโรงแรม
    .order('booking_date', { ascending: false })

  if (error) throw error

  // แปลงข้อมูลให้เข้ากับ HotelBooking interface
  const hotelBookings = data?.map(booking => ({
    id: booking.id,
    booking_number: booking.booking_number,
    hotel_id: booking.hotel_id,
    customer_name: booking.customer?.full_name || 'Guest',
    customer_phone: booking.customer?.phone || '',
    customer_email: booking.customer?.email || '',
    service_name: booking.service?.name_th || '',
    service_category: booking.service?.category || '',
    staff_name: booking.staff?.name_th || '',
    booking_date: booking.created_at,
    service_date: booking.booking_date,
    service_time: booking.booking_time,
    duration: booking.duration,
    total_price: booking.final_price,
    status: booking.status,
    payment_status: booking.payment_status,
    room_number: booking.hotel_room_number,
    notes: booking.customer_notes,
    created_by_hotel: booking.is_hotel_booking,
    created_at: booking.created_at
  })) || []

  return hotelBookings as HotelBooking[]
}

export const createBooking = async (bookingData: Partial<HotelBooking>) => {
  // แปลงข้อมูลให้เข้ากับโครงสร้าง bookings table
  const newBooking = {
    hotel_id: bookingData.hotel_id,
    service_id: bookingData.service_name, // ต้องใส่ service_id จริง
    booking_date: bookingData.service_date,
    booking_time: bookingData.service_time,
    duration: bookingData.duration,
    base_price: bookingData.total_price,
    final_price: bookingData.total_price,
    is_hotel_booking: true,
    hotel_room_number: bookingData.room_number,
    customer_notes: bookingData.notes,
    status: bookingData.status || 'confirmed',
    payment_status: bookingData.payment_status || 'pending'
  }

  const { data, error } = await supabase
    .from('bookings') // ✅ ใช้ existing table
    .insert([newBooking])
    .select()
    .single()

  if (error) throw error
  return data as any
}

export const updateBooking = async (id: string, bookingData: Partial<HotelBooking>) => {
  const { data, error } = await supabase
    .from('bookings') // ✅ ใช้ existing table
    .update({
      status: bookingData.status,
      payment_status: bookingData.payment_status,
      hotel_room_number: bookingData.room_number,
      customer_notes: bookingData.notes
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as any
}

// ==================== STATS ====================

export const getHotelStats = async (hotelId: string) => {
  // ✅ Get total bookings count from existing bookings table
  const { count: totalBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('hotel_id', hotelId)
    .eq('is_hotel_booking', true)

  // ✅ Get monthly revenue from existing monthly_bills table
  const firstDayOfMonth = new Date()
  firstDayOfMonth.setDate(1)
  const { data: monthlyBills } = await supabase
    .from('monthly_bills')
    .select('total_amount')
    .eq('hotel_id', hotelId)
    .eq('status', 'paid')
    .gte('period_start', firstDayOfMonth.toISOString().split('T')[0])

  const monthlyRevenue = monthlyBills?.reduce((sum, bill) => sum + Number(bill.total_amount), 0) || 0

  return {
    totalBookings: totalBookings || 0,
    monthlyRevenue,
  }
}

export const getTotalMonthlyRevenue = async () => {
  // ✅ Get total revenue across all hotels from existing monthly_bills table
  const { data: paidBills, error } = await supabase
    .from('monthly_bills')
    .select('total_amount')
    .eq('status', 'paid')

  if (error) throw error

  const totalRevenue = paidBills?.reduce((sum, bill) => sum + Number(bill.total_amount), 0) || 0
  return totalRevenue
}
