// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock AudioContext
const mockBufferSource = {
  connect: vi.fn(),
  buffer: null as any,
  start: vi.fn(),
}

const mockOscillator = {
  connect: vi.fn(),
  frequency: { value: 0 },
  type: 'sine' as OscillatorType,
  start: vi.fn(),
  stop: vi.fn(),
}

const mockGainNode = {
  connect: vi.fn(),
  gain: {
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
}

const mockAudioBuffer = { duration: 1, length: 44100, sampleRate: 44100, numberOfChannels: 1 }

const mockAudioContext = {
  createOscillator: vi.fn().mockReturnValue(mockOscillator),
  createGain: vi.fn().mockReturnValue(mockGainNode),
  createBufferSource: vi.fn().mockReturnValue(mockBufferSource),
  decodeAudioData: vi.fn().mockResolvedValue(mockAudioBuffer),
  destination: {},
  currentTime: 0,
}

// Use vi.stubGlobal with regular function (not arrow) so it works as constructor with `new`
vi.stubGlobal('AudioContext', vi.fn(function () { return mockAudioContext }))

// Mock Audio for fallback
const mockAudioPlay = vi.fn().mockResolvedValue(undefined)
vi.stubGlobal('Audio', vi.fn(function () {
  return {
    play: mockAudioPlay,
    volume: 0.7,
  }
}))

// Mock fetch for preloadSounds
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn().mockReturnValue(true),
  writable: true,
  configurable: true,
})

// Mock localStorage
const mockStorage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value }),
})

import {
  initializeAudio,
  preloadSounds,
  playSound,
  playBeep,
  NotificationSounds,
  vibrate,
  notifyWithSoundAndVibration,
  isSoundEnabled,
  setSoundEnabled,
} from '../soundNotification'

