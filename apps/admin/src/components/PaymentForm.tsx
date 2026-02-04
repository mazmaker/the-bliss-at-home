import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, DollarSign, CreditCard, Calendar, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { createPayment } from '../lib/hotelQueries'
import type { HotelInvoice } from '../lib/hotelQueries'

// Validation schema
const paymentFormSchema = z.object({
  invoice_id: z.string().optional(),
  amount: z.coerce
    .number({ required_error: 'ระบุจำนวนเงิน' })
    .min(1, 'จำนวนเงินต้องมากกว่า 0'),
  payment_method: z.enum(['bank_transfer', 'cash', 'cheque', 'online'], {
    required_error: 'เลือกช่องทางการชำระเงิน',
  }),
  payment_date: z.string().min(1, 'เลือกวันที่ชำระเงิน'),
  transaction_ref: z.string().min(3, 'รหัสอ้างอิงต้องมีอย่างน้อย 3 ตัวอักษร'),
  status: z.enum(['completed', 'pending', 'failed', 'refunded'], {
    required_error: 'เลือกสถานะ',
  }),
  notes: z.string().optional(),
})

type PaymentFormData = z.infer<typeof paymentFormSchema>

interface PaymentFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  hotelId: string
  invoices: HotelInvoice[]
}

const paymentMethodOptions = [
  { value: 'bank_transfer', label: 'โอนผ่านธนาคาร' },
  { value: 'cash', label: 'เงินสด' },
  { value: 'cheque', label: 'เช็ค' },
  { value: 'online', label: 'ชำระออนไลน์' },
]

const statusOptions = [
  { value: 'completed', label: 'สำเร็จ' },
  { value: 'pending', label: 'รอตรวจสอบ' },
  { value: 'failed', label: 'ล้มเหลว' },
  { value: 'refunded', label: 'คืนเงิน' },
]

export function PaymentForm({ isOpen, onClose, onSuccess, hotelId, invoices }: PaymentFormProps) {
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: 0,
      payment_method: 'bank_transfer',
      payment_date: new Date().toISOString().split('T')[0],
      transaction_ref: '',
      status: 'completed',
      notes: '',
    },
  })

  const selectedInvoiceId = watch('invoice_id')

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset({
        invoice_id: '',
        amount: 0,
        payment_method: 'bank_transfer',
        payment_date: new Date().toISOString().split('T')[0],
        transaction_ref: '',
        status: 'completed',
        notes: '',
      })
      setSubmitError('')
      setSubmitSuccess(false)
    }
  }, [isOpen, reset])

  // Auto-fill amount when invoice is selected
  useEffect(() => {
    if (selectedInvoiceId) {
      const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId)
      if (selectedInvoice) {
        reset((prev) => ({
          ...prev,
          amount: Number(selectedInvoice.commission_amount),
        }))
      }
    }
  }, [selectedInvoiceId, invoices, reset])

  const onSubmit = async (data: PaymentFormData) => {
    try {
      setSubmitError('')

      // Get invoice number if invoice is selected
      let invoiceNumber = undefined
      if (data.invoice_id) {
        const invoice = invoices.find((inv) => inv.id === data.invoice_id)
        invoiceNumber = invoice?.invoice_number
      }

      await createPayment({
        hotel_id: hotelId,
        invoice_id: data.invoice_id || null,
        invoice_number: invoiceNumber,
        transaction_ref: data.transaction_ref,
        amount: data.amount,
        payment_method: data.payment_method,
        status: data.status,
        payment_date: data.payment_date,
        notes: data.notes,
      })

      setSubmitSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 1000)
    } catch (err: any) {
      console.error('Error creating payment:', err)
      setSubmitError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    }
  }

  if (!isOpen) return null

  // Filter pending invoices
  const pendingInvoices = invoices.filter((inv) => inv.status === 'pending' || inv.status === 'overdue')

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">บันทึกการชำระเงิน</h2>
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
                <span>บันทึกการชำระเงินสำเร็จ!</span>
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
              {/* Invoice Selection (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  เลือกบิล (ถ้ามี)
                </label>
                <select
                  {...register('invoice_id')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">ไม่เลือกบิล</option>
                  {pendingInvoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - ฿{Number(invoice.commission_amount).toLocaleString()} ({invoice.status === 'pending' ? 'รอชำระ' : 'เกินกำหนด'})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  เลือกบิลที่ต้องการบันทึกการชำระเงิน (ถ้าเป็นการชำระเงินทั่วไปไม่ต้องเลือก)
                </p>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  จำนวนเงิน *
                </label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    {...register('amount')}
                    type="number"
                    step="0.01"
                    min="0"
                    className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ช่องทางการชำระเงิน *
                </label>
                <div className="relative mt-1">
                  <CreditCard className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <select
                    {...register('payment_method')}
                    className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {paymentMethodOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.payment_method && (
                  <p className="mt-1 text-sm text-red-600">{errors.payment_method.message}</p>
                )}
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  วันที่ชำระเงิน *
                </label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    {...register('payment_date')}
                    type="date"
                    className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                {errors.payment_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.payment_date.message}</p>
                )}
              </div>

              {/* Transaction Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  รหัสอ้างอิง/เลขที่ธุรกรรม *
                </label>
                <div className="relative mt-1">
                  <FileText className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    {...register('transaction_ref')}
                    type="text"
                    className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="TXN202601310001"
                  />
                </div>
                {errors.transaction_ref && (
                  <p className="mt-1 text-sm text-red-600">{errors.transaction_ref.message}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700">สถานะ *</label>
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
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  หมายเหตุ
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="หมายเหตุเพิ่มเติม..."
                />
                {errors.notes && (
                  <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
                )}
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
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-700 to-amber-800 px-4 py-2 text-sm font-medium text-white hover:from-amber-800 hover:to-amber-900 disabled:opacity-50"
                disabled={isSubmitting || submitSuccess}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการชำระเงิน'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
