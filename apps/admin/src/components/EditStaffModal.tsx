import { useState, useEffect } from 'react'
import {
  X,
  Phone,
  User,
  MapPin,
  FileText,
  Sparkles,
  Hand,
  Flower2,
  Check,
  Loader2,
} from 'lucide-react'
import { useUpdateStaff } from '../hooks/useStaff'
import { CreateStaffData, Staff } from '../services/staffService'
import { toast } from 'react-hot-toast'

interface EditStaffModalProps {
  isOpen: boolean
  onClose: () => void
  staff: Staff
}

const skills = [
  { id: 'massage', name: 'นวด', icon: Sparkles },
  { id: 'nail', name: 'เล็บ', icon: Hand },
  { id: 'spa', name: 'สปา', icon: Flower2 },
]

export default function EditStaffModal({ isOpen, onClose, staff }: EditStaffModalProps) {
  const [formData, setFormData] = useState<Partial<CreateStaffData>>({
    name_th: staff.name_th,
    name_en: staff.name_en || '',
    phone: staff.phone,
    id_card: staff.id_card || '',
    address: staff.address || '',
    bio_th: staff.bio_th || '',
    bio_en: staff.bio_en || '',
    skills: staff.skills?.map(s => s.skill_id) || [],
  })

  const updateStaffMutation = useUpdateStaff()

  useEffect(() => {
    if (isOpen) {
      // Reset form data when modal opens
      setFormData({
        name_th: staff.name_th,
        name_en: staff.name_en || '',
        phone: staff.phone,
        id_card: staff.id_card || '',
        address: staff.address || '',
        bio_th: staff.bio_th || '',
        bio_en: staff.bio_en || '',
        skills: staff.skills?.map(s => s.skill_id) || [],
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
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <h2 className="text-xl font-bold text-stone-900">
            ✏️ แก้ไขข้อมูลพนักงาน
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
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
                disabled={updateStaffMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl font-medium hover:from-amber-700 hover:to-amber-800 transition disabled:opacity-50"
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
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
