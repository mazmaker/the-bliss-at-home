import { useEffect, useRef, useState } from 'react'
import { usePendingSOSAlerts } from './useSOS'
import { notificationService } from '../utils/notificationService'
import { soundAlertService } from '../utils/soundAlert'
import type { SOSAlert } from '../lib/sosQueries'

/**
 * Comprehensive SOS Notifications Hook
 * Handles:
 * - Browser push notifications
 * - Sound alerts
 * - Tab title notifications
 * - Real-time polling (every 5 seconds)
 * - New alert detection
 */
export function useSOSNotifications() {
  const { alerts, loading, error, refetch } = usePendingSOSAlerts('all')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [audioContextReady, setAudioContextReady] = useState(false)
  const previousAlertsRef = useRef<Set<string>>(new Set())
  const originalTitleRef = useRef<string>(document.title)

  // Request notification permission on mount
  useEffect(() => {
    const requestPermission = async () => {
      const granted = await notificationService.requestPermission()
      setNotificationsEnabled(granted)
    }

    requestPermission()

    // Check sound preference
    const isMuted = soundAlertService.isSoundMuted()
    setSoundEnabled(!isMuted)

    // Store original title
    originalTitleRef.current = document.title

    // Check AudioContext state
    setAudioContextReady(soundAlertService.isAudioContextReady())
  }, [])

  // Periodically check AudioContext state (especially after page load)
  useEffect(() => {
    const checkAudioContext = () => {
      setAudioContextReady(soundAlertService.isAudioContextReady())
    }

    // Check every 500ms for the first 5 seconds after mount
    // This helps detect when user interacts with the page
    const interval = setInterval(checkAudioContext, 500)
    const timeout = setTimeout(() => {
      clearInterval(interval)
    }, 5000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  // Detect new alerts and trigger notifications
  useEffect(() => {
    // Skip if loading or no alerts
    if (loading) {
      return
    }

    const currentAlertIds = new Set(alerts.map(a => a.id))

    // Handle case when there are no alerts
    if (!alerts.length) {
      // Only update if we previously had alerts
      if (previousAlertsRef.current.size > 0) {
        // Reset title when no pending alerts
        document.title = originalTitleRef.current
        // Stop all repeating sounds
        soundAlertService.stopAllRepeatingAlerts()
        // Clear previous alerts reference
        previousAlertsRef.current = new Set()
      }
      return
    }

    // On first load, initialize previousAlertsRef without triggering notifications
    if (previousAlertsRef.current.size === 0) {
      previousAlertsRef.current = currentAlertIds
      updateTabTitle(alerts.length)
      return
    }

    const newAlerts: SOSAlert[] = []
    const removedAlertIds: string[] = []

    // Find new alerts
    alerts.forEach(alert => {
      if (!previousAlertsRef.current.has(alert.id) && alert.status === 'pending') {
        newAlerts.push(alert)
      }
    })

    // Find removed alerts (acknowledged or resolved)
    previousAlertsRef.current.forEach(alertId => {
      if (!currentAlertIds.has(alertId)) {
        removedAlertIds.push(alertId)
      }
    })

    // Update the reference
    previousAlertsRef.current = currentAlertIds

    // Handle new alerts
    if (newAlerts.length > 0) {
      newAlerts.forEach(alert => {
        handleNewAlert(alert)
      })
    }

    // Stop sounds for removed alerts
    if (removedAlertIds.length > 0) {
      removedAlertIds.forEach(alertId => {
        soundAlertService.stopRepeatingAlert(alertId)
      })
    }

    // Update tab title with count
    updateTabTitle(alerts.length)
  }, [alerts, loading])

  /**
   * Handle a new SOS alert
   */
  const handleNewAlert = (alert: SOSAlert) => {
    // 1. Start repeating sound alert (will play until acknowledged)
    // Check mute state directly from service to avoid stale closure
    if (!soundAlertService.isSoundMuted()) {
      soundAlertService.startRepeatingAlert(alert.id, alert.priority)
    }

    // 2. Show browser notification
    if (notificationsEnabled) {
      notificationService.showSOSNotification({
        title: '🚨 SOS Alert - Emergency!',
        message: alert.source_name || 'Unknown',
        priority: alert.priority,
        sourceType: alert.source_type || 'customer',
        alertId: alert.id,
      })
    }

    // 3. Log for debugging
    console.log('🚨 New SOS Alert:', {
      id: alert.id,
      source: alert.source_name,
      type: alert.source_type,
      priority: alert.priority,
      message: alert.message,
      repeatingSound: !soundAlertService.isSoundMuted(),
    })
  }

  /**
   * Update browser tab title with alert count
   */
  const updateTabTitle = (count: number) => {
    if (count > 0) {
      const prefix = count > 5 ? '🚨🚨🚨' : '🚨'
      document.title = `${prefix} (${count}) SOS Alert - Admin`

      // Make title blink
      startTitleBlink(count)
    } else {
      document.title = originalTitleRef.current
      stopTitleBlink()
    }
  }

  /**
   * Start blinking tab title
   */
  let blinkInterval: NodeJS.Timeout | null = null
  const startTitleBlink = (count: number) => {
    stopTitleBlink()

    let isOriginal = true
    blinkInterval = setInterval(() => {
      if (isOriginal) {
        document.title = `🚨 (${count}) SOS ALERT!`
      } else {
        document.title = `⚠️ (${count}) URGENT!`
      }
      isOriginal = !isOriginal
    }, 1000)
  }

  const stopTitleBlink = () => {
    if (blinkInterval) {
      clearInterval(blinkInterval)
      blinkInterval = null
    }
  }

  /**
   * Toggle sound on/off
   */
  const toggleSound = () => {
    const newState = soundAlertService.toggleMute()
    setSoundEnabled(!newState)

    // If muting, stop all repeating alerts
    if (newState) {
      soundAlertService.stopAllRepeatingAlerts()
    } else {
      // If unmuting, restart repeating alerts for current pending alerts
      alerts.forEach(alert => {
        if (alert.status === 'pending') {
          soundAlertService.startRepeatingAlert(alert.id, alert.priority)
        }
      })
    }

    return !newState
  }

  /**
   * Play test sound
   */
  const playTestSound = async () => {
    await soundAlertService.playTestSound()
  }

  /**
   * Request notification permission again
   */
  const requestNotificationPermission = async () => {
    const granted = await notificationService.requestPermission()
    setNotificationsEnabled(granted)
    return granted
  }

  /**
   * Enable audio (resume AudioContext)
   * Must be called in response to user interaction
   */
  const enableAudio = async () => {
    const success = await soundAlertService.enableAudio()
    setAudioContextReady(success)

    // If successful and there are pending alerts, start their sounds
    if (success && alerts.length > 0 && !soundAlertService.isSoundMuted()) {
      alerts.forEach(alert => {
        if (alert.status === 'pending' && !soundAlertService.isRepeating(alert.id)) {
          soundAlertService.startRepeatingAlert(alert.id, alert.priority)
        }
      })
    }

    return success
  }

  // Ensure sounds are playing for all pending alerts (handles page refresh/reload)
  useEffect(() => {
    if (!loading && alerts.length > 0 && !soundAlertService.isSoundMuted()) {
      // Make sure all pending alerts have their sounds playing
      alerts.forEach(alert => {
        if (alert.status === 'pending' && !soundAlertService.isRepeating(alert.id)) {
          soundAlertService.startRepeatingAlert(alert.id, alert.priority)
        }
      })
    }
  }, [loading]) // Only run when loading state changes (initial load)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTitleBlink()
      soundAlertService.stopAllRepeatingAlerts()
      document.title = originalTitleRef.current
    }
  }, [])

  return {
    // Alerts data
    pendingAlerts: alerts,
    pendingCount: alerts.length,
    loading,
    error,
    refetch,

    // Notification settings
    notificationsEnabled,
    soundEnabled,
    audioContextReady,

    // Controls
    toggleSound,
    playTestSound,
    requestNotificationPermission,
    enableAudio,

    // Stats
    hasHighPriorityAlerts: alerts.some(a => a.priority === 'high' || a.priority === 'critical'),
    hasCriticalAlerts: alerts.some(a => a.priority === 'critical'),
  }
}
