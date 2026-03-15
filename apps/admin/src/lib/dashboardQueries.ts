import supabase from '@/lib/supabase'

// ============================================
// TYPES
// ============================================

export interface DashboardOverview {
  todayBookings: number
  todayRevenue: number
  monthBookings: number
  monthRevenue: number
  totalStaff: number
  activeStaff: number
  totalHotels: number
  totalServices: number
  activeServices: number
  totalCustomers: number
  newCustomersToday: number
  newCustomersMonth: number
  avgBookingValue: number
}

export interface RecentBooking {
  id: string
  booking_number: string
  customer_name: string | null
  service_name: string | null
  hotel_name: string | null
  booking_date: string
  booking_time: string
  final_price: number
  status: string
  created_at: string
}

export interface PendingStaffApplication {
  id: string
  full_name: string
  phone_number: string | null
  skills: string[]
  experience_years: number
  status: string
  application_date: string
}

export interface PopularService {
  service_id: string
  name: string
  bookings: number
  revenue: number
}

export interface QuickStats {
  completedToday: number
  pendingToday: number
  cancelledToday: number
}

// ============================================
// QUERY FUNCTIONS
// ============================================

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  // Run all queries in parallel
  const [
    todayBookingsResult,
    monthBookingsResult,
    staffResult,
    hotelsResult,
    servicesResult,
    customersResult,
    newCustomersTodayResult,
    newCustomersMonthResult,
  ] = await Promise.all([
    // Today's bookings & revenue
    supabase
      .from('bookings')
      .select('final_price')
      .eq('booking_date', todayStr)
      .neq('status', 'cancelled'),

    // This month's bookings & revenue
    supabase
      .from('bookings')
      .select('final_price')
      .gte('created_at', monthStart)
      .neq('status', 'cancelled'),

    // Staff counts
    supabase
      .from('staff')
      .select('status'),

    // Hotels count
    supabase
      .from('hotels')
      .select('id', { count: 'exact', head: true }),

    // Services count
    supabase
      .from('services')
      .select('is_active'),

    // Total customers
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true }),

    // New customers today
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStr),

    // New customers this month
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart),
  ])

  const todayBookings = todayBookingsResult.data || []
  const monthBookings = monthBookingsResult.data || []
  const staffData = staffResult.data || []
  const servicesData = servicesResult.data || []

  const todayRevenue = todayBookings.reduce((sum, b) => sum + (Number(b.final_price) || 0), 0)
  const monthRevenue = monthBookings.reduce((sum, b) => sum + (Number(b.final_price) || 0), 0)
  const totalStaff = staffData.length
  const activeStaff = staffData.filter(s => s.status === 'active').length
  const totalServices = servicesData.length
  const activeServices = servicesData.filter(s => s.is_active).length

  return {
    todayBookings: todayBookings.length,
    todayRevenue,
    monthBookings: monthBookings.length,
    monthRevenue,
    totalStaff,
    activeStaff,
    totalHotels: hotelsResult.count || 0,
    totalServices,
    activeServices,
    totalCustomers: customersResult.count || 0,
    newCustomersToday: newCustomersTodayResult.count || 0,
    newCustomersMonth: newCustomersMonthResult.count || 0,
    avgBookingValue: monthBookings.length > 0 ? monthRevenue / monthBookings.length : 0,
  }
}

export async function getRecentBookings(limit: number = 10): Promise<RecentBooking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_number,
      booking_date,
      booking_time,
      final_price,
      status,
      created_at,
      customers (full_name),
      services (name_th),
      hotels (name_th)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent bookings:', error)
    return []
  }

  return (data || []).map(b => ({
    id: b.id,
    booking_number: b.booking_number,
    customer_name: (b.customers as any)?.full_name || null,
    service_name: (b.services as any)?.name_th || null,
    hotel_name: (b.hotels as any)?.name_th || null,
    booking_date: b.booking_date,
    booking_time: b.booking_time,
    final_price: Number(b.final_price) || 0,
    status: b.status,
    created_at: b.created_at,
  }))
}

export async function getPendingStaffApplications(limit: number = 5): Promise<PendingStaffApplication[]> {
  const { data, error } = await supabase
    .from('staff_applications')
    .select('id, full_name, phone_number, skills, experience_years, status, application_date')
    .eq('status', 'pending')
    .order('application_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching pending staff applications:', error)
    return []
  }

  return (data || []).map(a => ({
    id: a.id,
    full_name: a.full_name || '',
    phone_number: a.phone_number,
    skills: a.skills || [],
    experience_years: a.experience_years || 0,
    status: a.status,
    application_date: a.application_date,
  }))
}

export async function getPopularServicesThisMonth(limit: number = 5): Promise<PopularService[]> {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      service_id,
      final_price,
      services!inner (name_th)
    `)
    .gte('created_at', monthStart)
    .neq('status', 'cancelled')

  if (error) {
    console.error('Error fetching popular services:', error)
    return []
  }

  // Group by service
  const serviceMap = new Map<string, { name: string; bookings: number; revenue: number }>()

  ;(data || []).forEach(b => {
    const serviceId = b.service_id
    const serviceName = (b.services as any)?.name_th || 'Unknown'

    if (!serviceMap.has(serviceId)) {
      serviceMap.set(serviceId, { name: serviceName, bookings: 0, revenue: 0 })
    }
    const svc = serviceMap.get(serviceId)!
    svc.bookings++
    svc.revenue += Number(b.final_price) || 0
  })

  return Array.from(serviceMap.entries())
    .map(([id, svc]) => ({
      service_id: id,
      name: svc.name,
      bookings: svc.bookings,
      revenue: svc.revenue,
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, limit)
}

export async function getQuickStats(): Promise<QuickStats> {
  const todayStr = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('bookings')
    .select('status')
    .eq('booking_date', todayStr)

  if (error) {
    console.error('Error fetching quick stats:', error)
    return { completedToday: 0, pendingToday: 0, cancelledToday: 0 }
  }

  const bookings = data || []
  return {
    completedToday: bookings.filter(b => b.status === 'completed').length,
    pendingToday: bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length,
    cancelledToday: bookings.filter(b => b.status === 'cancelled').length,
  }
}
