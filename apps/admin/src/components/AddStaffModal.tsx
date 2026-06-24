import { useState, useEffect } from 'react'
import {
  X,
  Plus,
  Phone,
  User,
  MapPin,
  FileText,
  MessageCircle,
  Copy,
  Sparkles,
  Hand,
  Flower2,
  Check,
  Loader2,
  AlertCircle,
  Star,
} from 'lucide-react'
import { useCreateStaff, useGenerateLineInvite } from '../hooks/useStaff'
import { CreateStaffData } from '../services/staffService'
import { toast } from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface AddStaffModalProps {
  isOpen: boolean
  onClose: () => void
}

// Icon mapping for skills
const skillIconMap = [
  { name: 'นวด', icon: Sparkles },
  { name: 'เล็บ', icon: Hand },
  { name: 'สปา', icon: Flower2 },
]

// Initial empty form data
const getEmptyFormData = (): CreateStaffData => ({
  name_th: '',
  name_en: '',
  phone: '',
  id_card: '',
  address: '',
  gender: undefined,
  bio_th: '',
  bio_en: '',
  skills: [],
})

export default function AddStaffModal({ isOpen, onClose }: AddStaffModalProps) {
  const [currentStep, setCurrentStep] = useState<'form' | 'invite' | 'success'>('form')
  const [inviteData, setInviteData] = useState<any>(null)
  const [formData, setFormData] = useState<CreateStaffData>(getEmptyFormData())

  const createStaffMutation = useCreateStaff()
  const generateInviteMutation = useGenerateLineInvite()

  // Fetch available skills from database
  const { data: availableSkills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('id, name_th, name_en')
        .order('name_th')

      if (error) throw error
      return data || []
    }
  })

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setCurrentStep('form')
      setFormData(getEmptyFormData())
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

  const handleComplete = () => {
    setCurrentStep('success')
    setTimeout(() => {
      onClose()
    }, 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-bliss-700 to-bliss-800 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                {currentStep === 'form' && <Plus className="w-5 h-5 text-white" />}
                {currentStep === 'invite' && <MessageCircle className="w-5 h-5 text-white" />}
                {currentStep === 'success' && <Check className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white leading-tight">
                  {currentStep === 'form' && 'เพิ่มพนักงานใหม่'}
                  {currentStep === 'invite' && 'ส่งคำเชิญ LINE'}
                  {currentStep === 'success' && 'สำเร็จ!'}
                </h2>
                <p className="text-xs text-bliss-200">
                  {currentStep === 'form' && 'กรอกข้อมูลพนักงานเพื่อสร้างคำเชิญ'}
                  {currentStep === 'invite' && 'ส่งลิงก์ให้พนักงานลงทะเบียน'}
                  {currentStep === 'success' && 'เพิ่มพนักงานเรียบร้อย'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Step 1: Form */}
        {currentStep === 'form' && (
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* ── Section: ข้อมูลส่วนตัว ── */}
              <div className="rounded-xl border border-bliss-200 p-5">
                <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-bliss-100">
                  <User className="w-5 h-5 text-bliss-600" />
                  <h4 className="text-lg font-bold text-bliss-900">ข้อมูลส่วนตัว</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Thai Name */}
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1.5">
                      <User className="w-4 h-4 inline mr-1" />
                      ชื่อ (ภาษาไทย) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name_th}
                      onChange={(e) => handleInputChange('name_th', e.target.value)}
                      className="w-full px-4 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-transparent"
                      placeholder="เช่น สมหญิง นวดเก่ง"
                      required
                    />
                  </div>

                  {/* English Name */}
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1.5">
                      <User className="w-4 h-4 inline mr-1" />
                      ชื่อ (ภาษาอังกฤษ)
                    </label>
                    <input
                      type="text"
                      value={formData.name_en}
                      onChange={(e) => handleInputChange('name_en', e.target.value)}
                      className="w-full px-4 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-transparent"
                      placeholder="เช่น Somying Massage"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1.5">
                      <Phone className="w-4 h-4 inline mr-1" />
                      เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-4 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-transparent"
                      placeholder="เช่น 081-234-5678"
                      required
                    />
                  </div>

                  {/* ID Card */}
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1.5">
                      <FileText className="w-4 h-4 inline mr-1" />
                      เลขบัตรประชาชน
                    </label>
                    <input
                      type="text"
                      value={formData.id_card}
                      onChange={(e) => handleInputChange('id_card', e.target.value)}
                      className="w-full px-4 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-transparent"
                      placeholder="เช่น 1234567890123"
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-bliss-700 mb-2">
                    เพศ
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
                      className={`flex-1 py-2.5 px-4 rounded-lg font-medium border-2 transition ${
                        formData.gender === 'female'
                          ? 'bg-bliss-50 text-bliss-700 border-bliss-500'
                          : 'bg-white text-bliss-600 border-bliss-200 hover:border-bliss-300'
                      }`}
                    >
                      หญิง
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
                      className={`flex-1 py-2.5 px-4 rounded-lg font-medium border-2 transition ${
                        formData.gender === 'male'
                          ? 'bg-bliss-50 text-bliss-700 border-bliss-500'
                          : 'bg-white text-bliss-600 border-bliss-200 hover:border-bliss-300'
                      }`}
                    >
                      ชาย
                    </button>
                  </div>
                </div>

                {/* Address */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-bliss-700 mb-1.5">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    ที่อยู่
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-4 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-transparent"
                    placeholder="เช่น 123 ถนนสุขุมวิท แขวงคลองตัน เขตวัฒนา กรุงเทพฯ 10110"
                    rows={2}
                  />
                </div>
              </div>

              {/* ── Section: ทักษะ/ความสามารถ ── */}
              <div className="rounded-xl border border-bliss-200 p-5">
                <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-bliss-100">
                  <Sparkles className="w-5 h-5 text-bliss-600" />
                  <h4 className="text-lg font-bold text-bliss-900">ทักษะ / ความสามารถ</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1">
                  {availableSkills.map((skill: any) => {
                    // Map skill name to icon
                    const skillIcon = skillIconMap.find(
                      (s) => skill.name_th?.includes(s.name) || skill.name_en?.toLowerCase().includes(s.name.toLowerCase())
                    )
                    const Icon = skillIcon?.icon || Star
                    const isSelected = formData.skills?.includes(skill.id)
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => handleSkillToggle(skill.id)}
                        className={`flex flex-col items-center gap-2 px-3 py-3 rounded-xl font-medium border-2 transition relative ${
                          isSelected
                            ? 'bg-bliss-50 text-bliss-700 border-bliss-500'
                            : 'bg-white text-bliss-600 border-bliss-200 hover:border-bliss-300'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-bliss-600' : 'text-bliss-400'}`} />
                        <span className="text-sm">{skill.name_th}</span>
                        {isSelected && <Check className="w-4 h-4 absolute top-1.5 right-1.5 text-bliss-600" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ── Section: ข้อมูลเพิ่มเติม ── */}
              <div className="rounded-xl border border-bliss-200 p-5">
                <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-bliss-100">
                  <FileText className="w-5 h-5 text-bliss-600" />
                  <h4 className="text-lg font-bold text-bliss-900">ข้อมูลเพิ่มเติม</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1.5">
                      ประวัติ / จุดเด่น (ภาษาไทย)
                    </label>
                    <textarea
                      value={formData.bio_th}
                      onChange={(e) => handleInputChange('bio_th', e.target.value)}
                      className="w-full px-4 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-transparent"
                      placeholder="เช่น มีประสบการณ์นวดมา 5 ปี เชี่ยวชาญการนวดแผนไทย"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1.5">
                      ประวัติ / จุดเด่น (ภาษาอังกฤษ)
                    </label>
                    <textarea
                      value={formData.bio_en}
                      onChange={(e) => handleInputChange('bio_en', e.target.value)}
                      className="w-full px-4 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-transparent"
                      placeholder="e.g. 5 years experience in Thai massage therapy"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="flex-shrink-0 flex justify-end gap-3 border-t border-bliss-200 bg-bliss-50 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-bliss-700 bg-white border border-bliss-300 rounded-xl hover:bg-bliss-100 transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={generateInviteMutation.isPending}
                className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-bliss-600 to-bliss-700 text-white rounded-xl hover:from-bliss-700 hover:to-bliss-800 shadow-sm transition disabled:opacity-50"
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
            </div>
          </form>
        )}

        {/* Step 2: LINE Invitation */}
        {currentStep === 'invite' && inviteData && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-bliss-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-bliss-600" />
              </div>
              <h3 className="text-lg font-semibold text-bliss-900 mb-2">
                สร้าง LINE Invitation สำเร็จ!
              </h3>
              <p className="text-bliss-600">
                ส่งลิงก์ด้านล่างให้ {formData.name_th} เพื่อลงทะเบียนเข้าระบบ
              </p>
            </div>

            {/* Staff Info */}
            <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-4">
              <h4 className="font-semibold text-bliss-900 mb-2">ข้อมูลพนักงาน</h4>
              <div className="space-y-1 text-sm text-bliss-700">
                <p><strong>ชื่อ:</strong> {formData.name_th}</p>
                <p><strong>โทรศัพท์:</strong> {formData.phone}</p>
                <p><strong>ทักษะ:</strong> {formData.skills?.map(id =>
                  availableSkills.find((s: any) => s.id === id)?.name_th
                ).filter(Boolean).join(', ') || 'ไม่ระบุ'}</p>
              </div>
            </div>

            {/* QR Code */}
            <div className="text-center">
              <div className="bg-white border border-bliss-200 rounded-xl p-4 inline-block">
                <img
                  src={inviteData.qrCode}
                  alt="QR Code for LINE invitation"
                  className="w-48 h-48 mx-auto"
                />
                <p className="text-xs text-bliss-500 mt-2">สแกนเพื่อเข้าสู่ระบบ</p>
              </div>
            </div>

            {/* Invite Link */}
            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                Invitation Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteData.inviteLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-bliss-50 border border-bliss-300 rounded-lg text-sm"
                />
                <button
                  onClick={copyInviteLink}
                  className="px-4 py-2 bg-bliss-600 text-white rounded-lg hover:bg-bliss-700 transition"
                  title="คัดลอกลิงก์"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleComplete}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-bliss-600 to-bliss-700 text-white rounded-xl font-medium hover:from-bliss-700 hover:to-bliss-800 transition"
              >
                <Check className="w-4 h-4" />
                เสร็จสิ้น
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 border border-bliss-300 text-bliss-700 rounded-xl font-medium hover:bg-bliss-50 transition"
              >
                ปิด
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-4">
              <h5 className="font-semibold text-bliss-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-bliss-600" />
                วิธีการใช้งาน
              </h5>
              <ol className="text-sm text-bliss-700 space-y-1 list-decimal list-inside">
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
          <div className="flex-1 overflow-y-auto p-10 text-center">
            <div className="w-16 h-16 bg-bliss-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-bliss-600" />
            </div>
            <h3 className="text-lg font-semibold text-bliss-900 mb-2">
              เพิ่มพนักงานสำเร็จ!
            </h3>
            <p className="text-bliss-600">
              พนักงานใหม่ได้รับคำเชิญแล้ว รอการยืนยันตัวตน
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
