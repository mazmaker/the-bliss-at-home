import { describe, it, expect } from 'vitest'
import type {
  RefundStatus,
  RefundOption,
  RefundInfo,
  RefundTransaction,
  CancellationRecipientType,
  NotificationChannel,
  NotificationStatus,
  BookingCancellationRequest,
  BookingCancellationResponse,
  BookingWithCancellation,
} from '../cancellation'

// ============================================
// Type validation tests
// These tests verify type compatibility at runtime
// and serve as documentation for the type system
// ============================================

describe('Cancellation Types', () => {
  describe('RefundStatus', () => {
    it('accepts valid refund statuses', () => {
      const statuses: RefundStatus[] = ['none', 'pending', 'processing', 'completed', 'failed']
      expect(statuses).toHaveLength(5)
    })
  })

  describe('RefundOption', () => {
    it('accepts valid refund options', () => {
      const options: RefundOption[] = ['full', 'partial', 'none']
      expect(options).toHaveLength(3)
    })
  })

  describe('RefundInfo', () => {
    it('creates valid RefundInfo objects', () => {
      const info: RefundInfo = {
        amount: 1500,
        percentage: 50,
        status: 'pending',
        expected_days: 5,
      }
      expect(info.amount).toBe(1500)
      expect(info.percentage).toBe(50)
      expect(info.status).toBe('pending')
      expect(info.expected_days).toBe(5)
    })

    it('handles 0% refund correctly', () => {
      const info: RefundInfo = {
        amount: 0,
        percentage: 0,
        status: 'none',
        expected_days: 0,
      }
      expect(info.amount).toBe(0)
    })

    it('handles full refund correctly', () => {
      const info: RefundInfo = {
        amount: 3000,
        percentage: 100,
        status: 'completed',
        expected_days: 5,
      }
      expect(info.percentage).toBe(100)
    })
  })

  describe('RefundTransaction', () => {
    it('creates a complete refund transaction', () => {
      const txn: RefundTransaction = {
        id: 'rfnd-001',
        booking_id: 'bkng-001',
        payment_transaction_id: 'txn-001',
        refund_amount: 1500,
        refund_percentage: 50,
        status: 'completed',
        reason: 'Customer requested cancellation',
        initiated_by: 'admin-001',
        omise_refund_id: 'rfnd_test_123',
        created_at: '2026-03-01T10:00:00Z',
        updated_at: '2026-03-01T10:05:00Z',
        completed_at: '2026-03-01T10:05:00Z',
      }
      expect(txn.id).toBe('rfnd-001')
      expect(txn.status).toBe('completed')
    })

    it('creates a minimal refund transaction (optional fields omitted)', () => {
      const txn: RefundTransaction = {
        id: 'rfnd-002',
        booking_id: 'bkng-002',
        refund_amount: 0,
        status: 'none',
        created_at: '2026-03-01T10:00:00Z',
        updated_at: '2026-03-01T10:00:00Z',
      }
      expect(txn.payment_transaction_id).toBeUndefined()
      expect(txn.omise_refund_id).toBeUndefined()
    })
  })

  describe('BookingCancellationRequest', () => {
    it('creates a full cancellation request', () => {
      const request: BookingCancellationRequest = {
        booking_id: 'bkng-001',
        reason: 'Changed plans',
        refund_option: 'full',
        notify_customer: true,
        notify_staff: true,
        notify_hotel: true,
      }
      expect(request.refund_option).toBe('full')
    })

    it('creates a partial refund cancellation request', () => {
      const request: BookingCancellationRequest = {
        booking_id: 'bkng-002',
        reason: 'Late cancellation',
        refund_option: 'partial',
        refund_percentage: 50,
      }
      expect(request.refund_percentage).toBe(50)
    })

    it('creates a no-refund cancellation request', () => {
      const request: BookingCancellationRequest = {
        booking_id: 'bkng-003',
        reason: 'No-show',
        refund_option: 'none',
      }
      expect(request.refund_option).toBe('none')
    })
  })

  describe('CancellationRecipientType', () => {
    it('accepts all recipient types', () => {
      const types: CancellationRecipientType[] = ['customer', 'staff', 'hotel', 'admin']
      expect(types).toHaveLength(4)
    })
  })

  describe('NotificationChannel', () => {
    it('accepts all channels', () => {
      const channels: NotificationChannel[] = ['email', 'in_app', 'line']
      expect(channels).toHaveLength(3)
    })
  })

  describe('BookingCancellationResponse', () => {
    it('creates a successful cancellation response', () => {
      const response: BookingCancellationResponse = {
        booking_id: 'bkng-001',
        cancelled_at: '2026-03-01T10:00:00Z',
        refund_transaction_id: 'rfnd-001',
        refund_amount: 1500,
        notifications_sent: {
          customer: true,
          staff: true,
          hotel: false,
          admin: true,
        },
      }
      expect(response.notifications_sent.customer).toBe(true)
      expect(response.notifications_sent.hotel).toBe(false)
    })
  })
})
