/**
 * React Hooks for Earnings & Payouts
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/hooks'
import { supabase } from '../auth/supabaseClient'
import type {
  EarningsSummary,
  DailyEarning,
  ServiceEarning,
  Payout,
  BankAccount,
} from './types'
import {
  getEarningsSummary,
  getDailyEarnings,
  getServiceEarnings,
  getPayoutHistory,
  getBankAccounts,
  addBankAccount,
  updateBankAccount,
  setPrimaryBankAccount,
  deleteBankAccount,
  subscribeToPayouts,
} from './earningsService'

/**
 * Hook for earnings summary
 */
export function useEarningsSummary() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [summary, setSummary] = useState<EarningsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const staffId = user?.id

  const refresh = useCallback(async () => {
    if (!staffId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const data = await getEarningsSummary(staffId)
      setSummary(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [staffId])

  useEffect(() => {
    if (!isAuthLoading) {
      refresh()
    }
  }, [refresh, isAuthLoading])

  return { summary, isLoading, error, refresh }
}

/**
 * Hook for daily earnings
 */
export function useDailyEarnings(startDate: string, endDate: string) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [earnings, setEarnings] = useState<DailyEarning[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const staffId = user?.id

  const refresh = useCallback(async () => {
    if (!staffId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const data = await getDailyEarnings(staffId, startDate, endDate)
      setEarnings(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [staffId, startDate, endDate])

  useEffect(() => {
    if (!isAuthLoading) {
      refresh()
    }
  }, [refresh, isAuthLoading])

  return { earnings, isLoading, error, refresh }
}

/**
 * Hook for service earnings breakdown
 */
export function useServiceEarnings(startDate: string, endDate: string) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [services, setServices] = useState<ServiceEarning[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const staffId = user?.id

  const refresh = useCallback(async () => {
    if (!staffId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const data = await getServiceEarnings(staffId, startDate, endDate)
      setServices(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [staffId, startDate, endDate])

  useEffect(() => {
    if (!isAuthLoading) {
      refresh()
    }
  }, [refresh, isAuthLoading])

  return { services, isLoading, error, refresh }
}

/**
 * Hook for payout history with real-time updates
 */
export function usePayouts(realtime = false) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const staffId = user?.id

  const refresh = useCallback(async () => {
    if (!staffId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const data = await getPayoutHistory(staffId)
      setPayouts(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [staffId])

  useEffect(() => {
    if (!isAuthLoading) {
      refresh()
    }
  }, [refresh, isAuthLoading])

  // Real-time subscription
  useEffect(() => {
    if (!staffId || !realtime) return

    const handlePayoutUpdate = (payout: Payout) => {
      setPayouts((prev) => {
        const index = prev.findIndex((p) => p.id === payout.id)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = payout
          return updated
        }
        return [payout, ...prev]
      })
    }

    const unsubscribe = subscribeToPayouts(staffId, handlePayoutUpdate)
    return unsubscribe
  }, [staffId, realtime])

  return { payouts, isLoading, error, refresh }
}

/**
 * Hook for bank accounts management
 */
export function useBankAccounts() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const profileId = user?.id

  const refresh = useCallback(async () => {
    if (!profileId) {
      console.log('[useBankAccounts] No profileId')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      console.log('[useBankAccounts] Converting profile_id to staff_id:', profileId)

      // Convert profile_id to staff_id first
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('profile_id', profileId)
        .single()

      console.log('[useBankAccounts] Staff data:', staffData)
      console.log('[useBankAccounts] Staff error:', staffError)

      if (staffError) throw staffError
      if (!staffData) throw new Error('Staff record not found')

      console.log('[useBankAccounts] Fetching bank accounts for staff_id:', staffData.id)
      const data = await getBankAccounts(staffData.id)
      console.log('[useBankAccounts] Bank accounts:', data)
      setAccounts(data)
    } catch (err) {
      console.error('[useBankAccounts] Error:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    if (!isAuthLoading) {
      refresh()
    }
  }, [refresh, isAuthLoading])

  const addAccount = useCallback(
    async (
      bankCode: string,
      bankName: string,
      accountNumber: string,
      accountName: string,
      isPrimary = false
    ) => {
      if (!profileId) throw new Error('Not authenticated')

      setIsSaving(true)
      try {
        // Convert profile_id to staff_id first
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('profile_id', profileId)
          .single()

        if (staffError) throw staffError
        if (!staffData) throw new Error('Staff record not found')

        const newAccount = await addBankAccount(
          staffData.id,
          bankCode,
          bankName,
          accountNumber,
          accountName,
          isPrimary
        )
        setAccounts((prev) => {
          if (isPrimary) {
            return [newAccount, ...prev.map((a) => ({ ...a, is_primary: false }))]
          }
          return [...prev, newAccount]
        })
        return newAccount
      } finally {
        setIsSaving(false)
      }
    },
    [profileId]
  )

  const updateAccount = useCallback(
    async (accountId: string, updates: Partial<BankAccount>) => {
      setIsSaving(true)
      try {
        const updated = await updateBankAccount(accountId, updates)
        setAccounts((prev) => prev.map((a) => (a.id === accountId ? updated : a)))
        return updated
      } finally {
        setIsSaving(false)
      }
    },
    []
  )

  const setPrimary = useCallback(
    async (accountId: string) => {
      if (!profileId) throw new Error('Not authenticated')

      setIsSaving(true)
      try {
        // Convert profile_id to staff_id first
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('profile_id', profileId)
          .single()

        if (staffError) throw staffError
        if (!staffData) throw new Error('Staff record not found')

        await setPrimaryBankAccount(staffData.id, accountId)
        setAccounts((prev) =>
          prev.map((a) => ({
            ...a,
            is_primary: a.id === accountId,
          }))
        )
      } finally {
        setIsSaving(false)
      }
    },
    [profileId]
  )

  const deleteAccount = useCallback(async (accountId: string) => {
    setIsSaving(true)
    try {
      await deleteBankAccount(accountId)
      setAccounts((prev) => prev.filter((a) => a.id !== accountId))
    } finally {
      setIsSaving(false)
    }
  }, [])

  return {
    accounts,
    isLoading,
    error,
    isSaving,
    refresh,
    addAccount,
    updateAccount,
    setPrimary,
    deleteAccount,
  }
}
