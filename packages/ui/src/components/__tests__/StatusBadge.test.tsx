// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from '../StatusBadge'
import type { BookingStatus, PaymentStatus } from '../StatusBadge'

describe('StatusBadge', () => {
  describe('booking statuses', () => {
    const bookingCases: { status: BookingStatus; label: string; bg: string; text: string }[] = [
      { status: 'pending', label: 'รอดำเนินการ', bg: 'bg-yellow-100', text: 'text-yellow-700' },
      { status: 'confirmed', label: 'ยืนยันแล้ว', bg: 'bg-blue-100', text: 'text-blue-700' },
      { status: 'in-progress', label: 'กำลังดำเนินการ', bg: 'bg-purple-100', text: 'text-purple-700' },
      { status: 'completed', label: 'เสร็จสิ้น', bg: 'bg-green-100', text: 'text-green-700' },
      { status: 'cancelled', label: 'ยกเลิก', bg: 'bg-red-100', text: 'text-red-700' },
    ]

    bookingCases.forEach(({ status, label, bg, text }) => {
      it(`renders "${label}" for booking status "${status}"`, () => {
        render(<StatusBadge status={status} type="booking" />)
        expect(screen.getByText(label)).toBeInTheDocument()
      })

      it(`applies ${bg} and ${text} for booking "${status}"`, () => {
        render(<StatusBadge status={status} type="booking" />)
        const badge = screen.getByText(label)
        expect(badge.className).toContain(bg)
        expect(badge.className).toContain(text)
      })
    })
  })

  describe('payment statuses', () => {
    const paymentCases: { status: PaymentStatus; label: string; bg: string; text: string }[] = [
      { status: 'pending', label: 'รอชำระ', bg: 'bg-yellow-100', text: 'text-yellow-700' },
      { status: 'processing', label: 'กำลังดำเนินการ', bg: 'bg-blue-100', text: 'text-blue-700' },
      { status: 'paid', label: 'ชำระแล้ว', bg: 'bg-green-100', text: 'text-green-700' },
      { status: 'failed', label: 'ชำระไม่สำเร็จ', bg: 'bg-red-100', text: 'text-red-700' },
      { status: 'refunded', label: 'คืนเงิน', bg: 'bg-stone-100', text: 'text-stone-700' },
    ]

    paymentCases.forEach(({ status, label, bg, text }) => {
      it(`renders "${label}" for payment status "${status}"`, () => {
        render(<StatusBadge status={status} type="payment" />)
        expect(screen.getByText(label)).toBeInTheDocument()
      })

      it(`applies ${bg} and ${text} for payment "${status}"`, () => {
        render(<StatusBadge status={status} type="payment" />)
        const badge = screen.getByText(label)
        expect(badge.className).toContain(bg)
        expect(badge.className).toContain(text)
      })
    })
  })

  describe('defaults', () => {
    it('uses booking type by default', () => {
      render(<StatusBadge status="pending" />)
      // booking pending = "รอดำเนินการ", not "รอชำระ"
      expect(screen.getByText('รอดำเนินการ')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('has rounded-full class', () => {
      render(<StatusBadge status="confirmed" type="booking" />)
      expect(screen.getByText('ยืนยันแล้ว').className).toContain('rounded-full')
    })

    it('has text-sm font-medium classes', () => {
      render(<StatusBadge status="paid" type="payment" />)
      const badge = screen.getByText('ชำระแล้ว')
      expect(badge.className).toContain('text-sm')
      expect(badge.className).toContain('font-medium')
    })

    it('merges custom className', () => {
      render(<StatusBadge status="pending" className="extra-class" />)
      expect(screen.getByText('รอดำเนินการ').className).toContain('extra-class')
    })
  })
})
