import { useState, useEffect, useRef } from 'react'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Edit,
  Check,
  X,
  Plus,
  Trash2,
  Star,
  Building2,
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Upload,
  Eye,
  Lock,
  ChevronRight,
  Map,
  CircleDot,
  Shield,
  Download,
  Sparkles,
  Hand,
  Flower2,
} from 'lucide-react'
import { useAuth, authService, liffService } from '@bliss/supabase/auth'
import {
  useStaffStats,
  useBankAccounts,
  THAI_BANKS,
  useDocuments,
  useServiceAreas,
  useStaffSkills,
  useProfileUpdate,
  useStaffEligibility,
  DOCUMENT_TYPES,
  THAI_PROVINCES,
  type DocumentType,
  type BankAccount,
} from '@bliss/supabase'

// Available skills for selection
const availableSkillsData = [
  { id: 'massage', name: 'นวด', icon: Sparkles },
  { id: 'nail', name: 'เล็บ', icon: Hand },
  { id: 'spa', name: 'สปา', icon: Flower2 },
]

function StaffProfile() {
  const { user } = useAuth()
  const { stats } = useStaffStats()
  const {
    accounts: bankAccounts,
    isLoading: isBankLoading,
    isSaving: isBankSaving,
    addAccount,
    updateAccount,
    deleteAccount,
    setPrimary,
  } = useBankAccounts()
  const { documents, isLoading: isDocsLoading, isUploading, uploadDocument, deleteDocument } = useDocuments()
  const { areas, isLoading: isAreasLoading, isSaving: isAreaSaving, addArea, deleteArea, toggleArea } = useServiceAreas()
  const {
    skills,
    availableSkills,
    isLoading: isSkillsLoading,
    isSaving: isSkillSaving,
    addSkill,
    deleteSkill,
  } = useStaffSkills()
  const { isSaving: isProfileSaving, updateProfile, updateStaffData, uploadAvatar, changePassword } = useProfileUpdate()
  const { eligibility, isLoading: isEligibilityLoading, refetch: refetchEligibility } = useStaffEligibility()

  const [isEditing, setIsEditing] = useState(false)
  const [showAddBank, setShowAddBank] = useState(false)
  const [editingBankId, setEditingBankId] = useState<string | null>(null)
  const [showAddDocument, setShowAddDocument] = useState(false)
  const [showAddArea, setShowAddArea] = useState(false)
  const [showAddSkill, setShowAddSkill] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // New bank account form
  const [newBank, setNewBank] = useState({
    bank_code: '',
    account_number: '',
    account_name: '',
    is_primary: false,
  })

  // New document form (match Admin app)
  const [newDocument, setNewDocument] = useState({
    type: 'id_card' as DocumentType,
    file: null as File | null,
    notes: '',
    expires_at: '',
  })

  // New service area form
  const [newArea, setNewArea] = useState({
    province: '',
    district: '',
    radius_km: 10,
  })

  // Selected skills for adding
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  // Profile form data
  const [profile, setProfile] = useState({
    name_th: '',
    name_en: '',
    email: user?.email || '',
    phone: '',
    id_card: '',
    address: '',
    bio_th: '',
    bio_en: '',
  })

  // Fetch staff data once on mount
  useEffect(() => {
    if (!user?.id) return

    // Fetch staff data from database
    const fetchStaffData = async () => {
      try {
        const { data, error } = await (await import('@bliss/supabase/auth')).supabase
          .from('staff')
          .select('name_th, name_en, phone, id_card, address, bio_th, bio_en')
          .eq('profile_id', user.id)
          .single()

        if (!error && data) {
          setProfile((prev) => ({
            ...prev,
            name_th: data.name_th || '',
            name_en: data.name_en || '',
            email: user.email || prev.email,
            phone: data.phone || '',
            id_card: data.id_card || '',
            address: data.address || '',
            bio_th: data.bio_th || '',
            bio_en: data.bio_en || '',
          }))
        }
      } catch (err) {
        console.error('Error fetching staff data:', err)
      }
    }
    fetchStaffData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleSave = async () => {
    try {
      setError(null)
      await updateStaffData({
        name_th: profile.name_th,
        name_en: profile.name_en,
        phone: profile.phone,
        id_card: profile.id_card,
        address: profile.address,
        bio_th: profile.bio_th,
        bio_en: profile.bio_en,
      })
      setSuccess('บันทึกข้อมูลเรียบร้อย')
      setIsEditing(false)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถบันทึกข้อมูลได้')
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setError(null)
      await uploadAvatar(file)
      setSuccess('อัปโหลดรูปภาพเรียบร้อย')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถอัปโหลดรูปภาพได้')
    }
  }

  const handleAddBankAccount = async () => {
    if (!newBank.bank_code || !newBank.account_number || !newBank.account_name) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    const bank = THAI_BANKS.find((b) => b.code === newBank.bank_code)
    if (!bank) {
      setError('กรุณาเลือกธนาคาร')
      return
    }

    try {
      if (editingBankId) {
        // Update existing account
        await updateAccount(editingBankId, {
          bank_code: newBank.bank_code,
          bank_name: bank.name,
          account_number: newBank.account_number,
          account_name: newBank.account_name,
        })
        setSuccess('แก้ไขบัญชีเรียบร้อย')
      } else {
        // Add new account
        await addAccount(
          newBank.bank_code,
          bank.name,
          newBank.account_number,
          newBank.account_name,
          newBank.is_primary || bankAccounts.length === 0
        )
        setSuccess('เพิ่มบัญชีเรียบร้อย')
      }
      setShowAddBank(false)
      setEditingBankId(null)
      setNewBank({ bank_code: '', account_number: '', account_name: '', is_primary: false })
      setError(null)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || (editingBankId ? 'ไม่สามารถแก้ไขบัญชีได้' : 'ไม่สามารถเพิ่มบัญชีได้'))
    }
  }

  const handleAddDocument = async () => {
    if (!newDocument.file) {
      setError('กรุณาเลือกไฟล์')
      return
    }

    // Validate file size (max 10MB)
    if (newDocument.file.size > 10 * 1024 * 1024) {
      setError('ไฟล์มีขนาดใหญ่เกิน 10MB')
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(newDocument.file.type)) {
      setError('รองรับเฉพาะไฟล์ JPG, PNG, และ PDF เท่านั้น')
      return
    }

    try {
      await uploadDocument(
        newDocument.type,
        newDocument.file,
        newDocument.notes || undefined,
        newDocument.expires_at || undefined
      )
      setShowAddDocument(false)
      setNewDocument({ type: 'id_card', file: null, notes: '', expires_at: '' })
      setSuccess('อัปโหลดเอกสารเรียบร้อย')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถอัปโหลดเอกสารได้')
    }
  }

  const handleAddServiceArea = async () => {
    if (!newArea.province) {
      setError('กรุณาเลือกจังหวัด')
      return
    }

    try {
      await addArea({
        province: newArea.province,
        district: newArea.district || undefined,
        radius_km: newArea.radius_km,
      })
      setShowAddArea(false)
      setNewArea({ province: '', district: '', radius_km: 10 })
      setSuccess('เพิ่มพื้นที่บริการเรียบร้อย')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถเพิ่มพื้นที่บริการได้')
    }
  }

  const handleAddSkills = async () => {
    if (selectedSkills.length === 0) {
      setError('กรุณาเลือกทักษะอย่างน้อย 1 ทักษะ')
      return
    }

    try {
      // Add all selected skills
      for (const skillId of selectedSkills) {
        await addSkill(skillId, 'intermediate', undefined)
      }
      setShowAddSkill(false)
      setSelectedSkills([])
      setSuccess('เพิ่มทักษะเรียบร้อย')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถเพิ่มทักษะได้')
    }
  }

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    )
  }


  const handleChangePassword = async () => {
    if (passwordForm.newPassword.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน')
      return
    }

    try {
      await changePassword(passwordForm.newPassword)
      setShowChangePassword(false)
      setPasswordForm({ newPassword: '', confirmPassword: '' })
      setSuccess('เปลี่ยนรหัสผ่านเรียบร้อย')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้')
    }
  }


  const handleDelete = async () => {
    if (!deleteConfirm) return

    try {
      if (deleteConfirm.type === 'bank') {
        await deleteAccount(deleteConfirm.id)
      } else if (deleteConfirm.type === 'document') {
        await deleteDocument(deleteConfirm.id)
      } else if (deleteConfirm.type === 'area') {
        await deleteArea(deleteConfirm.id)
      } else if (deleteConfirm.type === 'skill') {
        await deleteSkill(deleteConfirm.id)
      }
      setDeleteConfirm(null)
      if (deleteConfirm.type === 'skill') {
        setSuccess('ลบทักษะเรียบร้อย')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถลบได้')
    }
  }


  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">ยืนยันแล้ว</span>
      case 'rejected':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">ถูกปฏิเสธ</span>
      case 'reviewing':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">กำลังตรวจสอบ</span>
      case 'pending':
      default:
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">รอตรวจสอบ</span>
    }
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-stone-900">โปรไฟล์</h1>
        <p className="text-stone-500 text-sm">Profile</p>
      </div>

      {/* Error/Success Message */}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-700 to-amber-800 p-6 text-white">
          <div className="flex flex-col items-center">
            <div className="relative">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name || 'Profile'} className="w-24 h-24 rounded-full border-4 border-white/30 object-cover mb-2" />
              ) : (
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl font-bold mb-2">
                  {(user?.full_name || 'S').charAt(0)}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg"
              >
                <Camera className="w-4 h-4 text-stone-600" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>
            <h2 className="text-xl font-bold">{user?.full_name || 'Staff'}</h2>
            <p className="text-sm opacity-90">
              {user?.email?.startsWith('line_') && user?.email?.endsWith('@line.local')
                ? 'เข้าสู่ระบบด้วย LINE'
                : user?.email}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-yellow-300">★</span>
              <span className="font-semibold">{stats?.average_rating?.toFixed(1) || '0.0'}</span>
              <span className="text-sm opacity-80">({stats?.rating_count || 0} รีวิว)</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 py-4 border-b border-stone-100">
            <div className="text-center">
              <p className="text-xl font-bold text-stone-900">{stats?.total_jobs || 0}</p>
              <p className="text-xs text-stone-500">งานที่ทำ</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-green-600">฿{((stats?.total_earnings || 0) / 1000).toFixed(0)}k</p>
              <p className="text-xs text-stone-500">รายได้รวม</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-amber-600">{stats?.average_rating?.toFixed(1) || '0.0'}</p>
              <p className="text-xs text-stone-500">คะแนน</p>
            </div>
          </div>

          {/* Eligibility Status Dashboard */}
          {!isEligibilityLoading && eligibility && (
            <div className={`p-4 rounded-xl border-2 ${
              eligibility.canWork
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  eligibility.canWork
                    ? 'bg-green-100'
                    : 'bg-amber-100'
                }`}>
                  {eligibility.canWork ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold text-sm ${
                    eligibility.canWork
                      ? 'text-green-900'
                      : 'text-amber-900'
                  }`}>
                    {eligibility.canWork
                      ? '✓ พร้อมรับงาน'
                      : 'ยังไม่พร้อมรับงาน'}
                  </h4>
                  {eligibility.reasons.length > 0 && (
                    <ul className={`mt-2 space-y-1 text-xs ${
                      eligibility.canWork
                        ? 'text-green-700'
                        : 'text-amber-700'
                    }`}>
                      {eligibility.reasons.map((reason, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="mt-0.5">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Document Status */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <FileText className="w-3.5 h-3.5" />
                      <span>บัตรประชาชน:</span>
                      {eligibility.documents.id_card.verified ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      ) : eligibility.documents.id_card.uploaded ? (
                        <span className="text-amber-600">รอตรวจ</span>
                      ) : (
                        <X className="w-3.5 h-3.5 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>บัญชีธนาคาร:</span>
                      {eligibility.documents.bank_statement.verified ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      ) : eligibility.documents.bank_statement.uploaded ? (
                        <span className="text-amber-600">รอตรวจ</span>
                      ) : (
                        <X className="w-3.5 h-3.5 text-red-600" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Personal Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-stone-900">ข้อมูลส่วนตัว</h3>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="p-2 bg-white rounded-lg shadow-sm border border-stone-200">
                  <Edit className="w-5 h-5 text-stone-600" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="p-2 bg-stone-100 rounded-lg">
                    <X className="w-5 h-5 text-stone-600" />
                  </button>
                  <button onClick={handleSave} disabled={isProfileSaving} className="p-2 bg-amber-700 rounded-lg disabled:opacity-50">
                    {isProfileSaving ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Check className="w-5 h-5 text-white" />}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-stone-400" />
              <div className="flex-1">
                <p className="text-xs text-stone-500">ชื่อ (ภาษาไทย) *</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.name_th}
                    onChange={(e) => setProfile({ ...profile, name_th: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    placeholder="เช่น สมหญิง นวดเก่ง"
                  />
                ) : (
                  <p className="text-sm font-medium text-stone-900">{profile.name_th || '-'}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-stone-400" />
              <div className="flex-1">
                <p className="text-xs text-stone-500">ชื่อ (ภาษาอังกฤษ)</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.name_en}
                    onChange={(e) => setProfile({ ...profile, name_en: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    placeholder="เช่น Somying Massage"
                  />
                ) : (
                  <p className="text-sm font-medium text-stone-900">{profile.name_en || '-'}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-stone-400" />
              <div className="flex-1">
                <p className="text-xs text-stone-500">บัญชี LINE</p>
                <p className="text-sm font-medium text-green-600 flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 5.64 2 10.14c0 4.08 3.6 7.49 8.47 8.14.33.07.78.21.89.49.1.25.07.64.03.89l-.14.85c-.04.26-.2 1.02.89.56.09-.04.18-.08.27-.12 3.66-1.88 6.59-4.54 6.59-8.81C19 5.64 15.52 2 12 2zm4.24 10.15l-.98.02c-.18 0-.33-.15-.33-.33v-2.5c0-.18.15-.33.33-.33h.98c.18 0 .33.15.33.33v2.5c0 .18-.15.33-.33.33zm-2.5 0h-.98c-.18 0-.33-.15-.33-.33v-2.5c0-.18.15-.33.33-.33h.98c.18 0 .33.15.33.33v2.5c0 .18-.15.33-.33.33zm-2.5 0H8.76c-.18 0-.33-.15-.33-.33V9.34c0-.18.15-.33.33-.33h2.48c.18 0 .33.15.33.33v2.48c0 .18-.15.33-.33.33z"/>
                  </svg>
                  {user?.line_display_name || user?.full_name || 'เชื่อมต่อแล้ว'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-stone-400" />
              <div className="flex-1">
                <p className="text-xs text-stone-500">เบอร์โทรศัพท์ *</p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    placeholder="เช่น 081-234-5678"
                  />
                ) : (
                  <p className="text-sm font-medium text-stone-900">{profile.phone || '-'}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-stone-400" />
              <div className="flex-1">
                <p className="text-xs text-stone-500">เลขบัตรประชาชน</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.id_card}
                    onChange={(e) => setProfile({ ...profile, id_card: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    placeholder="เช่น 1234567890123"
                  />
                ) : (
                  <p className="text-sm font-medium text-stone-900">{profile.id_card || '-'}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-stone-400 mt-1" />
              <div className="flex-1">
                <p className="text-xs text-stone-500">ที่อยู่</p>
                {isEditing ? (
                  <textarea
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    placeholder="กรอกที่อยู่..."
                  />
                ) : (
                  <p className="text-sm font-medium text-stone-900">{profile.address || '-'}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-stone-400 mt-1" />
              <div className="flex-1">
                <p className="text-xs text-stone-500">ข้อมูลเพิ่มเติม (ภาษาไทย)</p>
                {isEditing ? (
                  <textarea
                    value={profile.bio_th}
                    onChange={(e) => setProfile({ ...profile, bio_th: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    placeholder="เช่น มีประสบการณ์นวดมา 5 ปี เชี่ยวชาญการนวดแผนไทย"
                  />
                ) : (
                  <p className="text-sm font-medium text-stone-900">{profile.bio_th || '-'}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-stone-400 mt-1" />
              <div className="flex-1">
                <p className="text-xs text-stone-500">ข้อมูลเพิ่มเติม (ภาษาอังกฤษ)</p>
                {isEditing ? (
                  <textarea
                    value={profile.bio_en}
                    onChange={(e) => setProfile({ ...profile, bio_en: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. 5 years experience in Thai massage therapy"
                  />
                ) : (
                  <p className="text-sm font-medium text-stone-900">{profile.bio_en || '-'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-stone-600" />
            <h3 className="font-semibold text-stone-900">ทักษะ / บริการที่ทำได้</h3>
          </div>
          <button
            onClick={() => setShowAddSkill(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            เพิ่มทักษะ
          </button>
        </div>

        {isSkillsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-8">
            <Star className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500">ยังไม่มีทักษะ</p>
            <p className="text-xs text-stone-400">เพิ่มทักษะเพื่อให้ลูกค้าเห็นความสามารถของคุณ</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => {
              const skillData = availableSkillsData.find(s => s.id === skill.skill_id)
              const Icon = skillData?.icon || Star
              return (
                <div key={skill.id} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 rounded-full text-sm font-medium border border-amber-200">
                  <Icon className="w-4 h-4" />
                  <span>{skill.skill?.name_th || 'Unknown'}</span>
                  <button
                    onClick={() => setDeleteConfirm({ type: 'skill', id: skill.skill_id })}
                    className="ml-1 p-0.5 hover:bg-amber-200 rounded-full transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-stone-600" />
            <h3 className="font-semibold text-stone-900">เอกสาร KYC</h3>
          </div>
          <button
            onClick={() => setShowAddDocument(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
          >
            <Plus className="w-4 h-4" />
            เพิ่มเอกสาร
          </button>
        </div>

        {/* Stats Summary */}
        {documents.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            <div className="bg-stone-50 rounded-lg p-2">
              <p className="text-xl font-bold text-stone-900">{documents.length}</p>
              <p className="text-xs text-stone-500">ทั้งหมด</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-2">
              <p className="text-xl font-bold text-yellow-900">
                {documents.filter(d => d.status === 'pending').length}
              </p>
              <p className="text-xs text-yellow-600">รอตรวจสอบ</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-xl font-bold text-blue-900">
                {documents.filter(d => d.status === 'reviewing').length}
              </p>
              <p className="text-xs text-blue-600">กำลังตรวจ</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2">
              <p className="text-xl font-bold text-green-900">
                {documents.filter(d => d.status === 'approved').length}
              </p>
              <p className="text-xs text-green-600">อนุมัติแล้ว</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2">
              <p className="text-xl font-bold text-red-900">
                {documents.filter(d => d.status === 'rejected').length}
              </p>
              <p className="text-xs text-red-600">ปฏิเสธ</p>
            </div>
          </div>
        )}

        {isDocsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 bg-stone-50 rounded-xl">
            <FileText className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500">ยังไม่มีเอกสาร</p>
            <p className="text-xs text-stone-400">อัปโหลดเอกสารเพื่อยืนยันตัวตน</p>
            <button
              onClick={() => setShowAddDocument(true)}
              className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm"
            >
              เพิ่มเอกสารแรก
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((doc) => (
              <div key={doc.id} className="border border-stone-200 rounded-xl p-3 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-stone-900 text-sm">{DOCUMENT_TYPES[doc.document_type]?.th}</p>
                      <p className="text-xs text-stone-500">{doc.file_name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {new Date(doc.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  {getDocumentStatusBadge(doc.verification_status)}
                </div>

                {/* Rejection Reason */}
                {doc.verification_status === 'rejected' && doc.rejection_reason && (
                  <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">
                      <strong>เหตุผล:</strong> {doc.rejection_reason}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {doc.notes && (
                  <div className="mb-2 p-2 bg-stone-50 rounded-lg">
                    <p className="text-xs text-stone-600">
                      <strong>หมายเหตุ:</strong> {doc.notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-1.5">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-2 py-1.5 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition text-xs flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    ดู
                  </a>
                  <a
                    href={doc.file_url}
                    download
                    className="flex-1 px-2 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-xs flex items-center justify-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    ดาวน์โหลด
                  </a>
                  {doc.verification_status !== 'verified' && (
                    <button
                      onClick={() => setDeleteConfirm({ type: 'document', id: doc.id })}
                      className="px-2 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-xs"
                      title="ลบ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bank Accounts Section */}
      <div id="bank" className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900">บัญชีรับเงิน</h2>
            <p className="text-sm text-stone-500">Bank Accounts</p>
          </div>
          {bankAccounts.length === 0 && (
            <button
              onClick={() => setShowAddBank(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition"
            >
              <Plus className="w-4 h-4" />
              เพิ่มบัญชี
            </button>
          )}
        </div>

        {isBankLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
          </div>
        ) : bankAccounts.length === 0 ? (
          <div className="text-center py-8 text-stone-500">
            <CreditCard className="w-12 h-12 mx-auto mb-3 text-stone-300" />
            <p className="text-sm">ยังไม่มีบัญชีรับเงิน</p>
            <p className="text-xs text-stone-400 mt-1">กดปุ่ม "เพิ่มบัญชี" เพื่อเพิ่มบัญชีธนาคาร</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bankAccounts.map((account) => {
              const bank = THAI_BANKS.find((b) => b.code === account.bank_code)
              return (
                <div
                  key={account.id}
                  className="flex items-center gap-3 p-4 border border-stone-200 rounded-xl hover:border-stone-300 transition"
                >
                  <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-stone-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900 truncate mb-1">{bank?.name || account.bank_code}</p>
                    <p className="text-sm text-stone-600 font-mono">{account.account_number}</p>
                    <p className="text-xs text-stone-500 truncate">{account.account_name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditingBankId(account.id)
                        setNewBank({
                          bank_code: account.bank_code,
                          account_number: account.account_number,
                          account_name: account.account_name,
                          is_primary: account.is_primary,
                        })
                        setShowAddBank(true)
                      }}
                      disabled={isBankSaving}
                      className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition text-xs disabled:opacity-50"
                      title="แก้ไข"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: 'bank', id: account.id })}
                      disabled={isBankSaving}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-xs disabled:opacity-50"
                      title="ลบ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Bank Account Modal */}
      {showAddBank && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg text-stone-900">
                {editingBankId ? 'แก้ไขบัญชีธนาคาร' : 'เพิ่มบัญชีธนาคาร'}
              </h3>
              <button
                onClick={() => {
                  setShowAddBank(false)
                  setEditingBankId(null)
                  setNewBank({ bank_code: '', account_number: '', account_name: '', is_primary: false })
                }}
                className="p-2 hover:bg-stone-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-stone-600" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">ธนาคาร</label>
                <select
                  value={newBank.bank_code}
                  onChange={(e) => setNewBank({ ...newBank, bank_code: e.target.value })}
                  className="w-full px-3 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">เลือกธนาคาร</option>
                  {THAI_BANKS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">เลขที่บัญชี</label>
                <input
                  type="text"
                  value={newBank.account_number}
                  onChange={(e) => setNewBank({ ...newBank, account_number: e.target.value })}
                  placeholder="xxx-x-xxxxx-x"
                  className="w-full px-3 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">ชื่อบัญชี</label>
                <input
                  type="text"
                  value={newBank.account_name}
                  onChange={(e) => setNewBank({ ...newBank, account_name: e.target.value })}
                  placeholder="ชื่อ-นามสกุล ตามบัญชี"
                  className="w-full px-3 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                onClick={handleAddBankAccount}
                disabled={isBankSaving}
                className="w-full py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition disabled:opacity-50"
              >
                {isBankSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : editingBankId ? (
                  'บันทึกการแก้ไข'
                ) : (
                  'เพิ่มบัญชี'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {showAddDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 pb-20">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[75vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-lg text-stone-900">อัปโหลดเอกสาร</h3>
              <button onClick={() => setShowAddDocument(false)} className="p-2 hover:bg-stone-100 rounded-lg transition">
                <X className="w-5 h-5 text-stone-600" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  ประเภทเอกสาร <span className="text-red-500">*</span>
                </label>
                <select
                  value={newDocument.type}
                  onChange={(e) => setNewDocument({ ...newDocument, type: e.target.value as DocumentType })}
                  className="w-full px-3 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                >
                  {Object.entries(DOCUMENT_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.th}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  ไฟล์เอกสาร <span className="text-red-500">*</span>
                </label>
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-300 rounded-xl cursor-pointer hover:border-amber-500 transition">
                  {newDocument.file ? (
                    <div className="text-center">
                      <FileText className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                      <p className="text-sm text-stone-700">{newDocument.file.name}</p>
                      <p className="text-xs text-stone-500">{(newDocument.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          setNewDocument({ ...newDocument, file: null })
                        }}
                        className="mt-2 text-xs text-red-600 hover:text-red-700"
                      >
                        ลบไฟล์
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                      <p className="text-sm text-stone-600">คลิกเพื่อเลือกไฟล์</p>
                      <p className="text-xs text-stone-400">รองรับ JPG, PNG, PDF (ขนาดไม่เกิน 10MB)</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/jpg,image/png,application/pdf"
                    onChange={(e) => setNewDocument({ ...newDocument, file: e.target.files?.[0] || null })}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">หมายเหตุ (ถ้ามี)</label>
                <textarea
                  value={newDocument.notes}
                  onChange={(e) => setNewDocument({ ...newDocument, notes: e.target.value })}
                  placeholder="ระบุรายละเอียดเพิ่มเติม..."
                  className="w-full px-3 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">วันหมดอายุ (ถ้ามี)</label>
                <input
                  type="date"
                  value={newDocument.expires_at}
                  onChange={(e) => setNewDocument({ ...newDocument, expires_at: e.target.value })}
                  className="w-full px-3 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-xs text-stone-500 mt-1">
                  สำหรับเอกสารที่มีวันหมดอายุ เช่น ใบประกอบวิชาชีพ
                </p>
              </div>
            </div>

            {/* Fixed Footer with Button */}
            <div className="p-4 border-t flex-shrink-0">
              <button
                onClick={handleAddDocument}
                disabled={isUploading}
                className="w-full py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'อัปโหลด'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Service Area Modal */}
      {showAddArea && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg text-stone-900">เพิ่มพื้นที่บริการ</h3>
              <button onClick={() => setShowAddArea(false)} className="p-2 hover:bg-stone-100 rounded-lg transition">
                <X className="w-5 h-5 text-stone-600" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">จังหวัด</label>
                <select
                  value={newArea.province}
                  onChange={(e) => setNewArea({ ...newArea, province: e.target.value })}
                  className="w-full px-3 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">เลือกจังหวัด</option>
                  {THAI_PROVINCES.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">เขต/อำเภอ (ไม่บังคับ)</label>
                <input
                  type="text"
                  value={newArea.district}
                  onChange={(e) => setNewArea({ ...newArea, district: e.target.value })}
                  placeholder="เช่น บางรัก, เมือง"
                  className="w-full px-3 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">รัศมีบริการ (กม.)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={newArea.radius_km}
                    onChange={(e) => setNewArea({ ...newArea, radius_km: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="w-16 text-center text-sm font-medium text-stone-900">{newArea.radius_km} กม.</span>
                </div>
              </div>
              <button
                onClick={handleAddServiceArea}
                disabled={isAreaSaving}
                className="w-full py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition disabled:opacity-50"
              >
                {isAreaSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'เพิ่มพื้นที่'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg text-stone-900">เปลี่ยนรหัสผ่าน</h3>
              <button onClick={() => setShowChangePassword(false)} className="p-2 hover:bg-stone-100 rounded-lg transition">
                <X className="w-5 h-5 text-stone-600" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">รหัสผ่านใหม่</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="w-full px-3 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  className="w-full px-3 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={isProfileSaving}
                className="w-full py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition disabled:opacity-50"
              >
                {isProfileSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'เปลี่ยนรหัสผ่าน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Skill Modal */}
      {showAddSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowAddSkill(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div className="px-4 py-3 border-b flex items-center justify-between bg-white rounded-t-2xl" style={{ flexShrink: 0 }}>
              <h3 className="font-semibold text-base text-stone-900">เพิ่มทักษะ</h3>
              <button onClick={() => setShowAddSkill(false)} className="p-1.5 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5 text-stone-600" />
              </button>
            </div>
            <div className="px-4 py-3 space-y-3" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-3">
                  ทักษะ/ความสามารถ
                </label>
                <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                  {availableSkills
                    .filter((skill) => !skills.find((s) => s.skill_id === skill.id))
                    .map((skill) => {
                      // Map skill name to icon
                      const skillData = availableSkillsData.find(
                        (s) => skill.name_th?.includes(s.name) || skill.name_en?.toLowerCase().includes(s.name.toLowerCase())
                      )
                      const Icon = skillData?.icon || Star
                      const isSelected = selectedSkills.includes(skill.id)
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => handleSkillToggle(skill.id)}
                          className={`flex flex-col items-center gap-2 px-3 py-3 rounded-xl font-medium transition relative ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-sm">{skill.name_th}</span>
                          {isSelected && <Check className="w-4 h-4 absolute top-1 right-1" />}
                        </button>
                      )
                    })}
                </div>
                {availableSkills.filter((skill) => !skills.find((s) => s.skill_id === skill.id)).length === 0 && (
                  <p className="text-sm text-stone-500 text-center py-4">คุณมีทักษะครบทุกด้านแล้ว</p>
                )}
              </div>
            </div>
            <div className="px-4 py-3 border-t bg-white rounded-b-2xl" style={{ flexShrink: 0 }}>
              <button
                onClick={handleAddSkills}
                disabled={isSkillSaving || selectedSkills.length === 0}
                className="w-full py-2.5 bg-amber-700 text-white rounded-lg font-medium text-sm shadow-lg hover:bg-amber-800 disabled:opacity-50"
              >
                {isSkillSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'เพิ่มทักษะ'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900 mb-2">ยืนยันการลบ</h3>
              <p className="text-sm text-stone-500 mb-6">
                {deleteConfirm.type === 'bank' && 'ต้องการลบบัญชีธนาคารนี้?'}
                {deleteConfirm.type === 'document' && 'ต้องการลบเอกสารนี้?'}
                {deleteConfirm.type === 'area' && 'ต้องการลบพื้นที่บริการนี้?'}
                {deleteConfirm.type === 'skill' && 'ต้องการลบทักษะนี้?'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium"
                >
                  ลบ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffProfile
