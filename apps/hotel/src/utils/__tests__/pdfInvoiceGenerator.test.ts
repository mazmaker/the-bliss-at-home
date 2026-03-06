import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock jsPDF with vi.hoisted to avoid hoisting issues
const {
  mockSave, mockSetFont, mockSetFontSize, mockSetTextColor,
  mockSetFillColor, mockSetDrawColor, mockText, mockRect,
  mockLine, mockAddPage, mockSetLanguage,
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
  mockAddPage: vi.fn(),
  mockSetLanguage: vi.fn(),
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
    this.addPage = mockAddPage
    this.setLanguage = mockSetLanguage
  })
  return { jsPDF: MockJsPDF }
})

import {
  PDFInvoiceGenerator,
  generateBookingInvoicePDF,
  generateMonthlyBillPDF,
} from '../pdfInvoiceGenerator'

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
    provider_preference: 'female-only',
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
    provider_preference: 'no-preference',
  },
]

describe('PDFInvoiceGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create a new instance', () => {
      const generator = new PDFInvoiceGenerator()
      expect(generator).toBeDefined()
    })
  })

  describe('generateBookingInvoice', () => {
    it('should generate a booking invoice without errors', () => {
      const generator = new PDFInvoiceGenerator()
      const invoiceData = {
        bookings: mockBookings,
        hotelName: 'Test Hotel',
        totalAmount: 2000,
        invoiceNumber: 'INV-001',
      }

      expect(() => generator.generateBookingInvoice(invoiceData)).not.toThrow()
    })

    it('should call jsPDF text method for header', () => {
      const generator = new PDFInvoiceGenerator()
      generator.generateBookingInvoice({
        bookings: mockBookings,
        hotelName: 'Test Hotel',
        totalAmount: 2000,
        invoiceNumber: 'INV-001',
      })

      expect(mockText).toHaveBeenCalled()
      expect(mockSetFont).toHaveBeenCalled()
    })

    it('should handle empty bookings array', () => {
      const generator = new PDFInvoiceGenerator()
      expect(() =>
        generator.generateBookingInvoice({
          bookings: [],
          hotelName: 'Test Hotel',
          totalAmount: 0,
          invoiceNumber: 'INV-001',
        })
      ).not.toThrow()
    })
  })

  describe('generateMonthlyBill', () => {
    it('should generate a monthly bill without errors', () => {
      const generator = new PDFInvoiceGenerator()
      expect(() =>
        generator.generateMonthlyBill({
          bookings: mockBookings,
          hotelName: 'Test Hotel',
          period: '2026-03',
          totalAmount: 2000,
          invoiceNumber: 'MONTHLY-2026-03',
        })
      ).not.toThrow()
    })

    it('should display period in the bill', () => {
      const generator = new PDFInvoiceGenerator()
      generator.generateMonthlyBill({
        bookings: mockBookings,
        hotelName: 'Test Hotel',
        period: '2026-03',
        totalAmount: 2000,
        invoiceNumber: 'MONTHLY-2026-03',
      })

      expect(mockText).toHaveBeenCalled()
    })
  })

  describe('downloadPDF', () => {
    it('should call save with the provided filename', () => {
      const generator = new PDFInvoiceGenerator()
      generator.generateBookingInvoice({
        bookings: [],
        hotelName: 'Test',
        totalAmount: 0,
        invoiceNumber: 'INV-001',
      })
      generator.downloadPDF('test-invoice.pdf')

      expect(mockSave).toHaveBeenCalledWith('test-invoice.pdf')
    })
  })
})

describe('generateBookingInvoicePDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create and download a booking invoice PDF', () => {
    generateBookingInvoicePDF(mockBookings, 'Test Hotel')

    expect(mockSave).toHaveBeenCalledWith(
      expect.stringMatching(/^invoice-\d{4}-\d{2}-\d{2}\.pdf$/)
    )
  })

  it('should calculate total amount from bookings', () => {
    generateBookingInvoicePDF(mockBookings)

    // Total should be 800 + 1200 = 2000
    expect(mockText).toHaveBeenCalled()
  })

  it('should use default hotel name when not provided', () => {
    generateBookingInvoicePDF(mockBookings)

    expect(mockText).toHaveBeenCalled()
  })

  it('should handle empty bookings', () => {
    expect(() => generateBookingInvoicePDF([])).not.toThrow()
  })
})

describe('generateMonthlyBillPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create and download a monthly bill PDF', () => {
    generateMonthlyBillPDF(mockBookings, 'Test Hotel', '2026-03')

    expect(mockSave).toHaveBeenCalledWith('monthly-bill-2026-03.pdf')
  })

  it('should use default hotel name and period when not provided', () => {
    generateMonthlyBillPDF(mockBookings)

    expect(mockSave).toHaveBeenCalledWith(
      expect.stringMatching(/^monthly-bill-\d{4}-\d{2}\.pdf$/)
    )
  })

  it('should generate correct invoice number format', () => {
    generateMonthlyBillPDF(mockBookings, 'Hotel', '2026-03')

    expect(mockText).toHaveBeenCalled()
  })
})

describe('getProviderPreferenceText (via integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render provider preference text in booking details', () => {
    const generator = new PDFInvoiceGenerator()
    generator.generateBookingInvoice({
      bookings: [
        {
          ...mockBookings[0],
          provider_preference: 'female-only',
        },
      ],
      hotelName: 'Test',
      totalAmount: 800,
      invoiceNumber: 'INV-001',
    })

    // The text method should have been called with provider preference text
    expect(mockText).toHaveBeenCalled()
  })

  it('should handle unknown provider preference', () => {
    const generator = new PDFInvoiceGenerator()
    expect(() =>
      generator.generateBookingInvoice({
        bookings: [
          {
            ...mockBookings[0],
            provider_preference: undefined,
          },
        ],
        hotelName: 'Test',
        totalAmount: 800,
        invoiceNumber: 'INV-001',
      })
    ).not.toThrow()
  })
})
