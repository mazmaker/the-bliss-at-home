/**
 * Secure Bookings API v2 - Professional Approach
 * ใช้ Supabase Auth Context แทน manual JWT verification
 */

import * as dotenv from 'dotenv'
dotenv.config()

import { Router, Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import { staffAssignmentService } from '../services/staffAssignmentService'
import { sendBookingConfirmedNotifications } from '../services/notificationService.js'

// Extend Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    role: string
    email?: string
    hotel_id?: string
  }
}

const router = Router()

// Service Role Supabase (bypass RLS)
const serviceSupabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// User Context Supabase (for auth verification)
const createUserSupabase = (token: string) => {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

// Middleware: Authenticate using Supabase's built-in verification (ORIGINAL VERSION)
async function authenticateSupabaseUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    console.log('🔍 Auth middleware - checking token...')
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      console.log('❌ No token provided')
      return res.status(401).json({ error: 'No token provided' })
    }

    console.log('🔍 Token length:', token.length)

    // Use Supabase to verify the token (original way)
    const userSupabase = createUserSupabase(token)
    const { data: { user }, error } = await userSupabase.auth.getUser()

    if (error || !user) {
      console.log('❌ Auth getUser failed:', error?.message)
      return res.status(401).json({ error: 'Invalid token', details: error?.message })
    }

    console.log('✅ Auth getUser success:', user.id)

    // Get user profile using service role
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('id, role, email, hotel_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.log('❌ Profile lookup failed:', profileError?.message)
      return res.status(401).json({ error: 'User profile not found', details: profileError?.message })
    }

    console.log('✅ Profile found:', profile.role, profile.email)

    // Attach to request
    req.user = profile
    next()

  } catch (error: any) {
    console.log('💥 Auth middleware error:', error.message)
    return res.status(401).json({ error: 'Authentication failed', details: error.message })
  }
}

// Middleware: Check Hotel Role
function requireHotelRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'HOTEL') {
    return res.status(403).json({
      error: 'Forbidden: Hotel role required',
      userRole: req.user?.role
    })
  }
  next()
}

