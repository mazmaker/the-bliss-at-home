/**
 * Sound Alert Service for SOS Notifications
 * Plays audio alerts for different priority levels
 */

export class SoundAlertService {
  private static instance: SoundAlertService
  private audioContext: AudioContext | null = null
  private isMuted: boolean = false
  private repeatingAlerts: Map<string, NodeJS.Timeout> = new Map()

  private constructor() {
    // Initialize AudioContext on first user interaction
    this.initAudioContext()
  }

  static getInstance(): SoundAlertService {
    if (!SoundAlertService.instance) {
      SoundAlertService.instance = new SoundAlertService()
    }
    return SoundAlertService.instance
  }

  /**
   * Initialize Web Audio API context
   */
  private initAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass()

        // Add user interaction handler to resume suspended context
        // This helps with browser autoplay restrictions
        const resumeOnInteraction = async () => {
          if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
              await this.audioContext.resume()
              console.log('AudioContext resumed after user interaction')
            } catch (error) {
              console.warn('Failed to resume AudioContext:', error)
            }
          }
          // Remove listener after first successful interaction
          if (this.audioContext && this.audioContext.state === 'running') {
            document.removeEventListener('click', resumeOnInteraction)
            document.removeEventListener('keydown', resumeOnInteraction)
          }
        }

        document.addEventListener('click', resumeOnInteraction)
        document.addEventListener('keydown', resumeOnInteraction)
      }
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error)
    }
  }

  /**
   * Play SOS alert sound based on priority
   */
  async playSOSAlert(priority: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
    if (this.isMuted) {
      return
    }

    if (!this.audioContext) {
      this.initAudioContext()
    }

    if (!this.audioContext) {
      console.warn('AudioContext not available')
      return
    }

    // Resume audio context if suspended (due to browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
        if (this.audioContext.state === 'suspended') {
          console.warn('AudioContext still suspended - sound may not play until user interacts with page')
          return
        }
      } catch (error) {
        console.warn('Failed to resume AudioContext:', error)
        return
      }
    }

    try {
      switch (priority) {
        case 'critical':
          await this.playCriticalAlert()
          break
        case 'high':
          await this.playHighAlert()
          break
        case 'medium':
          await this.playMediumAlert()
          break
        case 'low':
          await this.playLowAlert()
          break
      }
    } catch (error) {
      console.error('Error playing sound alert:', error)
    }
  }

  /**
   * Play critical priority alert (urgent, repeating)
   */
  private async playCriticalAlert(): Promise<void> {
    if (!this.audioContext) return

    const now = this.audioContext.currentTime

    // Play 3 urgent beeps
    for (let i = 0; i < 3; i++) {
      this.playBeep(880, now + i * 0.3, 0.2, 0.8) // High pitch
      this.playBeep(440, now + i * 0.3 + 0.1, 0.1, 0.6) // Mid pitch
    }
  }

  /**
   * Play high priority alert
   */
  private async playHighAlert(): Promise<void> {
    if (!this.audioContext) return

    const now = this.audioContext.currentTime

    // Play 2 urgent beeps
    this.playBeep(784, now, 0.15, 0.7) // G5
    this.playBeep(659, now + 0.2, 0.15, 0.7) // E5
  }

  /**
   * Play medium priority alert
   */
  private async playMediumAlert(): Promise<void> {
    if (!this.audioContext) return

    const now = this.audioContext.currentTime

    // Single beep
    this.playBeep(523, now, 0.2, 0.5) // C5
  }

  /**
   * Play low priority alert
   */
  private async playLowAlert(): Promise<void> {
    if (!this.audioContext) return

    const now = this.audioContext.currentTime

    // Gentle beep
    this.playBeep(440, now, 0.15, 0.3) // A4
  }

  /**
   * Play a single beep tone
   */
  private playBeep(
    frequency: number,
    startTime: number,
    duration: number,
    volume: number
  ): void {
    if (!this.audioContext) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = 'sine'

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }

  /**
   * Play test sound
   */
  async playTestSound(): Promise<void> {
    await this.playSOSAlert('medium')
  }

  /**
   * Mute/unmute alerts
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted
    localStorage.setItem('sos-sound-muted', String(muted))
  }

  /**
   * Check if muted
   */
  isSoundMuted(): boolean {
    const stored = localStorage.getItem('sos-sound-muted')
    if (stored !== null) {
      this.isMuted = stored === 'true'
    }
    return this.isMuted
  }

  /**
   * Toggle mute
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted
    localStorage.setItem('sos-sound-muted', String(this.isMuted))
    return this.isMuted
  }

  /**
   * Start repeating alert for a specific SOS alert
   * Will play sound every 3 seconds until stopped
   */
  startRepeatingAlert(alertId: string, priority: 'low' | 'medium' | 'high' | 'critical'): void {
    // Stop existing interval for this alert if any
    this.stopRepeatingAlert(alertId)

    // Play immediately
    this.playSOSAlert(priority)

    // Get repeat interval based on priority
    const repeatInterval = this.getRepeatInterval(priority)

    // Set up repeating interval
    const interval = setInterval(() => {
      this.playSOSAlert(priority)
    }, repeatInterval)

    // Store the interval
    this.repeatingAlerts.set(alertId, interval)
  }

  /**
   * Stop repeating alert for a specific SOS alert
   */
  stopRepeatingAlert(alertId: string): void {
    const interval = this.repeatingAlerts.get(alertId)
    if (interval) {
      clearInterval(interval)
      this.repeatingAlerts.delete(alertId)
    }
  }

  /**
   * Stop all repeating alerts
   */
  stopAllRepeatingAlerts(): void {
    this.repeatingAlerts.forEach((interval) => {
      clearInterval(interval)
    })
    this.repeatingAlerts.clear()
  }

  /**
   * Get repeat interval based on priority (in milliseconds)
   */
  private getRepeatInterval(priority: 'low' | 'medium' | 'high' | 'critical'): number {
    switch (priority) {
      case 'critical':
        return 2000  // Every 2 seconds for critical
      case 'high':
        return 3000  // Every 3 seconds for high
      case 'medium':
        return 5000  // Every 5 seconds for medium
      case 'low':
        return 7000  // Every 7 seconds for low
    }
  }

  /**
   * Check if an alert is currently repeating
   */
  isRepeating(alertId: string): boolean {
    return this.repeatingAlerts.has(alertId)
  }

  /**
   * Get count of currently repeating alerts
   */
  getRepeatingCount(): number {
    return this.repeatingAlerts.size
  }

  /**
   * Check if AudioContext is ready (not suspended)
   */
  isAudioContextReady(): boolean {
    if (!this.audioContext) {
      return false
    }
    return this.audioContext.state === 'running'
  }

  /**
   * Manually enable audio (requires user interaction)
   * Returns true if successful
   */
  async enableAudio(): Promise<boolean> {
    if (!this.audioContext) {
      this.initAudioContext()
    }

    if (!this.audioContext) {
      return false
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
        return this.audioContext.state === 'running'
      } catch (error) {
        console.error('Failed to enable audio:', error)
        return false
      }
    }

    return true
  }
}

// Export singleton instance
export const soundAlertService = SoundAlertService.getInstance()
