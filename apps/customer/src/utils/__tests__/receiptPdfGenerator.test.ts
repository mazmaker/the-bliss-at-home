import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock jsPDF - use vi.hoisted to avoid hoisting issues
const {
  mockSave, mockText, mockSetFont, mockSetFontSize, mockSetTextColor,
  mockSetFillColor, mockSetDrawColor, mockRect, mockRoundedRect, mockLine,
  mockAddFileToVFS, mockAddFont, mockSplitTextToSize,
} = vi.hoisted(() => ({
  mockSave: vi.fn(),
  mockText: vi.fn(),
  mockSetFont: vi.fn(),
  mockSetFontSize: vi.fn(),
  mockSetTextColor: vi.fn(),
  mockSetFillColor: vi.fn(),
  mockSetDrawColor: vi.fn(),
  mockRect: vi.fn(),
  mockRoundedRect: vi.fn(),
  mockLine: vi.fn(),
  mockAddFileToVFS: vi.fn(),
  mockAddFont: vi.fn(),
  mockSplitTextToSize: vi.fn().mockReturnValue(['line1']),
}))

vi.mock('jspdf', () => {
  const MockJsPDF = vi.fn().mockImplementation(function (this: any) {
    this.text = mockText
    this.save = mockSave
    this.setFont = mockSetFont
    this.setFontSize = mockSetFontSize
    this.setTextColor = mockSetTextColor
    this.setFillColor = mockSetFillColor
    this.setDrawColor = mockSetDrawColor
    this.rect = mockRect
    this.roundedRect = mockRoundedRect
    this.line = mockLine
    this.addFileToVFS = mockAddFileToVFS
    this.addFont = mockAddFont
    this.splitTextToSize = mockSplitTextToSize
  })
  return { jsPDF: MockJsPDF }
})

vi.mock('../fonts/sarabun', () => ({
  SarabunRegular: 'mock-regular-font-data',
  SarabunBold: 'mock-bold-font-data',
}))

vi.mock('../pdfLabels', () => ({
  getPdfLabels: vi.fn((lang: string) => ({
    receipt: lang === 'th' ? 'ใบเสร็จรับเงิน' : 'RECEIPT',
    paymentReceipt: lang === 'th' ? 'ใบเสร็จรับเงิน' : 'Payment Receipt',
    receiptInformation: 'Receipt Information',
    receiptNo: 'Receipt No.',
    date: 'Date',
    bookingNo: 'Booking No.',
    customer: 'Customer',
    serviceDetails: 'Service Details',
    service: 'Service',
    appointmentDate: 'Appointment Date',
    time: 'Time',
    payment: 'Payment',
    method: 'Method',
    totalAmount: 'Total Amount',
    creditNote: 'CREDIT NOTE',
    refundDocument: 'Refund Document',
    creditNoteInformation: 'Credit Note Information',
    creditNoteNo: 'Credit Note No.',
    originalReceipt: 'Original Receipt',
    originalBooking: 'Original Booking',
    originalAmount: 'Original Amount',
    refundDetails: 'Refund Details',
    refundPercentage: 'Refund Percentage',
    reason: 'Reason',
    refundMethod: 'Refund Method',
    refundAmount: 'Refund Amount',
    refundTimeline: 'Refund will be processed within 5-10 business days',
    thankYou: 'Thank you',
    creditCard: 'Credit Card',
    promptPay: 'PromptPay',
    bankTransfer: 'Bank Transfer',
    taxId: 'Tax ID',
    tel: 'Tel',
    email: 'Email',
  })),
}))

import { downloadReceipt, downloadCreditNote, type ReceiptPdfData, type CreditNotePdfData } from '../receiptPdfGenerator'

const baseCompany = {
  name: 'The Bliss Massage at Home',
  nameTh: 'เดอะบลิสนวดที่บ้าน',
  address: '123 Bangkok',
  phone: '0812345678',
  email: 'info@thebliss.com',
  taxId: '1234567890123',
}

