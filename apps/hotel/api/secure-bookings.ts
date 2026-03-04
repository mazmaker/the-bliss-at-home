/**
 * Vercel Serverless Function for Secure Bookings
 * Replaces Express backend server
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase with service role
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Verify JWT token
async function verifyAuth(request: VercelRequest) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header')
  }

  const token = authHeader.substring(7)

  // Verify JWT with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw new Error('Invalid authentication token')
  }

  return user
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // CORS headers
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return response.status(200).end()
  }

  try {
    // Verify authentication
    const user = await verifyAuth(request)

    // POST - Create booking
    if (request.method === 'POST') {
      const bookingData = request.body

      console.log('🏨 Creating booking for user:', user.id)
      console.log('📦 Booking data:', bookingData)

      // Insert booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          hotel_id: bookingData.hotel_id,
          scheduled_date: bookingData.scheduled_date,
          scheduled_time: bookingData.scheduled_time,
          customer_name: bookingData.customer_name,
          customer_phone: bookingData.customer_phone,
          room_number: bookingData.room_number,
          base_price: bookingData.base_price,
          final_price: bookingData.final_price,
          customer_notes: bookingData.customer_notes,
          status: bookingData.status,
          payment_status: bookingData.payment_status,
          is_hotel_booking: bookingData.is_hotel_booking,
          provider_preference: bookingData.provider_preference,
        })
        .select()
        .single()

      if (bookingError) {
        throw bookingError
      }

      // Insert booking services
      if (bookingData.services && bookingData.services.length > 0) {
        const bookingServices = bookingData.services.map((service: any) => ({
          booking_id: booking.id,
          service_id: service.service_id,
          duration: service.duration,
          price: service.price,
          recipient_index: service.recipient_index,
          sort_order: service.sort_order,
        }))

        const { error: servicesError } = await supabase
          .from('booking_services')
          .insert(bookingServices)

        if (servicesError) {
          console.error('Failed to insert booking services:', servicesError)
        }
      }

      return response.status(200).json({
        success: true,
        data: booking,
        staffAssignment: null,
        warnings: []
      })
    }

    // GET - List bookings
    if (request.method === 'GET') {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return response.status(200).json({
        success: true,
        data: bookings
      })
    }

    // Method not allowed
    return response.status(405).json({
      success: false,
      error: 'Method not allowed'
    })

  } catch (error: any) {
    console.error('API Error:', error)
    return response.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    })
  }
}
