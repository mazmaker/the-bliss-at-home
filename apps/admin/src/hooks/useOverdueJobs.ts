/**
 * useOverdueJobs Hook (PART46 R2)
 * Polls for admin "overdue-not-started" alerts — jobs a staff ACCEPTED but never started
 * past their scheduled time. Mirrors useJobEscalation (10s poll, sound on new, optional
 * tab-title blink). Feeds the OverdueJobsWidget (dashboard) + the AdminLayout bell.
 *
 * NOTE on the title-blink: document.title is ALSO written by useSOSNotifications +
 * useJobEscalation (uncoordinated, last-writer-wins). To avoid making that worse, the blink
 * here is OPT-IN (`{ titleBlink: true }`) and only the single AdminLayout instance enables it
 * — the dashboard widget instance leaves the title alone. A central SOS-priority title
 * coordinator across all three hooks is a separate, larger improvement (not done here).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAdminAuth } from './useAdminAuth'
import { soundAlertService } from '../utils/soundAlert'

export interface OverdueJobAlert {
  id: string
  type: 'job_overdue_not_started'
  title: string
  message: string
  data: Record<string, any> | null
  is_read: boolean
  created_at: string
}

const POLL_INTERVAL = 10_000 // 10 seconds
const OVERDUE_TYPES = ['job_overdue_not_started']

export function useOverdueJobs(options: { titleBlink?: boolean } = {}) {
  const { titleBlink = false } = options
  const [alerts, setAlerts] = useState<OverdueJobAlert[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAdminAuth()
  const previousAlertIdsRef = useRef<Set<string>>(new Set())
  const originalTitleRef = useRef<string>(document.title)
  const blinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isFirstLoadRef = useRef(true)

  const fetchAlerts = useCallback(async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .in('type', OVERDUE_TYPES)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Failed to fetch overdue alerts:', error)
        return
      }

      const newAlerts = (data || []) as OverdueJobAlert[]
      setAlerts(newAlerts)

      const currentIds = new Set(newAlerts.map(a => a.id))

      if (isFirstLoadRef.current) {
        previousAlertIdsRef.current = currentIds
        isFirstLoadRef.current = false
        return
      }

      const brandNewAlerts = newAlerts.filter(a => !previousAlertIdsRef.current.has(a.id))
      if (brandNewAlerts.length > 0) {
        if (!soundAlertService.isSoundMuted()) {
          soundAlertService.playSOSAlert('medium')
        }
        brandNewAlerts.forEach(alert => {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`🔴 ${alert.title}`, {
              body: alert.message,
              icon: '/favicon.ico',
              tag: `overdue-${alert.id}`,
            })
          }
        })
      }

      previousAlertIdsRef.current = currentIds
    } catch (error) {
      console.error('Error fetching overdue alerts:', error)
    }
  }, [user?.id])

  // Initial fetch
  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    fetchAlerts().finally(() => setLoading(false))
  }, [user?.id, fetchAlerts])

  // Polling
  useEffect(() => {
    if (!user?.id) return
    const interval = setInterval(fetchAlerts, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [user?.id, fetchAlerts])

  const totalCount = alerts.length

  // Tab title blinking (opt-in — only the AdminLayout instance)
  useEffect(() => {
    if (!titleBlink) return

    if (totalCount > 0) {
      if (blinkIntervalRef.current) clearInterval(blinkIntervalRef.current)
      let toggle = true
      blinkIntervalRef.current = setInterval(() => {
        document.title = toggle
          ? `🔴 (${totalCount}) งานเลยเวลา!`
          : `⚠️ (${totalCount}) staff ยังไม่เริ่ม!`
        toggle = !toggle
      }, 1300)
    } else {
      if (blinkIntervalRef.current) {
        clearInterval(blinkIntervalRef.current)
        blinkIntervalRef.current = null
      }
      document.title = originalTitleRef.current
    }

    return () => {
      if (blinkIntervalRef.current) {
        clearInterval(blinkIntervalRef.current)
        blinkIntervalRef.current = null
      }
    }
  }, [titleBlink, totalCount])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blinkIntervalRef.current) clearInterval(blinkIntervalRef.current)
      if (titleBlink) document.title = originalTitleRef.current
    }
  }, [titleBlink])

  const markAsRead = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (!error) setAlerts(prev => prev.filter(a => a.id !== notificationId))
    return !error
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return false
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .in('type', OVERDUE_TYPES)
      .eq('is_read', false)

    if (!error) setAlerts([])
    return !error
  }, [user?.id])

  return {
    alerts,
    totalCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchAlerts,
  }
}
