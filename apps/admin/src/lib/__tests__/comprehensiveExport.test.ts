import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before import
vi.mock('@/lib/supabase', () => {
  const mockFrom = vi.fn()
  return { default: { from: mockFrom } }
})

// Mock DOM APIs
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:test'),
  revokeObjectURL: vi.fn(),
})
vi.stubGlobal('Blob', vi.fn((content, options) => ({ content, options })))

// Since processReportData and translateStatus are private, we test them
// indirectly through fetchComprehensiveReportData
import supabase from '@/lib/supabase'
import { fetchComprehensiveReportData } from '../comprehensiveExport'

function mockSupabaseQuery(tableName: string, data: any[], error: any = null) {
  const builder: any = {}
  const methods = ['select', 'eq', 'gte', 'order', 'single', 'in', 'neq', 'limit']
  methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
  builder.then = (resolve: any) => Promise.resolve({ data, error }).then(resolve)

  ;(supabase.from as any).mockImplementation((table: string) => {
    if (table === tableName) return builder
    // Return empty for other tables
    const emptyBuilder: any = {}
    methods.forEach(m => { emptyBuilder[m] = vi.fn().mockReturnValue(emptyBuilder) })
    emptyBuilder.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve)
    return emptyBuilder
  })

  return builder
}

