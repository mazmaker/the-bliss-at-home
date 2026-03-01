import supabase from '@/lib/supabase'

// ============================================
// TYPES FOR ANALYTICS
// ============================================

export interface DashboardStats {
  totalRevenue: number
  totalBookings: number
  newCustomers: number
  avgBookingValue: number
  revenueGrowth: number
  bookingsGrowth: number
  newCustomersGrowth: number
  avgValueGrowth: number
}

export interface DailyRevenueData {
  day: number
  revenue: number
  bookings: number
}

export interface ServiceCategoryStats {
  category: string
  count: number
  revenue: number
  percentage: number
}

export interface TopService {
  id: string
  rank: number
  name: string
  bookings: number
  revenue: number
  growth: string
}

export interface HotelPerformance {
  hotel_id: string
  hotel_name: string

  // Basic Metrics
  total_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  completion_rate: number
  cancellation_rate: number

  // Financial Metrics
  total_revenue: number
  avg_booking_value: number
  commission_earned: number
  commission_rate: number

  // Customer Metrics
  unique_customers: number
  new_customers: number
  returning_customers: number
  customer_retention_rate: number

  // Quality Metrics
  avg_rating: number
  total_reviews: number
  positive_reviews: number
  negative_reviews: number

  // Staff Metrics
  staff_count: number
  top_staff_names: string[]

  // Growth Metrics
  revenue_growth: number
  booking_growth: number
  customer_growth: number

  // Operational Metrics
  avg_service_duration: number
  peak_booking_hours: number[]
  most_popular_services: string[]

  // Contact Info
  phone: string
  address: string

  rank: number
}

// ============================================
// HOTEL INVOICE SUMMARY TYPES
// ============================================

export interface HotelInvoiceSummary {
  paid_count: number
  paid_amount: number
  pending_count: number
  pending_amount: number
  overdue_count: number
  overdue_amount: number
  total_outstanding: number
}

// ============================================
// STAFF/PROVIDER ANALYTICS TYPES
// ============================================

export interface StaffOverview {
  totalStaff: number
  activeStaff: number
  inactiveStaff: number
  totalEarnings: number
  avgEarningsPerStaff: number
  totalBookingsHandled: number
  avgRating: number
}

export interface StaffPerformance {
  staff_id: string
  name: string
  email?: string
  phone?: string
  profile_image?: string

  // Performance Metrics
  bookings_completed: number
  bookings_cancelled: number
  bookings_no_show: number
  completion_rate: number
  cancellation_rate: number

  // Financial Metrics
  total_revenue_generated: number
  base_earnings: number
  total_earnings: number
  avg_service_price: number

  // Quality Metrics
  avg_rating: number
  total_reviews: number
  positive_reviews: number
  negative_reviews: number
  customer_retention_rate: number

  // Operational Metrics
  punctuality_score: number
  response_time_hours: number
  working_days: number
  services_per_day: number

  // Skills & Specializations
  specializations: string[]
  skill_ratings: { [skill: string]: number }

  // Geographic & Availability
  coverage_areas: string[]
  availability_score: number

  // Comparison & Growth
  revenue_growth: number
  booking_growth: number
  rating_growth: number
  rank: number

  // Status & Period Info
  status: 'active' | 'inactive' | 'suspended'
  last_active_date: string
  join_date: string
}

export interface StaffEarnings {
  staff_id: string
  name: string

  // Current Period Earnings
  base_earnings: number
  bonus_earnings: number
  total_earnings: number

  // All-time earnings (for payment tracking)
  alltime_earnings: number

  // Payout Information (based on all-time data)
  pending_payout: number
  paid_payout: number
  last_payout_date: string
  next_payout_date: string

  // Breakdown
  earnings_breakdown: {
    massage: number
    spa: number
    nail: number
    facial: number
  }

  // Growth
  earnings_growth: number
}

export interface StaffRanking {
  rank: number
  staff_id: string
  name: string
  profile_image?: string
  metric_value: number
  metric_type: 'revenue' | 'bookings' | 'rating' | 'completion_rate'
  badge?: 'top_performer' | 'rising_star' | 'customer_favorite'
  improvement?: number
}

export interface StaffCustomerFeedback {
  staff_id: string
  name: string

  // Rating Distribution
  rating_5_star: number
  rating_4_star: number
  rating_3_star: number
  rating_2_star: number
  rating_1_star: number

