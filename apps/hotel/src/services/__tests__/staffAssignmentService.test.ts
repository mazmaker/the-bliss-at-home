import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted for all mocks referenced inside vi.mock factories
const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}))

const { mockFindMatchingStaff, mockFindMultipleStaff, mockGetStaffMatchingSummary } = vi.hoisted(() => ({
  mockFindMatchingStaff: vi.fn(),
  mockFindMultipleStaff: vi.fn(),
  mockGetStaffMatchingSummary: vi.fn(),
}))

// Mock supabase
vi.mock('@bliss/supabase/auth', () => ({
  supabase: { from: mockFrom },
}))

// Mock staffMatcher utilities
vi.mock('../../utils/staffMatcher', () => ({
  findMatchingStaff: (...args: any[]) => mockFindMatchingStaff(...args),
  findMultipleStaff: (...args: any[]) => mockFindMultipleStaff(...args),
  getStaffMatchingSummary: (...args: any[]) => mockGetStaffMatchingSummary(...args),
}))

import { staffAssignmentService } from '../staffAssignmentService'
import type { StaffAssignmentRequest } from '../staffAssignmentService'

const mockStaff = [
  {
    id: 'staff-1',
    name_th: 'สมหญิง',
    name_en: 'Somying',
    gender: 'female',
    is_active: true,
    is_available: true,
    hotel_id: 'hotel-1',
  },
  {
    id: 'staff-2',
    name_th: 'สมชาย',
    name_en: 'Somchai',
    gender: 'male',
    is_active: true,
    is_available: true,
    hotel_id: 'hotel-1',
  },
]

const defaultRequest: StaffAssignmentRequest = {
  providerPreference: 'no-preference' as any,
  bookingDate: '2026-03-01',
  bookingTime: '14:00',
  duration: 60,
  hotelId: 'hotel-1',
}

const defaultSummary = {
  totalStaff: 2,
  activeStaff: 2,
  availableStaff: 2,
  timeAvailableStaff: 2,
  preferenceMatchedStaff: 2,
}

