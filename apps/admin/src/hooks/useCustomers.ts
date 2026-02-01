import { useState, useEffect } from 'react'
import {
  getAllCustomers,
  getCustomerById,
  getCustomerWithStats,
  getCustomerBookings,
  updateCustomerStatus,
  updateCustomer,
  getAllSOSAlerts,
  getPendingSOSAlerts,
  acknowledgeSOSAlert,
  resolveSOSAlert,
  cancelSOSAlert,
  getCustomerStatistics,
  type Customer,
  type CustomerWithStats,
  type CustomerBooking,
  type SOSAlert,
  type CustomerStatus,
} from '../lib/customerQueries'

// ============================================
// CUSTOMER HOOKS
// ============================================

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllCustomers()
      setCustomers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers')
      console.error('Error fetching customers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  return { customers, loading, error, refetch: fetchCustomers }
}

export function useCustomer(id: string | null) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomer = async () => {
    if (!id) {
      setCustomer(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getCustomerById(id)
      setCustomer(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customer')
      console.error('Error fetching customer:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomer()
  }, [id])

  return { customer, loading, error, refetch: fetchCustomer }
}

export function useCustomerWithStats(id: string | null) {
  const [customer, setCustomer] = useState<CustomerWithStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomer = async () => {
    if (!id) {
      setCustomer(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getCustomerWithStats(id)
      setCustomer(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customer stats')
      console.error('Error fetching customer stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomer()
  }, [id])

  return { customer, loading, error, refetch: fetchCustomer }
}

export function useCustomerBookings(customerId: string | null) {
  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBookings = async () => {
    if (!customerId) {
      setBookings([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getCustomerBookings(customerId)
      setBookings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings')
      console.error('Error fetching customer bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [customerId])

  return { bookings, loading, error, refetch: fetchBookings }
}

export function useUpdateCustomerStatus() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateStatus = async (id: string, status: CustomerStatus) => {
    try {
      setLoading(true)
      setError(null)
      const data = await updateCustomerStatus(id, status)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status'
      setError(errorMessage)
      console.error('Error updating customer status:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { updateStatus, loading, error }
}

export function useUpdateCustomer() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = async (id: string, updates: Partial<Customer>) => {
    try {
      setLoading(true)
      setError(null)
      const data = await updateCustomer(id, updates)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update customer'
      setError(errorMessage)
      console.error('Error updating customer:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { update, loading, error }
}

// ============================================
// SOS ALERT HOOKS
// ============================================

export function useSOSAlerts() {
  const [alerts, setAlerts] = useState<SOSAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllSOSAlerts()
      setAlerts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch SOS alerts')
      console.error('Error fetching SOS alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  return { alerts, loading, error, refetch: fetchAlerts }
}

export function usePendingSOSAlerts() {
  const [alerts, setAlerts] = useState<SOSAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getPendingSOSAlerts()
      setAlerts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pending alerts')
      console.error('Error fetching pending SOS alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()

    // Poll for new alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  return { alerts, loading, error, refetch: fetchAlerts }
}

export function useSOSAlertActions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const acknowledge = async (id: string, adminId: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await acknowledgeSOSAlert(id, adminId)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to acknowledge alert'
      setError(errorMessage)
      console.error('Error acknowledging SOS alert:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const resolve = async (id: string, adminId: string, notes: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await resolveSOSAlert(id, adminId, notes)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resolve alert'
      setError(errorMessage)
      console.error('Error resolving SOS alert:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const cancel = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await cancelSOSAlert(id)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel alert'
      setError(errorMessage)
      console.error('Error cancelling SOS alert:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { acknowledge, resolve, cancel, loading, error }
}

// ============================================
// STATISTICS HOOKS
// ============================================

export function useCustomerStatistics() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    banned: 0,
    repeat_customers: 0,
    repeat_rate: 0,
    total_revenue: 0,
    average_lifetime_value: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getCustomerStatistics()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics')
      console.error('Error fetching customer statistics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return { stats, loading, error, refetch: fetchStats }
}
