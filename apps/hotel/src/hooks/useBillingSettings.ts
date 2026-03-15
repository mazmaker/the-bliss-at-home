/**
 * React Hook for Billing Settings
 * Custom hook to manage billing settings and overdue calculations
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getBillingSettings, subscribeToBillingSettingsChanges, type BillingSettings } from '../services/billingSettingsService'
import {
  getMonthlyBillStatus,
  formatOverdueMessage,
  getAdminContactInfo,
  calculateLateFee,
  createDueDate,
  type OverdueStatus
} from '../utils/overdueCalculatorV2'

// Hook return type
interface UseBillingSettingsReturn {
  // Settings data
  settings: BillingSettings | null
  loading: boolean
  error: string | null

  // Overdue calculations
  getOverdueStatus: (month: string) => Promise<OverdueStatus>
  getOverdueMessage: (status: OverdueStatus, amount?: number) => Promise<{
    title: string
    description: string
    actionText: string
  }>
  getDueDate: (month: string) => Promise<string>
  getLateFee: (amount: number, overdueDays: number) => Promise<number>

  // Contact info
  adminContact: {
    phone?: string
    email?: string
    lineId?: string
  } | null

  // Utilities
  refresh: () => Promise<void>
}

// Main hook
export function useBillingSettings(): UseBillingSettingsReturn {
  const [settings, setSettings] = useState<BillingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminContact, setAdminContact] = useState<{
    phone?: string
    email?: string
    lineId?: string
  } | null>(null)

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const billingSettings = await getBillingSettings()
      setSettings(billingSettings)

      // Load admin contact info
      const contactInfo = await getAdminContactInfo(billingSettings)
      setAdminContact(contactInfo)

    } catch (err: any) {
      console.error('Error loading billing settings:', err)
      setError(err.message || 'Failed to load billing settings')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initialize and subscribe to changes
  useEffect(() => {
    loadSettings()

    // Subscribe to real-time changes
    const unsubscribe = subscribeToBillingSettingsChanges(async (newSettings) => {
      setSettings(newSettings)
      const contactInfo = await getAdminContactInfo(newSettings)
      setAdminContact(contactInfo)
    })

    return unsubscribe
  }, [loadSettings])

  // Memoized calculation functions
  const getOverdueStatus = useCallback(async (month: string): Promise<OverdueStatus> => {
    return await getMonthlyBillStatus(month)
  }, [])

  const getOverdueMessage = useCallback(async (status: OverdueStatus, amount?: number) => {
    return await formatOverdueMessage(status, amount, settings || undefined)
  }, [settings])

  const getDueDate = useCallback(async (month: string): Promise<string> => {
    return await createDueDate(month, settings || undefined)
  }, [settings])

  const getLateFee = useCallback(async (amount: number, overdueDays: number): Promise<number> => {
    return await calculateLateFee(amount, overdueDays, settings || undefined)
  }, [settings])

  const refresh = useCallback(async () => {
    await loadSettings()
  }, [loadSettings])

  return {
    settings,
    loading,
    error,
    getOverdueStatus,
    getOverdueMessage,
    getDueDate,
    getLateFee,
    adminContact,
    refresh
  }
}

// Specialized hook for monthly bill status
export function useMonthlyBillStatus(month: string) {
  const [status, setStatus] = useState<OverdueStatus | null>(null)
  const [message, setMessage] = useState<{
    title: string
    description: string
    actionText: string
  } | null>(null)
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { settings } = useBillingSettings()

  useEffect(() => {
    if (!month || !settings) return

    const calculateStatus = async () => {
      try {
        setLoading(true)
        setError(null)

        // Calculate overdue status
        const overdueStatus = await getMonthlyBillStatus(month)
        setStatus(overdueStatus)

        // Format message
        const overdueMessage = await formatOverdueMessage(overdueStatus, undefined, settings)
        setMessage(overdueMessage)

        // Get due date
        const dueDateStr = await createDueDate(month, settings)
        setDueDate(dueDateStr)

      } catch (err: any) {
        console.error('Error calculating monthly bill status:', err)
        setError(err.message || 'Failed to calculate bill status')
      } finally {
        setLoading(false)
      }
    }

    calculateStatus()
  }, [month, settings])

  return {
    status,
    message,
    dueDate,
    loading,
    error
  }
}

// Specialized hook for overdue payment alerts
export function useOverdueAlert(month: string, pendingAmount?: number) {
  const [alertData, setAlertData] = useState<{
    status: OverdueStatus
    message: {
      title: string
      description: string
      actionText: string
    }
    lateFee: number
    totalAmount: number
    styling: {
      bgClass: string
      borderClass: string
      iconBg: string
      iconColor: string
      titleColor: string
      textColor: string
      animation: string
    }
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const { settings, adminContact } = useBillingSettings()

  useEffect(() => {
    if (!month || !settings || !pendingAmount || pendingAmount <= 0) {
      setAlertData(null)
      setLoading(false)
      return
    }

    const calculateAlert = async () => {
      try {
        setLoading(true)

        // Calculate status
        const status = await getMonthlyBillStatus(month)
        const message = await formatOverdueMessage(status, pendingAmount, settings)
        const lateFee = await calculateLateFee(pendingAmount, status.days, settings)
        const totalAmount = pendingAmount + lateFee

        // Determine styling
        const getStyling = () => {
          switch (status.level) {
            case 'URGENT':
              return {
                bgClass: 'bg-gradient-to-r from-red-50 to-red-100',
                borderClass: 'border-2 border-red-300 ring-2 ring-red-100',
                iconBg: 'bg-red-200',
                iconColor: 'text-red-700',
                titleColor: 'text-red-800',
                textColor: 'text-red-700',
                animation: 'animate-pulse'
              }
            case 'WARNING':
              return {
                bgClass: 'bg-gradient-to-r from-orange-50 to-orange-100',
                borderClass: 'border-2 border-orange-300',
                iconBg: 'bg-orange-200',
                iconColor: 'text-orange-700',
                titleColor: 'text-orange-800',
                textColor: 'text-orange-700',
                animation: ''
              }
            case 'OVERDUE':
              return {
                bgClass: 'bg-gradient-to-r from-amber-50 to-amber-100',
                borderClass: 'border border-amber-300',
                iconBg: 'bg-amber-200',
                iconColor: 'text-amber-700',
                titleColor: 'text-amber-800',
                textColor: 'text-amber-700',
                animation: ''
              }
            case 'DUE_SOON':
              return {
                bgClass: 'bg-gradient-to-r from-blue-50 to-blue-100',
                borderClass: 'border border-blue-300',
                iconBg: 'bg-blue-200',
                iconColor: 'text-blue-700',
                titleColor: 'text-blue-800',
                textColor: 'text-blue-700',
                animation: ''
              }
            default:
              return {
                bgClass: 'bg-amber-50',
                borderClass: 'border border-amber-200',
                iconBg: 'bg-amber-200',
                iconColor: 'text-amber-600',
                titleColor: 'text-amber-800',
                textColor: 'text-amber-700',
                animation: ''
              }
          }
        }

        setAlertData({
          status,
          message,
          lateFee,
          totalAmount,
          styling: getStyling()
        })

      } catch (err: any) {
        console.error('Error calculating overdue alert:', err)
        setAlertData(null)
      } finally {
        setLoading(false)
      }
    }

    calculateAlert()
  }, [month, pendingAmount, settings])

  return {
    alertData,
    adminContact,
    loading,
    showAlert: alertData !== null
  }
}