import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { User, Bell, Lock, Globe, MapPin, CreditCard, Plus, LogOut, FileText, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCurrentCustomer, useUpdateCustomer } from '@bliss/supabase/hooks/useCustomer'
import { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress, useSetDefaultAddress } from '@bliss/supabase/hooks/useAddresses'
import { usePaymentMethods, useAddPaymentMethod, useDeletePaymentMethod, useSetDefaultPaymentMethod } from '@bliss/supabase/hooks/usePaymentMethods'
import { useTaxInformation, useUpsertTaxInformation } from '@bliss/supabase/hooks/useTaxInformation'
import AddressFormModal from '../components/AddressFormModal'
import PaymentMethodModal from '../components/PaymentMethodModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Database } from '@bliss/supabase/types/database.types'

type Address = Database['public']['Tables']['addresses']['Row']

function Profile() {
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'payment' | 'tax'>('profile')

  // Modal control state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  // Fetch real data from Supabase
  const { data: customer, isLoading: customerLoading } = useCurrentCustomer()
  const { data: addresses = [], isLoading: addressesLoading } = useAddresses(customer?.id)
  const { data: paymentMethods = [], isLoading: paymentLoading } = usePaymentMethods(customer?.id)
  const { data: taxInformation, isLoading: taxLoading } = useTaxInformation(customer?.id)

  // Mutations
  const updateCustomer = useUpdateCustomer()
  const createAddress = useCreateAddress()
  const updateAddress = useUpdateAddress()
  const deleteAddress = useDeleteAddress()
  const setDefaultAddress = useSetDefaultAddress()
  const addPaymentMethod = useAddPaymentMethod()
  const deletePaymentMethod = useDeletePaymentMethod()
  const setDefaultPaymentMethod = useSetDefaultPaymentMethod()
  const upsertTaxInfo = useUpsertTaxInformation()

  // Local form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
  })

  const [taxForm, setTaxForm] = useState({
    tax_type: 'individual' as 'individual' | 'company',
    tax_id: '',
    company_name: '',
    branch_code: '',
    address_line: '',
    district: '',
    subdistrict: '',
    province: '',
    zipcode: '',
  })

  // Initialize forms when data loads
  useEffect(() => {
    if (customer) {
      setProfileForm({
        full_name: customer.full_name || '',
        phone: customer.phone || '',
        date_of_birth: customer.date_of_birth || '',
      })
    }
  }, [customer])

  useEffect(() => {
    if (taxInformation) {
      setTaxForm({
        tax_type: taxInformation.tax_type as 'individual' | 'company',
        tax_id: taxInformation.tax_id || '',
        company_name: taxInformation.company_name || '',
        branch_code: taxInformation.branch_code || '',
        address_line: taxInformation.address_line || '',
        district: taxInformation.district || '',
        subdistrict: taxInformation.subdistrict || '',
        province: taxInformation.province || '',
        zipcode: taxInformation.zipcode || '',
      })
    }
  }, [taxInformation])

  const handleProfileSave = async () => {
    if (!customer) return
    try {
      await updateCustomer.mutateAsync({
        customerId: customer.id,
        updates: profileForm,
      })
      toast.success('อัปเดตข้อมูลโปรไฟล์สำเร็จ')
    } catch (error) {
      console.error('Update profile error:', error)
      toast.error('ไม่สามารถอัปเดตข้อมูลโปรไฟล์ได้')
    }
  }

  const handleAddAddress = () => {
    setEditingAddress(null)
    setIsAddressModalOpen(true)
  }

  const handleEditAddress = (id: string) => {
    const address = addresses.find((a) => a.id === id)
    setEditingAddress(address || null)
    setIsAddressModalOpen(true)
  }

  const handleDeleteAddress = (id: string) => {
    if (!customer) return
    setConfirmDialog({
      isOpen: true,
      title: 'ลบที่อยู่',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบที่อยู่นี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      onConfirm: async () => {
        try {
          await deleteAddress.mutateAsync({ addressId: id, customerId: customer.id })
          toast.success('ลบที่อยู่สำเร็จ')
        } catch (error) {
          console.error('Delete address error:', error)
          toast.error('ไม่สามารถลบที่อยู่ได้')
        }
      },
    })
  }

  const handleSetDefaultAddress = async (id: string) => {
    if (!customer) return
    try {
      await setDefaultAddress.mutateAsync({ addressId: id, customerId: customer.id })
    } catch (error) {
      console.error('Set default address error:', error)
      toast.error('ไม่สามารถตั้งค่าที่อยู่เริ่มต้นได้')
    }
  }

  const handleAddPaymentMethod = () => {
    setIsPaymentModalOpen(true)
  }

  const handleSetDefaultPaymentMethod = async (id: string) => {
    if (!customer) return
    try {
      await setDefaultPaymentMethod.mutateAsync({ paymentMethodId: id, customerId: customer.id })
      toast.success('ตั้งค่าวิธีการชำระเงินเริ่มต้นสำเร็จ')
    } catch (error) {
      console.error('Set default payment method error:', error)
      toast.error('ไม่สามารถตั้งค่าวิธีการชำระเงินเริ่มต้นได้')
    }
  }

  const handleDeletePaymentMethod = (id: string) => {
    if (!customer) return
    setConfirmDialog({
      isOpen: true,
      title: 'ลบวิธีการชำระเงิน',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบวิธีการชำระเงินนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      onConfirm: async () => {
        try {
          await deletePaymentMethod.mutateAsync({ paymentMethodId: id, customerId: customer.id })
          toast.success('ลบวิธีการชำระเงินสำเร็จ')
        } catch (error) {
          console.error('Delete payment method error:', error)
          toast.error('ไม่สามารถลบวิธีการชำระเงินได้')
        }
      },
    })
  }

  const handleSaveTaxInfo = async () => {
    if (!customer) return
    try {
      await upsertTaxInfo.mutateAsync({
        customer_id: customer.id,
        ...taxForm,
      })
      toast.success('บันทึกข้อมูลภาษีสำเร็จ')
    } catch (error) {
      console.error('Save tax info error:', error)
      toast.error('ไม่สามารถบันทึกข้อมูลภาษีได้')
    }
  }

  // Loading state
  if (customerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto"></div>
          <p className="text-stone-600 mt-4">Loading profile...</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-600 text-lg">Please log in to view your profile</p>
          <Link to="/login" className="inline-block mt-4 text-amber-700 hover:text-amber-800 font-medium">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-900">Profile</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-amber-700 to-amber-800 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{customer.full_name}</h2>
                <p className="text-white/80">{customer.phone}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-stone-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-4 text-center font-medium transition ${
                  activeTab === 'profile'
                    ? 'text-amber-700 border-b-2 border-amber-700'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('addresses')}
                className={`flex-1 py-4 text-center font-medium transition ${
                  activeTab === 'addresses'
                    ? 'text-amber-700 border-b-2 border-amber-700'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                Addresses
              </button>
              <button
                onClick={() => setActiveTab('payment')}
                className={`flex-1 py-4 text-center font-medium transition ${
                  activeTab === 'payment'
                    ? 'text-amber-700 border-b-2 border-amber-700'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                Payment Methods
              </button>
              <button
                onClick={() => setActiveTab('tax')}
                className={`flex-1 py-4 text-center font-medium transition ${
                  activeTab === 'tax'
                    ? 'text-amber-700 border-b-2 border-amber-700'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                Tax Invoice
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-stone-900 mb-4">Personal Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={profileForm.date_of_birth}
                        onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleProfileSave}
                    className="bg-amber-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-800 transition"
                  >
                    Save Profile
                  </button>
                </div>

                <div className="border-t border-stone-200 pt-6">
                  <h3 className="text-lg font-semibold text-stone-900 mb-4">Settings</h3>
                  <div className="space-y-3">
                    <Link
                      to="/settings/notifications"
                      className="flex items-center justify-between p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-stone-600" />
                        <span className="font-medium text-stone-900">Notifications</span>
                      </div>
                      <span className="text-stone-400">→</span>
                    </Link>
                    <Link
                      to="/settings/privacy"
                      className="flex items-center justify-between p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-stone-600" />
                        <span className="font-medium text-stone-900">Privacy</span>
                      </div>
                      <span className="text-stone-400">→</span>
                    </Link>
                    <Link
                      to="/settings/language"
                      className="flex items-center justify-between p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-stone-600" />
                        <span className="font-medium text-stone-900">Language</span>
                      </div>
                      <span className="text-stone-400">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-stone-900">My Addresses</h3>
                  <button
                    onClick={handleAddAddress}
                    className="bg-amber-700 text-white px-4 py-2 rounded-xl font-medium hover:bg-amber-800 transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Address
                  </button>
                </div>

                {addressesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700 mx-auto"></div>
                  </div>
                ) : addresses.length > 0 ? (
                  <div className="space-y-4">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className={`border-2 rounded-xl p-4 ${
                          address.is_default ? 'border-amber-500 bg-stone-50' : 'border-stone-200'
                        }`}
                      >
                        {address.is_default && (
                          <span className="inline-block px-2 py-1 bg-amber-700 text-white text-xs rounded-full mb-2">
                            Default
                          </span>
                        )}
                        <h4 className="font-semibold text-stone-900 mb-2">{address.label} - {address.recipient_name}</h4>
                        <p className="text-stone-600 text-sm mb-1">{address.recipient_phone}</p>
                        <p className="text-stone-600 text-sm">{address.address_line}</p>
                        <p className="text-stone-600 text-sm">
                          {address.subdistrict} {address.district}
                        </p>
                        <p className="text-stone-600 text-sm">
                          {address.province} {address.zipcode}
                        </p>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleEditAddress(address.id)}
                            className="text-amber-700 hover:text-amber-900 font-medium text-sm"
                          >
                            Edit
                          </button>
                          <span className="text-stone-300">|</span>
                          {!address.is_default && (
                            <>
                              <button
                                onClick={() => handleSetDefaultAddress(address.id)}
                                className="text-amber-700 hover:text-amber-900 font-medium text-sm"
                              >
                                Set as Default
                              </button>
                              <span className="text-stone-300">|</span>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteAddress(address.id)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-stone-50 rounded-xl">
                    <MapPin className="w-12 h-12 text-stone-400 mx-auto" />
                    <p className="text-stone-500 mt-4">No addresses yet</p>
                    <button
                      onClick={handleAddAddress}
                      className="mt-4 bg-amber-700 text-white px-6 py-2 rounded-xl font-medium hover:bg-amber-800 transition flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Address
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Payment Methods Tab */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-stone-900">Payment Methods</h3>
                  <button
                    onClick={handleAddPaymentMethod}
                    className="bg-amber-700 text-white px-4 py-2 rounded-xl font-medium hover:bg-amber-800 transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Payment Method
                  </button>
                </div>

                {paymentLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700 mx-auto"></div>
                  </div>
                ) : paymentMethods.length > 0 ? (
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`border-2 rounded-xl p-4 ${
                          method.is_default ? 'border-amber-500 bg-stone-50' : 'border-stone-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-8 h-8 text-stone-600" />
                            <div>
                              <h4 className="font-semibold text-stone-900">
                                {method.card_brand} •••• {method.card_last_digits}
                              </h4>
                              <p className="text-sm text-stone-500">{method.cardholder_name}</p>
                              <p className="text-xs text-stone-400">
                                Expires {method.card_expiry_month}/{method.card_expiry_year}
                              </p>
                              {method.is_default && (
                                <span className="inline-block px-2 py-1 bg-amber-700 text-white text-xs rounded-full mt-1">
                                  Default
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!method.is_default && (
                              <button
                                onClick={() => handleSetDefaultPaymentMethod(method.id)}
                                className="text-amber-700 hover:text-amber-800 font-medium text-sm"
                              >
                                Set as Default
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePaymentMethod(method.id)}
                              className="text-red-600 hover:text-red-800 font-medium text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-stone-50 rounded-xl">
                    <CreditCard className="w-12 h-12 text-stone-400 mx-auto" />
                    <p className="text-stone-500 mt-4">No payment methods yet</p>
                    <button
                      onClick={handleAddPaymentMethod}
                      className="mt-4 bg-amber-700 text-white px-6 py-2 rounded-xl font-medium hover:bg-amber-800 transition flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Payment Method
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tax Invoice Tab */}
            {activeTab === 'tax' && (
              <div className="space-y-6">
                {taxLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700 mx-auto"></div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900 mb-4">ข้อมูลสำหรับออกใบกำกับภาษี</h3>
                    <p className="text-sm text-stone-600 mb-6">
                      กรอกข้อมูลเพื่อใช้สำหรับออกใบกำกับภาษี/ใบเสร็จรับเงิน
                    </p>

                    {/* Tax Type Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-stone-700 mb-3">
                        ประเภท <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setTaxForm({ ...taxForm, tax_type: 'individual' })}
                          className={`p-4 border-2 rounded-xl transition ${
                            taxForm.tax_type === 'individual'
                              ? 'border-amber-500 bg-amber-50'
                              : 'border-stone-200 hover:border-amber-300'
                          }`}
                        >
                          <User className="w-8 h-8 mx-auto mb-2 text-stone-600" />
                          <p className="font-medium text-stone-900">บุคคลธรรมดา</p>
                          <p className="text-xs text-stone-500 mt-1">Individual</p>
                        </button>
                        <button
                          onClick={() => setTaxForm({ ...taxForm, tax_type: 'company' })}
                          className={`p-4 border-2 rounded-xl transition ${
                            taxForm.tax_type === 'company'
                              ? 'border-amber-500 bg-amber-50'
                              : 'border-stone-200 hover:border-amber-300'
                          }`}
                        >
                          <Building2 className="w-8 h-8 mx-auto mb-2 text-stone-600" />
                          <p className="font-medium text-stone-900">นิติบุคคล</p>
                          <p className="text-xs text-stone-500 mt-1">Company</p>
                        </button>
                      </div>
                    </div>

                    {/* Tax ID */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        {taxForm.tax_type === 'individual' ? 'เลขประจำตัวประชาชน' : 'เลขประจำตัวผู้เสียภาษี'}{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={taxForm.tax_id}
                        onChange={(e) => setTaxForm({ ...taxForm, tax_id: e.target.value })}
                        placeholder={taxForm.tax_type === 'individual' ? '1-2345-67890-12-3' : '0-1234-56789-01-2'}
                        maxLength={13}
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>

                    {/* Company Name (only for company type) */}
                    {taxForm.tax_type === 'company' && (
                      <>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-stone-700 mb-2">
                            ชื่อบริษัท <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={taxForm.company_name}
                            onChange={(e) => setTaxForm({ ...taxForm, company_name: e.target.value })}
                            placeholder="บริษัท ABC จำกัด"
                            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-stone-700 mb-2">
                            สาขา
                          </label>
                          <input
                            type="text"
                            value={taxForm.branch_code}
                            onChange={(e) => setTaxForm({ ...taxForm, branch_code: e.target.value })}
                            placeholder="สำนักงานใหญ่ หรือ 00001"
                            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                        </div>
                      </>
                    )}

                  {/* Tax Address */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      ที่อยู่สำหรับออกใบกำกับภาษี <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={taxForm.address_line}
                      onChange={(e) => setTaxForm({ ...taxForm, address_line: e.target.value })}
                      placeholder="เลขที่, หมู่บ้าน, ซอย, ถนน"
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        แขวง/ตำบล
                      </label>
                      <input
                        type="text"
                        value={taxForm.subdistrict}
                        onChange={(e) => setTaxForm({ ...taxForm, subdistrict: e.target.value })}
                        placeholder="แขวง/ตำบล"
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        เขต/อำเภอ
                      </label>
                      <input
                        type="text"
                        value={taxForm.district}
                        onChange={(e) => setTaxForm({ ...taxForm, district: e.target.value })}
                        placeholder="เขต/อำเภอ"
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        จังหวัด <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={taxForm.province}
                        onChange={(e) => setTaxForm({ ...taxForm, province: e.target.value })}
                        placeholder="จังหวัด"
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        รหัสไปรษณีย์
                      </label>
                      <input
                        type="text"
                        value={taxForm.zipcode}
                        onChange={(e) => setTaxForm({ ...taxForm, zipcode: e.target.value })}
                        placeholder="10100"
                        maxLength={5}
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveTaxInfo}
                      className="bg-amber-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-800 transition"
                    >
                      บันทึกข้อมูล
                    </button>
                  </div>

                  {/* Info Box */}
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">หมายเหตุ:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>ข้อมูลนี้จะใช้สำหรับออกใบกำกับภาษี/ใบเสร็จรับเงิน</li>
                          <li>กรุณากรอกข้อมูลให้ถูกต้องและครบถ้วน</li>
                          <li>สามารถแก้ไขข้อมูลได้ตลอดเวลา</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="mt-6">
          <button className="w-full border-2 border-red-200 text-red-600 py-3 rounded-xl font-medium hover:bg-red-50 transition flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Modals */}
        <AddressFormModal
          isOpen={isAddressModalOpen}
          onClose={() => {
            setIsAddressModalOpen(false)
            setEditingAddress(null)
          }}
          customerId={customer!.id}
          addressToEdit={editingAddress}
        />

        <PaymentMethodModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          customerId={customer!.id}
        />

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="ลบ"
          cancelText="ยกเลิก"
          variant="danger"
        />
      </div>
    </div>
  )
}

export default Profile
