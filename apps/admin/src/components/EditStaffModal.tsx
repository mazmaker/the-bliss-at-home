import { useState, useEffect } from 'react'
import {
  X,
  Pencil,
  Phone,
  User,
  MapPin,
  FileText,
  Sparkles,
  Hand,
  Flower2,
  Check,
  Loader2,
  Star,
  ShieldAlert,
} from 'lucide-react'
import { useUpdateStaff } from '../hooks/useStaff'
import { CreateStaffData, Staff } from '../services/staffService'
import { toast } from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
interface EditStaffModalProps {
  isOpen: boolean
  onClose: () => void
  staff: Staff
}

// Emergency contact relationship options
const EMERGENCY_CONTACT_RELATIONSHIPS = [
  { value: 'father', label: 'บิดา' },
  { value: 'mother', label: 'มารดา' },
  { value: 'spouse', label: 'คู่สมรส' },
  { value: 'sibling', label: 'พี่/น้อง' },
  { value: 'child', label: 'บุตร' },
  { value: 'relative', label: 'ญาติ' },
  { value: 'friend', label: 'เพื่อน' },
  { value: 'other', label: 'อื่นๆ' },
] as const

// Icon mapping for skills
const skillIconMap = [
  { name: 'นวด', icon: Sparkles },
  { name: 'เล็บ', icon: Hand },
  { name: 'สปา', icon: Flower2 },
]

export default function EditStaffModal({ isOpen, onClose, staff }: EditStaffModalProps) {
  const [formData, setFormData] = useState<Partial<CreateStaffData> & { emergency_contact_name?: string; emergency_contact_phone?: string; emergency_contact_relationship?: string }>({
    name_th: staff.name_th,
    name_en: staff.name_en || '',
    phone: staff.phone,
    id_card: staff.id_card || '',
    address: staff.address || '',
    gender: staff.gender || undefined,
    bio_th: staff.bio_th || '',
    bio_en: staff.bio_en || '',
    skills: staff.skills?.map(s => s.skill_id) || [],
    emergency_contact_name: (staff as any).emergency_contact_name || '',
    emergency_contact_phone: (staff as any).emergency_contact_phone || '',
    emergency_contact_relationship: (staff as any).emergency_contact_relationship || '',
  })

  const updateStaffMutation = useUpdateStaff()

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
    if (isOpen) {
      // Reset form data when modal opens
      setFormData({
        name_th: staff.name_th,
        name_en: staff.name_en || '',
        phone: staff.phone,
        id_card: staff.id_card || '',
        address: staff.address || '',
        gender: staff.gender || undefined,
        bio_th: staff.bio_th || '',
        bio_en: staff.bio_en || '',
        skills: staff.skills?.map(s => s.skill_id) || [],
        emergency_contact_name: (staff as any).emergency_contact_name || '',
        emergency_contact_phone: (staff as any).emergency_contact_phone || '',
        emergency_contact_relationship: (staff as any).emergency_contact_relationship || '',
      })
    }
  }, [isOpen, staff])

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
      await updateStaffMutation.mutateAsync({
        id: staff.id,
        updates: formData
      })
      onClose()
    } catch (error) {
      console.error('Failed to update staff:', error)
    }
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
                <Pencil className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white leading-tight">
                  แก้ไขข้อมูลพนักงาน
                </h2>
                <p className="text-xs text-bliss-200">
                  อัปเดตข้อมูลของ {staff.name_th}
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

        {/* Form */}
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

            {/* ── Section: ผู้ติดต่อฉุกเฉิน ── */}
            <div className="rounded-xl border border-bliss-200 p-5">
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-bliss-100">
                <ShieldAlert className="w-5 h-5 text-bliss-600" />
                <h4 className="text-lg font-bold text-bliss-900">ผู้ติดต่อฉุกเฉิน</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bliss-700 mb-1.5">ชื่อ-นามสกุล</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                    className="w-full px-4 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-transparent"
                    placeholder="ชื่อบุคคลอ้างอิง"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bliss-700 mb-1.5">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                    className="w-full px-4 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-transparent"
                    placeholder="081-234-5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bliss-700 mb-1.5">ความสัมพันธ์</label>
                  <select
                    value={formData.emergency_contact_relationship}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_relationship: e.target.value }))}
                    className="w-full px-4 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-transparent"
                  >
                    <option value="">-- เลือก --</option>
                    {EMERGENCY_CONTACT_RELATIONSHIPS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
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
              disabled={updateStaffMutation.isPending}
              className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-bliss-600 to-bliss-700 text-white rounded-xl hover:from-bliss-700 hover:to-bliss-800 shadow-sm transition disabled:opacity-50"
            >
              {updateStaffMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  บันทึกการแก้ไข
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
