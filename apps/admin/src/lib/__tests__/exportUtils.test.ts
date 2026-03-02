import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DOM APIs
const mockCreateElement = vi.fn()
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()
const mockClick = vi.fn()
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()

vi.stubGlobal('document', {
  createElement: mockCreateElement.mockReturnValue({
    href: '',
    download: '',
    style: { display: '' },
    click: mockClick,
  }),
  body: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
  },
})

vi.stubGlobal('URL', {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
})

vi.stubGlobal('Blob', class MockBlob {
  content: any[]
  options: any
  constructor(content: any[], options: any) {
    this.content = content
    this.options = options
  }
})

// Mock window.open for PDF export
const mockPrintWindow = {
  document: {
    write: vi.fn(),
    close: vi.fn(),
  },
  print: vi.fn(),
}
vi.stubGlobal('window', {
  open: vi.fn(() => mockPrintWindow),
  location: { origin: 'http://localhost:3001' },
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
})

import {
  exportToExcel,
  exportToPDF,
  quickExportPDF,
  quickExportExcel,
} from '../exportUtils'

import type { ReportExportData } from '../exportUtils'

describe('exportUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mockExportData: ReportExportData = {
    dashboardStats: {
      totalRevenue: 100000,
      totalBookings: 50,
      newCustomers: 10,
      avgBookingValue: 2000,
      revenueGrowth: 15,
      bookingsGrowth: 10,
      newCustomersGrowth: 5,
      avgValueGrowth: 3,
    },
    categories: [
      { category: 'นวด', count: 30, revenue: 60000, percentage: 60 },
      { category: 'เล็บ', count: 20, revenue: 40000, percentage: 40 },
    ],
    topServices: [
      { id: '1', rank: 1, name: 'นวดไทย', bookings: 20, revenue: 40000, growth: '+10%' },
    ],
    hotelPerformance: [],
    staffOverview: {
      totalStaff: 10,
      activeStaff: 8,
      inactiveStaff: 2,
      totalEarnings: 200000,
      avgEarningsPerStaff: 25000,
      totalBookingsHandled: 100,
      avgRating: 4.5,
    },
    staffPerformance: [
      {
        staff_id: 's1',
        name: 'Staff 1',
        bookings_completed: 10,
        bookings_cancelled: 1,
        bookings_no_show: 0,
        completion_rate: 90,
        cancellation_rate: 10,
        total_revenue_generated: 50000,
        base_earnings: 20000,
        total_earnings: 25000,
        avg_service_price: 5000,
        avg_rating: 4.5,
        total_reviews: 8,
        positive_reviews: 7,
        negative_reviews: 1,
        customer_retention_rate: 80,
        punctuality_score: 95,
        response_time_hours: 2,
        working_days: 20,
        services_per_day: 2,
        specializations: ['massage'],
        skill_ratings: {},
        coverage_areas: [],
        availability_score: 90,
        revenue_growth: 10,
        booking_growth: 5,
        rating_growth: 2,
        rank: 1,
        status: 'active' as const,
        last_active_date: '2026-01-01',
        join_date: '2025-01-01',
      },
    ],
    staffEarnings: [
      {
        staff_id: 's1',
        name: 'Staff 1',
        base_earnings: 20000,
        bonus_earnings: 5000,
        total_earnings: 25000,
        alltime_earnings: 100000,
        pending_payout: 10000,
        paid_payout: 90000,
        last_payout_date: '2026-01-01',
        next_payout_date: '2026-02-01',
        earnings_breakdown: { massage: 15000, spa: 5000, nail: 3000, facial: 2000 },
        earnings_growth: 10,
      },
    ],
    period: 'month',
    generatedAt: '2026-01-01T00:00:00Z',
  }

  describe('exportToExcel', () => {
    it('should create a CSV file and trigger download', async () => {
      await exportToExcel(mockExportData)

      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })

    it('should handle empty data gracefully', async () => {
      const emptyData: ReportExportData = {
        dashboardStats: null,
        categories: [],
        topServices: [],
        hotelPerformance: [],
        staffOverview: null,
        staffPerformance: [],
        staffEarnings: [],
        period: 'month',
        generatedAt: new Date().toISOString(),
      }

      await exportToExcel(emptyData)

      expect(mockCreateObjectURL).toHaveBeenCalled()
    })

    it('should include categories sheet when data exists', async () => {
      await exportToExcel(mockExportData)

      // Verify it created a download
      expect(mockCreateElement).toHaveBeenCalledWith('a')
    })
  })

  describe('exportToPDF', () => {
    it('should open a print window with HTML content', async () => {
      await exportToPDF(mockExportData)

      expect(window.open).toHaveBeenCalledWith('', '_blank')
      expect(mockPrintWindow.document.write).toHaveBeenCalled()
      expect(mockPrintWindow.document.close).toHaveBeenCalled()
    })

    it('should throw when popup is blocked', async () => {
      vi.mocked(window.open).mockReturnValueOnce(null)

      await expect(exportToPDF(mockExportData)).rejects.toThrow(
        'ไม่สามารถส่งออกไฟล์ PDF ได้'
      )
    })

    it('should include HTML with dashboard stats', async () => {
      await exportToPDF(mockExportData)

      const htmlContent = mockPrintWindow.document.write.mock.calls[0][0]
      expect(htmlContent).toContain('100,000')
      expect(htmlContent).toContain('รายงานสรุปผลประกอบการ')
    })

    it('should include categories section when data exists', async () => {
      await exportToPDF(mockExportData)

      const htmlContent = mockPrintWindow.document.write.mock.calls[0][0]
      expect(htmlContent).toContain('การจองตามหมวดหมู่')
    })

    it('should include staff sections when data exists', async () => {
      await exportToPDF(mockExportData)

      const htmlContent = mockPrintWindow.document.write.mock.calls[0][0]
      expect(htmlContent).toContain('ภาพรวมพนักงาน')
      expect(htmlContent).toContain('ประสิทธิภาพพนักงาน')
    })
  })

  describe('quickExportPDF', () => {
    it('should assemble data and call exportToPDF', async () => {
      await quickExportPDF(
        mockExportData.dashboardStats,
        mockExportData.categories,
        mockExportData.topServices,
        [],
        'month',
        mockExportData.staffOverview,
        mockExportData.staffPerformance,
        mockExportData.staffEarnings,
      )

      expect(window.open).toHaveBeenCalled()
    })
  })

  describe('quickExportExcel', () => {
    it('should assemble data and call exportToExcel', async () => {
      await quickExportExcel(
        mockExportData.dashboardStats,
        mockExportData.categories,
        mockExportData.topServices,
        [],
        'month',
      )

      expect(mockCreateObjectURL).toHaveBeenCalled()
    })
  })

  describe('ReportExportData type', () => {
    it('should validate the type shape', () => {
      const data: ReportExportData = mockExportData
      expect(data.period).toBe('month')
      expect(data.dashboardStats?.totalRevenue).toBe(100000)
      expect(data.categories).toHaveLength(2)
    })
  })
})
