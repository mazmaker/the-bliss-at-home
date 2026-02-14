import { supabase } from './supabase'

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

export interface CustomerAddress {
  id: string
  customer_id: string
  label: string
  recipient_name: string
  phone: string
  address_line: string
  subdistrict: string | null
  district: string | null
  province: string
  zipcode: string
  latitude: number | null
  longitude: number | null
  is_default: boolean | null
  created_at: string
  updated_at: string
}

export interface CustomerTaxInfo {
  id: string
  customer_id: string
  tax_type: string
  tax_id: string
  company_name: string | null
  branch_code: string | null
  address_line: string
  subdistrict: string | null
  district: string | null
  province: string
  zipcode: string
  created_at: string
  updated_at: string
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


// ============================================
// CUSTOMER QUERIES
// ============================================

export async function getAllCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  const customers = data || []

  // Fetch emails from profiles table (no FK, so separate query)
  const profileIds = customers.map((c) => c.profile_id).filter(Boolean)
  let emailMap: Record<string, string> = {}
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', profileIds)
    if (profiles) {
      emailMap = Object.fromEntries(profiles.map((p) => [p.id, p.email || '']))
    }
  }

  return customers.map((customer) => ({
    ...customer,
    email: customer.profile_id ? emailMap[customer.profile_id] || '' : '',
  })) as Customer[]
}

export async function getCustomerById(id: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  // Fetch email from profiles table
  let email = ''
  if (data.profile_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', data.profile_id)
      .single()
    email = profile?.email || ''
  }

  return { ...data, email } as Customer
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
        name_th
      ),
      staff:staff_id (
        name_th
      )
    `)
    .eq('customer_id', customerId)
    .order('booking_date', { ascending: false })

  if (error) throw error

  return (data || []).map((booking) => ({
    ...booking,
    service_name: booking.services?.name_th || '',
    staff_name: booking.staff?.name_th || '',
    hotel_name: '',
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
// CUSTOMER ADDRESSES & TAX INFO QUERIES
// ============================================

export async function getCustomerAddresses(customerId: string) {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as CustomerAddress[]
}

export async function getCustomerTaxInfo(customerId: string) {
  const { data, error } = await supabase
    .from('tax_information')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle()

  if (error) throw error
  return data as CustomerTaxInfo | null
}

// ============================================
// ADDRESS CRUD
// ============================================

export async function createCustomerAddress(
  customerId: string,
  addressData: Omit<CustomerAddress, 'id' | 'customer_id' | 'created_at' | 'updated_at'>
) {
  // If setting as default, unset other defaults first
  if (addressData.is_default) {
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId)
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert({ customer_id: customerId, ...addressData })
    .select()
    .single()

  if (error) throw error
  return data as CustomerAddress
}

export async function updateCustomerAddress(
  id: string,
  customerId: string,
  addressData: Partial<Omit<CustomerAddress, 'id' | 'customer_id' | 'created_at' | 'updated_at'>>
) {
  // If setting as default, unset other defaults first
  if (addressData.is_default) {
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId)
      .neq('id', id)
  }

  const { data, error } = await supabase
    .from('addresses')
    .update(addressData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as CustomerAddress
}

export async function deleteCustomerAddress(id: string) {
  const { error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function setDefaultAddress(customerId: string, addressId: string) {
  // Unset all defaults
  await supabase
    .from('addresses')
    .update({ is_default: false })
    .eq('customer_id', customerId)

  // Set the selected one
  const { data, error } = await supabase
    .from('addresses')
    .update({ is_default: true })
    .eq('id', addressId)
    .select()
    .single()

  if (error) throw error
  return data as CustomerAddress
}

// ============================================
// TAX INFO CRUD
// ============================================

export async function upsertCustomerTaxInfo(
  customerId: string,
  taxData: Omit<CustomerTaxInfo, 'id' | 'customer_id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('tax_information')
    .upsert(
      { customer_id: customerId, ...taxData },
      { onConflict: 'customer_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data as CustomerTaxInfo
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