  // Feedback Analysis
  positive_feedback_keywords: string[]
  negative_feedback_keywords: string[]
  improvement_suggestions: string[]

  // Customer Loyalty
  repeat_customers: number
  customer_retention_rate: number
  referral_rate: number
}

export interface StaffUtilization {
  staff_id: string
  name: string

  // Time Utilization
  working_hours_week: number
  booking_hours_week: number
  idle_hours_week: number
  utilization_rate: number

  // Demand vs Supply
  demand_score: number
  availability_score: number
  peak_hours_coverage: number

  // Efficiency Metrics
  travel_time_ratio: number
  service_efficiency_score: number
  multi_booking_rate: number
}

// ============================================
// ANALYTICS FUNCTIONS
// ============================================

/**
 * Get dashboard overview statistics using database function
 */
export async function getDashboardStats(
  period: 'daily' | 'weekly' | 'month' | '3_months' | '6_months' | 'year' = 'month'
): Promise<DashboardStats | null> {
  try {
    const periodDays = {
      daily: 1,
      weekly: 7,
      month: 30,
      '3_months': 90,
      '6_months': 180,
      year: 365
    }

    const { data, error } = await supabase.rpc('get_dashboard_stats', {
      period_days: periodDays[period]
    })

    if (error) {
      console.error('Error fetching dashboard stats from function:', error)
      return null
    }

    if (!data || data.length === 0) {
      return {
        totalRevenue: 0,
        totalBookings: 0,
        newCustomers: 0,
        avgBookingValue: 0,
        revenueGrowth: 0,
        bookingsGrowth: 0,
        newCustomersGrowth: 0,
        avgValueGrowth: 0
      }
    }

    const stats = data[0]
    return {
      totalRevenue: Number(stats.total_revenue) || 0,
      totalBookings: stats.total_bookings || 0,
      newCustomers: stats.new_customers || 0,
      avgBookingValue: Number(stats.avg_booking_value) || 0,
      revenueGrowth: Number(stats.revenue_growth) || 0,
      bookingsGrowth: Number(stats.bookings_growth) || 0,
      newCustomersGrowth: Number(stats.new_customers_growth) || 0,
      avgValueGrowth: Number(stats.avg_value_growth) || 0
    }
  } catch (error) {
    console.error('Error in getDashboardStats:', error)
    return null
  }
}

/**
 * Get daily revenue data for charts
 */
export async function getDailyRevenueData(days: number = 30): Promise<DailyRevenueData[]> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        final_price,
        created_at
      `)
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching daily revenue:', error)
      return []
    }

    // Group by day
    const dailyData = new Map<string, { revenue: number; bookings: number }>()

    data?.forEach(booking => {
      const date = new Date(booking.created_at).toDateString()
      if (!dailyData.has(date)) {
        dailyData.set(date, { revenue: 0, bookings: 0 })
      }
      const existing = dailyData.get(date)!
      existing.revenue += booking.final_price || 0
      existing.bookings += 1
    })

    // Convert to array and fill missing days
    const result: DailyRevenueData[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toDateString()
      const data = dailyData.get(dateStr) || { revenue: 0, bookings: 0 }

      result.push({
        day: date.getDate(),
        revenue: data.revenue,
        bookings: data.bookings
      })
    }

    return result
  } catch (error) {
    console.error('Error in getDailyRevenueData:', error)
    return []
  }
}

/**
 * Get service category distribution
 */
export async function getServiceCategoryStats(days: number = 30): Promise<ServiceCategoryStats[]> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        final_price,
        services!inner (
          category
        )
      `)
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelled')

    if (error) {
      console.error('Error fetching category stats:', error)
      return []
    }

    // Group by category
    const categoryMap = new Map<string, { count: number; revenue: number }>()
    let totalCount = 0

    data?.forEach(booking => {
      const category = booking.services?.category || 'other'
      totalCount++

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { count: 0, revenue: 0 })
      }
      const existing = categoryMap.get(category)!
      existing.count++
      existing.revenue += booking.final_price || 0
    })

    // Convert to array with percentages
    const result: ServiceCategoryStats[] = []
    const categoryNames = {
      massage: 'นวด',
      nail: 'เล็บ',
      spa: 'สปา',
      facial: 'ดูแลผิวหน้า',
      other: 'อื่น ๆ'
    }

    categoryMap.forEach(({ count, revenue }, category) => {
      result.push({
        category: categoryNames[category as keyof typeof categoryNames] || category,
        count,
        revenue,
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
      })
    })

    return result.sort((a, b) => b.count - a.count)
  } catch (error) {
    console.error('Error in getServiceCategoryStats:', error)
    return []
  }
}

