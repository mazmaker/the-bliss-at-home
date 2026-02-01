import { supabase } from '@the-bliss-at-home/supabase'

export type CustomerStatus = 'active' | 'suspended' | 'banned'

export interface Customer {
  id: string
  profile_id: string | null
  full_name: string
  phone: string
  address: string | null
  date_of_birth: string | null
  preferences: Record<string, any>
  total_bookings: number
  total_spent: number
  last_booking_date: string | null
  status: CustomerStatus
  created_at: string
  updated_at: string
  // Joined data
  email?: string
}

export interface CustomerWithStats extends Customer {
  repeat_booking_rate: number
  average_booking_value: number
  last_30_days_bookings: number
  last_30_days_spent: number
}

export interface CustomerBooking {
  id: string
  booking_number: string
  customer_id: string
  hotel_id: string | null
  staff_id: string | null
  service_id: string
  booking_date: string
  booking_time: string
  duration: number
  base_price: number
  discount_amount: number
  final_price: number
  status: string
  payment_status: string
  customer_notes: string | null
  created_at: string
  // Joined data
  service_name?: string
  staff_name?: string
  hotel_name?: string
}

export interface SOSAlert {
  id: string
  customer_id: string | null
  booking_id: string | null
  latitude: number | null
  longitude: number | null
  location_accuracy: number | null
  message: string | null
  user_agent: string | null
  status: 'pending' | 'acknowledged' | 'resolved' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  acknowledged_by: string | null
  acknowledged_at: string | null
  resolved_by: string | null
  resolved_at: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
  // Joined data
  customer_name?: string
  customer_phone?: string
}

// ============================================
// CUSTOMER QUERIES
// ============================================

export async function getAllCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      profiles:profile_id (
        email
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((customer) => ({
    ...customer,
    email: customer.profiles?.email || '',
  })) as Customer[]
}

export async function getCustomerById(id: string) {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      profiles:profile_id (
        email
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error

  return {
    ...data,
    email: data.profiles?.email || '',
  } as Customer
}

export async function getCustomerWithStats(id: string): Promise<CustomerWithStats> {
  const customer = await getCustomerById(id)

  // Calculate repeat booking rate
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, created_at, final_price')
    .eq('customer_id', id)
    .order('created_at', { ascending: true })

  const totalBookings = bookings?.length || 0
  const repeatBookings = totalBookings > 1 ? totalBookings - 1 : 0
  const repeatBookingRate = totalBookings > 0 ? (repeatBookings / totalBookings) * 100 : 0

  // Calculate average booking value
  const averageBookingValue = totalBookings > 0 ? customer.total_spent / totalBookings : 0

  // Calculate last 30 days stats
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: recentBookings } = await supabase
    .from('bookings')
    .select('final_price')
    .eq('customer_id', id)
    .gte('created_at', thirtyDaysAgo.toISOString())

  const last30DaysBookings = recentBookings?.length || 0
  const last30DaysSpent = recentBookings?.reduce((sum, b) => sum + Number(b.final_price), 0) || 0

  return {
    ...customer,
    repeat_booking_rate: repeatBookingRate,
    average_booking_value: averageBookingValue,
    last_30_days_bookings: last30DaysBookings,
    last_30_days_spent: last30DaysSpent,
  }
}

export async function getCustomerBookings(customerId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      services:service_id (
        name
      ),
      staff:staff_id (
        full_name
      ),
      hotels:hotel_id (
        name
      )
    `)
    .eq('customer_id', customerId)
    .order('booking_date', { ascending: false })

  if (error) throw error

  return (data || []).map((booking) => ({
    ...booking,
    service_name: booking.services?.name || '',
    staff_name: booking.staff?.full_name || '',
    hotel_name: booking.hotels?.name || '',
  })) as CustomerBooking[]
}

export async function updateCustomerStatus(id: string, status: CustomerStatus) {
  const { data, error } = await supabase
    .from('customers')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Customer
}

export async function updateCustomer(id: string, updates: Partial<Customer>) {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Customer
}

// ============================================
// SOS ALERT QUERIES
// ============================================

export async function getAllSOSAlerts() {
  const { data, error } = await supabase
    .from('sos_alerts')
    .select(`
      *,
      customers:customer_id (
        full_name,
        phone
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((alert) => ({
    ...alert,
    customer_name: alert.customers?.full_name || 'Unknown',
    customer_phone: alert.customers?.phone || '',
  })) as SOSAlert[]
}

export async function getPendingSOSAlerts() {
  const { data, error } = await supabase
    .from('sos_alerts')
    .select(`
      *,
      customers:customer_id (
        full_name,
        phone
      )
    `)
    .in('status', ['pending', 'acknowledged'])
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((alert) => ({
    ...alert,
    customer_name: alert.customers?.full_name || 'Unknown',
    customer_phone: alert.customers?.phone || '',
  })) as SOSAlert[]
}

export async function acknowledgeSOSAlert(id: string, adminId: string) {
  const { data, error } = await supabase
    .from('sos_alerts')
    .update({
      status: 'acknowledged',
      acknowledged_by: adminId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as SOSAlert
}

export async function resolveSOSAlert(id: string, adminId: string, notes: string) {
  const { data, error } = await supabase
    .from('sos_alerts')
    .update({
      status: 'resolved',
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
      resolution_notes: notes,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as SOSAlert
}

export async function cancelSOSAlert(id: string) {
  const { data, error } = await supabase
    .from('sos_alerts')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as SOSAlert
}

// ============================================
// STATISTICS QUERIES
// ============================================

export async function getCustomerStatistics() {
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, total_bookings, total_spent, status')

  if (error) throw error

  const total = customers?.length || 0
  const active = customers?.filter((c) => c.status === 'active').length || 0
  const suspended = customers?.filter((c) => c.status === 'suspended').length || 0
  const banned = customers?.filter((c) => c.status === 'banned').length || 0

  // Calculate customers with repeat bookings
  const repeatCustomers = customers?.filter((c) => c.total_bookings > 1).length || 0
  const repeatRate = total > 0 ? (repeatCustomers / total) * 100 : 0

  // Calculate average customer lifetime value
  const totalRevenue = customers?.reduce((sum, c) => sum + Number(c.total_spent), 0) || 0
  const averageLifetimeValue = total > 0 ? totalRevenue / total : 0

  return {
    total,
    active,
    suspended,
    banned,
    repeat_customers: repeatCustomers,
    repeat_rate: repeatRate,
    total_revenue: totalRevenue,
    average_lifetime_value: averageLifetimeValue,
  }
}