describe('receiptPdfGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('downloadReceipt', () => {
    it('should generate and save a receipt PDF', () => {
      const data: ReceiptPdfData = {
        receiptNumber: 'RCP-001',
        transactionDate: '2026-03-01',
        bookingNumber: 'BK-001',
        serviceName: 'นวดไทย',
        bookingDate: '2026-03-05',
        bookingTime: '14:00',
        amount: 1500,
        paymentMethod: 'credit_card',
        customerName: 'John Doe',
        company: baseCompany,
      }

      downloadReceipt(data)

      expect(mockSave).toHaveBeenCalledWith('receipt-RCP-001.pdf')
      // Constructor calls registerFonts(), then reset() calls it again = 4 calls each
      expect(mockAddFileToVFS).toHaveBeenCalled()
      expect(mockAddFont).toHaveBeenCalled()
    })

    it('should handle addons in receipt', () => {
      const data: ReceiptPdfData = {
        receiptNumber: 'RCP-002',
        transactionDate: '2026-03-01',
        bookingNumber: 'BK-002',
        serviceName: 'นวดน้ำมัน',
        bookingDate: '2026-03-05',
        bookingTime: '15:00',
        amount: 2000,
        paymentMethod: 'promptpay',
        customerName: 'Jane',
        addons: [
          { name: 'อโรมา', nameEn: 'Aroma', price: 300 },
          { name: 'ร้อน', price: 200 },
        ],
        company: baseCompany,
      }

      downloadReceipt(data)

      expect(mockSave).toHaveBeenCalledWith('receipt-RCP-002.pdf')
    })

    it('should use English language when specified', () => {
      const data: ReceiptPdfData = {
        receiptNumber: 'RCP-003',
        transactionDate: '2026-03-01',
        bookingNumber: 'BK-003',
        serviceName: 'นวดไทย',
        serviceNameEn: 'Thai Massage',
        bookingDate: '2026-03-05',
        bookingTime: '10:00',
        amount: 1200,
        paymentMethod: 'internet_banking',
        customerName: 'Test',
        company: baseCompany,
        language: 'en',
      }

      downloadReceipt(data)

      expect(mockSave).toHaveBeenCalledWith('receipt-RCP-003.pdf')
    })
  })

  describe('downloadCreditNote', () => {
    it('should generate and save a credit note PDF', () => {
      const data: CreditNotePdfData = {
        creditNoteNumber: 'CN-001',
        originalReceiptNumber: 'RCP-001',
        refundDate: '2026-03-02',
        bookingNumber: 'BK-001',
        serviceName: 'นวดไทย',
        originalAmount: 1500,
        refundAmount: 1500,
        refundPercentage: 100,
        refundReason: 'Customer requested',
        customerName: 'John Doe',
        paymentMethod: 'credit_card',
        company: baseCompany,
      }

      downloadCreditNote(data)

      expect(mockSave).toHaveBeenCalledWith('credit-note-CN-001.pdf')
    })

    it('should handle partial refund credit note', () => {
      const data: CreditNotePdfData = {
        creditNoteNumber: 'CN-002',
        originalReceiptNumber: 'RCP-002',
        refundDate: '2026-03-02',
        bookingNumber: 'BK-002',
        serviceName: 'นวดน้ำมัน',
        originalAmount: 2000,
        refundAmount: 1000,
        refundPercentage: 50,
        refundReason: 'Late cancellation',
        customerName: 'Jane',
        paymentMethod: 'promptpay',
        cardLastDigits: '4242',
        company: baseCompany,
        language: 'en',
      }

      downloadCreditNote(data)

      expect(mockSave).toHaveBeenCalledWith('credit-note-CN-002.pdf')
    })
  })

  describe('exports', () => {
    it('should export downloadReceipt function', () => {
      expect(typeof downloadReceipt).toBe('function')
    })

    it('should export downloadCreditNote function', () => {
      expect(typeof downloadCreditNote).toBe('function')
    })
  })
})
