/**
 * Secure Bookings API - Server-side Security
 * วิธีที่ถูกต้องตามหลักการ Security
 */

import dotenv from 'dotenv'
dotenv.config()

import { Router, Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const router = Router()

// Supabase Service Role (bypass RLS)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// User profile interface
interface UserProfile {
  id: string
  role: string
  hotel_id?: string
  email: string
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserProfile
    }
  }
}

// Middleware: Authenticate User
async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    // Verify JWT and get user
    const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as any
    const userId = payload.sub

    // Get user profile with role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, role, hotel_id, email')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return res.status(401).json({ error: 'Invalid user' })
    }

    req.user = profile as UserProfile
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
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

// POST /api/secure-bookings - Create Booking (Secure)
router.post('/', authenticateUser, requireHotelRole, async (req: Request, res: Response) => {
  try {
    const bookingData = {
      ...req.body,
      // Force hotel ownership
      hotel_id: req.user?.hotel_id,
      created_by: req.user?.id
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

    console.log('🏨 Creating booking for hotel:', req.user?.email)
    console.log('📋 Booking data:', bookingData)

    // Insert booking with service role (bypass RLS)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()

    if (bookingError) {
      console.error('❌ Booking creation failed:', bookingError)
      return res.status(500).json({
        error: 'Failed to create booking',
        details: bookingError.message
      })
    }

    // Insert booking_services if needed
    if (req.body.services && req.body.services.length > 0) {
      const bookingServices = req.body.services.map((service: any) => ({
        booking_id: booking.id,
        service_id: service.service_id,
        duration: service.duration,
        price: service.price,
        recipient_index: service.recipient_index || 0,
        sort_order: service.sort_order || 0
      }))

      const { error: servicesError } = await supabase
        .from('booking_services')
        .insert(bookingServices)

      if (servicesError) {
        // Rollback booking if services fail
        await supabase.from('bookings').delete().eq('id', booking.id)
        console.error('❌ Booking services creation failed:', servicesError)
        return res.status(500).json({
          error: 'Failed to create booking services',
          details: servicesError.message
        })
      }
    }

    console.log('✅ Booking created successfully:', booking.id)
    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking created successfully'
    })

  } catch (error: any) {
    console.error('💥 Booking creation error:', error)
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
})

// GET /api/secure-bookings - Get Hotel Bookings
router.get('/', authenticateUser, requireHotelRole, async (req: Request, res: Response) => {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_services(*)
      `)
      .eq('hotel_id', req.user?.hotel_id)
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

// PUT /api/secure-bookings/:id - Update Booking
router.put('/:id', authenticateUser, requireHotelRole, async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.id
    const updates = req.body

    // Make sure this booking belongs to the hotel
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, hotel_id')
      .eq('id', bookingId)
      .eq('hotel_id', req.user?.hotel_id)
      .single()

    if (fetchError || !existingBooking) {
      return res.status(404).json({
        error: 'Booking not found or access denied'
      })
    }

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select()
      .single()

    if (updateError) {
      return res.status(500).json({
        error: 'Failed to update booking',
        details: updateError.message
      })
    }

    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking updated successfully'
    })

  } catch (error: any) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
})

export default router