import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { updateBooking } from '../lib/hotelQueries'
import type { HotelBooking } from '../lib/hotelQueries'

// Validation schema
const bookingEditSchema = z.object({
  customer_name: z.string().min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'),
  customer_phone: z.string().min(9, 'เบอร์โทรต้องมีอย่างน้อย 9 หลัก'),
  customer_email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง').optional().or(z.literal('')),
  service_name: z.string().min(1, 'กรุณาระบุชื่อบริการ'),
  service_category: z.string().min(1, 'กรุณาระบุประเภทบริการ'),
  staff_name: z.string().optional(),
  service_date: z.string().min(1, 'กรุณาเลือกวันที่'),
  service_time: z.string().min(1, 'กรุณาระบุเวลา'),
  duration: z.coerce.number().min(1, 'ระยะเวลาต้องมากกว่า 0'),
  total_price: z.coerce.number().min(0, 'ราคาต้องไม่ติดลบ'),
  status: z.enum(['confirmed', 'pending', 'completed', 'cancelled', 'no_show']),
  payment_status: z.enum(['paid', 'pending', 'refunded']),
  room_number: z.string().optional(),
  notes: z.string().optional(),
})

type BookingEditData = z.infer<typeof bookingEditSchema>

interface BookingEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  booking: HotelBooking | null
}

const statusOptions = [
  { value: 'pending', label: 'รอยืนยัน' },
  { value: 'confirmed', label: 'ยืนยันแล้ว' },
  { value: 'completed', label: 'เสร็จสิ้น' },
  { value: 'cancelled', label: 'ยกเลิก' },
  { value: 'no_show', label: 'ไม่มาใช้บริการ' },
]

const paymentStatusOptions = [
  { value: 'pending', label: 'รอชำระ' },
  { value: 'paid', label: 'ชำระแล้ว' },
  { value: 'refunded', label: 'คืนเงินแล้ว' },
]

export function BookingEditModal({ isOpen, onClose, onSuccess, booking }: BookingEditModalProps) {
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BookingEditData>({
    resolver: zodResolver(bookingEditSchema),
  })

  // Reset form when modal opens/closes or booking changes
  useEffect(() => {
    if (isOpen && booking) {
      reset({
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone,
        customer_email: booking.customer_email || '',
        service_name: booking.service_name,
        service_category: booking.service_category,
        staff_name: booking.staff_name || '',
        service_date: booking.service_date,
        service_time: booking.service_time,
        duration: booking.duration,
        total_price: Number(booking.total_price),
        status: booking.status,
        payment_status: booking.payment_status,
        room_number: booking.room_number || '',
        notes: booking.notes || '',
      })
      setSubmitError('')
      setSubmitSuccess(false)
    }
  }, [isOpen, booking, reset])

  const onSubmit = async (data: BookingEditData) => {
    if (!booking) return

    try {
      setSubmitError('')

      await updateBooking(booking.id, {
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || null,
        service_name: data.service_name,
        service_category: data.service_category,
        staff_name: data.staff_name || null,
        service_date: data.service_date,
        service_time: data.service_time,
        duration: data.duration,
        total_price: data.total_price,
        status: data.status,
        payment_status: data.payment_status,
        room_number: data.room_number || null,
        notes: data.notes || null,
      })

      setSubmitSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 1000)
    } catch (err: any) {
      console.error('Error updating booking:', err)
      setSubmitError(err.message || 'เกิดข้อผิดพลาดในการแก้ไขการจอง')
    }
  }

  if (!isOpen || !booking) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">แก้ไขการจอง</h2>
              <p className="text-sm text-gray-500">{booking.booking_number}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4">
            {/* Success Message */}
            {submitSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span>แก้ไขการจองสำเร็จ!</span>
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">ข้อมูลผู้เข้าพัก</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ชื่อผู้เข้าพัก *</label>
                    <input
                      {...register('customer_name')}
                      type="text"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {errors.customer_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.customer_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">เบอร์โทร *</label>
                    <input
                      {...register('customer_phone')}
                      type="text"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {errors.customer_phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.customer_phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">อีเมล</label>
                    <input
                      {...register('customer_email')}
                      type="email"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {errors.customer_email && (
                      <p className="mt-1 text-sm text-red-600">{errors.customer_email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">ห้องพัก</label>
                    <input
                      {...register('room_number')}
                      type="text"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Service Information */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">ข้อมูลบริการ</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ชื่อบริการ *</label>
                    <input
                      {...register('service_name')}
                      type="text"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {errors.service_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.service_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">ประเภท *</label>
                    <input
                      {...register('service_category')}
                      type="text"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {errors.service_category && (
                      <p className="mt-1 text-sm text-red-600">{errors.service_category.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">ช่าง/พนักงาน</label>
                    <input
                      {...register('staff_name')}
                      type="text"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">ระยะเวลา (นาที) *</label>
                    <input
                      {...register('duration')}
                      type="number"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {errors.duration && (
                      <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">ราคา (บาท) *</label>
                    <input
                      {...register('total_price')}
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {errors.total_price && (
                      <p className="mt-1 text-sm text-red-600">{errors.total_price.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">วันที่และเวลา</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">วันที่ใช้บริการ *</label>
                    <input
                      {...register('service_date')}
                      type="date"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {errors.service_date && (
                      <p className="mt-1 text-sm text-red-600">{errors.service_date.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">เวลา *</label>
                    <input
                      {...register('service_time')}
                      type="time"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {errors.service_time && (
                      <p className="mt-1 text-sm text-red-600">{errors.service_time.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">สถานะ</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">สถานะการจอง *</label>
                    <select
                      {...register('status')}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">สถานะการชำระเงิน *</label>
                    <select
                      {...register('payment_status')}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {paymentStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">หมายเหตุ</label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="หมายเหตุเพิ่มเติม..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={isSubmitting || submitSuccess}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
