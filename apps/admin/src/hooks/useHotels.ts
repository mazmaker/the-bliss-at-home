import { useEffect, useState } from 'react'
import {
  getAllHotels,
  getHotelById,
  getHotelInvoices,
  getHotelPayments,
  getHotelBookings,
  getHotelStats,
  getTotalMonthlyRevenue,
  type Hotel,
  type HotelInvoice,
  type HotelPayment,
  type HotelBooking,
} from '../lib/hotelQueries'

export function useHotels() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchHotels = async () => {
    try {
      setLoading(true)
      const data = await getAllHotels()

      // Fetch stats for each hotel
      const hotelsWithStats = await Promise.all(
        data.map(async (hotel) => {
          try {
            const stats = await getHotelStats(hotel.id)
            return {
              ...hotel,
              totalBookings: stats.totalBookings,
              monthlyRevenue: stats.monthlyRevenue,
            }
          } catch (err) {
            console.error(`Error fetching stats for hotel ${hotel.id}:`, err)
            return {
              ...hotel,
              totalBookings: 0,
              monthlyRevenue: 0,
            }
          }
        })
      )

      setHotels(hotelsWithStats as any)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching hotels:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHotels()
  }, [])

  return { hotels, loading, error, refetch: fetchHotels }
}

export function useHotel(id: string | undefined) {
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchHotel = async () => {
    if (!id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await getHotelById(id)

      // Fetch stats
      const stats = await getHotelStats(id)

      setHotel({
        ...data,
        total_bookings: stats.totalBookings,
        monthly_revenue: stats.monthlyRevenue,
      } as Hotel & { total_bookings: number; monthly_revenue: number })
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching hotel:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHotel()
  }, [id])

  return { hotel, loading, error, refetch: fetchHotel }
}

export function useHotelInvoices(hotelId: string | undefined) {
  const [invoices, setInvoices] = useState<HotelInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchInvoices = async () => {
    if (!hotelId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await getHotelInvoices(hotelId)
      setInvoices(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching invoices:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [hotelId])

  return { invoices, loading, error, refetch: fetchInvoices }
}

export function useHotelPayments(hotelId: string | undefined) {
  const [payments, setPayments] = useState<HotelPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPayments = async () => {
    if (!hotelId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await getHotelPayments(hotelId)
      setPayments(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching payments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [hotelId])

  return { payments, loading, error, refetch: fetchPayments }
}

export function useHotelBookings(hotelId: string | undefined) {
  const [bookings, setBookings] = useState<HotelBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchBookings = async () => {
    if (!hotelId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await getHotelBookings(hotelId)
      setBookings(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [hotelId])

  return { bookings, loading, error, refetch: fetchBookings }
}

export function useTotalMonthlyRevenue() {
  const [revenue, setRevenue] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchRevenue = async () => {
    try {
      setLoading(true)
      const data = await getTotalMonthlyRevenue()
      setRevenue(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching total monthly revenue:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRevenue()
  }, [])

  return { revenue, loading, error, refetch: fetchRevenue }
}
