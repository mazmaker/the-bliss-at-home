/**
 * Job Reminder Utility
 * Manages job reminders with browser notifications and localStorage
 */

import type { Job } from '@bliss/supabase'

const REMINDER_STORAGE_KEY = 'bliss_job_reminders'
const REMINDER_SETTINGS_KEY = 'bliss_reminder_settings'

// Reminder times in minutes before job start
export const REMINDER_OPTIONS = [
  { value: 30, label: '30 นาที', labelEn: '30 minutes' },
  { value: 60, label: '1 ชั่วโมง', labelEn: '1 hour' },
  { value: 120, label: '2 ชั่วโมง', labelEn: '2 hours' },
  { value: 1440, label: '1 วัน', labelEn: '1 day' },
]

interface ReminderSettings {
  enabled: boolean
  times: number[] // minutes before job start
}

interface ScheduledReminder {
  jobId: string
  jobTitle: string
  scheduledTime: string
  reminderTime: string
  timeoutId?: ReturnType<typeof setTimeout>
}

let activeReminders: Map<string, ScheduledReminder> = new Map()

/**
 * Get reminder settings from localStorage
 */
export function getReminderSettings(): ReminderSettings {
  try {
    const stored = localStorage.getItem(REMINDER_SETTINGS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error reading reminder settings:', error)
  }
  return { enabled: true, times: [60, 120] } // Default: 1 hour and 2 hours before
}

/**
 * Save reminder settings to localStorage
 */
export function saveReminderSettings(settings: ReminderSettings): void {
  try {
    localStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('Error saving reminder settings:', error)
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

/**
 * Check if notifications are enabled
 */
export function isNotificationEnabled(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

/**
 * Show a notification
 */
export function showNotification(title: string, options?: NotificationOptions): void {
  if (!isNotificationEnabled()) {
    console.warn('Notifications not enabled')
    return
  }

  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    })

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000)

    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  } catch (error) {
    console.error('Error showing notification:', error)
  }
}

/**
 * Calculate reminder time from job scheduled time
 */
function calculateReminderTime(scheduledDate: string, scheduledTime: string, minutesBefore: number): Date {
  const [hours, minutes] = scheduledTime.split(':').map(Number)
  const jobDateTime = new Date(scheduledDate)
  jobDateTime.setHours(hours, minutes, 0, 0)
  return new Date(jobDateTime.getTime() - minutesBefore * 60 * 1000)
}

/**
 * Format time until job start
 */
function formatTimeUntil(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} นาที`
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    return `${hours} ชั่วโมง`
  } else {
    const days = Math.floor(minutes / 1440)
    return `${days} วัน`
  }
}

/**
 * Schedule a reminder for a job
 */
export function scheduleJobReminder(job: Job, minutesBefore: number): void {
  const settings = getReminderSettings()
  if (!settings.enabled) return

  const reminderKey = `${job.id}-${minutesBefore}`

  // Cancel existing reminder for this job/time combo
  cancelJobReminder(reminderKey)

  const reminderTime = calculateReminderTime(
    job.scheduled_date,
    job.scheduled_time || '00:00',
    minutesBefore
  )

  const now = new Date()
  const timeUntilReminder = reminderTime.getTime() - now.getTime()

  // Don't schedule if reminder time has passed
  if (timeUntilReminder <= 0) {
    return
  }

  // Schedule the reminder
  const timeoutId = setTimeout(() => {
    showNotification(`งานใน ${formatTimeUntil(minutesBefore)}`, {
      body: `${job.service_name}\nลูกค้า: ${job.customer_name}\nเวลา: ${job.scheduled_time}`,
      tag: `job-reminder-${job.id}`,
      requireInteraction: true,
    })
    activeReminders.delete(reminderKey)
  }, timeUntilReminder)

  activeReminders.set(reminderKey, {
    jobId: job.id,
    jobTitle: job.service_name,
    scheduledTime: `${job.scheduled_date}T${job.scheduled_time}`,
    reminderTime: reminderTime.toISOString(),
    timeoutId,
  })
}

/**
 * Cancel a specific reminder
 */
export function cancelJobReminder(reminderKey: string): void {
  const reminder = activeReminders.get(reminderKey)
  if (reminder?.timeoutId) {
    clearTimeout(reminder.timeoutId)
    activeReminders.delete(reminderKey)
  }
}

/**
 * Cancel all reminders for a job
 */
export function cancelAllJobReminders(jobId: string): void {
  for (const [key, reminder] of activeReminders.entries()) {
    if (reminder.jobId === jobId && reminder.timeoutId) {
      clearTimeout(reminder.timeoutId)
      activeReminders.delete(key)
    }
  }
}

/**
 * Schedule reminders for all upcoming jobs
 */
export function scheduleRemindersForJobs(jobs: Job[]): void {
  const settings = getReminderSettings()
  if (!settings.enabled || settings.times.length === 0) return

  const now = new Date()
  const upcomingJobs = jobs.filter((job) => {
    if (['completed', 'cancelled'].includes(job.status)) return false
    const jobDateTime = new Date(`${job.scheduled_date}T${job.scheduled_time || '00:00'}`)
    return jobDateTime > now
  })

  // Schedule reminders for each job at each configured time
  for (const job of upcomingJobs) {
    for (const minutes of settings.times) {
      scheduleJobReminder(job, minutes)
    }
  }
}

/**
 * Clear all active reminders
 */
export function clearAllReminders(): void {
  for (const [key, reminder] of activeReminders.entries()) {
    if (reminder.timeoutId) {
      clearTimeout(reminder.timeoutId)
    }
  }
  activeReminders.clear()
}

/**
 * Get count of active reminders
 */
export function getActiveRemindersCount(): number {
  return activeReminders.size
}
