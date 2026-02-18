/**
 * Secure Bookings API - Server-side Security
 * วิธีที่ถูกต้องตามหลักการ Security
 */

import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const router = Router()

// Supabase Service Role (bypass RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Middleware: Authenticate User
async function authenticateUser(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    // Verify JWT and get user
    const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET)
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

    req.user = profile
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Middleware: Check Hotel Role
function requireHotelRole(req, res, next) {
  if (req.user.role !== 'HOTEL') {
    return res.status(403).json({
      error: 'Forbidden: Hotel role required',
      userRole: req.user.role
    })
  }
  next()
}

// POST /api/secure-bookings - Create Booking (Secure)
router.post('/bookings', authenticateUser, requireHotelRole, async (req, res) => {
  try {
    const bookingData = {
      ...req.body,
      // Force hotel ownership
      hotel_id: req.user.hotel_id,
      created_by: req.user.id
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

    // Insert booking with service role (bypass RLS)
    const { data: booking, error: bookingError } = await supabase
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

    // Insert booking_services if needed
    if (req.body.services && req.body.services.length > 0) {
      const bookingServices = req.body.services.map(service => ({
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

  } catch (error) {
    console.error('Booking creation error:', error)
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
})

// GET /api/secure-bookings - Get Hotel Bookings
router.get('/bookings', authenticateUser, requireHotelRole, async (req, res) => {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_services(*)
      `)
      .eq('hotel_id', req.user.hotel_id)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({
        error: 'Failed to fetch bookings',
        details: error.message
      })
    }

    res.json({
      success: true,
      data: bookings
    })

  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
})

export default router