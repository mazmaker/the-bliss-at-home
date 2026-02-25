/**
 * Browser Notification Service for SOS Alerts
 * Handles browser push notifications with permission management
 */

export class NotificationService {
  private static instance: NotificationService
  private permissionGranted: boolean = false

  private constructor() {
    this.checkPermission()
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Check current notification permission status
   */
  private checkPermission(): void {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return
    }

    this.permissionGranted = Notification.permission === 'granted'
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true
      return true
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      this.permissionGranted = permission === 'granted'
      return this.permissionGranted
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  /**
   * Show a notification for SOS alert
   */
  showSOSNotification(data: {
    title: string
    message: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    sourceType: 'customer' | 'staff'
    alertId: string
  }): void {
    if (!this.permissionGranted) {
      console.warn('Notification permission not granted')
      return
    }

    const { title, message, priority, sourceType } = data

    // Determine icon based on priority
    const icon = priority === 'critical' || priority === 'high'
      ? '🚨'
      : '⚠️'

    // Create notification body
    const body = `${icon} ${message}\nจาก: ${sourceType === 'customer' ? 'ลูกค้า' : 'พนักงาน'}\nระดับ: ${this.getPriorityText(priority)}`

    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `sos-${data.alertId}`, // Prevent duplicate notifications
        requireInteraction: priority === 'critical' || priority === 'high', // Stay visible for critical alerts
        silent: false,
        vibrate: priority === 'critical' ? [200, 100, 200, 100, 200] : [200, 100, 200],
      })

      // Handle notification click - focus the admin panel
      notification.onclick = () => {
        window.focus()
        notification.close()
        // Navigate to SOS alerts page
        window.location.href = '/admin/sos-alerts'
      }

      // Auto-close after 10 seconds for non-critical alerts
      if (priority !== 'critical' && priority !== 'high') {
        setTimeout(() => {
          notification.close()
        }, 10000)
      }
    } catch (error) {
      console.error('Error showing notification:', error)
    }
  }

  /**
   * Get priority text in Thai
   */
  private getPriorityText(priority: string): string {
    const priorityMap: Record<string, string> = {
      low: 'ต่ำ',
      medium: 'ปานกลาง',
      high: 'สูง',
      critical: 'วิกฤต'
    }
    return priorityMap[priority] || priority
  }

  /**
   * Check if notifications are supported and permission is granted
   */
  isAvailable(): boolean {
    return 'Notification' in window && this.permissionGranted
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    return Notification.permission
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance()
