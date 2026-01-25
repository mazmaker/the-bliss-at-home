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
} from 'lucide-react'
import { useAuth } from '@bliss/supabase/auth'
import {
  useStaffStats,
  useBankAccounts,
  THAI_BANKS,
  useDocuments,
  useServiceAreas,
  useStaffSkills,
  useProfileUpdate,
  DOCUMENT_TYPES,
  THAI_PROVINCES,
  type DocumentType,
  type BankAccount,
} from '@bliss/supabase'

function StaffProfile() {
  const { user } = useAuth()
  const { stats } = useStaffStats()
  const {
    accounts: bankAccounts,
    isLoading: isBankLoading,
    isSaving: isBankSaving,
    addAccount,
    deleteAccount,
    setPrimary,
  } = useBankAccounts()
  const { documents, isLoading: isDocsLoading, isUploading, uploadDocument, deleteDocument } = useDocuments()
  const { areas, isLoading: isAreasLoading, isSaving: isAreaSaving, addArea, deleteArea, toggleArea } = useServiceAreas()
  const { skills, isLoading: isSkillsLoading } = useStaffSkills()
  const { isSaving: isProfileSaving, updateProfile, uploadAvatar, changePassword } = useProfileUpdate()

  const [isEditing, setIsEditing] = useState(false)
  const [showAddBank, setShowAddBank] = useState(false)
  const [showAddDocument, setShowAddDocument] = useState(false)
  const [showAddArea, setShowAddArea] = useState(false)
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

  // New document form
  const [newDocument, setNewDocument] = useState({
    type: 'id_card' as DocumentType,
    name: '',
    file: null as File | null,
  })

  // New service area form
  const [newArea, setNewArea] = useState({
    province: '',
    district: '',
    radius_km: 10,
  })

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  // Profile form data
  const [profile, setProfile] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: (user as any)?.address || '',
  })

  // Update profile when user changes
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: (user as any).address || '',
      })
    }
  }, [user])

  const handleSave = async () => {
    try {
      setError(null)
      await updateProfile({
        full_name: profile.name,
        phone: profile.phone,
        address: profile.address,
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
      await addAccount(
        newBank.bank_code,
        bank.name,
        newBank.account_number,
        newBank.account_name,
        newBank.is_primary || bankAccounts.length === 0
      )
      setShowAddBank(false)
      setNewBank({ bank_code: '', account_number: '', account_name: '', is_primary: false })
      setError(null)
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถเพิ่มบัญชีได้')
    }
  }

  const handleAddDocument = async () => {
    if (!newDocument.name || !newDocument.file) {
      setError('กรุณากรอกข้อมูลและเลือกไฟล์')
      return
    }

    try {
      await uploadDocument(newDocument.type, newDocument.name, newDocument.file)
      setShowAddDocument(false)
      setNewDocument({ type: 'id_card', name: '', file: null })
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
      }
      setDeleteConfirm(null)
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถลบได้')
    }
  }

  const renderSkillLevel = (level: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <div
            key={star}
            className={`w-6 h-1.5 rounded-full ${star <= level ? 'bg-amber-500' : 'bg-stone-200'}`}
          />
        ))}
      </div>
    )
  }

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">อนุมัติแล้ว</span>
      case 'rejected':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">ไม่อนุมัติ</span>
      case 'expired':
        return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">หมดอายุ</span>
      default:
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">รอตรวจสอบ</span>
    }
  }

  // Use mock skills if database skills not available
  const displaySkills = skills.length > 0 ? skills : [
    { id: '1', skill_id: '1', staff_id: '', skill_name: 'นวดไทย', skill_name_en: 'Thai Massage', level: 5, is_certified: true, created_at: '', updated_at: '' },
    { id: '2', skill_id: '2', staff_id: '', skill_name: 'นวดน้ำมัน', skill_name_en: 'Oil Massage', level: 4, is_certified: false, created_at: '', updated_at: '' },
    { id: '3', skill_id: '3', staff_id: '', skill_name: 'นวดเท้า', skill_name_en: 'Foot Massage', level: 5, is_certified: true, created_at: '', updated_at: '' },
  ]

  return (
    <div className="space-y-4 pb-4">
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">โปรไฟล์</h1>
          <p className="text-stone-500 text-sm">Profile</p>
        </div>
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

          {/* Personal Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-stone-900">ข้อมูลส่วนตัว</h3>

            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-stone-400" />
              <div className="flex-1">
                <p className="text-xs text-stone-500">ชื่อ-นามสกุล</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <p className="text-sm font-medium text-stone-900">{profile.name || '-'}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-stone-400" />
              <div className="flex-1">
                <p className="text-xs text-stone-500">อีเมล</p>
                <p className="text-sm font-medium text-stone-900">
                  {profile.email?.startsWith('line_') && profile.email?.endsWith('@line.local')
                    ? <span className="text-green-600">เชื่อมต่อกับ LINE ✓</span>
                    : (profile.email || '-')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-stone-400" />
              <div className="flex-1">
                <p className="text-xs text-stone-500">เบอร์โทรศัพท์</p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <p className="text-sm font-medium text-stone-900">{profile.phone || '-'}</p>
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
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <h3 className="font-semibold text-stone-900 mb-4">ทักษะ / บริการที่ทำได้</h3>
        {isSkillsLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : (
          <div className="space-y-3">
            {displaySkills.map((skill) => (
              <div key={skill.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-stone-900">{skill.skill_name}</p>
                    {skill.is_certified && <Shield className="w-4 h-4 text-green-500" />}
                  </div>
                  <p className="text-xs text-stone-500">{skill.skill_name_en}</p>
                </div>
                {renderSkillLevel(skill.level)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-stone-600" />
            <h3 className="font-semibold text-stone-900">เอกสาร</h3>
          </div>
          <button
            onClick={() => setShowAddDocument(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            อัปโหลด
          </button>
        </div>

        {isDocsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500">ยังไม่มีเอกสาร</p>
            <p className="text-xs text-stone-400">อัปโหลดเอกสารเพื่อยืนยันตัวตน</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="p-3 bg-stone-50 rounded-xl">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{doc.name}</p>
                      <p className="text-xs text-stone-500">{DOCUMENT_TYPES[doc.type]?.th}</p>
                      <div className="mt-1">{getDocumentStatusBadge(doc.status)}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-stone-200 rounded-lg">
                      <Eye className="w-4 h-4 text-stone-500" />
                    </a>
                    <button onClick={() => setDeleteConfirm({ type: 'document', id: doc.id })} className="p-2 hover:bg-red-100 rounded-lg">
                      <Trash2 className="w-4 h-4 text-stone-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service Areas Section */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-stone-600" />
            <h3 className="font-semibold text-stone-900">พื้นที่บริการ</h3>
          </div>
          <button
            onClick={() => setShowAddArea(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            เพิ่มพื้นที่
          </button>
        </div>

        {isAreasLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : areas.length === 0 ? (
          <div className="text-center py-8">
            <Map className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500">ยังไม่ได้ตั้งค่าพื้นที่บริการ</p>
            <p className="text-xs text-stone-400">เพิ่มพื้นที่เพื่อรับงานในบริเวณที่ต้องการ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {areas.map((area) => (
              <div key={area.id} className={`p-3 rounded-xl border-2 ${area.is_active ? 'border-green-200 bg-green-50' : 'border-stone-200 bg-stone-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${area.is_active ? 'bg-green-200' : 'bg-stone-200'}`}>
                      <MapPin className={`w-5 h-5 ${area.is_active ? 'text-green-700' : 'text-stone-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">
                        {area.province}
                        {area.district && ` - ${area.district}`}
                      </p>
                      <p className="text-xs text-stone-500">รัศมี {area.radius_km} กม.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleArea(area.id, !area.is_active)}
                      disabled={isAreaSaving}
                      className={`relative w-12 h-6 rounded-full transition ${area.is_active ? 'bg-green-500' : 'bg-stone-300'}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${area.is_active ? 'right-1' : 'left-1'}`}
                      />
                    </button>
                    <button onClick={() => setDeleteConfirm({ type: 'area', id: area.id })} className="p-2 hover:bg-red-100 rounded-lg">
                      <Trash2 className="w-4 h-4 text-stone-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bank Accounts Section */}
      <div id="bank" className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-stone-600" />
            <h3 className="font-semibold text-stone-900">บัญชีรับเงิน</h3>
          </div>
          <button
            onClick={() => setShowAddBank(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            เพิ่มบัญชี
          </button>
        </div>

        {isBankLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : bankAccounts.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500">ยังไม่มีบัญชีธนาคาร</p>
            <p className="text-xs text-stone-400">เพิ่มบัญชีเพื่อรับเงินจากการทำงาน</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bankAccounts.map((account) => (
              <div
                key={account.id}
                className={`p-4 rounded-xl border-2 ${account.is_primary ? 'border-amber-500 bg-amber-50' : 'border-stone-200 bg-stone-50'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${account.is_primary ? 'bg-amber-200' : 'bg-stone-200'}`}>
                      <Building2 className={`w-5 h-5 ${account.is_primary ? 'text-amber-700' : 'text-stone-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-stone-900">{account.bank_name}</p>
                        {account.is_primary && <span className="px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">หลัก</span>}
                        {account.is_verified && <CheckCircle className="w-4 h-4 text-green-500" />}
                      </div>
                      <p className="text-sm text-stone-600 font-mono">{account.account_number}</p>
                      <p className="text-xs text-stone-500">{account.account_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!account.is_primary && (
                      <button onClick={() => setPrimary(account.id)} disabled={isBankSaving} className="p-2 hover:bg-amber-100 rounded-lg transition">
                        <Star className="w-4 h-4 text-stone-400" />
                      </button>
                    )}
                    <button onClick={() => setDeleteConfirm({ type: 'bank', id: account.id })} className="p-2 hover:bg-red-100 rounded-lg transition">
                      <Trash2 className="w-4 h-4 text-stone-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <h3 className="font-semibold text-stone-900 mb-4">ความปลอดภัย</h3>
        <button
          onClick={() => setShowChangePassword(true)}
          className="w-full flex items-center justify-between p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-200 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-stone-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-stone-900">เปลี่ยนรหัสผ่าน</p>
              <p className="text-xs text-stone-500">อัปเดตรหัสผ่านเข้าใช้งาน</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400" />
        </button>
      </div>

      {/* Add Bank Account Modal */}
      {showAddBank && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg text-stone-900">เพิ่มบัญชีธนาคาร</h3>
              <button onClick={() => setShowAddBank(false)} className="p-2 hover:bg-stone-100 rounded-lg transition">
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
              {bankAccounts.length > 0 && (
                <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newBank.is_primary}
                    onChange={(e) => setNewBank({ ...newBank, is_primary: e.target.checked })}
                    className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm text-stone-700">ตั้งเป็นบัญชีหลัก</span>
                </label>
              )}
              <button
                onClick={handleAddBankAccount}
                disabled={isBankSaving}
                className="w-full py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition disabled:opacity-50"
              >
                {isBankSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'เพิ่มบัญชี'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {showAddDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg text-stone-900">อัปโหลดเอกสาร</h3>
              <button onClick={() => setShowAddDocument(false)} className="p-2 hover:bg-stone-100 rounded-lg transition">
                <X className="w-5 h-5 text-stone-600" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">ประเภทเอกสาร</label>
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
                <label className="block text-sm font-medium text-stone-700 mb-1">ชื่อเอกสาร</label>
                <input
                  type="text"
                  value={newDocument.name}
                  onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                  placeholder="เช่น บัตรประชาชน, ใบประกาศนียบัตร"
                  className="w-full px-3 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">ไฟล์เอกสาร</label>
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-300 rounded-xl cursor-pointer hover:border-amber-500 transition">
                  {newDocument.file ? (
                    <div className="text-center">
                      <FileText className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                      <p className="text-sm text-stone-700">{newDocument.file.name}</p>
                      <p className="text-xs text-stone-500">{(newDocument.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                      <p className="text-sm text-stone-600">คลิกเพื่อเลือกไฟล์</p>
                      <p className="text-xs text-stone-400">รองรับ PDF, JPG, PNG</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setNewDocument({ ...newDocument, file: e.target.files?.[0] || null })}
                    className="hidden"
                  />
                </label>
              </div>
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
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
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
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-lg">
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