describe('comprehensiveExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-19T10:00:00Z'))
  })

  describe('fetchComprehensiveReportData', () => {
    it('should process empty bookings data', async () => {
      // Mock all three queries to return empty
      const builder: any = {}
      const methods = ['select', 'eq', 'gte', 'order', 'single', 'in', 'neq', 'limit']
      methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
      builder.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve)

      ;(supabase.from as any).mockReturnValue(builder)

      const result = await fetchComprehensiveReportData(30)

      expect(result.summary.totalBookings).toBe(0)
      expect(result.summary.totalRevenue).toBe(0)
      expect(result.summary.completionRate).toBe(0)
      expect(result.summary.avgBookingValue).toBe(0)
      expect(result.bookings).toEqual([])
      expect(result.services).toEqual([])
      expect(result.staff).toEqual([])
    })

    it('should calculate summary statistics correctly', async () => {
      const mockBookings = [
        {
          booking_number: 'BK-001',
          booking_date: '2026-02-15',
          booking_time: '14:00',
          status: 'completed',
          final_price: 1500,
          duration: 60,
          created_at: '2026-02-15T10:00:00Z',
          services: { name_th: 'นวดไทย', name_en: 'Thai Massage' },
          customers: { full_name: 'สมชาย', phone: '0891234567' },
          staff: { name_th: 'พนักงาน A', name_en: 'Staff A' },
          hotels: null,
        },
        {
          booking_number: 'BK-002',
          booking_date: '2026-02-16',
          booking_time: '16:00',
          status: 'completed',
          final_price: 2000,
          duration: 90,
          created_at: '2026-02-16T10:00:00Z',
          services: { name_th: 'นวดน้ำมัน', name_en: 'Oil Massage' },
          customers: { full_name: 'สมหญิง', phone: '0899876543' },
          staff: { name_th: 'พนักงาน B', name_en: 'Staff B' },
          hotels: null,
        },
        {
          booking_number: 'BK-003',
          booking_date: '2026-02-17',
          booking_time: '10:00',
          status: 'cancelled',
          final_price: 1200,
          duration: 60,
          created_at: '2026-02-17T10:00:00Z',
          services: { name_th: 'นวดไทย', name_en: 'Thai Massage' },
          customers: { full_name: 'สมชาย', phone: '0891234567' },
          staff: null,
          hotels: null,
        },
      ]

      const callCount = { count: 0 }
      const builder: any = {}
      const methods = ['select', 'eq', 'gte', 'order', 'single', 'in', 'neq', 'limit']
      methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })

      ;(supabase.from as any).mockImplementation((table: string) => {
        const b: any = {}
        methods.forEach(m => { b[m] = vi.fn().mockReturnValue(b) })
        if (table === 'bookings') {
          b.then = (resolve: any) => Promise.resolve({ data: mockBookings, error: null }).then(resolve)
        } else {
          b.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve)
        }
        return b
      })

      const result = await fetchComprehensiveReportData(30)

      // 2 completed, 1 cancelled
      expect(result.summary.totalBookings).toBe(3)
      expect(result.summary.completedBookings).toBe(2)
      expect(result.summary.cancelledBookings).toBe(1)
      expect(result.summary.totalRevenue).toBe(3500) // 1500 + 2000
      expect(result.summary.avgBookingValue).toBe(1750) // 3500 / 2
      expect(result.summary.completionRate).toBeCloseTo(66.67, 0) // 2/3
    })

    it('should translate status to Thai', async () => {
      const mockBookings = [
        {
          booking_number: 'BK-001', booking_date: '2026-02-15', booking_time: '14:00',
          status: 'pending', final_price: 1000, duration: 60,
          created_at: '2026-02-15T10:00:00Z',
          services: { name_th: 'Test' }, customers: null, staff: null, hotels: null,
        },
        {
          booking_number: 'BK-002', booking_date: '2026-02-15', booking_time: '14:00',
          status: 'confirmed', final_price: 1000, duration: 60,
          created_at: '2026-02-15T10:00:00Z',
          services: { name_th: 'Test' }, customers: null, staff: null, hotels: null,
        },
        {
          booking_number: 'BK-003', booking_date: '2026-02-15', booking_time: '14:00',
          status: 'completed', final_price: 1000, duration: 60,
          created_at: '2026-02-15T10:00:00Z',
          services: { name_th: 'Test' }, customers: null, staff: null, hotels: null,
        },
        {
          booking_number: 'BK-004', booking_date: '2026-02-15', booking_time: '14:00',
          status: 'cancelled', final_price: 1000, duration: 60,
          created_at: '2026-02-15T10:00:00Z',
          services: { name_th: 'Test' }, customers: null, staff: null, hotels: null,
        },
      ]

      const builder: any = {}
      const methods = ['select', 'eq', 'gte', 'order', 'single', 'in', 'neq', 'limit']
      methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
      ;(supabase.from as any).mockImplementation((table: string) => {
        const b: any = {}
        methods.forEach(m => { b[m] = vi.fn().mockReturnValue(b) })
        if (table === 'bookings') {
          b.then = (resolve: any) => Promise.resolve({ data: mockBookings, error: null }).then(resolve)
        } else {
          b.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve)
        }
        return b
      })

      const result = await fetchComprehensiveReportData(30)
      const statuses = result.bookings.map(b => b.status)
      expect(statuses).toContain('รอดำเนินการ')
      expect(statuses).toContain('ยืนยันแล้ว')
      expect(statuses).toContain('เสร็จสิ้น')
      expect(statuses).toContain('ยกเลิก')
    })

    it('should classify customers as new or returning', async () => {
      const mockBookings = [
        {
          booking_number: 'BK-001', booking_date: '2026-02-15', booking_time: '14:00',
          status: 'completed', final_price: 1000, duration: 60,
          created_at: '2026-02-10T10:00:00Z',
          services: { name_th: 'Test' }, customers: { full_name: 'สมชาย', phone: '089' },
          staff: null, hotels: null,
        },
        {
          booking_number: 'BK-002', booking_date: '2026-02-16', booking_time: '14:00',
          status: 'completed', final_price: 1500, duration: 60,
          created_at: '2026-02-15T10:00:00Z',
          services: { name_th: 'Test' }, customers: { full_name: 'สมชาย', phone: '089' },
          staff: null, hotels: null,
        },
        {
          booking_number: 'BK-003', booking_date: '2026-02-17', booking_time: '14:00',
          status: 'completed', final_price: 2000, duration: 60,
          created_at: '2026-02-17T10:00:00Z',
          services: { name_th: 'Test' }, customers: { full_name: 'สมหญิง', phone: '090' },
          staff: null, hotels: null,
        },
      ]

      const builder: any = {}
      const methods = ['select', 'eq', 'gte', 'order', 'single', 'in', 'neq', 'limit']
      methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
      ;(supabase.from as any).mockImplementation((table: string) => {
        const b: any = {}
        methods.forEach(m => { b[m] = vi.fn().mockReturnValue(b) })
        if (table === 'bookings') {
          b.then = (resolve: any) => Promise.resolve({ data: mockBookings, error: null }).then(resolve)
        } else {
          b.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve)
        }
        return b
      })

      const result = await fetchComprehensiveReportData(30)

      const returning = result.customers.find(c => c.name === 'สมชาย')
      const newCustomer = result.customers.find(c => c.name === 'สมหญิง')
      expect(returning?.customer_type).toBe('returning')
      expect(returning?.total_bookings).toBe(2)
      expect(newCustomer?.customer_type).toBe('new')
    })

    it('should determine period label correctly', async () => {
      const builder: any = {}
      const methods = ['select', 'eq', 'gte', 'order', 'single', 'in', 'neq', 'limit']
      methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
      builder.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve)
      ;(supabase.from as any).mockReturnValue(builder)

      const result7 = await fetchComprehensiveReportData(7)
      expect(result7.summary.period).toBe('รายสัปดาห์')

      const result30 = await fetchComprehensiveReportData(30)
      expect(result30.summary.period).toBe('รายเดือน')

      const result90 = await fetchComprehensiveReportData(90)
      expect(result90.summary.period).toBe('3 เดือน')

      const result180 = await fetchComprehensiveReportData(180)
      expect(result180.summary.period).toBe('6 เดือน')
    })

    it('should handle supabase error', async () => {
      const builder: any = {}
      const methods = ['select', 'eq', 'gte', 'order', 'single', 'in', 'neq', 'limit']
      methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
      builder.then = (resolve: any) =>
        Promise.resolve({ data: null, error: { message: 'DB error', code: '500' } }).then(resolve)
      ;(supabase.from as any).mockReturnValue(builder)

      await expect(fetchComprehensiveReportData(30)).rejects.toBeDefined()
    })

    it('should calculate staff earnings with 80% commission', async () => {
      const mockBookings = [
        {
          booking_number: 'BK-001', booking_date: '2026-02-15', booking_time: '14:00',
          status: 'completed', final_price: 1000, duration: 60,
          created_at: '2026-02-15T10:00:00Z',
          services: { name_th: 'Test' }, customers: null,
          staff: { name_th: 'พนักงาน A' }, hotels: null,
        },
      ]

      const builder: any = {}
      const methods = ['select', 'eq', 'gte', 'order', 'single', 'in', 'neq', 'limit']
      methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
      ;(supabase.from as any).mockImplementation((table: string) => {
        const b: any = {}
        methods.forEach(m => { b[m] = vi.fn().mockReturnValue(b) })
        if (table === 'bookings') {
          b.then = (resolve: any) => Promise.resolve({ data: mockBookings, error: null }).then(resolve)
        } else {
          b.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve)
        }
        return b
      })

      const result = await fetchComprehensiveReportData(30)
      const staffA = result.staff.find(s => s.name === 'พนักงาน A')
      expect(staffA?.total_earnings).toBe(800) // 1000 * 0.8
    })
  })
})
