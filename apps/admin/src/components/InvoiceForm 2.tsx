import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Calendar, FileText, DollarSign, AlertCircle, CheckCircle, Loader2, TrendingUp } from 'lucide-react'
import type { HotelInvoice, HotelBooking } from '../lib/hotelQueries'

// Validation schema
const invoiceFormSchema = z.object({
  period_type: z.enum(['weekly', 'monthly'], {
    required_error: 'เลือกประเภทช่วงเวลา',
  }),
  period: z.string().min(1, 'เลือกช่วงเวลา'),
})

type InvoiceFormData = z.infer<typeof invoiceFormSchema>

interface PeriodOption {
  start: string
  end: string
  label: string
  value: string
}

interface InvoiceFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  hotelId: string
  commissionRate: number
  invoices: HotelInvoice[]
  bookings: HotelBooking[]
}

export function InvoiceForm({
  isOpen,
  onClose,
  onSuccess,
  hotelId,
  commissionRate,
  invoices,
  bookings,
}: InvoiceFormProps) {
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [availablePeriods, setAvailablePeriods] = useState<PeriodOption[]>([])
  const [periodSummary, setPeriodSummary] = useState<{
    totalBookings: number
    totalRevenue: number
    commissionAmount: number
  } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      period_type: 'monthly',
      period: '',
    },
  })

  const selectedPeriodType = watch('period_type')
  const selectedPeriod = watch('period')

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset({
        period_type: 'monthly',
        period: '',
      })
      setSubmitError('')
      setSubmitSuccess(false)
      setPeriodSummary(null)
    }
  }, [isOpen, reset])

  // Calculate available periods when period type changes
  useEffect(() => {
    if (!selectedPeriodType) return

    const periods = calculateAvailablePeriods(selectedPeriodType, invoices, bookings)
    setAvailablePeriods(periods)
    setValue('period', '') // Reset period selection
    setPeriodSummary(null)
  }, [selectedPeriodType, invoices, bookings, setValue])

  // Calculate summary when period is selected
  useEffect(() => {
    if (!selectedPeriod) {
      setPeriodSummary(null)
      return
    }

    const [periodStart, periodEnd] = selectedPeriod.split('|')
    const periodBookings = bookings.filter((booking) => {
      const serviceDate = new Date(booking.service_date)
      return serviceDate >= new Date(periodStart) && serviceDate <= new Date(periodEnd)
    })

    const totalRevenue = periodBookings.reduce((sum, b) => sum + Number(b.total_price), 0)
    const commissionAmount = (totalRevenue * commissionRate) / 100

    setPeriodSummary({
      totalBookings: periodBookings.length,
      totalRevenue,
      commissionAmount,
    })
  }, [selectedPeriod, bookings, commissionRate])

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      setSubmitError('')

      if (!periodSummary) {
        setSubmitError('ไม่พบข้อมูลการจองในช่วงเวลาที่เลือก')
        return
      }

      const [periodStart, periodEnd] = data.period.split('|')

      // Generate invoice number
      const invoiceNumber = generateInvoiceNumber(hotelId, periodStart)

      // Calculate dates
      const issuedDate = new Date().toISOString().split('T')[0]
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30) // 30 days from now
      const dueDateStr = dueDate.toISOString().split('T')[0]

      // Create invoice (you'll need to import this function)
      const { createInvoice } = await import('../lib/hotelQueries')

      await createInvoice({
        hotel_id: hotelId,
        invoice_number: invoiceNumber,
        period_start: periodStart,
        period_end: periodEnd,
        period_type: data.period_type,
        total_bookings: periodSummary.totalBookings,
        total_revenue: periodSummary.totalRevenue,
        commission_rate: commissionRate,
        commission_amount: periodSummary.commissionAmount,
        status: 'pending',
        issued_date: issuedDate,
        due_date: dueDateStr,
      })

      setSubmitSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 1000)
    } catch (err: any) {
      console.error('Error creating invoice:', err)
      setSubmitError(err.message || 'เกิดข้อผิดพลาดในการสร้างบิล')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">สร้างบิล/ใบแจ้งหนี้ใหม่</h2>
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
                <span>สร้างบิลสำเร็จ!</span>
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Period Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ประเภทช่วงเวลา *
                </label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <select
                    {...register('period_type')}
                    className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="monthly">รายเดือน</option>
                    <option value="weekly">รายสัปดาห์</option>
                  </select>
                </div>
                {errors.period_type && (
                  <p className="mt-1 text-sm text-red-600">{errors.period_type.message}</p>
                )}
              </div>

              {/* Period Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  เลือกช่วงเวลา *
                </label>
                <div className="relative mt-1">
                  <FileText className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <select
                    {...register('period')}
                    className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={availablePeriods.length === 0}
                  >
                    <option value="">เลือกช่วงเวลา</option>
                    {availablePeriods.map((period) => (
                      <option key={period.value} value={period.value}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.period && (
                  <p className="mt-1 text-sm text-red-600">{errors.period.message}</p>
                )}
                {availablePeriods.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    ไม่มีช่วงเวลาที่ยังไม่มีบิล (อาจมีบิลครบทุกช่วงเวลาแล้ว)
                  </p>
                )}
              </div>

              {/* Summary */}
              {periodSummary && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-blue-900">
                    <TrendingUp className="h-5 w-5" />
                    <h3 className="font-semibold">สรุปข้อมูลช่วงเวลาที่เลือก</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-blue-700">จำนวนการจอง</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {periodSummary.totalBookings}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700">รายได้รวม</p>
                      <p className="text-2xl font-bold text-blue-900">
                        ฿{periodSummary.totalRevenue.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700">คอมมิชชั่น ({commissionRate}%)</p>
                      <p className="text-2xl font-bold text-amber-700">
                        ฿{periodSummary.commissionAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
                disabled={isSubmitting || submitSuccess || !periodSummary}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'กำลังสร้างบิล...' : 'สร้างบิล'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Helper function to calculate available periods
function calculateAvailablePeriods(
  periodType: 'weekly' | 'monthly',
  invoices: HotelInvoice[],
  bookings: HotelBooking[]
): PeriodOption[] {
  if (bookings.length === 0) return []

  // Find earliest and latest booking dates
  const dates = bookings.map((b) => new Date(b.service_date))
  const earliestDate = new Date(Math.min(...dates.map((d) => d.getTime())))
  const latestDate = new Date(Math.max(...dates.map((d) => d.getTime())))

  // Generate all possible periods
  const allPeriods: PeriodOption[] = []
  let currentDate = new Date(earliestDate)

  if (periodType === 'monthly') {
    // Set to first day of month
    currentDate.setDate(1)

    while (currentDate <= new Date()) {
      const periodStart = new Date(currentDate)
      const periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const value = `${periodStart.toISOString().split('T')[0]}|${periodEnd.toISOString().split('T')[0]}`
      const label = `${formatThaiMonth(periodStart)} ${periodStart.getFullYear() + 543}`

      allPeriods.push({ start: periodStart.toISOString().split('T')[0], end: periodEnd.toISOString().split('T')[0], label, value })

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1)
    }
  } else {
    // Weekly
    // Set to Monday of the week
    const day = currentDate.getDay()
    const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1)
    currentDate.setDate(diff)

    while (currentDate <= new Date()) {
      const periodStart = new Date(currentDate)
      const periodEnd = new Date(currentDate)
      periodEnd.setDate(periodEnd.getDate() + 6)

      const value = `${periodStart.toISOString().split('T')[0]}|${periodEnd.toISOString().split('T')[0]}`
      const label = `${formatShortDate(periodStart)} - ${formatShortDate(periodEnd)}`

      allPeriods.push({ start: periodStart.toISOString().split('T')[0], end: periodEnd.toISOString().split('T')[0], label, value })

      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7)
    }
  }

  // Filter out periods that already have invoices
  const existingPeriods = new Set(
    invoices
      .filter((inv) => inv.period_type === periodType)
      .map((inv) => `${inv.period_start}|${inv.period_end}`)
  )

  return allPeriods.filter((period) => !existingPeriods.has(period.value))
}

// Helper function to format Thai month
function formatThaiMonth(date: Date): string {
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]
  return months[date.getMonth()]
}

// Helper function to format short date
function formatShortDate(date: Date): string {
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear() + 543
  return `${day}/${month}/${year}`
}

// Helper function to generate invoice number
function generateInvoiceNumber(hotelId: string, periodStart: string): string {
  const date = new Date(periodStart)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const hotelCode = hotelId.substring(0, 8).toUpperCase()
  const timestamp = Date.now().toString().slice(-6)

  return `INV-${year}${month}-${hotelCode}-${timestamp}`
}
