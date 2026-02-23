/**
 * Secure Booking Service - Frontend
 * ใช้ API endpoints แทน direct Supabase calls
 */

import { hotelSupabase } from '../lib/supabaseClient'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

class SecureBookingService {

  // Get authentication token
  private async getAuthToken(): Promise<string> {
    let { data: { session }, error } = await hotelSupabase.auth.getSession()

    // Try refreshing session if no access token
    if (!session?.access_token) {
      const refreshResult = await hotelSupabase.auth.refreshSession()
      session = refreshResult.data.session
    }

    if (!session?.access_token) {
      throw new Error('Not authenticated - no valid session found')
    }

    return session.access_token
  }

  // Create secure API request
  private async apiRequest(endpoint: string, options: RequestInit = {}) {
    const token = await this.getAuthToken()

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  }

  // Create booking (secure)
  async createBooking(bookingData: any) {
    try {
      const result = await this.apiRequest('/secure-bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData)
      })
      return result
    } catch (error) {
      throw error
    }
  }

  // Get bookings (secure)
  async getBookings() {
    return this.apiRequest('/secure-bookings')
  }

  // Update booking (secure)
  async updateBooking(bookingId: string, updates: any) {
    return this.apiRequest(`/secure-bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  // Delete booking (secure)
  async deleteBooking(bookingId: string) {
    return this.apiRequest(`/secure-bookings/${bookingId}`, {
      method: 'DELETE'
    })
  }
}

export const secureBookingService = new SecureBookingService()

// Hook for React components
export function useSecureBookings() {
  const createBooking = async (bookingData: any) => {
    try {
      const result = await secureBookingService.createBooking(bookingData)
      return { data: result.data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  const getBookings = async () => {
    try {
      const result = await secureBookingService.getBookings()
      return { data: result.data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  return {
    createBooking,
    getBookings
  }
}