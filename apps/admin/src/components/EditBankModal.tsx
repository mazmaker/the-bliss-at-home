import { useState } from 'react'
import { X, Building, CreditCard, User, MapPin } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface EditBankModalProps {
  bankInfo: {
    bank_name: string
    account_name: string
    account_number: string
    branch: string
  }
  onClose: () => void
  onSave: (bankInfo: any) => void
}

export function EditBankModal({ bankInfo, onClose, onSave }: EditBankModalProps) {
  const [formData, setFormData] = useState({
    bank_name: bankInfo.bank_name,
    account_name: bankInfo.account_name,
    account_number: bankInfo.account_number,
    branch: bankInfo.branch,
  })

  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    if (!formData.bank_name.trim()) {
      toast.error('กรุณากรอกชื่อธนาคาร')
      return
    }
    if (!formData.account_name.trim()) {
      toast.error('กรุณากรอกชื่อบัญชี')
      return
    }
    if (!formData.account_number.trim()) {
      toast.error('กรุณากรอกเลขที่บัญชี')
      return
    }
    if (!formData.branch.trim()) {
      toast.error('กรุณากรอกสาขา')
      return
    }

    setIsSaving(true)

    try {
      // TODO: Save to database
      // For now, just update the parent component
      await onSave(formData)
      toast.success('บันทึกข้อมูลธนาคารสำเร็จ')
      onClose()
    } catch (error: any) {
      console.error('Error saving bank info:', error)
      toast.error(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-gradient-to-r from-blue-50 to-cyan-50">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">แก้ไขข้อมูลบัญชีธนาคาร</h2>
            <p className="text-sm text-stone-600 mt-1">อัปเดตข้อมูลการโอนเงินของพนักงาน</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition"
            disabled={isSaving}
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Bank Name */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                ธนาคาร <span className="text-red-500">*</span>
              </div>
            </label>
            <select
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
              required
            >
              <option value="">เลือกธนาคาร</option>
              <option value="ธนาคารกสิกรไทย">ธนาคารกสิกรไทย</option>
              <option value="ธนาคารไทยพาณิชย์">ธนาคารไทยพาณิชย์</option>
              <option value="ธนาคารกรุงเทพ">ธนาคารกรุงเทพ</option>
              <option value="ธนาคารกรุงไทย">ธนาคารกรุงไทย</option>
              <option value="ธนาคารกรุงศรีอยุธยา">ธนาคารกรุงศรีอยุธยา</option>
              <option value="ธนาคารทหารไทยธนชาต">ธนาคารทหารไทยธนชาต</option>
              <option value="ธนาคารออมสิน">ธนาคารออมสิน</option>
              <option value="ธนาคารธนชาต">ธนาคารธนชาต</option>
              <option value="ธนาคารยูโอบี">ธนาคารยูโอบี</option>
              <option value="ธนาคารซีไอเอ็มบีไทย">ธนาคารซีไอเอ็มบีไทย</option>
            </select>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                ชื่อบัญชี <span className="text-red-500">*</span>
              </div>
            </label>
            <input
              type="text"
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              placeholder="ชื่อ-นามสกุลตามบัญชีธนาคาร"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
              required
            />
            <p className="text-xs text-stone-500 mt-1">กรอกชื่อตามบัตรประชาชนหรือทะเบียนบัญชี</p>
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                เลขที่บัญชี <span className="text-red-500">*</span>
              </div>
            </label>
            <input
              type="text"
              value={formData.account_number}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              placeholder="xxx-x-xxxxx-x"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
              required
            />
            <p className="text-xs text-stone-500 mt-1">กรอกเลขที่บัญชีธนาคาร 10-15 หลัก</p>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                สาขา <span className="text-red-500">*</span>
              </div>
            </label>
            <input
              type="text"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              placeholder="เช่น สาขาเซ็นทรัล ลาดพร้าว"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
              required
            />
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
            <div className="text-sm text-yellow-800">
              <p className="font-medium">⚠️ โปรดตรวจสอบความถูกต้อง</p>
              <p className="text-yellow-700 mt-1">
                กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนบันทึก เพื่อความถูกต้องในการโอนเงิน
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 bg-stone-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-100 transition"
            disabled={isSaving}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                กำลังบันทึก...
              </>
            ) : (
              <>บันทึกข้อมูล</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
