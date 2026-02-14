import { useState, useEffect } from 'react'
import { X, Save, Plus, Pencil, Trash2, Star, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { Customer, CustomerStatus, type CustomerAddress, type CustomerTaxInfo } from '../lib/customerQueries'
import {
  useUpdateCustomer,
  useCustomerAddresses,
  useCustomerTaxInfo,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
  useUpsertTaxInfo,
} from '../hooks/useCustomers'
import ThaiAddressFields from './ThaiAddressFields'
import { GoogleMapsPicker } from './GoogleMapsPicker'

type TabKey = 'profile' | 'addresses' | 'tax'

interface CustomerEditModalProps {
  isOpen: boolean
  onClose: () => void
  customer: Customer
  onSuccess?: () => void
}

// ============================================
// ADDRESS FORM SUB-COMPONENT
// ============================================

const emptyAddressForm = {
  label: 'บ้าน' as string,
  recipient_name: '',
  phone: '',
  address_line: '',
  province: '',
  district: '',
  subdistrict: '',
  zipcode: '',
  latitude: null as number | null,
  longitude: null as number | null,
  is_default: false as boolean | null,
}

type AddressFormData = typeof emptyAddressForm

function AddressForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: AddressFormData
  onSave: (data: AddressFormData) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<AddressFormData>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.recipient_name.trim()) errs.recipient_name = 'กรุณากรอกชื่อผู้รับ'
    if (!form.phone || !/^0\d{9}$/.test(form.phone)) errs.phone = 'เบอร์โทร 10 หลัก ขึ้นต้นด้วย 0'
    if (!form.address_line.trim()) errs.address_line = 'กรุณากรอกที่อยู่'
    if (!form.province) errs.province = 'กรุณาเลือกจังหวัด'
    if (!form.zipcode || !/^\d{5}$/.test(form.zipcode)) errs.zipcode = 'รหัสไปรษณีย์ 5 หลัก'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (validate()) onSave(form)
  }

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
      hasError ? 'border-red-500' : 'border-stone-300'
    }`

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">ป้ายกำกับ</label>
          <select
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className={inputClass(false)}
          >
            <option value="บ้าน">บ้าน</option>
            <option value="ที่ทำงาน">ที่ทำงาน</option>
            <option value="อื่นๆ">อื่นๆ</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            ชื่อผู้รับ <span className="text-red-500">*</span>
          </label>
          <input
            value={form.recipient_name}
            onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
            className={inputClass(!!errors.recipient_name)}
            placeholder="ชื่อผู้รับ"
          />
          {errors.recipient_name && <p className="text-xs text-red-600 mt-1">{errors.recipient_name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            เบอร์โทร <span className="text-red-500">*</span>
          </label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClass(!!errors.phone)}
            placeholder="0812345678"
            maxLength={10}
          />
          {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          ที่อยู่ <span className="text-red-500">*</span>
        </label>
        <input
          value={form.address_line}
          onChange={(e) => setForm({ ...form, address_line: e.target.value })}
          className={inputClass(!!errors.address_line)}
          placeholder="บ้านเลขที่ ซอย ถนน"
        />
        {errors.address_line && <p className="text-xs text-red-600 mt-1">{errors.address_line}</p>}
      </div>

      <ThaiAddressFields
        province={form.province}
        district={form.district}
        subdistrict={form.subdistrict}
        zipcode={form.zipcode}
        errors={errors}
        onChange={(fields) => setForm({ ...form, ...fields })}
      />

      {/* Google Maps Location Picker */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          เลือกตำแหน่งบนแผนที่ (ไม่บังคับ)
        </label>
        <GoogleMapsPicker
          latitude={form.latitude}
          longitude={form.longitude}
          onLocationChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!form.is_default}
          onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
          className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
        />
        <span className="text-sm text-stone-700">ตั้งเป็นที่อยู่เริ่มต้น</span>
      </label>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 text-sm hover:bg-stone-50 transition"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 bg-amber-700 text-white rounded-xl text-sm hover:bg-amber-800 transition disabled:opacity-50 flex items-center gap-1"
        >
          {saving ? 'กำลังบันทึก...' : <><Save className="w-3 h-3" /> บันทึก</>}
        </button>
      </div>
    </div>
  )
}

// ============================================
// MAIN EDIT MODAL
// ============================================

function CustomerEditModal({ isOpen, onClose, customer, onSuccess }: CustomerEditModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('profile')

  // Profile state
  const [profileForm, setProfileForm] = useState({
    full_name: customer.full_name,
    phone: customer.phone,
    date_of_birth: customer.date_of_birth || '',
    status: customer.status as CustomerStatus,
  })
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})

  // Addresses state
  const { addresses, loading: addrLoading, refetch: refetchAddresses } = useCustomerAddresses(customer.id)
  const [addressFormMode, setAddressFormMode] = useState<'hidden' | 'create' | 'edit'>('hidden')
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [editingAddressData, setEditingAddressData] = useState<AddressFormData>(emptyAddressForm)

  // Tax state
  const { taxInfo, loading: taxLoading, refetch: refetchTax } = useCustomerTaxInfo(customer.id)
  const [taxForm, setTaxForm] = useState({
    tax_type: 'individual' as string,
    tax_id: '',
    company_name: '',
    branch_code: '',
    address_line: '',
    province: '',
    district: '',
    subdistrict: '',
    zipcode: '',
  })

  // Hooks
  const { update: updateProfile, loading: profileSaving } = useUpdateCustomer()
  const { create: createAddr, loading: createAddrLoading } = useCreateAddress()
  const { update: updateAddr, loading: updateAddrLoading } = useUpdateAddress()
  const { remove: removeAddr } = useDeleteAddress()
  const { setDefault: setDefaultAddr } = useSetDefaultAddress()
  const { upsert: upsertTax, loading: taxSaving } = useUpsertTaxInfo()

  // Initialize tax form when data loads
  useEffect(() => {
    if (taxInfo) {
      setTaxForm({
        tax_type: taxInfo.tax_type || 'individual',
        tax_id: taxInfo.tax_id || '',
        company_name: taxInfo.company_name || '',
        branch_code: taxInfo.branch_code || '',
        address_line: taxInfo.address_line || '',
        province: taxInfo.province || '',
        district: taxInfo.district || '',
        subdistrict: taxInfo.subdistrict || '',
        zipcode: taxInfo.zipcode || '',
      })
    }
  }, [taxInfo])

  if (!isOpen) return null

  // ---- PROFILE HANDLERS ----
  const handleProfileSave = async () => {
    const errs: Record<string, string> = {}
    if (!profileForm.full_name || profileForm.full_name.length < 2) errs.full_name = 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'
    if (!profileForm.phone || profileForm.phone.length < 9) errs.phone = 'เบอร์โทรต้องมีอย่างน้อย 9 หลัก'
    setProfileErrors(errs)
    if (Object.keys(errs).length > 0) return

    try {
      await updateProfile(customer.id, profileForm)
      toast.success('อัปเดตข้อมูลสำเร็จ')
      onSuccess?.()
    } catch {
      toast.error('เกิดข้อผิดพลาดในการอัปเดต')
    }
  }

  // ---- ADDRESS HANDLERS ----
  const handleAddressCreate = async (data: AddressFormData) => {
    try {
      await createAddr(customer.id, data)
      toast.success('เพิ่มที่อยู่สำเร็จ')
      setAddressFormMode('hidden')
      refetchAddresses()
    } catch {
      toast.error('เกิดข้อผิดพลาดในการเพิ่มที่อยู่')
    }
  }

  const handleAddressUpdate = async (data: AddressFormData) => {
    if (!editingAddressId) return
    try {
      await updateAddr(editingAddressId, customer.id, data)
      toast.success('อัปเดตที่อยู่สำเร็จ')
      setAddressFormMode('hidden')
      setEditingAddressId(null)
      refetchAddresses()
    } catch {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตที่อยู่')
    }
  }

  const handleAddressDelete = async (id: string) => {
    if (!confirm('ต้องการลบที่อยู่นี้?')) return
    try {
      await removeAddr(id)
      toast.success('ลบที่อยู่สำเร็จ')
      refetchAddresses()
    } catch {
      toast.error('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddr(customer.id, id)
      toast.success('ตั้งเป็นที่อยู่เริ่มต้นสำเร็จ')
      refetchAddresses()
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    }
  }

  const startEditAddress = (addr: CustomerAddress) => {
    setEditingAddressId(addr.id)
    setEditingAddressData({
      label: addr.label,
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      address_line: addr.address_line,
      province: addr.province || '',
      district: addr.district || '',
      subdistrict: addr.subdistrict || '',
      zipcode: addr.zipcode || '',
      latitude: addr.latitude,
      longitude: addr.longitude,
      is_default: addr.is_default,
    })
    setAddressFormMode('edit')
  }

  // ---- TAX HANDLERS ----
  const handleTaxSave = async () => {
    try {
      await upsertTax(customer.id, taxForm)
      toast.success('บันทึกข้อมูลภาษีสำเร็จ')
      refetchTax()
    } catch {
      toast.error('เกิดข้อผิดพลาดในการบันทึก')
    }
  }

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
      hasError ? 'border-red-500' : 'border-stone-300'
    }`

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'profile', label: 'ข้อมูลส่วนตัว' },
    { key: 'addresses', label: 'ที่อยู่' },
    { key: 'tax', label: 'ใบกำกับภาษี' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">แก้ไขข้อมูลลูกค้า</h2>
            <p className="text-sm text-stone-500">{customer.full_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg transition">
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'text-amber-700 border-b-2 border-amber-700 bg-amber-50/50'
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-160px)]">
          <div className="p-6">
            {/* ==================== PROFILE TAB ==================== */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    ชื่อลูกค้า <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    className={inputClass(!!profileErrors.full_name)}
                    placeholder="กรอกชื่อลูกค้า"
                  />
                  {profileErrors.full_name && <p className="text-red-500 text-sm mt-1">{profileErrors.full_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    เบอร์โทร <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className={inputClass(!!profileErrors.phone)}
                    placeholder="กรอกเบอร์โทร"
                  />
                  {profileErrors.phone && <p className="text-red-500 text-sm mt-1">{profileErrors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">วันเกิด</label>
                  <input
                    type="date"
                    value={profileForm.date_of_birth}
                    onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                    className={inputClass(false)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    สถานะ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={profileForm.status}
                    onChange={(e) => setProfileForm({ ...profileForm, status: e.target.value as CustomerStatus })}
                    className={inputClass(false)}
                  >
                    <option value="active">ใช้งานอยู่ (Active)</option>
                    <option value="suspended">ระงับชั่วคราว (Suspended)</option>
                    <option value="banned">ระงับถาวร (Banned)</option>
                  </select>
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>คำเตือน:</strong> การเปลี่ยนสถานะจะส่งผลต่อการใช้งานของลูกค้า
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleProfileSave}
                    disabled={profileSaving}
                    className="px-6 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {profileSaving ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> กำลังบันทึก...</>
                    ) : (
                      <><Save className="w-4 h-4" /> บันทึกข้อมูลส่วนตัว</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ==================== ADDRESSES TAB ==================== */}
            {activeTab === 'addresses' && (
              <div className="space-y-4">
                {/* Add button */}
                {addressFormMode === 'hidden' && (
                  <button
                    onClick={() => {
                      setAddressFormMode('create')
                      setEditingAddressId(null)
                      setEditingAddressData(emptyAddressForm)
                    }}
                    className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-amber-500 hover:text-amber-700 transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> เพิ่มที่อยู่ใหม่
                  </button>
                )}

                {/* Create form */}
                {addressFormMode === 'create' && (
                  <AddressForm
                    initial={emptyAddressForm}
                    onSave={handleAddressCreate}
                    onCancel={() => setAddressFormMode('hidden')}
                    saving={createAddrLoading}
                  />
                )}

                {/* Address list */}
                {addrLoading ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-700 mx-auto mb-2" />
                    <p className="text-sm text-stone-500">กำลังโหลด...</p>
                  </div>
                ) : addresses.length === 0 && addressFormMode === 'hidden' ? (
                  <p className="text-center text-stone-500 py-6">ยังไม่มีที่อยู่</p>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <div key={addr.id}>
                        {addressFormMode === 'edit' && editingAddressId === addr.id ? (
                          <AddressForm
                            initial={editingAddressData}
                            onSave={handleAddressUpdate}
                            onCancel={() => {
                              setAddressFormMode('hidden')
                              setEditingAddressId(null)
                            }}
                            saving={updateAddrLoading}
                          />
                        ) : (
                          <div className="bg-stone-50 rounded-xl p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                    {addr.label}
                                  </span>
                                  {addr.is_default && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                      ค่าเริ่มต้น
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-stone-900">{addr.recipient_name}</p>
                                <p className="text-xs text-stone-500">{addr.phone}</p>
                                <p className="text-sm text-stone-700 mt-1">
                                  {addr.address_line}
                                  {addr.subdistrict && ` ${addr.subdistrict}`}
                                  {addr.district && ` ${addr.district}`}
                                  {addr.province && ` ${addr.province}`}
                                  {addr.zipcode && ` ${addr.zipcode}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 ml-3">
                                {!addr.is_default && (
                                  <button
                                    onClick={() => handleSetDefault(addr.id)}
                                    className="p-1.5 hover:bg-amber-100 rounded-lg transition"
                                    title="ตั้งเป็นค่าเริ่มต้น"
                                  >
                                    <Star className="w-4 h-4 text-stone-400" />
                                  </button>
                                )}
                                <button
                                  onClick={() => startEditAddress(addr)}
                                  className="p-1.5 hover:bg-blue-100 rounded-lg transition"
                                  title="แก้ไข"
                                >
                                  <Pencil className="w-4 h-4 text-stone-400" />
                                </button>
                                <button
                                  onClick={() => handleAddressDelete(addr.id)}
                                  className="p-1.5 hover:bg-red-100 rounded-lg transition"
                                  title="ลบ"
                                >
                                  <Trash2 className="w-4 h-4 text-stone-400" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== TAX INVOICE TAB ==================== */}
            {activeTab === 'tax' && (
              <div className="space-y-4">
                {taxLoading ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-700 mx-auto mb-2" />
                    <p className="text-sm text-stone-500">กำลังโหลด...</p>
                  </div>
                ) : (
                  <>
                    {/* Tax Type */}
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">ประเภท</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="tax_type"
                            value="individual"
                            checked={taxForm.tax_type === 'individual'}
                            onChange={() => setTaxForm({ ...taxForm, tax_type: 'individual' })}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-sm">บุคคลธรรมดา</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="tax_type"
                            value="company"
                            checked={taxForm.tax_type === 'company'}
                            onChange={() => setTaxForm({ ...taxForm, tax_type: 'company' })}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-sm">นิติบุคคล</span>
                        </label>
                      </div>
                    </div>

                    {/* Tax ID */}
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        เลขประจำตัวผู้เสียภาษี <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={taxForm.tax_id}
                        onChange={(e) => setTaxForm({ ...taxForm, tax_id: e.target.value })}
                        className={inputClass(false)}
                        placeholder={taxForm.tax_type === 'individual' ? '1-2345-67890-12-3' : '0-1234-56789-01-2'}
                        maxLength={13}
                      />
                    </div>

                    {/* Company fields */}
                    {taxForm.tax_type === 'company' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1">
                            ชื่อบริษัท <span className="text-red-500">*</span>
                          </label>
                          <input
                            value={taxForm.company_name}
                            onChange={(e) => setTaxForm({ ...taxForm, company_name: e.target.value })}
                            className={inputClass(false)}
                            placeholder="ชื่อบริษัท"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1">รหัสสาขา</label>
                          <input
                            value={taxForm.branch_code}
                            onChange={(e) => setTaxForm({ ...taxForm, branch_code: e.target.value })}
                            className={inputClass(false)}
                            placeholder="สำนักงานใหญ่ หรือ 00001"
                          />
                        </div>
                      </div>
                    )}

                    {/* Tax Address */}
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        ที่อยู่ออกใบกำกับภาษี <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={taxForm.address_line}
                        onChange={(e) => setTaxForm({ ...taxForm, address_line: e.target.value })}
                        className={inputClass(false)}
                        placeholder="บ้านเลขที่ ซอย ถนน"
                      />
                    </div>

                    <ThaiAddressFields
                      province={taxForm.province}
                      district={taxForm.district}
                      subdistrict={taxForm.subdistrict}
                      zipcode={taxForm.zipcode}
                      onChange={(fields) => setTaxForm({ ...taxForm, ...fields })}
                    />

                    <div className="pt-2">
                      <button
                        onClick={handleTaxSave}
                        disabled={taxSaving}
                        className="px-6 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {taxSaving ? (
                          <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> กำลังบันทึก...</>
                        ) : (
                          <><Save className="w-4 h-4" /> บันทึกข้อมูลภาษี</>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerEditModal
