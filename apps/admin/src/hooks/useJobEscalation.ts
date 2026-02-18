/**
 * useJobEscalation Hook
 * Polls for job escalation notifications (unassigned jobs)
 * Handles: sound alerts, tab title blinking, browser notifications
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAdminAuth } from './useAdminAuth'
import { soundAlertService } from '../utils/soundAlert'

export interface JobEscalationAlert {
  id: string
  type: 'job_no_staff_warning' | 'job_no_staff_urgent'
  title: string
  message: string
  data: Record<string, any> | null
  is_read: boolean
  created_at: string
}

const POLL_INTERVAL = 10_000 // 10 seconds
const ESCALATION_TYPES = ['job_no_staff_warning', 'job_no_staff_urgent']

export function useJobEscalation() {
  const [alerts, setAlerts] = useState<JobEscalationAlert[]>([])
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
        .in('type', ESCALATION_TYPES)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Failed to fetch escalation alerts:', error)
        return
      }

      const newAlerts = (data || []) as JobEscalationAlert[]
      setAlerts(newAlerts)

      // Detect new alerts for sound/notification
      const currentIds = new Set(newAlerts.map(a => a.id))

      if (isFirstLoadRef.current) {
        // First load — just initialize, don't trigger sounds
        previousAlertIdsRef.current = currentIds
        isFirstLoadRef.current = false
        return
      }

      // Find truly new alerts (not seen before)
      const brandNewAlerts = newAlerts.filter(a => !previousAlertIdsRef.current.has(a.id))

      if (brandNewAlerts.length > 0) {
        brandNewAlerts.forEach(alert => {
          // Play sound for urgent alerts
          if (alert.type === 'job_no_staff_urgent' && !soundAlertService.isSoundMuted()) {
            soundAlertService.playSOSAlert('high')
          } else if (alert.type === 'job_no_staff_warning' && !soundAlertService.isSoundMuted()) {
            soundAlertService.playSOSAlert('medium')
          }

          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const icon = alert.type === 'job_no_staff_urgent' ? '🚨' : '⚠️'
            new Notification(`${icon} ${alert.title}`, {
              body: alert.message,
              icon: '/favicon.ico',
              tag: `escalation-${alert.id}`,
            })
          }
        })
      }

      previousAlertIdsRef.current = currentIds
    } catch (error) {
      console.error('Error fetching escalation alerts:', error)
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

  // Tab title blinking for urgent alerts
  const urgentAlerts = alerts.filter(a => a.type === 'job_no_staff_urgent')
  const warningAlerts = alerts.filter(a => a.type === 'job_no_staff_warning')
  const hasUrgent = urgentAlerts.length > 0
  const totalCount = alerts.length

  useEffect(() => {
    if (hasUrgent) {
      // Start blinking
      if (blinkIntervalRef.current) clearInterval(blinkIntervalRef.current)
      let toggle = true
      blinkIntervalRef.current = setInterval(() => {
        document.title = toggle
          ? `🚨 (${urgentAlerts.length}) งานไม่มี Staff!`
          : `⚠️ (${urgentAlerts.length}) ต้องจัดการด่วน!`
        toggle = !toggle
      }, 1200)
    } else if (totalCount === 0) {
      // Restore title
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
  }, [hasUrgent, urgentAlerts.length, totalCount])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blinkIntervalRef.current) {
        clearInterval(blinkIntervalRef.current)
      }
      document.title = originalTitleRef.current
    }
  }, [])

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (!error) {
      setAlerts(prev => prev.filter(a => a.id !== notificationId))
    }
    return !error
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return false
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .in('type', ESCALATION_TYPES)
      .eq('is_read', false)

    if (!error) {
      setAlerts([])
    }
    return !error
  }, [user?.id])

  return {
    alerts,
    urgentAlerts,
    warningAlerts,
    urgentCount: urgentAlerts.length,
    warningCount: warningAlerts.length,
    totalCount,
    hasUrgent,
    hasWarning: warningAlerts.length > 0,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchAlerts,
  }
}
