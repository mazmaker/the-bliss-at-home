import { describe, it, expect } from 'vitest'
import { getPdfLabels, type PdfLanguage } from '../pdfLabels'

describe('pdfLabels', () => {
  describe('getPdfLabels', () => {
    it('should return Thai labels for "th" language', () => {
      const labels = getPdfLabels('th')
      expect(labels.receipt).toBe('ใบเสร็จรับเงิน')
      expect(labels.creditNote).toBe('ใบลดหนี้')
      expect(labels.promptPay).toBe('พร้อมเพย์')
      expect(labels.taxId).toBe('เลขประจำตัวผู้เสียภาษี')
    })

    it('should return English labels for "en" language', () => {
      const labels = getPdfLabels('en')
      expect(labels.receipt).toBe('RECEIPT')
      expect(labels.creditNote).toBe('CREDIT NOTE')
      expect(labels.promptPay).toBe('PromptPay')
      expect(labels.taxId).toBe('Tax ID')
      expect(labels.refundTimeline).toBe('Refund will be processed within 5-10 business days')
    })

    it('should return Chinese labels for "cn" language', () => {
      const labels = getPdfLabels('cn')
      expect(labels.receipt).toBe('RECEIPT')
      expect(labels.creditCard).toBe('Credit Card')
      expect(labels.bankTransfer).toBe('Bank Transfer')
    })

    it('should fallback to English labels for unknown language', () => {
      const labels = getPdfLabels('xx' as PdfLanguage)
      expect(labels.receipt).toBe('RECEIPT')
      expect(labels.date).toBe('Date')
    })

    it('should have all required keys for each language', () => {
      const requiredKeys = [
        'receipt', 'paymentReceipt', 'receiptInformation', 'receiptNo',
        'date', 'bookingNo', 'customer', 'serviceDetails', 'service',
        'appointmentDate', 'time', 'payment', 'method', 'totalAmount',
        'creditNote', 'refundDocument', 'creditNoteInformation', 'creditNoteNo',
        'originalReceipt', 'originalBooking', 'originalAmount', 'refundDetails',
        'refundPercentage', 'reason', 'refundMethod', 'refundAmount',
        'refundTimeline', 'thankYou', 'creditCard', 'promptPay', 'bankTransfer',
        'taxId', 'tel', 'email',
      ]

      for (const lang of ['th', 'en', 'cn'] as PdfLanguage[]) {
        const labels = getPdfLabels(lang)
        for (const key of requiredKeys) {
          expect(labels).toHaveProperty(key)
          expect((labels as any)[key]).toBeTruthy()
        }
      }
    })
  })
})
