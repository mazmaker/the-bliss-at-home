import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../utils/cn'

export type BookingStatus = 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: BookingStatus | PaymentStatus
  type?: 'booking' | 'payment'
}

const statusConfig = {
  booking: {
    pending: { label: 'รอดำเนินการ', labelEn: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-700' },
    confirmed: { label: 'ยืนยันแล้ว', labelEn: 'Confirmed', bg: 'bg-blue-100', text: 'text-blue-700' },
    'in-progress': { label: 'กำลังดำเนินการ', labelEn: 'In Progress', bg: 'bg-purple-100', text: 'text-purple-700' },
    completed: { label: 'เสร็จสิ้น', labelEn: 'Completed', bg: 'bg-green-100', text: 'text-green-700' },
    cancelled: { label: 'ยกเลิก', labelEn: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700' },
  },
  payment: {
    pending: { label: 'รอชำระ', labelEn: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-700' },
    processing: { label: 'กำลังดำเนินการ', labelEn: 'Processing', bg: 'bg-blue-100', text: 'text-blue-700' },
    paid: { label: 'ชำระแล้ว', labelEn: 'Paid', bg: 'bg-green-100', text: 'text-green-700' },
    failed: { label: 'ชำระไม่สำเร็จ', labelEn: 'Failed', bg: 'bg-red-100', text: 'text-red-700' },
    refunded: { label: 'คืนเงิน', labelEn: 'Refunded', bg: 'bg-stone-100', text: 'text-stone-700' },
  },
} as const

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, type = 'booking', ...props }, ref) => {
    const config = statusConfig[type][status as keyof typeof statusConfig[typeof type]]

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
          config.bg,
          config.text,
          className
        )}
        {...props}
      >
        {config.label}
      </span>
    )
  }
)

StatusBadge.displayName = 'StatusBadge'

export default StatusBadge
