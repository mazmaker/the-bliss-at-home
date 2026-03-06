// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DOM download APIs
const mockClick = vi.fn()
const mockLink = { click: mockClick, href: '', download: '' }

vi.stubGlobal('URL', {
  createObjectURL: vi.fn().mockReturnValue('blob:http://test/abc'),
  revokeObjectURL: vi.fn(),
})

vi.stubGlobal('alert', vi.fn())

import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  formatInvoicesForExport,
  formatPaymentsForExport,
  formatBookingsForExport,
} from '../exportUtils'

describe('exportUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock document.createElement to return a link element
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
    vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn() as any)
    vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn() as any)
  })

  describe('exportToCSV', () => {
    it('alerts when data is empty', () => {
      exportToCSV([], 'test')
      expect(alert).toHaveBeenCalledWith('ไม่มีข้อมูลสำหรับการ Export')
    })

    it('creates CSV and triggers download', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ]
      exportToCSV(data, 'users')
      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockLink.download).toBe('users.csv')
      expect(URL.revokeObjectURL).toHaveBeenCalled()
    })

    it('uses provided headers instead of auto-detected', () => {
      const data = [{ name: 'John', age: 30, extra: 'x' }]
      exportToCSV(data, 'test', ['name', 'age'])
      // Should only have name,age headers
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    it('escapes values with commas by wrapping in quotes', () => {
      const data = [{ desc: 'one, two' }]
      exportToCSV(data, 'test')
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    it('escapes double quotes', () => {
      const data = [{ desc: 'say "hello"' }]
      exportToCSV(data, 'test')
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    it('handles null/undefined values', () => {
      const data = [{ name: null, val: undefined }]
      exportToCSV(data, 'test')
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    it('appends and removes link from body', () => {
      const data = [{ a: 1 }]
      exportToCSV(data, 'test')
      expect(document.body.appendChild).toHaveBeenCalled()
      expect(document.body.removeChild).toHaveBeenCalled()
    })
  })

  describe('exportToExcel', () => {
    it('alerts when data is empty', () => {
      exportToExcel([], 'test')
      expect(alert).toHaveBeenCalledWith('ไม่มีข้อมูลสำหรับการ Export')
    })

    it('creates Excel HTML and triggers download', () => {
      const data = [{ name: 'John', age: 30 }]
      exportToExcel(data, 'report', 'MySheet')
      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(mockLink.download).toBe('report.xls')
    })

    it('uses Sheet1 as default sheet name', () => {
      const data = [{ a: 1 }]
      exportToExcel(data, 'test')
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    it('handles null values in data', () => {
      const data = [{ name: 'test', value: null }]
      exportToExcel(data, 'test')
      expect(URL.createObjectURL).toHaveBeenCalled()
    })
  })

  describe('exportToPDF', () => {
    it('alerts when data is empty', () => {
      exportToPDF([], 'test')
      expect(alert).toHaveBeenCalledWith('ไม่มีข้อมูลสำหรับการ Export')
    })

    it('opens print window and writes content', () => {
      const mockPrintWindow = {
        document: { write: vi.fn(), close: vi.fn() },
        focus: vi.fn(),
        print: vi.fn(),
      }
      vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as any)

      const data = [{ name: 'Test', value: 100 }]
      exportToPDF(data, 'report', 'รายงาน')

      expect(window.open).toHaveBeenCalledWith('', '_blank')
      expect(mockPrintWindow.document.write).toHaveBeenCalled()
      expect(mockPrintWindow.document.close).toHaveBeenCalled()
      expect(mockPrintWindow.focus).toHaveBeenCalled()
    })

    it('handles null printWindow gracefully', () => {
      vi.spyOn(window, 'open').mockReturnValue(null)
      const data = [{ name: 'Test' }]
      expect(() => exportToPDF(data, 'test')).not.toThrow()
    })

    it('uses default title when not provided', () => {
      const mockPrintWindow = {
        document: { write: vi.fn(), close: vi.fn() },
        focus: vi.fn(),
        print: vi.fn(),
      }
      vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as any)

      const data = [{ a: 1 }]
      exportToPDF(data, 'test')
      // Default title is 'รายงาน'
      const htmlContent = mockPrintWindow.document.write.mock.calls[0][0]
      expect(htmlContent).toContain('รายงาน')
    })
  })

  describe('formatInvoicesForExport', () => {
    it('formats invoice data with Thai column names', () => {
      const invoices = [{
        invoice_number: 'INV-001',
        period_start: '2026-01-01',
        period_end: '2026-01-07',
        period_type: 'weekly',
        total_bookings: 10,
        total_revenue: 50000,
        commission_amount: 5000,
        commission_rate: 10,
        status: 'paid',
        issued_date: '2026-01-08',
        due_date: '2026-01-15',
        paid_date: '2026-01-10',
      }]

      const result = formatInvoicesForExport(invoices)
      expect(result).toHaveLength(1)
      expect(result[0]['เลขที่บิล']).toBe('INV-001')
      expect(result[0]['ช่วงเวลา']).toBe('2026-01-01 - 2026-01-07')
      expect(result[0]['ประเภท']).toBe('รายสัปดาห์')
      expect(result[0]['สถานะ']).toBe('จ่ายแล้ว')
    })

    it('shows monthly period type and handles null paid_date', () => {
      const invoices = [{
        invoice_number: 'INV-002',
        period_start: '2026-01-01',
        period_end: '2026-01-31',
        period_type: 'monthly',
        total_bookings: 40,
        total_revenue: 200000,
        commission_amount: 20000,
        commission_rate: 10,
        status: 'pending',
        issued_date: '2026-02-01',
        due_date: '2026-02-15',
        paid_date: null,
      }]

      const result = formatInvoicesForExport(invoices)
      expect(result[0]['ประเภท']).toBe('รายเดือน')
      expect(result[0]['วันที่จ่าย']).toBe('-')
    })

    it('handles empty array', () => {
      expect(formatInvoicesForExport([])).toEqual([])
    })

    it('translates all status labels', () => {
      const statuses = [
        { input: 'draft', expected: 'ร่าง' },
        { input: 'pending', expected: 'รอชำระ' },
        { input: 'paid', expected: 'จ่ายแล้ว' },
        { input: 'overdue', expected: 'เกินกำหนด' },
        { input: 'cancelled', expected: 'ยกเลิก' },
        { input: 'unknown', expected: 'unknown' },
      ]

      for (const { input, expected } of statuses) {
        const inv = [{
          invoice_number: 'X', period_start: '', period_end: '', period_type: 'weekly',
          total_bookings: 0, total_revenue: 0, commission_amount: 0, commission_rate: 0,
          status: input, issued_date: '', due_date: '', paid_date: null,
        }]
        expect(formatInvoicesForExport(inv)[0]['สถานะ']).toBe(expected)
      }
    })
  })

  describe('formatPaymentsForExport', () => {
    it('formats payment data with Thai column names', () => {
      const payments = [{
        transaction_id: 'TXN-001',
        invoice_number: 'INV-001',
        amount: 5000,
        payment_method: 'bank_transfer',
        status: 'completed',
        payment_date: '2026-01-10',
        verified_by: 'Admin',
        verified_date: '2026-01-10',
        notes: 'OK',
      }]

      const result = formatPaymentsForExport(payments)
      expect(result[0]['วิธีการชำระ']).toBe('โอนเงิน')
      expect(result[0]['สถานะ']).toBe('สำเร็จ')
    })

    it('shows dash for missing optional fields', () => {
      const payments = [{
        transaction_id: 'TXN-002',
        invoice_number: 'INV-002',
        amount: 3000,
        payment_method: 'cash',
        status: 'pending',
        payment_date: '2026-01-11',
        verified_by: null,
        verified_date: null,
        notes: null,
      }]

      const result = formatPaymentsForExport(payments)
      expect(result[0]['ยืนยันโดย']).toBe('-')
      expect(result[0]['วันที่ยืนยัน']).toBe('-')
      expect(result[0]['หมายเหตุ']).toBe('-')
    })

    it('translates all payment methods', () => {
      const methods = [
        { input: 'bank_transfer', expected: 'โอนเงิน' },
        { input: 'cash', expected: 'เงินสด' },
        { input: 'cheque', expected: 'เช็ค' },
        { input: 'online', expected: 'ออนไลน์' },
        { input: 'crypto', expected: 'crypto' },
      ]

      for (const { input, expected } of methods) {
        const p = [{
          transaction_id: 'T', invoice_number: 'I', amount: 100,
          payment_method: input, status: 'completed', payment_date: '',
          verified_by: null, verified_date: null, notes: null,
        }]
        expect(formatPaymentsForExport(p)[0]['วิธีการชำระ']).toBe(expected)
      }
    })

    it('translates all payment statuses', () => {
      const statuses = [
        { input: 'completed', expected: 'สำเร็จ' },
        { input: 'pending', expected: 'รอดำเนินการ' },
        { input: 'failed', expected: 'ล้มเหลว' },
        { input: 'refunded', expected: 'คืนเงิน' },
        { input: 'other', expected: 'other' },
      ]

      for (const { input, expected } of statuses) {
        const p = [{
          transaction_id: 'T', invoice_number: 'I', amount: 100,
          payment_method: 'cash', status: input, payment_date: '',
          verified_by: null, verified_date: null, notes: null,
        }]
        expect(formatPaymentsForExport(p)[0]['สถานะ']).toBe(expected)
      }
    })
  })

  describe('formatBookingsForExport', () => {
    it('formats booking data correctly', () => {
      const bookings = [{
        booking_number: 'BK-001',
        customer_name: 'สมชาย',
        customer_phone: '0812345678',
        customer_email: 'somchai@email.com',
        room_number: '101',
        check_in_date: '2026-01-15',
        check_out_date: '2026-01-17',
        additional_services: 'นวดไทย',
        price: 2500,
        payment_status: 'paid',
        status: 'confirmed',
        created_by_hotel: true,
        notes: 'VIP',
      }]

      const result = formatBookingsForExport(bookings)
      expect(result[0]['สถานะการชำระ']).toBe('จ่ายแล้ว')
      expect(result[0]['สถานะ']).toBe('ยืนยันแล้ว')
      expect(result[0]['สร้างโดยโรงแรม']).toBe('ใช่')
    })

    it('shows dash for missing fields and unpaid status', () => {
      const bookings = [{
        booking_number: 'BK-002',
        customer_name: 'Test',
        customer_phone: '000',
        customer_email: null,
        room_number: null,
        check_in_date: '',
        check_out_date: '',
        additional_services: null,
        price: 1000,
        payment_status: 'unpaid',
        status: 'pending',
        created_by_hotel: false,
        notes: null,
      }]

      const result = formatBookingsForExport(bookings)
      expect(result[0]['อีเมล']).toBe('-')
      expect(result[0]['ห้องพัก']).toBe('-')
      expect(result[0]['บริการเพิ่มเติม']).toBe('-')
      expect(result[0]['หมายเหตุ']).toBe('-')
      expect(result[0]['สถานะการชำระ']).toBe('ยังไม่จ่าย')
      expect(result[0]['สร้างโดยโรงแรม']).toBe('ไม่')
    })

    it('translates all booking statuses', () => {
      const statuses = [
        { input: 'confirmed', expected: 'ยืนยันแล้ว' },
        { input: 'pending', expected: 'รอยืนยัน' },
        { input: 'completed', expected: 'เสร็จสิ้น' },
        { input: 'cancelled', expected: 'ยกเลิก' },
        { input: 'no_show', expected: 'ไม่มาใช้บริการ' },
        { input: 'unknown', expected: 'unknown' },
      ]

      for (const { input, expected } of statuses) {
        const b = [{
          booking_number: 'BK', customer_name: 'T', customer_phone: '0',
          customer_email: null, room_number: null, check_in_date: '', check_out_date: '',
          additional_services: null, price: 100, payment_status: 'paid',
          status: input, created_by_hotel: false, notes: null,
        }]
        expect(formatBookingsForExport(b)[0]['สถานะ']).toBe(expected)
      }
    })
  })
})
