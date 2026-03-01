/**
 * Secure Bookings API v2 - Professional Approach
 * ใช้ Supabase Auth Context แทน manual JWT verification
 */

import * as dotenv from 'dotenv'
dotenv.config()

import { Router, Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import { staffAssignmentService } from '../services/staffAssignmentService'

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

    // 🏨 HOTEL BOOKING FIX: Disable automatic job creation trigger
    // The trigger is causing duplicate email conflicts when trying to create customer records
    // Since we want manual staff acceptance, we'll disable the auto-job creation
    const bookingData = {
      ...bookingFields,
      hotel_id: req.body.hotel_id, // ✅ Use hotel_id from request body (URL-based multi-tenant context)
      customer_id: null, // ✅ Explicitly set to null for hotel bookings
      is_hotel_booking: false, // ✅ Disable trigger to prevent customer creation conflicts
      // created_by: req.user?.id       // Column doesn't exist yet
    }

    console.log('🏨 [HOTEL BOOKING] Disabled auto-job creation to prevent conflicts')

    console.log('🔍 [BOOKING API] Final booking data hotel_id:', bookingData.hotel_id)
    console.log('🔍 [BOOKING API] All booking data:', JSON.stringify(bookingData, null, 2))

    // Validate required fields (including hotel_id)
    const requiredFields = ['hotel_id', 'service_id', 'booking_date', 'booking_time', 'duration', 'base_price', 'final_price']
    const missing = requiredFields.filter(field => !bookingData[field])

    console.log('🔍 [VALIDATION] Required fields check:')
    requiredFields.forEach(field => {
      console.log(`  ${field}: ${bookingData[field]} ${bookingData[field] ? '✅' : '❌'}`)
    })

    if (missing.length > 0) {
      console.log('❌ [VALIDATION] Missing required fields:', missing)
      return res.status(400).json({
        error: 'Missing required fields',
        missing
      })
    }

    console.log('✅ [VALIDATION] All required fields present')

    // Use service role to insert (proper way to bypass RLS)
    console.log('🔍 [DATABASE] Attempting to insert booking into database...')
    console.log('🔍 [DATABASE] Using service role Supabase client')

    const { data: booking, error: bookingError } = await serviceSupabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()

    if (bookingError) {
      console.log('❌ [DATABASE] Booking insertion failed!')
      console.log('❌ [DATABASE] Error details:', JSON.stringify(bookingError, null, 2))
      return res.status(500).json({
        error: 'Failed to create booking',
        details: bookingError.message
      })
    }

    console.log('✅ [DATABASE] Booking inserted successfully!')
    console.log('✅ [DATABASE] Booking ID:', booking.id)

    // Handle booking services if provided
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
        // Rollback booking if services fail
        await serviceSupabase.from('bookings').delete().eq('id', booking.id)
        return res.status(500).json({
          error: 'Failed to create booking services',
          details: servicesError.message
        })
      }
    }

    // 🔄 MANUAL STAFF ACCEPTANCE - Create job record for staff to see
    console.log('📋 Booking created successfully - creating job for staff to accept')

    // Get service and hotel details for job creation
    const { data: service, error: serviceError } = await serviceSupabase
      .from('services')
      .select('name_th, name_en')
      .eq('id', booking.service_id)
      .single()

    const { data: hotel, error: hotelError } = await serviceSupabase
      .from('hotels')
      .select('name_th')
      .eq('id', booking.hotel_id)
      .single()

    if (!serviceError && !hotelError && service && hotel) {
      // Extract guest name and phone from customer_notes
      const guestNameMatch = booking.customer_notes?.match(/Guest:\s*([^,]+)/)
      const guestPhoneMatch = booking.customer_notes?.match(/Phone:\s*([^,]+)/)

      const guestName = guestNameMatch ? guestNameMatch[1].trim() : 'Hotel Guest'
      const guestPhone = guestPhoneMatch ? guestPhoneMatch[1].trim() : '0000000000'

      // Create temporary profile for hotel guest (jobs table needs profiles.id)
      console.log('🏨 [GUEST PROFILE] Creating temporary profile for hotel guest...')

      // First check if a guest profile already exists by phone
      let guestProfile = null
      const { data: existingProfile } = await serviceSupabase
        .from('profiles')
        .select('id, full_name')
        .eq('phone', guestPhone)
        .eq('role', 'GUEST')
        .single()

      if (existingProfile) {
        console.log('✅ [GUEST PROFILE] Found existing guest profile:', existingProfile.id)
        guestProfile = existingProfile
      } else {
        // Create new temporary profile for hotel guest
        const { data: newProfile, error: profileError } = await serviceSupabase
          .from('profiles')
          .insert({
            full_name: guestName,
            phone: guestPhone,
            role: 'GUEST',
            email: `guest-${Date.now()}@hotel-temp.com`, // Temporary email
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id, full_name')
          .single()

        if (profileError) {
          console.log('❌ [GUEST PROFILE] Failed to create profile:', profileError.message)
          console.log('❌ Cannot create job without guest profile')
          return
        }

        console.log('✅ [GUEST PROFILE] Created new profile:', newProfile.id)
        guestProfile = newProfile
      }

      // For hotel bookings, we store guest info directly in job (no profiles needed)
      console.log('✅ [HOTEL GUEST] Ready to create job for hotel guest')

      // Create job record with guest profile ID
      console.log('📋 [JOB] Creating job record for staff assignment...')
      const { data: job, error: jobError } = await serviceSupabase
        .from('jobs')
        .insert({
          booking_id: booking.id,
          customer_id: null, // Hotel guests don't need customer profiles
          hotel_id: booking.hotel_id,
          customer_name: guestName,
          customer_phone: guestPhone,
          hotel_name: hotel.name_th,
          room_number: booking.hotel_room_number,
          address: `โรงแรม ${hotel.name_th}`,
          latitude: booking.latitude,
          longitude: booking.longitude,
          service_name: service.name_th,
          service_name_en: service.name_en,
          duration_minutes: booking.duration,
          scheduled_date: booking.booking_date,
          scheduled_time: booking.booking_time,
          amount: booking.final_price,
          staff_earnings: booking.staff_earnings || 0,
          status: 'pending',
          customer_notes: booking.customer_notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (jobError) {
        console.log('⚠️ Failed to create job record:', jobError.message)
      } else {
        console.log('✅ Job created successfully for staff to accept!')
        console.log(`🎯 Job ID: ${job.id}`)
        console.log(`👤 Guest: ${guestName}, Phone: ${guestPhone}`)
        console.log(`🏨 Hotel: ${hotel.name_th}`)
        console.log(`💰 Amount: ${booking.final_price} บาท`)
      }
    }

    // Keep booking in 'pending' status - staff will accept via staff app
    const { error: statusUpdateError } = await serviceSupabase
      .from('bookings')
      .update({
        status: 'pending', // Keep in pending status for staff to accept
      })
      .eq('id', booking.id)

    if (statusUpdateError) {
      console.log('⚠️ Failed to set pending status:', statusUpdateError.message)
    } else {
      console.log('✅ Booking set to pending status for manual staff acceptance')
    }

    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking created successfully - waiting for staff to accept',
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