/**
 * Sound Notification Service for Staff App
 * Plays notification sounds for job status changes
 */

type SoundType = 'new_job' | 'job_accepted' | 'job_started' | 'job_completed' | 'job_cancelled' | 'notification'

// Sound URLs - using simple beep/notification sounds
// In production, you would host these sound files
const SOUNDS: Record<SoundType, string> = {
  new_job: '/sounds/new-job.mp3',
  job_accepted: '/sounds/accepted.mp3',
  job_started: '/sounds/started.mp3',
  job_completed: '/sounds/completed.mp3',
  job_cancelled: '/sounds/cancelled.mp3',
  notification: '/sounds/notification.mp3',
}

// Audio context for Web Audio API (better performance)
let audioContext: AudioContext | null = null

// Cached audio buffers
const audioBuffers: Map<SoundType, AudioBuffer> = new Map()

// Initialize audio context (must be called after user interaction)
export function initializeAudio(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
}

// Preload sounds
export async function preloadSounds(): Promise<void> {
  initializeAudio()
  if (!audioContext) return

  const loadPromises = Object.entries(SOUNDS).map(async ([type, url]) => {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`Sound file not found: ${url}`)
        return
      }
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioContext!.decodeAudioData(arrayBuffer)
      audioBuffers.set(type as SoundType, audioBuffer)
    } catch (error) {
      console.warn(`Failed to load sound: ${type}`, error)
    }
  })

  await Promise.allSettled(loadPromises)
}

// Play a sound
export async function playSound(type: SoundType): Promise<void> {
  // First try Web Audio API (better performance)
  if (audioContext && audioBuffers.has(type)) {
    try {
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffers.get(type)!
      source.connect(audioContext.destination)
      source.start()
      return
    } catch (error) {
      console.warn('Web Audio playback failed, falling back to HTML5 Audio')
    }
  }

  // Fallback to HTML5 Audio
  try {
    const audio = new Audio(SOUNDS[type])
    audio.volume = 0.7
    await audio.play()
  } catch (error) {
    console.warn(`Failed to play sound: ${type}`, error)
    // Try vibration as last resort
    vibrate(type)
  }
}

// Play a simple beep using Web Audio API (no external files needed)
export function playBeep(frequency: number = 440, duration: number = 200): void {
  initializeAudio()
  if (!audioContext) return

  try {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration / 1000)
  } catch (error) {
    console.warn('Failed to play beep:', error)
  }
}

// Built-in notification sounds (no external files needed)
export const NotificationSounds = {
  newJob: () => {
    // Ascending two-tone sound
    playBeep(440, 150)
    setTimeout(() => playBeep(660, 200), 170)
  },

  jobAccepted: () => {
    // Single pleasant beep
    playBeep(523, 150)
  },

  jobStarted: () => {
    // Rising tone
    playBeep(392, 100)
    setTimeout(() => playBeep(523, 150), 120)
  },

  jobCompleted: () => {
    // Celebratory ascending arpeggio
    playBeep(523, 100)
    setTimeout(() => playBeep(659, 100), 120)
    setTimeout(() => playBeep(784, 200), 240)
  },

  jobCancelled: () => {
    // Descending tone (sad)
    playBeep(440, 150)
    setTimeout(() => playBeep(330, 200), 170)
  },

  alert: () => {
    // Urgent two-tone
    playBeep(880, 100)
    setTimeout(() => playBeep(880, 100), 200)
    setTimeout(() => playBeep(880, 100), 400)
  },

  notification: () => {
    // Simple ping
    playBeep(880, 100)
  },
}

// Vibration patterns for different sound types
const VIBRATION_PATTERNS: Record<SoundType, number[]> = {
  new_job: [200, 100, 200, 100, 200],
  job_accepted: [100],
  job_started: [100, 50, 100],
  job_completed: [100, 50, 100, 50, 200],
  job_cancelled: [300],
  notification: [100],
}

// Vibrate device (for mobile)
export function vibrate(type: SoundType = 'notification'): void {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(VIBRATION_PATTERNS[type])
    } catch (error) {
      console.warn('Vibration not supported')
    }
  }
}

// Play sound and vibrate together
export async function notifyWithSoundAndVibration(type: SoundType): Promise<void> {
  vibrate(type)

  // Use built-in sounds
  switch (type) {
    case 'new_job':
      NotificationSounds.newJob()
      break
    case 'job_accepted':
      NotificationSounds.jobAccepted()
      break
    case 'job_started':
      NotificationSounds.jobStarted()
      break
    case 'job_completed':
      NotificationSounds.jobCompleted()
      break
    case 'job_cancelled':
      NotificationSounds.jobCancelled()
      break
    default:
      NotificationSounds.notification()
  }
}

// Check if sound is enabled in settings
export function isSoundEnabled(): boolean {
  try {
    const settings = localStorage.getItem('staff_settings')
    if (settings) {
      const parsed = JSON.parse(settings)
      return parsed.soundEnabled !== false
    }
  } catch {
    // Default to enabled
  }
  return true
}

// Set sound enabled/disabled
export function setSoundEnabled(enabled: boolean): void {
  try {
    const settings = JSON.parse(localStorage.getItem('staff_settings') || '{}')
    settings.soundEnabled = enabled
    localStorage.setItem('staff_settings', JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save sound settings:', error)
  }
}
