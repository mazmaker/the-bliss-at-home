/**
 * Background Music Service for Staff App
 * Plays relaxing spa/massage music during service
 */

// Background music file path
// You can replace this with your actual music file
const MUSIC_URL = '/sounds/spa-music.mp3'

// Global audio instance for background music
let backgroundAudio: HTMLAudioElement | null = null
let isPlaying = false

/**
 * Initialize the background music audio element
 */
export function initializeBackgroundMusic(): void {
  if (!backgroundAudio) {
    backgroundAudio = new Audio(MUSIC_URL)
    backgroundAudio.loop = true // Loop continuously
    backgroundAudio.volume = 0.4 // Set comfortable volume (40%)
    backgroundAudio.preload = 'auto'

    // Handle errors gracefully
    backgroundAudio.addEventListener('error', (e) => {
      console.warn('Background music failed to load:', e)
    })
  }
}

/**
 * Play the background music
 */
export async function playBackgroundMusic(): Promise<void> {
  try {
    // Initialize if not already done
    if (!backgroundAudio) {
      initializeBackgroundMusic()
    }

    if (!backgroundAudio) {
      console.warn('Background audio not initialized')
      return
    }

    // Reset to beginning if needed
    if (backgroundAudio.currentTime > 0 && backgroundAudio.ended) {
      backgroundAudio.currentTime = 0
    }

    // Play the music
    await backgroundAudio.play()
    isPlaying = true
    console.log('Background music started')
  } catch (error) {
    console.warn('Failed to play background music:', error)
    // Silently fail - don't disrupt the app
  }
}

/**
 * Stop the background music
 */
export function stopBackgroundMusic(): void {
  if (!backgroundAudio) return

  try {
    backgroundAudio.pause()
    backgroundAudio.currentTime = 0 // Reset to beginning
    isPlaying = false
    console.log('Background music stopped')
  } catch (error) {
    console.warn('Failed to stop background music:', error)
  }
}

/**
 * Pause the background music (without resetting position)
 */
export function pauseBackgroundMusic(): void {
  if (!backgroundAudio) return

  try {
    backgroundAudio.pause()
    isPlaying = false
    console.log('Background music paused')
  } catch (error) {
    console.warn('Failed to pause background music:', error)
  }
}

/**
 * Resume the background music from where it was paused
 */
export async function resumeBackgroundMusic(): Promise<void> {
  if (!backgroundAudio) return

  try {
    await backgroundAudio.play()
    isPlaying = true
    console.log('Background music resumed')
  } catch (error) {
    console.warn('Failed to resume background music:', error)
  }
}

/**
 * Check if background music is currently playing
 */
export function isBackgroundMusicPlaying(): boolean {
  return isPlaying && backgroundAudio !== null && !backgroundAudio.paused
}

/**
 * Set the volume of background music (0.0 to 1.0)
 */
export function setBackgroundMusicVolume(volume: number): void {
  if (!backgroundAudio) return

  // Clamp volume between 0 and 1
  const clampedVolume = Math.max(0, Math.min(1, volume))
  backgroundAudio.volume = clampedVolume
}

/**
 * Get current volume (0.0 to 1.0)
 */
export function getBackgroundMusicVolume(): number {
  return backgroundAudio?.volume || 0.4
}

/**
 * Fade out the music gradually (smooth stop)
 */
export function fadeOutBackgroundMusic(duration: number = 2000): Promise<void> {
  return new Promise((resolve) => {
    if (!backgroundAudio || !isPlaying) {
      resolve()
      return
    }

    const startVolume = backgroundAudio.volume
    const steps = 20
    const stepDuration = duration / steps
    const volumeStep = startVolume / steps
    let currentStep = 0

    const fadeInterval = setInterval(() => {
      currentStep++

      if (currentStep >= steps || !backgroundAudio) {
        clearInterval(fadeInterval)
        stopBackgroundMusic()
        // Restore original volume for next time
        if (backgroundAudio) {
          backgroundAudio.volume = startVolume
        }
        resolve()
      } else {
        backgroundAudio.volume = Math.max(0, startVolume - (volumeStep * currentStep))
      }
    }, stepDuration)
  })
}

/**
 * Fade in the music gradually (smooth start)
 */
export function fadeInBackgroundMusic(duration: number = 2000, targetVolume: number = 0.4): Promise<void> {
  return new Promise((resolve) => {
    if (!backgroundAudio) {
      initializeBackgroundMusic()
      if (!backgroundAudio) {
        resolve()
        return
      }
    }

    const steps = 20
    const stepDuration = duration / steps
    const volumeStep = targetVolume / steps
    let currentStep = 0

    // Start from zero volume
    backgroundAudio.volume = 0

    // Start playing
    playBackgroundMusic().then(() => {
      const fadeInterval = setInterval(() => {
        currentStep++

        if (currentStep >= steps || !backgroundAudio) {
          clearInterval(fadeInterval)
          if (backgroundAudio) {
            backgroundAudio.volume = targetVolume
          }
          resolve()
        } else {
          backgroundAudio.volume = Math.min(targetVolume, volumeStep * currentStep)
        }
      }, stepDuration)
    }).catch(() => {
      resolve()
    })
  })
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stopBackgroundMusic()
  })
}
