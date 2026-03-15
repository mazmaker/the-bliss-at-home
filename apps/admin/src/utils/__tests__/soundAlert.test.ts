// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock AudioContext
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
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
}

const mockAudioContext = {
  createOscillator: vi.fn().mockReturnValue(mockOscillator),
  createGain: vi.fn().mockReturnValue(mockGainNode),
  destination: {},
  currentTime: 0,
  state: 'running' as AudioContextState,
  resume: vi.fn().mockResolvedValue(undefined),
}

// Use vi.stubGlobal with regular function (not arrow) so it works as constructor with `new`
vi.stubGlobal('AudioContext', vi.fn(function () { return mockAudioContext }))

// Mock localStorage
const localStorageMock: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => localStorageMock[key] || null),
  setItem: vi.fn((key: string, value: string) => { localStorageMock[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageMock[key] }),
})

import { SoundAlertService } from '../soundAlert'

describe('SoundAlertService', () => {
  let service: SoundAlertService

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Reset singleton
    // @ts-ignore
    SoundAlertService['instance'] = undefined as any
    mockAudioContext.state = 'running'
    mockAudioContext.resume.mockResolvedValue(undefined)
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k])
    service = SoundAlertService.getInstance()
  })

  afterEach(() => {
    service.stopAllRepeatingAlerts()
    vi.useRealTimers()
  })

  describe('getInstance', () => {
    it('returns singleton', () => {
      const a = SoundAlertService.getInstance()
      const b = SoundAlertService.getInstance()
      expect(a).toBe(b)
    })
  })

  describe('playSOSAlert', () => {
    it('plays critical alert', async () => {
      await service.playSOSAlert('critical')
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('plays high alert', async () => {
      await service.playSOSAlert('high')
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('plays medium alert', async () => {
      await service.playSOSAlert('medium')
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('plays low alert', async () => {
      await service.playSOSAlert('low')
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('does nothing when muted', async () => {
      service.setMuted(true)
      mockAudioContext.createOscillator.mockClear()
      await service.playSOSAlert('high')
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled()
    })

    it('resumes suspended audio context', async () => {
      mockAudioContext.state = 'suspended'
      mockAudioContext.resume.mockImplementation(async () => {
        mockAudioContext.state = 'running'
      })
      await service.playSOSAlert('medium')
      expect(mockAudioContext.resume).toHaveBeenCalled()
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('warns and returns when context stays suspended', async () => {
      mockAudioContext.state = 'suspended'
      // resume succeeds but state stays suspended
      mockAudioContext.resume.mockResolvedValue(undefined)
      mockAudioContext.createOscillator.mockClear()
      await service.playSOSAlert('high')
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled()
    })

    it('handles resume error', async () => {
      mockAudioContext.state = 'suspended'
      mockAudioContext.resume.mockRejectedValueOnce(new Error('resume failed'))
      mockAudioContext.createOscillator.mockClear()
      await service.playSOSAlert('critical')
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled()
    })

    it('handles oscillator error', async () => {
      mockAudioContext.createOscillator.mockImplementationOnce(() => { throw new Error('fail') })
      await expect(service.playSOSAlert('medium')).resolves.toBeUndefined()
    })
  })

  describe('setMuted / isSoundMuted / toggleMute', () => {
    it('sets muted state', () => {
      service.setMuted(true)
      expect(service.isSoundMuted()).toBe(true)
    })

    it('sets unmuted state', () => {
      service.setMuted(false)
      expect(service.isSoundMuted()).toBe(false)
    })

    it('toggles mute', () => {
      service.setMuted(false)
      const result = service.toggleMute()
      expect(result).toBe(true)
      expect(service.isSoundMuted()).toBe(true)
    })

    it('persists to localStorage', () => {
      service.setMuted(true)
      expect(localStorage.setItem).toHaveBeenCalledWith('sos-sound-muted', 'true')
    })

    it('reads from localStorage', () => {
      localStorageMock['sos-sound-muted'] = 'true'
      expect(service.isSoundMuted()).toBe(true)
    })

    it('toggles back from muted to unmuted', () => {
      service.setMuted(true)
      const result = service.toggleMute()
      expect(result).toBe(false)
    })
  })

  describe('repeating alerts', () => {
    it('starts repeating alert', () => {
      service.startRepeatingAlert('alert-1', 'high')
      expect(service.isRepeating('alert-1')).toBe(true)
      expect(service.getRepeatingCount()).toBe(1)
    })

    it('stops repeating alert', () => {
      service.startRepeatingAlert('alert-1', 'medium')
      service.stopRepeatingAlert('alert-1')
      expect(service.isRepeating('alert-1')).toBe(false)
    })

    it('stops all repeating alerts', () => {
      service.startRepeatingAlert('alert-1', 'high')
      service.startRepeatingAlert('alert-2', 'critical')
      expect(service.getRepeatingCount()).toBe(2)
      service.stopAllRepeatingAlerts()
      expect(service.getRepeatingCount()).toBe(0)
    })

    it('replaces existing repeating alert', () => {
      service.startRepeatingAlert('alert-1', 'high')
      service.startRepeatingAlert('alert-1', 'critical')
      expect(service.getRepeatingCount()).toBe(1)
    })

    it('stopRepeatingAlert is no-op for non-existent alert', () => {
      expect(() => service.stopRepeatingAlert('nonexistent')).not.toThrow()
      expect(service.getRepeatingCount()).toBe(0)
    })

    it('repeats alert at interval', () => {
      service.startRepeatingAlert('alert-1', 'critical')
      // Critical: 2000ms interval
      mockAudioContext.createOscillator.mockClear()
      vi.advanceTimersByTime(2000)
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('uses different intervals per priority', () => {
      service.startRepeatingAlert('low', 'low')
      service.startRepeatingAlert('med', 'medium')
      service.startRepeatingAlert('high', 'high')
      service.startRepeatingAlert('crit', 'critical')
      expect(service.getRepeatingCount()).toBe(4)
    })
  })

  describe('isAudioContextReady', () => {
    it('returns true when running', () => {
      mockAudioContext.state = 'running'
      expect(service.isAudioContextReady()).toBe(true)
    })

    it('returns false when suspended', () => {
      mockAudioContext.state = 'suspended'
      expect(service.isAudioContextReady()).toBe(false)
    })
  })

  describe('enableAudio', () => {
    it('resumes suspended context', async () => {
      mockAudioContext.state = 'suspended'
      mockAudioContext.resume.mockImplementation(async () => {
        mockAudioContext.state = 'running'
      })
      const result = await service.enableAudio()
      expect(result).toBe(true)
      expect(mockAudioContext.resume).toHaveBeenCalled()
    })

    it('returns true if already running', async () => {
      mockAudioContext.state = 'running'
      const result = await service.enableAudio()
      expect(result).toBe(true)
    })

    it('returns false when resume fails', async () => {
      mockAudioContext.state = 'suspended'
      mockAudioContext.resume.mockRejectedValueOnce(new Error('resume failed'))
      const result = await service.enableAudio()
      expect(result).toBe(false)
    })
  })

  describe('playTestSound', () => {
    it('plays medium alert as test sound', async () => {
      await service.playTestSound()
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })
  })
})
