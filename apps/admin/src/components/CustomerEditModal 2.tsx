import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Save } from 'lucide-react'
import { Customer, CustomerStatus } from '../lib/customerQueries'
import { useUpdateCustomer } from '../hooks/useCustomers'

const customerEditSchema = z.object({
  full_name: z.string().min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'),
  phone: z.string().min(9, 'เบอร์โทรต้องมีอย่างน้อย 9 หลัก'),
  address: z.string().optional(),
  date_of_birth: z.string().optional(),
  status: z.enum(['active', 'suspended', 'banned']),
})

type CustomerEditFormData = z.infer<typeof customerEditSchema>

interface CustomerEditModalProps {
  isOpen: boolean
  onClose: () => void
  customer: Customer
  onSuccess?: () => void
}

function CustomerEditModal({ isOpen, onClose, customer, onSuccess }: CustomerEditModalProps) {
  const { update, loading } = useUpdateCustomer()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerEditFormData>({
    resolver: zodResolver(customerEditSchema),
    defaultValues: {
      full_name: customer.full_name,
      phone: customer.phone,
      address: customer.address || '',
      date_of_birth: customer.date_of_birth || '',
      status: customer.status,
    },
  })

  const onSubmit = async (data: CustomerEditFormData) => {
    try {
      await update(customer.id, data)
      setMessage({ type: 'success', text: 'อัปเดตข้อมูลสำเร็จ' })
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch (error) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">แก้ไขข้อมูลลูกค้า</h2>
            <p className="text-sm text-stone-500">Edit Customer Information</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg transition">
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-4">
            {/* Message */}
            {message && (
              <div
                className={`p-4 rounded-xl ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                ชื่อลูกค้า <span className="text-red-500">*</span>
              </label>
              <input
                {...register('full_name')}
                type="text"
                className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="กรอกชื่อลูกค้า"
              />
              {errors.full_name && (
                <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                เบอร์โทร <span className="text-red-500">*</span>
              </label>
              <input
                {...register('phone')}
                type="tel"
                className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="กรอกเบอร์โทร"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">ที่อยู่</label>
              <textarea
                {...register('address')}
                rows={3}
                className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="กรอกที่อยู่"
              />
              {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">วันเกิด</label>
              <input
                {...register('date_of_birth')}
                type="date"
                className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              {errors.date_of_birth && (
                <p className="text-red-500 text-sm mt-1">{errors.date_of_birth.message}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                สถานะ <span className="text-red-500">*</span>
              </label>
              <select
                {...register('status')}
                className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="active">ใช้งานอยู่ (Active)</option>
                <option value="suspended">ระงับชั่วคราว (Suspended)</option>
                <option value="banned">ระงับถาวร (Banned)</option>
              </select>
              {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>}

              {/* Status Warning */}
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>คำเตือน:</strong> การเปลี่ยนสถานะจะส่งผลต่อการใช้งานของลูกค้า
                </p>
                <ul className="text-xs text-yellow-700 mt-2 space-y-1 ml-4 list-disc">
                  <li>
                    <strong>ระงับชั่วคราว:</strong> ลูกค้าจะไม่สามารถทำการจองได้ชั่วคราว
                  </li>
                  <li>
                    <strong>ระงับถาวร:</strong> ลูกค้าจะถูกบล็อกและไม่สามารถใช้งานได้อีก
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-stone-300 rounded-xl text-stone-700 font-medium hover:bg-stone-50 transition disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>บันทึกการเปลี่ยนแปลง</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CustomerEditModal
