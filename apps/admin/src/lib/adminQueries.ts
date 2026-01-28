/**
 * Admin-specific Supabase queries
 * Handles all data fetching for admin dashboard
 */

import { supabase } from '@bliss/supabase'

export interface AdminStats {
  todaySales: number
  todayBookings: number
  totalStaff: number
  activeHotels: number
}

export interface RecentBooking {
  id: string
  customer_name: string
  service_name: string
  hotel_name?: string
  scheduled_date: string
  scheduled_time: string
  total_amount: number
  status: string
}

export interface PendingStaffApplication {
  id: string
  full_name: string
  skills: string[]
  experience_years: number
  rating?: number
  applied_date: string
}

/**
 * Get dashboard statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Get today's sales
    const { data: salesData } = await supabase
      .from('bookings')
      .select('total_amount')
      .gte('scheduled_date', today)
      .eq('status', 'completed')

    const todaySales = salesData?.reduce((sum, booking) => sum + booking.total_amount, 0) || 0

    // Get today's bookings count
    const { count: todayBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_date', today)

    // Get total staff count
    const { count: totalStaff } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Get active hotels count
    const { count: activeHotels } = await supabase
      .from('hotels')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    return {
      todaySales: todaySales || 0,
      todayBookings: todayBookings || 0,
      totalStaff: totalStaff || 0,
      activeHotels: activeHotels || 0,
    }
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return {
      todaySales: 0,
      todayBookings: 0,
      totalStaff: 0,
      activeHotels: 0,
    }
  }
}

/**
 * Get recent bookings
 */
export async function getRecentBookings(limit: number = 10): Promise<RecentBooking[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_code,
        scheduled_date,
        scheduled_time,
        total_amount,
        status,
        customers!inner(full_name),
        services!inner(name_th, name_en),
        hotels(name_th, name_en)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data?.map((booking: any) => ({
      id: booking.booking_code || booking.id,
      customer_name: booking.customers?.full_name || 'Unknown Customer',
      service_name: booking.services?.name_th || booking.services?.name_en || 'Unknown Service',
      hotel_name: booking.hotels?.name_th || booking.hotels?.name_en || null,
      scheduled_date: booking.scheduled_date,
      scheduled_time: booking.scheduled_time,
      total_amount: booking.total_amount,
      status: booking.status,
    })) || []
  } catch (error) {
    console.error('Error fetching recent bookings:', error)
    return []
  }
}

/**
 * Get pending staff applications
 */
export async function getPendingStaffApplications(): Promise<PendingStaffApplication[]> {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select(`
        id,
        user_id,
        skills,
        experience_years,
        rating,
        created_at,
        profiles!inner(full_name)
      `)
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false })

    if (error) throw error

    return data?.map((staff: any) => ({
      id: staff.id,
      full_name: staff.profiles?.full_name || 'Unknown Staff',
      skills: staff.skills || [],
      experience_years: staff.experience_years || 0,
      rating: staff.rating,
      applied_date: new Date(staff.created_at).toLocaleDateString('th-TH'),
    })) || []
  } catch (error) {
    console.error('Error fetching pending staff applications:', error)
    return []
  }
}

/**
 * Approve staff application
 */
export async function approveStaff(staffId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('staff')
      .update({
        status: 'active',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', staffId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error approving staff:', error)
    return false
  }
}

/**
 * Reject staff application
 */
export async function rejectStaff(staffId: string, reason?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('staff')
      .update({
        status: 'inactive', // Using 'inactive' instead of 'REJECTED' based on enum
        rejection_reason: reason,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', staffId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error rejecting staff:', error)
    return false
  }
}

/**
 * Get popular services
 */
export async function getPopularServices(limit: number = 5) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        service_id,
        total_amount,
        services!inner(name_th, name_en)
      `)
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

    if (error) throw error

    // Aggregate by service
    const serviceStats = data?.reduce((acc: any, booking: any) => {
      const serviceName = booking.services?.name_th || booking.services?.name_en
      if (!serviceName) return acc

      if (!acc[serviceName]) {
        acc[serviceName] = {
          name: serviceName,
          bookings: 0,
          revenue: 0,
        }
      }

      acc[serviceName].bookings += 1
      acc[serviceName].revenue += booking.total_amount

      return acc
    }, {})

    // Convert to array and sort by bookings
    const popular = Object.values(serviceStats || {})
      .sort((a: any, b: any) => b.bookings - a.bookings)
      .slice(0, limit)

    return popular
  } catch (error) {
    console.error('Error fetching popular services:', error)
    return []
  }
}

/**
 * Get all services for testing
 */
export async function getAllServices() {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching services:', error)
    return []
  }
}