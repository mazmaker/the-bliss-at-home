import { useState } from 'react'
import { ArrowLeft, ArrowRight, CreditCard, Banknote, Smartphone, Gift, Check, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Props {
  totalAmount: number
  paymentMethod?: string
  paymentNotes?: string
  adminNotes?: string
  customerId?: string
  bookingId?: string
  onPaymentRecord: (method: string, notes: string, adminNotes: string) => void
  onNext?: () => void
  onBack: () => void
}

const paymentMethods = [
  { value: 'cash', label: 'เงินสด', icon: Banknote, description: 'ลูกค้าจ่ายเป็นเงินสด' },
  { value: 'bank_transfer', label: 'โอนเงิน', icon: Smartphone, description: 'โอนผ่านธนาคาร' },
  { value: 'credit_card', label: 'บัตรเครดิต', icon: CreditCard, description: 'จ่ายด้วยบัตรเครดิต' },
  { value: 'promptpay', label: 'PromptPay', icon: Smartphone, description: 'จ่ายผ่าน PromptPay' },
  { value: 'voucher', label: 'คูปอง/เครดิต', icon: Gift, description: 'ใช้คูปองหรือเครดิต' },
  { value: 'other', label: 'อื่นๆ', icon: CreditCard, description: 'ช่องทางอื่น' }
]

export default function PaymentRecording({
  totalAmount,
  paymentMethod,
  paymentNotes,
  adminNotes,
  customerId,
  bookingId,
  onPaymentRecord,
  onNext,
  onBack
}: Props) {
  const [selectedMethod, setSelectedMethod] = useState(paymentMethod || '')
  const [notes, setNotes] = useState(paymentNotes || '')
  const [adminNotesText, setAdminNotesText] = useState(adminNotes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  // Save payment record to database
  const savePaymentRecord = async (method: string, paymentNotes: string, adminNotes: string) => {
    if (!customerId) return

    try {
      setIsSaving(true)
      setError('')

      // Get current admin user using direct Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw new Error(`Authentication error: ${authError.message}`)
      if (!user) throw new Error('Admin not authenticated')

      // Get admin profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) throw new Error('Failed to get admin profile')
      if (profile.role !== 'ADMIN') throw new Error('Access denied. Admin role required.')

      // Save payment record to database
      const paymentData = {
        customer_id: customerId,
        booking_id: bookingId || null,
        payment_method: method,
        amount: totalAmount,
        payment_notes: paymentNotes.trim() || null,
        admin_notes: adminNotes.trim() || null,
        recorded_by: user.id,
        status: 'recorded', // Admin just recording, not processing
        recorded_at: new Date().toISOString()
      }

      const { error: insertError } = await supabase
        .from('payment_records')
        .insert(paymentData)

      if (insertError) throw insertError

      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)

    } catch (err: any) {
      console.error('Payment record save error:', err)
      setError('ไม่สามารถบันทึกข้อมูลการชำระเงินได้: ' + err.message)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleMethodSelect = async (method: string) => {
    setSelectedMethod(method)
    onPaymentRecord(method, notes, adminNotesText)

    // Auto-save to database
    await savePaymentRecord(method, notes, adminNotesText)
  }

  const handleNotesUpdate = async (newNotes: string, newAdminNotes: string) => {
    setNotes(newNotes)
    setAdminNotesText(newAdminNotes)
    if (selectedMethod) {
      onPaymentRecord(selectedMethod, newNotes, newAdminNotes)

      // Auto-save to database when notes change
      await savePaymentRecord(selectedMethod, newNotes, newAdminNotes)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-xl font-semibold text-bliss-900">บันทึกการชำระเงิน</h2>
          {isSaving && (
            <div className="w-5 h-5 border-2 border-[#565b34] border-t-transparent rounded-full animate-spin"></div>
          )}
          {saveStatus === 'success' && (
            <div className="flex items-center gap-1 text-green-600">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">บันทึกแล้ว</span>
            </div>
          )}
        </div>
        <p className="text-bliss-600">บันทึกวิธีการชำระเงินที่ลูกค้าใช้ สำหรับการรายงานและสถิติ</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Payment Summary */}
      <div className="bg-[#ebe6d0]/20 border border-[#565b34]/30 rounded-xl p-6">
        <h3 className="font-medium text-[#565b34] mb-2">สรุปยอดชำระ</h3>
        <div className="text-3xl font-bold text-bliss-800 mb-4">
          {formatCurrency(totalAmount)}
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-800 font-medium">หมายเหตุสำคัญ</p>
              <p className="text-blue-700">
                ข้อมูลการชำระเงินจะถูกเก็บบันทึกไว้สำหรับการวิเคราะห์ธุรกิจและการรายงานเท่านั้น
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div>
        <h3 className="font-medium text-bliss-900 mb-3">ลูกค้าจ่ายเงินผ่านช่องทางไหน?</h3>
        <div className="grid grid-cols-2 gap-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon
            const isSelected = selectedMethod === method.value

            return (
              <button
                key={method.value}
                onClick={() => handleMethodSelect(method.value)}
                disabled={isSaving}
                className={`
                  p-4 border-2 rounded-xl text-left transition-all duration-300 shadow-sm
                  ${isSelected
                    ? 'border-[#565b34] bg-[#ebe6d0]/30 text-bliss-900 shadow-md transform scale-[1.02]'
                    : 'border-bliss-200 hover:border-[#565b34]/50 hover:bg-bliss-50 hover:shadow-md'
                  }
                  ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-[#565b34]' : 'text-bliss-500'}`} />
                  <span className="font-medium">{method.label}</span>
                  {isSelected && (
                    <div className="ml-auto w-6 h-6 bg-[#565b34] rounded-full flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
                <p className={`text-sm ${isSelected ? 'text-bliss-700' : 'text-bliss-500'}`}>
                  {method.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Payment Notes */}
      {selectedMethod && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-bliss-700 mb-2">
              หมายเหตุการชำระเงิน (ถ้ามี)
            </label>
            <textarea
              value={notes}
              onChange={(e) => handleNotesUpdate(e.target.value, adminNotesText)}
              placeholder="เช่น: จ่ายเงินสด 3,000 บาท ทอนเงิน 500 บาท, หมายเลขการโอน: xxx, etc."
              className="w-full px-3 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-[#565b34] focus:border-[#565b34] resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-bliss-700 mb-2">
              หมายเหตุเพิ่มเติม (Admin)
            </label>
            <textarea
              value={adminNotesText}
              onChange={(e) => handleNotesUpdate(notes, e.target.value)}
              placeholder="หมายเหตุสำหรับ Admin เท่านั้น..."
              className="w-full px-3 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-[#565b34] focus:border-[#565b34] resize-none"
              rows={2}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-bliss-600 border border-bliss-300 rounded-xl hover:bg-bliss-50"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับ
        </button>

        {selectedMethod && onNext && (
          <button
            onClick={onNext}
            className="flex items-center gap-2 bg-[#565b34] text-white px-6 py-3 rounded-xl hover:bg-[#464a28] transition-colors"
          >
            ถัดไป: ยืนยันการจอง
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}