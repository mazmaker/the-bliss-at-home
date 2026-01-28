import { useState, useEffect } from 'react'
import {
  X,
  Plus,
  Phone,
  User,
  MapPin,
  FileText,
  MessageCircle,
  QrCode,
  Copy,
  ExternalLink,
  Sparkles,
  Hand,
  Flower2,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useCreateStaff, useGenerateLineInvite } from '../hooks/useStaff'
import { CreateStaffData } from '../services/staffService'
import { toast } from 'react-hot-toast'

interface AddStaffModalProps {
  isOpen: boolean
  onClose: () => void
}

const skills = [
  { id: 'massage', name: 'นวด', icon: Sparkles },
  { id: 'nail', name: 'เล็บ', icon: Hand },
  { id: 'spa', name: 'สปา', icon: Flower2 },
]

export default function AddStaffModal({ isOpen, onClose }: AddStaffModalProps) {
  const [currentStep, setCurrentStep] = useState<'form' | 'invite' | 'success'>('form')
  const [inviteData, setInviteData] = useState<any>(null)
  const [formData, setFormData] = useState<CreateStaffData>({
    name_th: '',
    name_en: '',
    phone: '',
    id_card: '',
    address: '',
    bio_th: '',
    bio_en: '',
    skills: [],
  })

  const createStaffMutation = useCreateStaff()
  const generateInviteMutation = useGenerateLineInvite()

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setCurrentStep('form')
      setFormData({
        name_th: '',
        name_en: '',
        phone: '',
        id_card: '',
        address: '',
        bio_th: '',
        bio_en: '',
        skills: [],
      })
      setInviteData(null)
    }
  }, [isOpen])

  const handleInputChange = (field: keyof CreateStaffData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSkillToggle = (skillId: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills?.includes(skillId)
        ? prev.skills.filter(id => id !== skillId)
        : [...(prev.skills || []), skillId]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name_th || !formData.phone) {
      toast.error('กรุณากรอกชื่อและเบอร์โทรศัพท์')
      return
    }

    try {
      // Generate LINE invitation
      const result = await generateInviteMutation.mutateAsync(formData)
      setInviteData(result)
      setCurrentStep('invite')
    } catch (error) {
      console.error('Failed to create staff:', error)
    }
  }

  const copyInviteLink = async () => {
    if (inviteData?.inviteLink) {
      try {
        await navigator.clipboard.writeText(inviteData.inviteLink)
        toast.success('คัดลอก Invite Link แล้ว')
      } catch (err) {
        toast.error('ไม่สามารถคัดลอกได้')
      }
    }
  }

  const sendLineMessage = () => {
    if (inviteData?.inviteLink) {
      const lineMessage = `🎉 เชิญเข้าร่วมเป็นพนักงาน The Bliss at Home\n\n👤 ชื่อ: ${formData.name_th}\n📱 เบอร์: ${formData.phone}\n\nคลิกลิงก์เพื่อลงทะเบียน:\n${inviteData.inviteLink}`

      const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(lineMessage)}`
      window.open(lineUrl, '_blank')
    }
  }

  const handleComplete = () => {
    setCurrentStep('success')
    setTimeout(() => {
      onClose()
    }, 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <h2 className="text-xl font-bold text-stone-900">
            {currentStep === 'form' && '🆕 เพิ่มพนักงานใหม่'}
            {currentStep === 'invite' && '📩 ส่งคำเชิญ LINE'}
            {currentStep === 'success' && '✅ สำเร็จ!'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Step 1: Form */}
          {currentStep === 'form' && (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Thai Name */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    ชื่อ (ภาษาไทย) *
                  </label>
                  <input
                    type="text"
                    value={formData.name_th}
                    onChange={(e) => handleInputChange('name_th', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="เช่น สมหญิง นวดเก่ง"
                    required
                  />
                </div>

                {/* English Name */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    ชื่อ (ภาษาอังกฤษ)
                  </label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => handleInputChange('name_en', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="เช่น Somying Massage"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    เบอร์โทรศัพท์ *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="เช่น 081-234-5678"
                    required
                  />
                </div>

                {/* ID Card */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    เลขบัตรประชาชน
                  </label>
                  <input
                    type="text"
                    value={formData.id_card}
                    onChange={(e) => handleInputChange('id_card', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="เช่น 1234567890123"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  ที่อยู่
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="เช่น 123 ถนนสุขุมวิท แขวงคลองตัน เขตวัฒนา กรุงเทพฯ 10110"
                  rows={2}
                />
              </div>

              {/* Skills */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-3">
                  ทักษะ/ความสามารถ
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {skills.map((skill) => {
                    const Icon = skill.icon
                    const isSelected = formData.skills?.includes(skill.id)
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => handleSkillToggle(skill.id)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{skill.name}</span>
                        {isSelected && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Bio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    ข้อมูลเพิ่มเติม (ภาษาไทย)
                  </label>
                  <textarea
                    value={formData.bio_th}
                    onChange={(e) => handleInputChange('bio_th', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="เช่น มีประสบการณ์นวดมา 5 ปี เชี่ยวชาญการนวดแผนไทย"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    ข้อมูลเพิ่มเติม (ภาษาอังกฤษ)
                  </label>
                  <textarea
                    value={formData.bio_en}
                    onChange={(e) => handleInputChange('bio_en', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="e.g. 5 years experience in Thai massage therapy"
                    rows={3}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={generateInviteMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:from-green-700 hover:to-green-800 transition disabled:opacity-50"
                >
                  {generateInviteMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      กำลังสร้าง...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5" />
                      สร้าง LINE Invitation
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          )}

          {/* Step 2: LINE Invitation */}
          {currentStep === 'invite' && inviteData && (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-stone-900 mb-2">
                  สร้าง LINE Invitation สำเร็จ!
                </h3>
                <p className="text-stone-600">
                  ส่งลิงก์ด้านล่างให้ {formData.name_th} เพื่อลงทะเบียนเข้าระบบ
                </p>
              </div>

              {/* Staff Info */}
              <div className="bg-stone-50 rounded-xl p-4">
                <h4 className="font-semibold text-stone-900 mb-2">ข้อมูลพนักงาน</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>ชื่อ:</strong> {formData.name_th}</p>
                  <p><strong>โทรศัพท์:</strong> {formData.phone}</p>
                  <p><strong>ทักษะ:</strong> {formData.skills?.map(id =>
                    skills.find(s => s.id === id)?.name
                  ).join(', ') || 'ไม่ระบุ'}</p>
                </div>
              </div>

              {/* QR Code */}
              <div className="text-center">
                <div className="bg-white border border-stone-200 rounded-xl p-4 inline-block">
                  <img
                    src={inviteData.qrCode}
                    alt="QR Code for LINE invitation"
                    className="w-48 h-48 mx-auto"
                  />
                  <p className="text-xs text-stone-500 mt-2">สแกนเพื่อเข้าสู่ระบบ</p>
                </div>
              </div>

              {/* Invite Link */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Invitation Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inviteData.inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={copyInviteLink}
                    className="px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition"
                    title="คัดลอกลิงก์"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={sendLineMessage}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition"
                >
                  <MessageCircle className="w-5 h-5" />
                  ส่งข้อความ LINE
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleComplete}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition"
                  >
                    <Check className="w-4 h-4" />
                    เสร็จสิ้น
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition"
                  >
                    ปิด
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  วิธีการใช้งาน
                </h5>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>ส่ง QR Code หรือลิงก์ให้พนักงาน</li>
                  <li>พนักงานสแกน QR Code หรือคลิกลิงก์</li>
                  <li>ระบบจะเปิด LINE และนำไปสู่ Staff App</li>
                  <li>พนักงานลงทะเบียนและยืนยันตัวตน</li>
                  <li>Admin อนุมัติการลงทะเบียน</li>
                  <li>พนักงานเริ่มรับงานได้</li>
                </ol>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {currentStep === 'success' && (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900 mb-2">
                เพิ่มพนักงานสำเร็จ!
              </h3>
              <p className="text-stone-600">
                พนักงานใหม่ได้รับคำเชิญแล้ว รอการยืนยันตัวตน
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}