import { useState, useEffect } from 'react'
import {
  getAllCustomers,
  getCustomerById,
  getCustomerWithStats,
  getCustomerBookings,
  getCustomerAddresses,
  getCustomerTaxInfo,
  updateCustomerStatus,
  updateCustomer,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultAddress,
  upsertCustomerTaxInfo,
  getCustomerStatistics,
  type Customer,
  type CustomerWithStats,
  type CustomerBooking,
  type CustomerAddress,
  type CustomerTaxInfo,
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
// CUSTOMER ADDRESSES & TAX INFO HOOKS
// ============================================

export function useCustomerAddresses(customerId: string | null) {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAddresses = async () => {
    if (!customerId) {
      setAddresses([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const data = await getCustomerAddresses(customerId)
      setAddresses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch addresses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAddresses()
  }, [customerId])

  return { addresses, loading, error, refetch: fetchAddresses }
}

export function useCustomerTaxInfo(customerId: string | null) {
  const [taxInfo, setTaxInfo] = useState<CustomerTaxInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTaxInfo = async () => {
    if (!customerId) {
      setTaxInfo(null)
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const data = await getCustomerTaxInfo(customerId)
      setTaxInfo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tax info')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTaxInfo()
  }, [customerId])

  return { taxInfo, loading, error, refetch: fetchTaxInfo }
}

// ============================================
// ADDRESS MUTATION HOOKS
// ============================================

export function useCreateAddress() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async (
    customerId: string,
    data: Omit<CustomerAddress, 'id' | 'customer_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      setLoading(true)
      setError(null)
      return await createCustomerAddress(customerId, data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create address'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { create, loading, error }
}

export function useUpdateAddress() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = async (
    id: string,
    customerId: string,
    data: Partial<Omit<CustomerAddress, 'id' | 'customer_id' | 'created_at' | 'updated_at'>>
  ) => {
    try {
      setLoading(true)
      setError(null)
      return await updateCustomerAddress(id, customerId, data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update address'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { update, loading, error }
}

export function useDeleteAddress() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      await deleteCustomerAddress(id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete address'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { remove, loading, error }
}

export function useSetDefaultAddress() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setDefault = async (customerId: string, addressId: string) => {
    try {
      setLoading(true)
      setError(null)
      return await setDefaultAddress(customerId, addressId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to set default address'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { setDefault, loading, error }
}

// ============================================
// TAX INFO MUTATION HOOK
// ============================================

export function useUpsertTaxInfo() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upsert = async (
    customerId: string,
    data: Omit<CustomerTaxInfo, 'id' | 'customer_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      setLoading(true)
      setError(null)
      return await upsertCustomerTaxInfo(customerId, data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save tax info'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { upsert, loading, error }
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