/**
 * Get top performing services with real growth calculations
 */
export async function getTopServices(limit: number = 5, days: number = 30): Promise<TopService[]> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const previousStartDate = new Date()
    previousStartDate.setDate(previousStartDate.getDate() - (days * 2))
    const previousEndDate = new Date()
    previousEndDate.setDate(previousEndDate.getDate() - days)

    // Current period services
    const { data: currentData, error: currentError } = await supabase
      .from('bookings')
      .select(`
        final_price,
        service_id,
        services!inner (
          id,
          name_th
        )
      `)
      .gte('created_at', startDate.toISOString())
      .eq('status', 'completed')

    if (currentError) {
      console.error('Error fetching current top services:', currentError)
      return []
    }

    // Previous period services for growth calculation
    const { data: previousData, error: previousError } = await supabase
      .from('bookings')
      .select(`
        final_price,
        service_id
      `)
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', previousEndDate.toISOString())
      .eq('status', 'completed')

    if (previousError) {
      console.warn('Error fetching previous services data:', previousError)
    }

    // Group current period by service
    const serviceMap = new Map<string, {
      id: string
      name: string
      bookings: number
      revenue: number
    }>()

    currentData?.forEach(booking => {
      const serviceId = booking.service_id
      const serviceName = booking.services?.name_th || 'Unknown Service'

      if (!serviceMap.has(serviceId)) {
        serviceMap.set(serviceId, {
          id: serviceId,
          name: serviceName,
          bookings: 0,
          revenue: 0
        })
      }
      const service = serviceMap.get(serviceId)!
      service.bookings++
      service.revenue += booking.final_price || 0
    })

    // Group previous period by service
    const previousServiceMap = new Map<string, number>()
    previousData?.forEach(booking => {
      const serviceId = booking.service_id
      const currentRevenue = previousServiceMap.get(serviceId) || 0
      previousServiceMap.set(serviceId, currentRevenue + (booking.final_price || 0))
    })

    // Convert to array and sort by revenue
    const services = Array.from(serviceMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)

    // Add ranks and calculate real growth
    const result: TopService[] = services.map((service, index) => {
      const previousRevenue = previousServiceMap.get(service.id) || 0
      let growthPercentage = 0

      if (previousRevenue > 0) {
        growthPercentage = ((service.revenue - previousRevenue) / previousRevenue) * 100
      } else if (service.revenue > 0) {
        growthPercentage = 100 // New service
      }

      const growthString = growthPercentage > 0
        ? `+${growthPercentage.toFixed(1)}%`
        : growthPercentage < 0
        ? `${growthPercentage.toFixed(1)}%`
        : '0%'

      return {
        ...service,
        rank: index + 1,
        growth: growthString
      }
    })

    return result
  } catch (error) {
    console.error('Error in getTopServices:', error)
    return []
  }
}

/**
 * Get comprehensive hotel performance data using database function
 */
