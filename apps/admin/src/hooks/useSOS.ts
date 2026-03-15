import { useState, useEffect } from 'react'
import {
  getAllSOSAlerts,
  getPendingSOSAlerts,
  acknowledgeSOSAlert,
  resolveSOSAlert,
  cancelSOSAlert,
  getSOSStatistics,
  type SOSAlert,
  type SOSSourceType,
  type SOSStatus,
} from '../lib/sosQueries'

// ============================================
// SOS ALERT HOOKS
// ============================================

export function useSOSAlerts(sourceFilter: SOSSourceType = 'all') {
  const [alerts, setAlerts] = useState<SOSAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllSOSAlerts(sourceFilter)
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
  }, [sourceFilter])

  return { alerts, loading, error, refetch: fetchAlerts }
}

export function usePendingSOSAlerts(sourceFilter: SOSSourceType = 'all') {
  const [alerts, setAlerts] = useState<SOSAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const fetchAlerts = async (isPolling = false) => {
    try {
      // Only set loading on initial load, not when polling
      if (!isPolling) {
        setLoading(true)
      }
      setError(null)
      const data = await getPendingSOSAlerts(sourceFilter)
      setAlerts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pending alerts')
      console.error('Error fetching pending SOS alerts:', err)
    } finally {
      if (!isPolling) {
        setLoading(false)
      }
      if (isInitialLoad) {
        setIsInitialLoad(false)
      }
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchAlerts(false)

    // Poll for new alerts every 5 seconds for faster response
    // Use polling flag to prevent loading state flicker
    const interval = setInterval(() => fetchAlerts(true), 5000)
    return () => clearInterval(interval)
  }, [sourceFilter])

  return { alerts, loading, error, refetch: () => fetchAlerts(false) }
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

export function useSOSStatistics() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    acknowledged: 0,
    resolved: 0,
    from_customers: 0,
    from_staff: 0,
    last_24_hours: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getSOSStatistics()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics')
      console.error('Error fetching SOS statistics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return { stats, loading, error, refetch: fetchStats }
}