// POST /api/secure-bookings-v2 - Create Booking (Professional Way)
router.post('/', authenticateSupabaseUser, requireHotelRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Debug: Log incoming request data
    console.log('🏨 [BOOKING API] Incoming request data:')
    console.log('   hotel_id from body:', req.body.hotel_id)
    console.log('   user role:', req.user?.role)
    console.log('   user email:', req.user?.email)

    // Extract services data separately (it goes to booking_services table)
    const { services, ...bookingFields } = req.body

    // Determine service_format from recipient_count
    // Valid values: 'single', 'simultaneous', 'sequential'
    const recipientCount = bookingFields.recipient_count || 1
    const isCoupleBooking = recipientCount > 1

    const bookingData = {
      ...bookingFields,
      hotel_id: req.body.hotel_id,
      customer_id: null, // Hotel guests don't have accounts
      is_hotel_booking: true,
      service_format: isCoupleBooking ? 'simultaneous' : 'single',
    }

    console.log('🏨 [HOTEL BOOKING] is_hotel_booking: true, service_format:', bookingData.service_format)

    // Validate required fields
    const requiredFields = ['hotel_id', 'service_id', 'booking_date', 'booking_time', 'duration', 'base_price', 'final_price']
    const missing = requiredFields.filter(field => !bookingData[field])

    if (missing.length > 0) {
      console.log('❌ [VALIDATION] Missing required fields:', missing)
      return res.status(400).json({ error: 'Missing required fields', missing })
    }

    // Check for duplicate hotel room booking (same room + date + time)
    if (bookingData.hotel_room_number) {
      const { data: roomConflict } = await serviceSupabase
        .from('bookings')
        .select('id, booking_number')
        .eq('hotel_id', bookingData.hotel_id)
        .eq('hotel_room_number', bookingData.hotel_room_number)
        .eq('booking_date', bookingData.booking_date)
        .eq('booking_time', bookingData.booking_time)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .limit(1)

      if (roomConflict && roomConflict.length > 0) {
        console.log('❌ [DUPLICATE] Room conflict:', roomConflict[0].booking_number)
        return res.status(409).json({
          error: 'DUPLICATE_BOOKING',
          message: `ห้อง ${bookingData.hotel_room_number} มีการจองในวันและเวลาเดียวกันอยู่แล้ว (${roomConflict[0].booking_number}) กรุณาเลือกเวลาอื่น`,
        })
      }
    }

    // Insert booking
    const { data: booking, error: bookingError } = await serviceSupabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()

    if (bookingError) {
      console.log('❌ [DATABASE] Booking insertion failed:', bookingError.message)
      return res.status(500).json({
        error: 'Failed to create booking',
        details: bookingError.message
      })
    }

    console.log('✅ [DATABASE] Booking created:', booking.id, booking.booking_number)

    // Insert booking_services
    if (services && services.length > 0) {
      const bookingServices = services.map((service: any) => ({
        booking_id: booking.id,
        service_id: service.service_id,
        duration: service.duration,
        price: service.price,
        recipient_index: service.recipient_index || 0,
        sort_order: service.sort_order || 0
      }))

      const { error: servicesError } = await serviceSupabase
        .from('booking_services')
        .insert(bookingServices)

      if (servicesError) {
        await serviceSupabase.from('bookings').delete().eq('id', booking.id)
        return res.status(500).json({
          error: 'Failed to create booking services',
          details: servicesError.message
        })
      }
    }

    // Create job records — one per booking_service (therapist)
    console.log('📋 [JOBS] Creating job records for staff assignment...')

    // Extract guest info from customer_notes
    const guestNameMatch = booking.customer_notes?.match(/Guest:\s*([^,]+)/)
    const guestPhoneMatch = booking.customer_notes?.match(/Phone:\s*([^,]+)/)
    const guestName = guestNameMatch ? guestNameMatch[1].trim() : 'Hotel Guest'
    const guestPhone = guestPhoneMatch ? guestPhoneMatch[1].trim() : '0000000000'

    // Get hotel details
    const { data: hotel } = await serviceSupabase
      .from('hotels')
      .select('name_th')
      .eq('id', booking.hotel_id)
      .single()

    const hotelName = hotel?.name_th || 'Hotel'

    // Determine how many jobs to create from booking_services
    const jobSources = (services && services.length > 0)
      ? services
      : [{ service_id: booking.service_id, duration: booking.duration, price: booking.final_price, recipient_index: 0 }]

    const totalJobs = jobSources.length

    const jobInserts = await Promise.all(
      jobSources.map(async (svc: any, index: number) => {
        // Get service name and commission rate for each job
        const { data: svcDetail } = await serviceSupabase
          .from('services')
          .select('name_th, name_en, staff_commission_rate')
          .eq('id', svc.service_id)
          .single()

        const commissionRate = Number(svcDetail?.staff_commission_rate) || 0.3
        const earnings = Math.round(Number(svc.price) * commissionRate)

        return {
          booking_id: booking.id,
          customer_id: null, // Hotel guests don't have accounts
          hotel_id: booking.hotel_id,
          customer_name: guestName,
          customer_phone: guestPhone,
          hotel_name: hotelName,
          room_number: booking.hotel_room_number,
          address: `โรงแรม ${hotelName}`,
          latitude: booking.latitude,
          longitude: booking.longitude,
          service_name: svcDetail?.name_th || 'บริการนวด',
          service_name_en: svcDetail?.name_en || 'Massage Service',
          duration_minutes: svc.duration,
          scheduled_date: booking.booking_date,
          scheduled_time: booking.booking_time,
          amount: svc.price,
          staff_earnings: earnings,
          status: 'pending' as const,
          customer_notes: booking.customer_notes,
          job_index: index + 1,
          total_jobs: totalJobs,
        }
      })
    )

    const { data: jobs, error: jobError } = await serviceSupabase
      .from('jobs')
      .insert(jobInserts)
      .select()

    if (jobError) {
      console.log('⚠️ [JOBS] Failed to create jobs:', jobError.message)
    } else {
      console.log(`✅ [JOBS] Created ${jobs.length} job(s) for booking ${booking.booking_number}`)
      jobs.forEach((j: any) => console.log(`   🎯 Job ${j.job_index}/${j.total_jobs}: ${j.id}`))
    }

    // Send notifications to available staff + admins (same as customer booking flow)
    let notificationResult = { staffNotified: 0, adminsNotified: 0 }
    if (jobs && jobs.length > 0) {
      try {
        const jobIds = jobs.map((j: any) => j.id)
        notificationResult = await sendBookingConfirmedNotifications(booking.id, jobIds)
        console.log(`📱 [NOTIFICATIONS] Hotel booking notifications sent: staff=${notificationResult.staffNotified}, admins=${notificationResult.adminsNotified}`)
      } catch (notifError: any) {
        console.error('⚠️ [NOTIFICATIONS] Failed (non-blocking):', notifError.message)
      }
    }

    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking created successfully - waiting for staff to accept',
      jobs: jobs || [],
      notifications: notificationResult,
      staffAssignment: {
        success: false,
        message: 'Manual staff acceptance required - booking is pending',
        status: 'pending_staff_acceptance'
      }
    })

  } catch (error: any) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
})

// GET /api/secure-bookings-v2 - Get Hotel Bookings
router.get('/', authenticateSupabaseUser, requireHotelRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get hotel_id from query parameter for multi-tenant support
    const hotelId = req.query.hotel_id as string || req.user?.hotel_id

    if (!hotelId) {
      return res.status(400).json({
        error: 'Hotel ID required',
        details: 'Please provide hotel_id in query parameter or ensure user profile has hotel_id'
      })
    }

    const { data: bookings, error } = await serviceSupabase
      .from('bookings')
      .select(`
        *,
        booking_services(*)
      `)
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({
        error: 'Failed to fetch bookings',
        details: error.message
      })
    }

    res.json({
      success: true,
      data: bookings,
      count: bookings.length
    })

  } catch (error: any) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
})

export default router