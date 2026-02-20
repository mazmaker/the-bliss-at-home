/**
 * Secure Bookings API v2 - Professional Approach
 * ใช้ Supabase Auth Context แทน manual JWT verification
 */

import dotenv from 'dotenv'
dotenv.config()

import { Router, Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

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

// Middleware: Authenticate using Supabase's built-in verification
async function authenticateSupabaseUser(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('🔍 Auth middleware - checking token...')
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      console.log('❌ No token provided')
      return res.status(401).json({ error: 'No token provided' })
    }

    console.log('🔍 Token length:', token.length)

    // Use Supabase to verify the token (proper way)
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
      .select('id, role, email')
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
function requireHotelRole(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'HOTEL') {
    return res.status(403).json({
      error: 'Forbidden: Hotel role required',
      userRole: req.user?.role
    })
  }
  next()
}

// POST /api/secure-bookings-v2 - Create Booking (Professional Way)
router.post('/', authenticateSupabaseUser, requireHotelRole, async (req: Request, res: Response) => {
  try {
    // Extract services data separately (it goes to booking_services table)
    const { services, ...bookingFields } = req.body

    const bookingData = {
      ...bookingFields,
      hotel_id: req.body.hotel_id, // Use hotel_id from request body (URL-based context)
      // created_by: req.user?.id       // Column doesn't exist yet
    }

    // Validate required fields
    const requiredFields = ['service_id', 'booking_date', 'booking_time', 'duration', 'base_price', 'final_price']
    const missing = requiredFields.filter(field => !bookingData[field])

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing
      })
    }

    // Use service role to insert (proper way to bypass RLS)
    const { data: booking, error: bookingError } = await serviceSupabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()

    if (bookingError) {
      return res.status(500).json({
        error: 'Failed to create booking',
        details: bookingError.message
      })
    }

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

    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking created successfully'
    })

  } catch (error: any) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
})

// GET /api/secure-bookings-v2 - Get Hotel Bookings
router.get('/', authenticateSupabaseUser, requireHotelRole, async (req: Request, res: Response) => {
  try {
    const { data: bookings, error } = await serviceSupabase
      .from('bookings')
      .select(`
        *,
        booking_services(*)
      `)
      .eq('hotel_id', req.query.hotel_id as string || req.user?.hotel_id || 'no-hotel-id')
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