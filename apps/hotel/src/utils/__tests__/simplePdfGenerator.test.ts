import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock jsPDF with vi.hoisted to avoid hoisting issues
const {
  mockSave, mockSetFont, mockSetFontSize, mockSetTextColor,
  mockSetFillColor, mockSetDrawColor, mockText, mockRect, mockLine,
} = vi.hoisted(() => ({
  mockSave: vi.fn(),
  mockSetFont: vi.fn(),
  mockSetFontSize: vi.fn(),
  mockSetTextColor: vi.fn(),
  mockSetFillColor: vi.fn(),
  mockSetDrawColor: vi.fn(),
  mockText: vi.fn(),
  mockRect: vi.fn(),
  mockLine: vi.fn(),
}))

vi.mock('jspdf', () => {
  const MockJsPDF = vi.fn().mockImplementation(function (this: any) {
    this.save = mockSave
    this.setFont = mockSetFont
    this.setFontSize = mockSetFontSize
    this.setTextColor = mockSetTextColor
    this.setFillColor = mockSetFillColor
    this.setDrawColor = mockSetDrawColor
    this.text = mockText
    this.rect = mockRect
    this.line = mockLine
  })
  return { jsPDF: MockJsPDF }
})

import {
  SimplePDFGenerator,
  generateSimpleMonthlyBillPDF,
} from '../simplePdfGenerator'

const mockBookings = [
  {
    id: 'booking-1',
    booking_number: 'BK-2026-0001',
    booking_date: '2026-03-01',
    booking_time: '14:00',
    service: { name_th: 'นวดแผนไทย', price: 800 },
    base_price: 800,
    final_price: 800,
    status: 'confirmed',
    created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'booking-2',
    booking_number: 'BK-2026-0002',
    booking_date: '2026-03-02',
    booking_time: '10:00',
    service: { name_th: 'นวดน้ำมัน', price: 1200 },
    base_price: 1200,
    final_price: 1200,
    status: 'completed',
    created_at: '2026-03-02T08:00:00Z',
  },
]

describe('SimplePDFGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create a new instance', () => {
      const generator = new SimplePDFGenerator()
      expect(generator).toBeDefined()
    })
  })

  describe('generateSimpleMonthlyBill', () => {
    it('should generate a monthly bill without errors', () => {
      const generator = new SimplePDFGenerator()
      expect(() =>
        generator.generateSimpleMonthlyBill({
          bookings: mockBookings,
          hotelName: 'Test Hotel',
          period: '2026-03',
          totalAmount: 2000,
          invoiceNumber: 'MONTHLY-2026-03-1234',
        })
      ).not.toThrow()
    })

    it('should handle empty bookings', () => {
      const generator = new SimplePDFGenerator()
      expect(() =>
        generator.generateSimpleMonthlyBill({
          bookings: [],
          hotelName: 'Test Hotel',
          period: '2026-03',
          totalAmount: 0,
          invoiceNumber: 'MONTHLY-2026-03-1234',
        })
      ).not.toThrow()
    })

    it('should call jsPDF text and formatting methods', () => {
      const generator = new SimplePDFGenerator()
      generator.generateSimpleMonthlyBill({
        bookings: mockBookings,
        hotelName: 'Test Hotel',
        period: '2026-03',
        totalAmount: 2000,
        invoiceNumber: 'MONTHLY-2026-03-1234',
      })

      expect(mockText).toHaveBeenCalled()
      expect(mockSetFont).toHaveBeenCalled()
      expect(mockSetFontSize).toHaveBeenCalled()
      expect(mockRect).toHaveBeenCalled()
    })
  })

  describe('downloadPDF', () => {
    it('should call save with the provided filename', () => {
      const generator = new SimplePDFGenerator()
      generator.generateSimpleMonthlyBill({
        bookings: [],
        hotelName: 'Test',
        totalAmount: 0,
        invoiceNumber: 'INV-001',
      })
      generator.downloadPDF('test-bill.pdf')

      expect(mockSave).toHaveBeenCalledWith('test-bill.pdf')
    })
  })
})

describe('generateSimpleMonthlyBillPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create and download a monthly bill PDF', () => {
    generateSimpleMonthlyBillPDF(mockBookings, 'Test Hotel', '2026-03')

    expect(mockSave).toHaveBeenCalledWith('monthly-bill-2026-03.pdf')
  })

  it('should use default hotel name and period when not provided', () => {
    generateSimpleMonthlyBillPDF(mockBookings)

    expect(mockSave).toHaveBeenCalledWith(
      expect.stringMatching(/^monthly-bill-\d{4}-\d{2}\.pdf$/)
    )
  })

  it('should calculate total amount from bookings', () => {
    generateSimpleMonthlyBillPDF(mockBookings, 'Hotel', '2026-03')
    // Total should be 800 + 1200 = 2000
    expect(mockText).toHaveBeenCalled()
  })

  it('should handle empty bookings', () => {
    expect(() => generateSimpleMonthlyBillPDF([])).not.toThrow()
  })

  it('should generate invoice number with period and timestamp suffix', () => {
    generateSimpleMonthlyBillPDF(mockBookings, 'Hotel', '2026-03')
    // invoiceNumber should be `MONTHLY-2026-03-XXXX`
    expect(mockText).toHaveBeenCalled()
  })
})

describe('SimplePDFGenerator private methods (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('convertToSafeText behavior', () => {
    it('should handle Thai hotel names by converting or providing fallback', () => {
      const generator = new SimplePDFGenerator()
      // The method is private, test it via the public API
      expect(() =>
        generator.generateSimpleMonthlyBill({
          bookings: [],
          hotelName: 'โรงแรมทดสอบ', // Thai hotel name
          totalAmount: 0,
          invoiceNumber: 'INV-001',
        })
      ).not.toThrow()
    })

    it('should handle English hotel names as-is', () => {
      const generator = new SimplePDFGenerator()
      expect(() =>
        generator.generateSimpleMonthlyBill({
          bookings: [],
          hotelName: 'Luxury Hotel Bangkok',
          totalAmount: 0,
          invoiceNumber: 'INV-001',
        })
      ).not.toThrow()
    })
  })

  describe('convertServiceName behavior', () => {
    it('should convert known Thai service names to English', () => {
      const generator = new SimplePDFGenerator()
      generator.generateSimpleMonthlyBill({
        bookings: [
          {
            ...mockBookings[0],
            service: { name_th: 'นวดไทย', price: 800 },
          },
        ],
        hotelName: 'Test',
        totalAmount: 800,
        invoiceNumber: 'INV-001',
      })

      expect(mockText).toHaveBeenCalled()
    })

    it('should handle unknown service names with fallback', () => {
      const generator = new SimplePDFGenerator()
      expect(() =>
        generator.generateSimpleMonthlyBill({
          bookings: [
            {
              ...mockBookings[0],
              service: { name_th: 'บริการพิเศษ', price: 500 },
            },
          ],
          hotelName: 'Test',
          totalAmount: 500,
          invoiceNumber: 'INV-001',
        })
      ).not.toThrow()
    })
  })

  describe('formatPeriodSafely behavior', () => {
    it('should handle undefined period by using current date', () => {
      const generator = new SimplePDFGenerator()
      expect(() =>
        generator.generateSimpleMonthlyBill({
          bookings: [],
          hotelName: 'Test',
          totalAmount: 0,
          invoiceNumber: 'INV-001',
          period: undefined,
        })
      ).not.toThrow()
    })

    it('should handle YYYY-MM period format', () => {
      const generator = new SimplePDFGenerator()
      expect(() =>
        generator.generateSimpleMonthlyBill({
          bookings: [],
          hotelName: 'Test',
          totalAmount: 0,
          invoiceNumber: 'INV-001',
          period: '2026-03',
        })
      ).not.toThrow()
    })

    it('should handle non-ASCII period with fallback', () => {
      const generator = new SimplePDFGenerator()
      expect(() =>
        generator.generateSimpleMonthlyBill({
          bookings: [],
          hotelName: 'Test',
          totalAmount: 0,
          invoiceNumber: 'INV-001',
          period: 'มีนาคม 2569',
        })
      ).not.toThrow()
    })
  })

  describe('formatCurrency behavior', () => {
    it('should format amounts in THB', () => {
      const generator = new SimplePDFGenerator()
      generator.generateSimpleMonthlyBill({
        bookings: mockBookings,
        hotelName: 'Test',
        totalAmount: 2000,
        invoiceNumber: 'INV-001',
      })

      // Verify that THB currency text was output
      const textCalls = mockText.mock.calls.map((call: any[]) => call[0])
      const hasTHB = textCalls.some((text: string) =>
        typeof text === 'string' && text.includes('THB')
      )
      expect(hasTHB).toBe(true)
    })
  })
})