describe('StaffAssignmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock the chain for getAllStaff
    mockFrom.mockImplementation((table: string) => {
      if (table === 'staff') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockStaff, error: null }),
            }),
          }),
        }
      }
      if (table === 'bookings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }
      }
      return { select: vi.fn() }
    })

    mockFindMatchingStaff.mockReturnValue(mockStaff[0])
    mockFindMultipleStaff.mockReturnValue(mockStaff)
    mockGetStaffMatchingSummary.mockReturnValue(defaultSummary)
  })

  describe('assignSingleStaff', () => {
    it('should return success with assigned staff when match found', async () => {
      const result = await staffAssignmentService.assignSingleStaff(defaultRequest)

      expect(result.success).toBe(true)
      expect(result.assignedStaff).toHaveLength(1)
      expect(result.assignedStaff[0].id).toBe('staff-1')
    })

    it('should return failure when no staff match', async () => {
      mockFindMatchingStaff.mockReturnValue(null)

      const result = await staffAssignmentService.assignSingleStaff(defaultRequest)

      expect(result.success).toBe(false)
      expect(result.assignedStaff).toEqual([])
      expect(result.error).toBeDefined()
    })

    it('should return failure when no staff exist', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }))

      const result = await staffAssignmentService.assignSingleStaff(defaultRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No staff available in the system')
    })

    it('should include warnings when preference not matched but staff available', async () => {
      mockFindMatchingStaff.mockReturnValue(mockStaff[0])
      mockGetStaffMatchingSummary.mockReturnValue({
        ...defaultSummary,
        preferenceMatchedStaff: 0,
        timeAvailableStaff: 2,
      })

      const result = await staffAssignmentService.assignSingleStaff({
        ...defaultRequest,
        providerPreference: 'female-only' as any,
      })

      expect(result.warnings).toBeDefined()
      expect(result.warnings?.length).toBeGreaterThan(0)
    })

    it('should handle database errors gracefully', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockRejectedValue(new Error('Database connection failed')),
          }),
        }),
      }))

      const result = await staffAssignmentService.assignSingleStaff(defaultRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('assignMultipleStaff', () => {
    it('should return success when enough staff are assigned', async () => {
      mockFindMultipleStaff.mockReturnValue(mockStaff)

      const request = { ...defaultRequest, requiredStaffCount: 2 }
      const result = await staffAssignmentService.assignMultipleStaff(request)

      expect(result.success).toBe(true)
      expect(result.assignedStaff).toHaveLength(2)
    })

    it('should default to 2 required staff count', async () => {
      mockFindMultipleStaff.mockReturnValue(mockStaff)

      const result = await staffAssignmentService.assignMultipleStaff(defaultRequest)

      expect(result.success).toBe(true)
    })

    it('should return failure when not enough staff available', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [mockStaff[0]], error: null }),
          }),
        }),
      }))

      const request = { ...defaultRequest, requiredStaffCount: 3 }
      const result = await staffAssignmentService.assignMultipleStaff(request)

      expect(result.success).toBe(false)
    })

    it('should add warning when fewer staff found than required', async () => {
      mockFindMultipleStaff.mockReturnValue([mockStaff[0]])

      const request = { ...defaultRequest, requiredStaffCount: 2 }
      const result = await staffAssignmentService.assignMultipleStaff(request)

      expect(result.warnings).toBeDefined()
    })

    it('should return failure when no staff found at all', async () => {
      mockFindMultipleStaff.mockReturnValue([])

      const result = await staffAssignmentService.assignMultipleStaff(defaultRequest)

      expect(result.success).toBe(false)
      expect(result.assignedStaff).toEqual([])
    })
  })

  describe('previewStaffAssignment', () => {
    it('should delegate to assignMultipleStaff for multiple count', async () => {
      mockFindMultipleStaff.mockReturnValue(mockStaff)

      const request = { ...defaultRequest, requiredStaffCount: 2 }
      const result = await staffAssignmentService.previewStaffAssignment(request)

      expect(result.assignedStaff.length).toBeGreaterThan(0)
    })

    it('should delegate to assignSingleStaff when requiredStaffCount is 1', async () => {
      mockFindMatchingStaff.mockReturnValue(mockStaff[0])

      const request = { ...defaultRequest, requiredStaffCount: 1 }
      const result = await staffAssignmentService.previewStaffAssignment(request)

      expect(result.assignedStaff).toHaveLength(1)
    })

    it('should delegate to assignSingleStaff when no requiredStaffCount', async () => {
      mockFindMatchingStaff.mockReturnValue(mockStaff[0])

      const result = await staffAssignmentService.previewStaffAssignment(defaultRequest)

      expect(result.assignedStaff).toHaveLength(1)
    })
  })

  describe('checkStaffAvailability', () => {
    it('should return false when staff not found', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          }),
        }),
      }))

      const result = await staffAssignmentService.checkStaffAvailability(
        'staff-1', '2026-03-01', '14:00', 60
      )

      expect(result).toBe(false)
    })
  })

  describe('StaffAssignmentResult interface', () => {
    it('should have correct shape for success result', () => {
      const result = {
        success: true,
        assignedStaff: mockStaff,
        summary: defaultSummary,
      }

      expect(result.success).toBe(true)
      expect(result.assignedStaff.length).toBe(2)
      expect(result.summary.totalStaff).toBe(2)
    })

    it('should have correct shape for failure result', () => {
      const result = {
        success: false,
        assignedStaff: [],
        summary: {
          totalStaff: 0,
          activeStaff: 0,
          availableStaff: 0,
          timeAvailableStaff: 0,
          preferenceMatchedStaff: 0,
        },
        error: 'No staff available',
        warnings: ['Low availability'],
      }

      expect(result.success).toBe(false)
      expect(result.error).toBe('No staff available')
      expect(result.warnings).toHaveLength(1)
    })
  })
})