describe('soundNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    Object.keys(mockStorage).forEach(k => delete mockStorage[k])
    mockFetch.mockResolvedValue({ ok: false })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initializeAudio', () => {
    it('creates AudioContext', () => {
      initializeAudio()
      expect(AudioContext).toHaveBeenCalled()
    })
  })

  describe('preloadSounds', () => {
    it('fetches all sound files', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      await preloadSounds()
      // Should attempt to fetch all 6 sound types
      expect(mockFetch).toHaveBeenCalledTimes(6)
    })

    it('decodes and caches buffers on success', async () => {
      const mockArrayBuffer = new ArrayBuffer(8)
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
      })
      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer)

      await preloadSounds()

      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled()
    })

    it('handles fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('network error'))
      await expect(preloadSounds()).resolves.toBeUndefined()
    })
  })

  describe('playSound', () => {
    it('uses HTML5 Audio fallback when Web Audio buffer not available', async () => {
      initializeAudio()
      // Make createBufferSource fail so it falls to HTML5 Audio
      mockAudioContext.createBufferSource.mockImplementationOnce(() => { throw new Error('no buffer') })
      await playSound('notification')
      expect(mockAudioPlay).toHaveBeenCalled()
    })

    it('uses Web Audio API when buffer is cached', async () => {
      initializeAudio()
      // Preload a buffer first
      const mockArrayBuffer = new ArrayBuffer(8)
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
      })
      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer)
      await preloadSounds()

      await playSound('notification')
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled()
      expect(mockBufferSource.start).toHaveBeenCalled()
    })

    it('falls back to vibration when both audio methods fail', async () => {
      initializeAudio()
      // Force Web Audio failure
      mockAudioContext.createBufferSource.mockImplementationOnce(() => { throw new Error('fail') })
      // Force HTML5 Audio failure
      mockAudioPlay.mockRejectedValueOnce(new Error('play failed'))
      await playSound('new_job')
      expect(navigator.vibrate).toHaveBeenCalledWith([200, 100, 200, 100, 200])
    })
  })

  describe('playBeep', () => {
    it('creates oscillator and plays beep', () => {
      initializeAudio()
      playBeep(440, 200)
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
      expect(mockOscillator.start).toHaveBeenCalled()
      expect(mockOscillator.stop).toHaveBeenCalled()
    })

    it('uses default frequency and duration', () => {
      initializeAudio()
      playBeep()
      expect(mockOscillator.frequency.value).toBe(440)
    })

    it('handles errors gracefully', () => {
      initializeAudio()
      mockAudioContext.createOscillator.mockImplementationOnce(() => { throw new Error('fail') })
      expect(() => playBeep(440, 200)).not.toThrow()
    })
  })

  describe('NotificationSounds', () => {
    beforeEach(() => {
      initializeAudio()
    })

    it('newJob plays ascending two-tone', () => {
      NotificationSounds.newJob()
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('jobAccepted plays single beep', () => {
      NotificationSounds.jobAccepted()
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('jobStarted plays rising tone', () => {
      NotificationSounds.jobStarted()
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('jobCompleted plays arpeggio', () => {
      NotificationSounds.jobCompleted()
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('jobCancelled plays descending tone', () => {
      NotificationSounds.jobCancelled()
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('alert plays urgent two-tone', () => {
      NotificationSounds.alert()
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('notification plays simple ping', () => {
      NotificationSounds.notification()
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })
  })

  describe('vibrate', () => {
    it('vibrates with pattern for notification', () => {
      vibrate('notification')
      expect(navigator.vibrate).toHaveBeenCalledWith([100])
    })

    it('vibrates with pattern for new_job', () => {
      vibrate('new_job')
      expect(navigator.vibrate).toHaveBeenCalledWith([200, 100, 200, 100, 200])
    })

    it('vibrates with pattern for job_completed', () => {
      vibrate('job_completed')
      expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100, 50, 200])
    })

    it('vibrates with pattern for job_accepted', () => {
      vibrate('job_accepted')
      expect(navigator.vibrate).toHaveBeenCalledWith([100])
    })

    it('vibrates with pattern for job_started', () => {
      vibrate('job_started')
      expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100])
    })

    it('vibrates with pattern for job_cancelled', () => {
      vibrate('job_cancelled')
      expect(navigator.vibrate).toHaveBeenCalledWith([300])
    })

    it('handles vibrate error gracefully', () => {
      const origVibrate = navigator.vibrate;
      (navigator as any).vibrate = vi.fn(() => { throw new Error('vibrate fail') })
      expect(() => vibrate('notification')).not.toThrow();
      (navigator as any).vibrate = origVibrate
    })
  })

  describe('notifyWithSoundAndVibration', () => {
    beforeEach(() => {
      initializeAudio()
    })

    it('plays new_job sound and vibrates', async () => {
      await notifyWithSoundAndVibration('new_job')
      expect(navigator.vibrate).toHaveBeenCalled()
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('plays job_accepted sound', async () => {
      await notifyWithSoundAndVibration('job_accepted')
      expect(navigator.vibrate).toHaveBeenCalled()
    })

    it('plays job_started sound', async () => {
      await notifyWithSoundAndVibration('job_started')
      expect(navigator.vibrate).toHaveBeenCalled()
    })

    it('plays job_completed sound', async () => {
      await notifyWithSoundAndVibration('job_completed')
      expect(navigator.vibrate).toHaveBeenCalled()
    })

    it('plays job_cancelled sound', async () => {
      await notifyWithSoundAndVibration('job_cancelled')
      expect(navigator.vibrate).toHaveBeenCalled()
    })

    it('plays default notification sound', async () => {
      await notifyWithSoundAndVibration('notification')
      expect(navigator.vibrate).toHaveBeenCalled()
    })
  })

  describe('isSoundEnabled', () => {
    it('returns true by default', () => {
      expect(isSoundEnabled()).toBe(true)
    })

    it('returns false when disabled in settings', () => {
      mockStorage['staff_settings'] = JSON.stringify({ soundEnabled: false })
      expect(isSoundEnabled()).toBe(false)
    })

    it('returns true when enabled in settings', () => {
      mockStorage['staff_settings'] = JSON.stringify({ soundEnabled: true })
      expect(isSoundEnabled()).toBe(true)
    })

    it('returns true when settings have invalid JSON', () => {
      mockStorage['staff_settings'] = 'not-json{'
      // localStorage.getItem returns the string, JSON.parse throws
      const origGetItem = (localStorage.getItem as any)
      ;(localStorage as any).getItem = vi.fn(() => 'not-json{')
      expect(isSoundEnabled()).toBe(true)
      ;(localStorage as any).getItem = origGetItem
    })
  })

  describe('setSoundEnabled', () => {
    it('saves enabled state to localStorage', () => {
      setSoundEnabled(true)
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'staff_settings',
        expect.stringContaining('"soundEnabled":true')
      )
    })

    it('saves disabled state to localStorage', () => {
      setSoundEnabled(false)
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'staff_settings',
        expect.stringContaining('"soundEnabled":false')
      )
    })

    it('handles JSON parse error gracefully', () => {
      const origGetItem = (localStorage.getItem as any)
      ;(localStorage as any).getItem = vi.fn(() => 'invalid-json{')
      expect(() => setSoundEnabled(true)).not.toThrow()
      ;(localStorage as any).getItem = origGetItem
    })
  })
})
