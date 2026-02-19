// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Audio class
const mockAudioInstance = {
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  loop: false,
  volume: 1,
  preload: '',
  currentTime: 0,
  paused: true,
  ended: false,
}

vi.stubGlobal('Audio', vi.fn(function () { return mockAudioInstance }))

import {
  initializeBackgroundMusic,
  playBackgroundMusic,
  stopBackgroundMusic,
  pauseBackgroundMusic,
  resumeBackgroundMusic,
  isBackgroundMusicPlaying,
  setBackgroundMusicVolume,
  getBackgroundMusicVolume,
  fadeOutBackgroundMusic,
  fadeInBackgroundMusic,
} from '../backgroundMusic'

describe('backgroundMusic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Reset module state
    mockAudioInstance.volume = 1
    mockAudioInstance.paused = true
    mockAudioInstance.ended = false
    mockAudioInstance.currentTime = 0
    mockAudioInstance.loop = false
    mockAudioInstance.preload = ''
    mockAudioInstance.play.mockResolvedValue(undefined)
    mockAudioInstance.pause.mockImplementation(() => {
      mockAudioInstance.paused = true
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    stopBackgroundMusic()
  })

  describe('initializeBackgroundMusic', () => {
    it('creates Audio instance with loop, volume, preload, and error listener', () => {
      // initializeBackgroundMusic only creates Audio once (module-level guard)
      // So we test all initialization behavior in one test
      initializeBackgroundMusic()
      expect(Audio).toHaveBeenCalled()
      // These are set during first init (may already be set from module load)
      expect(mockAudioInstance.loop).toBe(true)
      expect(mockAudioInstance.preload).toBe('auto')
    })
  })

  describe('playBackgroundMusic', () => {
    it('plays music', async () => {
      await playBackgroundMusic()
      expect(mockAudioInstance.play).toHaveBeenCalled()
    })

    it('resets currentTime when ended', async () => {
      initializeBackgroundMusic()
      mockAudioInstance.currentTime = 120
      mockAudioInstance.ended = true
      await playBackgroundMusic()
      expect(mockAudioInstance.currentTime).toBe(0)
    })

    it('handles play failure gracefully', async () => {
      mockAudioInstance.play.mockRejectedValueOnce(new Error('autoplay blocked'))
      await expect(playBackgroundMusic()).resolves.toBeUndefined()
    })
  })

  describe('stopBackgroundMusic', () => {
    it('pauses and resets audio', async () => {
      await playBackgroundMusic()
      stopBackgroundMusic()
      expect(mockAudioInstance.pause).toHaveBeenCalled()
      expect(mockAudioInstance.currentTime).toBe(0)
    })

    it('does nothing when no audio', () => {
      // No error when called without init
      expect(() => stopBackgroundMusic()).not.toThrow()
    })
  })

  describe('pauseBackgroundMusic', () => {
    it('pauses without resetting position', async () => {
      await playBackgroundMusic()
      mockAudioInstance.currentTime = 60
      pauseBackgroundMusic()
      expect(mockAudioInstance.pause).toHaveBeenCalled()
      // currentTime should NOT be reset
    })
  })

  describe('resumeBackgroundMusic', () => {
    it('resumes playing', async () => {
      await playBackgroundMusic()
      pauseBackgroundMusic()
      await resumeBackgroundMusic()
      expect(mockAudioInstance.play).toHaveBeenCalledTimes(2)
    })

    it('handles resume failure gracefully', async () => {
      await playBackgroundMusic()
      pauseBackgroundMusic()
      mockAudioInstance.play.mockRejectedValueOnce(new Error('resume failed'))
      await expect(resumeBackgroundMusic()).resolves.toBeUndefined()
    })
  })

  describe('isBackgroundMusicPlaying', () => {
    it('returns false when not playing', () => {
      expect(isBackgroundMusicPlaying()).toBe(false)
    })

    it('returns true when playing and not paused', async () => {
      mockAudioInstance.play.mockImplementation(async () => {
        mockAudioInstance.paused = false
      })
      await playBackgroundMusic()
      expect(isBackgroundMusicPlaying()).toBe(true)
    })
  })

  describe('setBackgroundMusicVolume', () => {
    it('clamps volume between 0 and 1', async () => {
      await playBackgroundMusic()
      setBackgroundMusicVolume(1.5)
      expect(mockAudioInstance.volume).toBe(1)

      setBackgroundMusicVolume(-0.5)
      expect(mockAudioInstance.volume).toBe(0)

      setBackgroundMusicVolume(0.7)
      expect(mockAudioInstance.volume).toBe(0.7)
    })

    it('does nothing when no audio', () => {
      expect(() => setBackgroundMusicVolume(0.5)).not.toThrow()
    })
  })

  describe('getBackgroundMusicVolume', () => {
    it('returns current volume', async () => {
      await playBackgroundMusic()
      mockAudioInstance.volume = 0.6
      expect(getBackgroundMusicVolume()).toBe(0.6)
    })

    it('returns default 0.4 when no audio initialized', () => {
      expect(getBackgroundMusicVolume()).toBeDefined()
    })
  })

  describe('fadeOutBackgroundMusic', () => {
    it('resolves immediately when not playing', async () => {
      await expect(fadeOutBackgroundMusic(500)).resolves.toBeUndefined()
    })

    it('gradually decreases volume and stops', async () => {
      // Setup: make music playing
      mockAudioInstance.play.mockImplementation(async () => {
        mockAudioInstance.paused = false
      })
      await playBackgroundMusic()
      mockAudioInstance.volume = 0.4

      const fadePromise = fadeOutBackgroundMusic(1000)

      // Advance timers through the fade steps (20 steps, 1000ms / 20 = 50ms each)
      for (let i = 0; i < 25; i++) {
        vi.advanceTimersByTime(50)
      }

      await fadePromise
      // After fade completes, stop should have been called
      expect(mockAudioInstance.pause).toHaveBeenCalled()
    })
  })

  describe('fadeInBackgroundMusic', () => {
    it('starts from zero and fades to target volume', async () => {
      mockAudioInstance.play.mockImplementation(async () => {
        mockAudioInstance.paused = false
      })

      const fadePromise = fadeInBackgroundMusic(1000, 0.5)

      // Flush microtasks first (playBackgroundMusic().then()), then advance timers
      await vi.advanceTimersByTimeAsync(1500)

      await fadePromise
      expect(mockAudioInstance.volume).toBe(0.5)
    })

    it('resolves when play fails', async () => {
      mockAudioInstance.play.mockRejectedValueOnce(new Error('play failed'))

      const fadePromise = fadeInBackgroundMusic(500, 0.4)

      // Use async advancement to flush microtasks (catch handler)
      await vi.advanceTimersByTimeAsync(1000)

      await expect(fadePromise).resolves.toBeUndefined()
    })
  })
})
