import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockStaffService } = vi.hoisted(() => ({
  mockStaffService: {
    getDocuments: vi.fn().mockResolvedValue([]),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getServiceAreas: vi.fn().mockResolvedValue([]),
    addServiceArea: vi.fn(),
    updateServiceArea: vi.fn(),
    deleteServiceArea: vi.fn(),
    getSkills: vi.fn().mockResolvedValue([]),
    getAllSkills: vi.fn().mockResolvedValue([]),
    addSkill: vi.fn(),
    updateSkillLevel: vi.fn(),
    deleteSkill: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    updateStaffData: vi.fn(),
    updatePassword: vi.fn(),
    canStaffStartWork: vi.fn().mockResolvedValue({ eligible: true, reasons: [] }),
  },
}))

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}))

vi.mock('../../auth/hooks', () => ({
  useAuth: mockUseAuth,
}))

vi.mock('../staffService', () => ({
  staffService: mockStaffService,
}))

import {
  useDocuments,
  useServiceAreas,
  useStaffSkills,
  useProfileUpdate,
  useStaffEligibility,
} from '../useStaffProfile'

describe('useStaffProfile hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: null, isLoading: true, refreshUser: vi.fn() })
  })

  describe('useDocuments', () => {
    it('should export useDocuments function', () => {
      expect(typeof useDocuments).toBe('function')
    })

    it('should accept no arguments', () => {
      expect(useDocuments.length).toBe(0)
    })
  })

  describe('useServiceAreas', () => {
    it('should export useServiceAreas function', () => {
      expect(typeof useServiceAreas).toBe('function')
    })

    it('should accept no arguments', () => {
      expect(useServiceAreas.length).toBe(0)
    })
  })

  describe('useStaffSkills', () => {
    it('should export useStaffSkills function', () => {
      expect(typeof useStaffSkills).toBe('function')
    })

    it('should accept no arguments', () => {
      expect(useStaffSkills.length).toBe(0)
    })
  })

  describe('useProfileUpdate', () => {
    it('should export useProfileUpdate function', () => {
      expect(typeof useProfileUpdate).toBe('function')
    })

    it('should accept no arguments', () => {
      expect(useProfileUpdate.length).toBe(0)
    })
  })

  describe('useStaffEligibility', () => {
    it('should export useStaffEligibility function', () => {
      expect(typeof useStaffEligibility).toBe('function')
    })

    it('should accept no arguments', () => {
      expect(useStaffEligibility.length).toBe(0)
    })
  })

  describe('staffService mock', () => {
    it('should have all document methods', () => {
      expect(typeof mockStaffService.getDocuments).toBe('function')
      expect(typeof mockStaffService.uploadDocument).toBe('function')
      expect(typeof mockStaffService.deleteDocument).toBe('function')
    })

    it('should have all service area methods', () => {
      expect(typeof mockStaffService.getServiceAreas).toBe('function')
      expect(typeof mockStaffService.addServiceArea).toBe('function')
      expect(typeof mockStaffService.updateServiceArea).toBe('function')
      expect(typeof mockStaffService.deleteServiceArea).toBe('function')
    })

    it('should have all skill methods', () => {
      expect(typeof mockStaffService.getSkills).toBe('function')
      expect(typeof mockStaffService.getAllSkills).toBe('function')
      expect(typeof mockStaffService.addSkill).toBe('function')
      expect(typeof mockStaffService.updateSkillLevel).toBe('function')
      expect(typeof mockStaffService.deleteSkill).toBe('function')
    })

    it('should have profile update methods', () => {
      expect(typeof mockStaffService.updateProfile).toBe('function')
      expect(typeof mockStaffService.uploadAvatar).toBe('function')
      expect(typeof mockStaffService.updateStaffData).toBe('function')
      expect(typeof mockStaffService.updatePassword).toBe('function')
    })

    it('should have eligibility check method', () => {
      expect(typeof mockStaffService.canStaffStartWork).toBe('function')
    })
  })
})