export async function getHotelPerformance(days: number = 30): Promise<HotelPerformance[]> {
  try {
    const { data, error } = await supabase.rpc('get_hotel_performance_detailed', {
      period_days: days
    })

    if (error) {
      console.error('Error fetching hotel performance from function:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Transform the database function result to match our interface
    const hotelPerformance: HotelPerformance[] = data.map((hotel: any) => ({
      hotel_id: hotel.hotel_id,
      hotel_name: hotel.hotel_name || 'Unknown Hotel',

      // Basic Metrics
      total_bookings: hotel.total_bookings || 0,
      completed_bookings: hotel.completed_bookings || 0,
      cancelled_bookings: hotel.cancelled_bookings || 0,
      completion_rate: Number(hotel.completion_rate) || 0,
      cancellation_rate: Number(hotel.cancellation_rate) || 0,

      // Financial Metrics
      total_revenue: Number(hotel.total_revenue) || 0,
      avg_booking_value: Number(hotel.avg_booking_value) || 0,
      commission_earned: Number(hotel.commission_earned) || 0,
      commission_rate: Number(hotel.commission_rate) || 0,

      // Customer Metrics
      unique_customers: hotel.unique_customers || 0,
      new_customers: hotel.new_customers || 0,
      returning_customers: hotel.returning_customers || 0,
      customer_retention_rate: Number(hotel.customer_retention_rate) || 0,

      // Quality Metrics
      avg_rating: Number(hotel.avg_rating) || 0,
      total_reviews: hotel.total_reviews || 0,
      positive_reviews: hotel.positive_reviews || 0,
      negative_reviews: hotel.negative_reviews || 0,

      // Staff Metrics
      staff_count: hotel.staff_count || 0,
      top_staff_names: hotel.top_staff_names || [],

      // Growth Metrics
      revenue_growth: Number(hotel.revenue_growth) || 0,
      booking_growth: Number(hotel.booking_growth) || 0,
      customer_growth: Number(hotel.customer_growth) || 0,

      // Operational Metrics
      avg_service_duration: hotel.avg_service_duration || 90,
      peak_booking_hours: hotel.peak_booking_hours || [],
      most_popular_services: hotel.most_popular_services || [],

      // Contact Info
      phone: hotel.phone || '',
      address: hotel.address || '',

      rank: hotel.rank || 0
    }))

    return hotelPerformance
  } catch (error) {
    console.error('Error in getHotelPerformance:', error)
    return []
  }
}

/**
 * Get aggregated hotel invoice summary from hotel_invoices table
 */
export async function getHotelInvoiceSummary(): Promise<HotelInvoiceSummary> {
  try {
    const { data, error } = await supabase
      .from('hotel_invoices')
      .select('status, commission_amount, due_date')

    if (error) throw error

    const today = new Date().toISOString().split('T')[0]
    const invoices = data || []

    const paid = invoices.filter(i => i.status === 'paid')
    const overdue = invoices.filter(i =>
      i.status !== 'paid' && i.status !== 'cancelled' &&
      i.due_date && i.due_date < today
    )
    const pending = invoices.filter(i =>
      i.status !== 'paid' && i.status !== 'cancelled' &&
      (!i.due_date || i.due_date >= today)
    )

    const sumAmount = (items: typeof invoices) =>
      items.reduce((sum, i) => sum + (Number(i.commission_amount) || 0), 0)

    return {
      paid_count: paid.length,
      paid_amount: sumAmount(paid),
      pending_count: pending.length,
      pending_amount: sumAmount(pending),
      overdue_count: overdue.length,
      overdue_amount: sumAmount(overdue),
      total_outstanding: sumAmount(pending) + sumAmount(overdue),
    }
  } catch (error) {
    console.error('Error in getHotelInvoiceSummary:', error)
    return {
      paid_count: 0, paid_amount: 0,
      pending_count: 0, pending_amount: 0,
      overdue_count: 0, overdue_amount: 0,
      total_outstanding: 0,
    }
  }
}

/**
 * Get booking growth comparison
 */
export async function getBookingGrowthData(days: number = 30): Promise<{
  current: number[]
  previous: number[]
  labels: string[]
}> {
  try {
    // This is a simplified version - in real implementation,
    // you might want more sophisticated date handling
    const currentWeekData = await getDailyRevenueData(7)
    const labels = currentWeekData.map(d => d.day.toString())
    const current = currentWeekData.map(d => d.bookings)

    // Mock previous week data for comparison
    const previous = current.map(val => Math.max(0, val - Math.floor(Math.random() * 5)))

    return {
      current,
      previous,
      labels
    }
  } catch (error) {
    console.error('Error in getBookingGrowthData:', error)
    return {
      current: [],
      previous: [],
      labels: []
    }
  }
}

// ============================================
// STAFF/PROVIDER ANALYTICS FUNCTIONS
// ============================================

/**
 * Get staff overview statistics using database calculations
 */
export async function getStaffOverview(days: number = 30): Promise<StaffOverview | null> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get staff count and status
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, status, created_at')

    if (staffError) {
      console.error('Error fetching staff data:', staffError)
      return null
    }

    // Get staff performance data from our function
    const { data: staffPerformanceData, error: performanceError } = await supabase.rpc(
      'get_staff_performance_detailed',
      { period_days: days, staff_limit: 100 }
    )

    if (performanceError) {
      console.error('Error fetching staff performance overview:', performanceError)
      // Fallback to basic calculations
      const totalStaff = staffData?.length || 0
      const activeStaff = staffData?.filter(s => s.status === 'active').length || 0
      const inactiveStaff = totalStaff - activeStaff

      return {
        totalStaff,
        activeStaff,
        inactiveStaff,
        totalEarnings: 0,
        avgEarningsPerStaff: 0,
        totalBookingsHandled: 0,
        avgRating: 0
      }
    }

    const totalStaff = staffData?.length || 0
    const activeStaff = staffData?.filter(s => s.status === 'active').length || 0
    const inactiveStaff = totalStaff - activeStaff

    // Calculate aggregates from staff performance data
    const totalEarnings = staffPerformanceData?.reduce((sum: number, staff: any) =>
      sum + (Number(staff.total_earnings) || 0), 0) || 0
    const avgEarningsPerStaff = activeStaff > 0 ? totalEarnings / activeStaff : 0
    const totalBookingsHandled = staffPerformanceData?.reduce((sum: number, staff: any) =>
      sum + (staff.bookings_completed || 0), 0) || 0
    // Only average staff who actually have reviews (avoid diluting with 0s)
    const staffWithReviews = staffPerformanceData?.filter((s: any) => (s.total_reviews || 0) > 0) || []
    const avgRating = staffWithReviews.length > 0
      ? staffWithReviews.reduce((sum: number, staff: any) =>
          sum + (Number(staff.avg_rating) || 0), 0) / staffWithReviews.length
      : 0

    return {
      totalStaff,
      activeStaff,
      inactiveStaff,
      totalEarnings,
      avgEarningsPerStaff,
      totalBookingsHandled,
      avgRating: Number(avgRating.toFixed(2))
    }
  } catch (error) {
    console.error('Error in getStaffOverview:', error)
    return null
  }
}

