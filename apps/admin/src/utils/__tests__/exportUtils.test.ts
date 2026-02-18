import { describe, it, expect } from 'vitest'
import {
  formatInvoicesForExport,
  formatPaymentsForExport,
  formatBookingsForExport,
} from '../exportUtils'

describe('exportUtils', () => {
  describe('formatInvoicesForExport', () => {
    it('formats invoice data with Thai column names', () => {
      const invoices = [
        {
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
        },
      ]

      const result = formatInvoicesForExport(invoices)
      expect(result).toHaveLength(1)
      expect(result[0]['เลขที่บิล']).toBe('INV-001')
      expect(result[0]['ช่วงเวลา']).toBe('2026-01-01 - 2026-01-07')
      expect(result[0]['ประเภท']).toBe('รายสัปดาห์')
      expect(result[0]['จำนวนการจอง']).toBe(10)
      expect(result[0]['รายได้']).toContain('50,000')
      expect(result[0]['คอมมิชชั่น']).toContain('5,000')
      expect(result[0]['คอมมิชชั่น']).toContain('10%')
      expect(result[0]['สถานะ']).toBe('จ่ายแล้ว')
    })

    it('shows period type monthly in Thai', () => {
      const invoices = [
        {
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
        },
      ]

      const result = formatInvoicesForExport(invoices)
      expect(result[0]['ประเภท']).toBe('รายเดือน')
      expect(result[0]['สถานะ']).toBe('รอชำระ')
      expect(result[0]['วันที่จ่าย']).toBe('-')
    })

    it('handles empty array', () => {
      expect(formatInvoicesForExport([])).toEqual([])
    })

    it('translates status labels correctly', () => {
      const statuses = ['draft', 'pending', 'paid', 'overdue', 'cancelled']
      const expected = ['ร่าง', 'รอชำระ', 'จ่ายแล้ว', 'เกินกำหนด', 'ยกเลิก']

      statuses.forEach((status, i) => {
        const invoices = [{
          invoice_number: 'INV',
          period_start: '',
          period_end: '',
          period_type: 'weekly',
          total_bookings: 0,
          total_revenue: 0,
          commission_amount: 0,
          commission_rate: 0,
          status,
          issued_date: '',
          due_date: '',
          paid_date: null,
        }]
        const result = formatInvoicesForExport(invoices)
        expect(result[0]['สถานะ']).toBe(expected[i])
      })
    })
  })

  describe('formatPaymentsForExport', () => {
    it('formats payment data with Thai column names', () => {
      const payments = [
        {
          transaction_id: 'TXN-001',
          invoice_number: 'INV-001',
          amount: 5000,
          payment_method: 'bank_transfer',
          status: 'completed',
          payment_date: '2026-01-10',
          verified_by: 'admin@bliss.com',
          verified_date: '2026-01-10',
          notes: 'โอนเรียบร้อย',
        },
      ]

      const result = formatPaymentsForExport(payments)
      expect(result).toHaveLength(1)
      expect(result[0]['รหัสธุรกรรม']).toBe('TXN-001')
      expect(result[0]['จำนวนเงิน']).toContain('5,000')
      expect(result[0]['วิธีการชำระ']).toBe('โอนเงิน')
      expect(result[0]['สถานะ']).toBe('สำเร็จ')
      expect(result[0]['หมายเหตุ']).toBe('โอนเรียบร้อย')
    })

    it('shows dash for missing optional fields', () => {
      const payments = [
        {
          transaction_id: 'TXN-002',
          invoice_number: 'INV-002',
          amount: 3000,
          payment_method: 'cash',
          status: 'pending',
          payment_date: '2026-01-11',
          verified_by: null,
          verified_date: null,
          notes: null,
        },
      ]

      const result = formatPaymentsForExport(payments)
      expect(result[0]['ยืนยันโดย']).toBe('-')
      expect(result[0]['วันที่ยืนยัน']).toBe('-')
      expect(result[0]['หมายเหตุ']).toBe('-')
    })

    it('translates payment methods correctly', () => {
      const methods = ['bank_transfer', 'cash', 'cheque', 'online']
      const expected = ['โอนเงิน', 'เงินสด', 'เช็ค', 'ออนไลน์']

      methods.forEach((method, i) => {
        const payments = [{
          transaction_id: 'TXN',
          invoice_number: 'INV',
          amount: 100,
          payment_method: method,
          status: 'completed',
          payment_date: '',
          verified_by: null,
          verified_date: null,
          notes: null,
        }]
        const result = formatPaymentsForExport(payments)
        expect(result[0]['วิธีการชำระ']).toBe(expected[i])
      })
    })
  })

  describe('formatBookingsForExport', () => {
    it('formats booking data with Thai column names', () => {
      const bookings = [
        {
          booking_number: 'BK-001',
          customer_name: 'สมชาย',
          customer_phone: '0812345678',
          customer_email: 'somchai@email.com',
          room_number: '101',
          check_in_date: '2026-01-15',
          check_out_date: '2026-01-17',
          additional_services: 'นวดไทย 60 นาที',
          price: 2500,
          payment_status: 'paid',
          status: 'confirmed',
          created_by_hotel: true,
          notes: 'VIP',
        },
      ]

      const result = formatBookingsForExport(bookings)
      expect(result).toHaveLength(1)
      expect(result[0]['เลขที่การจอง']).toBe('BK-001')
      expect(result[0]['ชื่อผู้เข้าพัก']).toBe('สมชาย')
      expect(result[0]['ราคา']).toContain('2,500')
      expect(result[0]['สถานะการชำระ']).toBe('จ่ายแล้ว')
      expect(result[0]['สถานะ']).toBe('ยืนยันแล้ว')
      expect(result[0]['สร้างโดยโรงแรม']).toBe('ใช่')
    })

    it('shows dash for missing optional fields', () => {
      const bookings = [
        {
          booking_number: 'BK-002',
          customer_name: 'Test',
          customer_phone: '0899999999',
          customer_email: null,
          room_number: null,
          check_in_date: '2026-01-20',
          check_out_date: '2026-01-21',
          additional_services: null,
          price: 1000,
          payment_status: 'pending',
          status: 'pending',
          created_by_hotel: false,
          notes: null,
        },
      ]

      const result = formatBookingsForExport(bookings)
      expect(result[0]['อีเมล']).toBe('-')
      expect(result[0]['ห้องพัก']).toBe('-')
      expect(result[0]['บริการเพิ่มเติม']).toBe('-')
      expect(result[0]['หมายเหตุ']).toBe('-')
      expect(result[0]['สถานะการชำระ']).toBe('ยังไม่จ่าย')
      expect(result[0]['สร้างโดยโรงแรม']).toBe('ไม่')
    })

    it('translates booking statuses correctly', () => {
      const statuses = ['confirmed', 'pending', 'completed', 'cancelled', 'no_show']
      const expected = ['ยืนยันแล้ว', 'รอยืนยัน', 'เสร็จสิ้น', 'ยกเลิก', 'ไม่มาใช้บริการ']

      statuses.forEach((status, i) => {
        const bookings = [{
          booking_number: 'BK',
          customer_name: 'Test',
          customer_phone: '000',
          customer_email: null,
          room_number: null,
          check_in_date: '',
          check_out_date: '',
          additional_services: null,
          price: 100,
          payment_status: 'pending',
          status,
          created_by_hotel: false,
          notes: null,
        }]
        const result = formatBookingsForExport(bookings)
        expect(result[0]['สถานะ']).toBe(expected[i])
      })
    })
  })
})