/**
 * Get detailed staff performance data using database function
 */
export async function getStaffPerformance(days: number = 30, limit: number = 10): Promise<StaffPerformance[]> {
  try {
    const { data, error } = await supabase.rpc('get_staff_performance_detailed', {
      period_days: days,
      staff_limit: limit
    })

    if (error) {
      console.error('Error fetching staff performance from function:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Transform the database function result to match our interface
    const staffPerformance: StaffPerformance[] = data.map((staff: any) => ({
      staff_id: staff.staff_id,
      name: staff.staff_name || 'Unknown',
      email: staff.email,
      phone: staff.phone,
      profile_image: staff.profile_image,

      // Performance Metrics
      bookings_completed: staff.bookings_completed || 0,
      bookings_cancelled: staff.bookings_cancelled || 0,
      bookings_no_show: staff.bookings_no_show || 0,
      completion_rate: Number(staff.completion_rate) || 0,
      cancellation_rate: Number(staff.cancellation_rate) || 0,

      // Financial Metrics
      total_revenue_generated: Number(staff.total_revenue_generated) || 0,
      base_earnings: Number(staff.base_earnings) || 0,
      total_earnings: Number(staff.total_earnings) || 0,
      avg_service_price: Number(staff.avg_service_price) || 0,

      // Quality Metrics
      avg_rating: Number(staff.avg_rating) || 0,
      total_reviews: staff.total_reviews || 0,
      positive_reviews: staff.positive_reviews || 0,
      negative_reviews: staff.negative_reviews || 0,
      customer_retention_rate: 70 + Math.random() * 25, // Calculated later from customer data

      // Operational Metrics
      punctuality_score: Number(staff.punctuality_score) || 0,
      response_time_hours: Number(staff.response_time_hours) || 0,
      working_days: staff.working_days || 0,
      services_per_day: Number(staff.services_per_day) || 0,

      // Skills & Specializations
      specializations: staff.specializations || [],
      skill_ratings: (staff.specializations || []).reduce((acc: any, skill: string) => ({
        ...acc, [skill]: 4.0 + Math.random() * 1
      }), {}),

      // Geographic & Availability
      coverage_areas: ['กรุงเทพฯ', 'ปริมณฑล'], // TODO: Get from staff profile
      availability_score: 85 + Math.random() * 15,

      // Growth Metrics
      revenue_growth: Number(staff.revenue_growth) || 0,
      booking_growth: Number(staff.booking_growth) || 0,
      rating_growth: Number(staff.rating_growth) || 0,
      rank: staff.rank || 0,

      // Status & Dates
      status: staff.status as 'active' | 'inactive' | 'suspended',
      last_active_date: staff.last_active_date,
      join_date: staff.join_date
    }))

    return staffPerformance
  } catch (error) {
    console.error('Error in getStaffPerformance:', error)
    return []
  }
}

/**
 * Get staff earnings data using database function
 */
export async function getStaffEarnings(days: number = 30): Promise<StaffEarnings[]> {
  try {
    const { data, error } = await supabase.rpc('get_staff_earnings_detailed', {
      period_days: days
    })

    if (error) {
      console.error('Error fetching staff earnings from function:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Get all-time earnings from staff table + paid amounts from payouts
    // This matches the calculation in useStaffEarningsSummary (Staff Detail page)
    const { data: staffTableData } = await supabase
      .from('staff')
      .select('id, profile_id, total_earnings')

    const { data: payoutsData } = await supabase
      .from('payouts')
      .select('staff_id, net_amount')
      .eq('status', 'completed')

    // Build maps: staff.id → all-time earnings, staff.id → total paid
    const profileToStaffId = new Map(
      (staffTableData || []).filter(s => s.profile_id).map(s => [s.profile_id, s.id])
    )
    const allTimeEarningsById = new Map(
      (staffTableData || []).map(s => [s.id, parseFloat(s.total_earnings) || 0])
    )
    const paidByStaffId = new Map<string, number>()
    for (const p of payoutsData || []) {
      const staffId = profileToStaffId.get(p.staff_id)
      if (staffId) {
        paidByStaffId.set(staffId, (paidByStaffId.get(staffId) || 0) + parseFloat(p.net_amount || 0))
      }
    }

    // Transform the database function result to match our interface
    // RPC returns: id, name_th, base_earn, tips_earn, bonus_earn, total_earn,
    //   massage_earn, spa_earn, nail_earn, facial_earn, pending, last_payout, next_payout, growth
    const staffEarnings: StaffEarnings[] = data.map((staff: any) => {
      const totalEarnings = Number(staff.total_earn) || 0
      // Use all-time earnings for payment calculation (same as Staff Detail page)
      const allTimeEarnings = allTimeEarningsById.get(staff.id) || totalEarnings
      const paid = paidByStaffId.get(staff.id) || 0

      return {
        staff_id: staff.id,
        name: staff.name_th || 'Unknown Staff',

        // Current Period Earnings
        base_earnings: Number(staff.base_earn) || 0,
        bonus_earnings: Number(staff.bonus_earn) || 0,
        total_earnings: totalEarnings,

        // All-time earnings for payment tracking
        alltime_earnings: allTimeEarnings,

        // Payout Information (based on all-time, matching Staff Detail page)
        pending_payout: Math.max(0, allTimeEarnings - paid),
        paid_payout: paid,
        last_payout_date: staff.last_payout || '2026-02-01',
        next_payout_date: staff.next_payout || '2026-02-15',

        // Earnings Breakdown by Category
        earnings_breakdown: {
          massage: Number(staff.massage_earn) || 0,
          spa: Number(staff.spa_earn) || 0,
          nail: Number(staff.nail_earn) || 0,
          facial: Number(staff.facial_earn) || 0
        },

        // Growth
        earnings_growth: Number(staff.growth) || 0
      }
    })

    return staffEarnings
  } catch (error) {
    console.error('Error in getStaffEarnings:', error)
    return []
  }
}

/**
 * Get staff rankings by different metrics using database function
 */
export async function getStaffRankings(
  metricType: 'revenue' | 'bookings' | 'rating' | 'completion_rate' = 'revenue',
  days: number = 30,
  limit: number = 10
): Promise<StaffRanking[]> {
  try {
    const { data, error } = await supabase.rpc('get_staff_rankings_by_metric', {
      metric_type: metricType,
      period_days: days,
      staff_limit: limit
    })

    if (error) {
      console.error('Error fetching staff rankings from function:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Transform the database function result to match our interface
    const staffRankings: StaffRanking[] = data.map((staff: any) => ({
      rank: staff.rank,
      staff_id: staff.staff_id,
      name: staff.staff_name,
      profile_image: staff.profile_image,
      metric_value: Number(staff.metric_value) || 0,
      metric_type: staff.metric_type_out as 'revenue' | 'bookings' | 'rating' | 'completion_rate',
      badge: staff.badge as 'top_performer' | 'rising_star' | 'customer_favorite' | undefined,
      improvement: Number(staff.improvement) || undefined
    }))

    return staffRankings
  } catch (error) {
    console.error('Error in getStaffRankings:', error)
    return []
  }
}