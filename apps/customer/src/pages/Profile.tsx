import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { User, Bell, Lock, Globe, MapPin, CreditCard, Plus, FileText, Building2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation, changeAppLanguage, getStoredLanguage } from '@bliss/i18n'
import { useCurrentCustomer, useUpdateCustomer } from '@bliss/supabase/hooks/useCustomer'
import { supabase } from '@bliss/supabase/auth'
import { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress, useSetDefaultAddress } from '@bliss/supabase/hooks/useAddresses'
import { usePaymentMethods, useAddPaymentMethod, useDeletePaymentMethod, useSetDefaultPaymentMethod } from '@bliss/supabase/hooks/usePaymentMethods'
import { useTaxInformation, useUpsertTaxInformation } from '@bliss/supabase/hooks/useTaxInformation'
import AddressFormModal from '../components/AddressFormModal'
import PaymentMethodModal from '../components/PaymentMethodModal'
import ThaiAddressFields from '../components/ThaiAddressFields'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Database } from '@bliss/supabase/types/database.types'

type Address = Database['public']['Tables']['addresses']['Row']

function Profile() {
  const { t } = useTranslation(['profile', 'common'])
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'payment' | 'tax'>('profile')
  const [expandedSetting, setExpandedSetting] = useState<'notifications' | 'privacy' | 'language' | null>(null)

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

  const [notificationPrefs, setNotificationPrefs] = useState({
    booking_updates: true,
    promotions: true,
    news: true,
  })

  const [privacyPrefs, setPrivacyPrefs] = useState({
    public_profile: false,
    marketing_emails: true,
  })

  const [selectedLanguage, setSelectedLanguage] = useState(getStoredLanguage())

  // Initialize forms when data loads
  useEffect(() => {
    if (customer) {
      setProfileForm({
        full_name: customer.full_name || '',
        phone: customer.phone || '',
        date_of_birth: customer.date_of_birth || '',
      })
      // Load preferences from customer JSONB
      const prefs = (customer.preferences as any) || {}
      if (prefs.notifications) {
        setNotificationPrefs(prev => ({ ...prev, ...prefs.notifications }))
      }
      if (prefs.privacy) {
        setPrivacyPrefs(prev => ({ ...prev, ...prefs.privacy }))
      }
    }
  }, [customer])

  // Load language from profiles table and sync with i18n
  useEffect(() => {
    async function loadLanguage() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('language').eq('id', user.id).single()
        if (data?.language) {
          setSelectedLanguage(data.language)
          changeAppLanguage(data.language)
        }
      }
    }
    loadLanguage()
  }, [])

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
      toast.success(t('toast.profileUpdated'))
    } catch (error) {
      console.error('Update profile error:', error)
      toast.error(t('toast.profileUpdateFailed'))
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
      title: t('addresses.deleteTitle'),
      message: t('addresses.deleteMessage'),
      onConfirm: async () => {
        try {
          await deleteAddress.mutateAsync({ addressId: id, customerId: customer.id })
          toast.success(t('toast.addressDeleted'))
        } catch (error) {
          console.error('Delete address error:', error)
          toast.error(t('toast.addressDeleteFailed'))
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
      toast.error(t('toast.defaultAddressFailed'))
    }
  }

  const handleAddPaymentMethod = () => {
    setIsPaymentModalOpen(true)
  }

  const handleSetDefaultPaymentMethod = async (id: string) => {
    if (!customer) return
    try {
      await setDefaultPaymentMethod.mutateAsync({ paymentMethodId: id, customerId: customer.id })
      toast.success(t('toast.defaultPaymentSet'))
    } catch (error) {
      console.error('Set default payment method error:', error)
      toast.error(t('toast.defaultPaymentFailed'))
    }
  }

  const handleDeletePaymentMethod = (id: string) => {
    if (!customer) return
    setConfirmDialog({
      isOpen: true,
      title: t('payment.deleteTitle'),
      message: t('payment.deleteMessage'),
      onConfirm: async () => {
        try {
          await deletePaymentMethod.mutateAsync({ paymentMethodId: id, customerId: customer.id })
          toast.success(t('toast.paymentDeleted'))
        } catch (error) {
          console.error('Delete payment method error:', error)
          toast.error(t('toast.paymentDeleteFailed'))
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
      toast.success(t('toast.taxSaved'))
    } catch (error) {
      console.error('Save tax info error:', error)
      toast.error(t('toast.taxSaveFailed'))
    }
  }

  // Loading state
  if (customerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto"></div>
          <p className="text-stone-600 mt-4">{t('common:loading.profile')}</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-600 text-lg">{t('common:auth.pleaseLogin')}</p>
          <Link to="/login" className="inline-block mt-4 text-amber-700 hover:text-amber-800 font-medium">
            {t('common:auth.goToLogin')}
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
          <h1 className="text-2xl font-bold text-stone-900">{t('title')}</h1>
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
                {t('tabs.profile')}
              </button>
              <button
                onClick={() => setActiveTab('addresses')}
                className={`flex-1 py-4 text-center font-medium transition ${
                  activeTab === 'addresses'
                    ? 'text-amber-700 border-b-2 border-amber-700'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {t('tabs.addresses')}
              </button>
              <button
                onClick={() => setActiveTab('payment')}
                className={`flex-1 py-4 text-center font-medium transition ${
                  activeTab === 'payment'
                    ? 'text-amber-700 border-b-2 border-amber-700'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {t('tabs.payment')}
              </button>
              <button
                onClick={() => setActiveTab('tax')}
                className={`flex-1 py-4 text-center font-medium transition ${
                  activeTab === 'tax'
                    ? 'text-amber-700 border-b-2 border-amber-700'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {t('tabs.tax')}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-stone-900 mb-4">{t('personal.title')}</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        {t('personal.fullName')}
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
                        {t('personal.phone')}
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
                        {t('personal.dateOfBirth')}
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
                    {t('personal.save')}
                  </button>
                </div>

                <div className="border-t border-stone-200 pt-6">
                  <h3 className="text-lg font-semibold text-stone-900 mb-4">{t('settings.title')}</h3>
                  <div className="space-y-3">
                    {/* Notifications */}
                    <div className="bg-stone-50 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedSetting(expandedSetting === 'notifications' ? null : 'notifications')}
                        className="w-full flex items-center justify-between p-4 hover:bg-stone-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          <Bell className="w-5 h-5 text-stone-600" />
                          <span className="font-medium text-stone-900">{t('settings.notifications.title')}</span>
                        </div>
                        {expandedSetting === 'notifications' ? (
                          <ChevronUp className="w-5 h-5 text-stone-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-stone-400" />
                        )}
                      </button>
                      {expandedSetting === 'notifications' && (
                        <div className="px-4 pb-4 space-y-4">
                          {[
                            { key: 'booking_updates' as const, label: t('settings.notifications.bookingUpdates'), desc: t('settings.notifications.bookingUpdatesDesc') },
                            { key: 'promotions' as const, label: t('settings.notifications.promotions'), desc: t('settings.notifications.promotionsDesc') },
                            { key: 'news' as const, label: t('settings.notifications.news'), desc: t('settings.notifications.newsDesc') },
                          ].map((item) => (
                            <label key={item.key} className="flex items-center justify-between cursor-pointer">
                              <div>
                                <p className="font-medium text-stone-800 text-sm">{item.label}</p>
                                <p className="text-xs text-stone-500">{item.desc}</p>
                              </div>
                              <div
                                onClick={(e) => {
                                  e.preventDefault()
                                  setNotificationPrefs(prev => ({ ...prev, [item.key]: !prev[item.key] }))
                                }}
                                className={`relative w-11 h-6 rounded-full transition cursor-pointer ${notificationPrefs[item.key] ? 'bg-amber-600' : 'bg-stone-300'}`}
                              >
                                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notificationPrefs[item.key] ? 'translate-x-5' : ''}`} />
                              </div>
                            </label>
                          ))}
                          <button
                            onClick={async () => {
                              if (!customer) return
                              try {
                                const currentPrefs = (customer.preferences as any) || {}
                                await updateCustomer.mutateAsync({
                                  customerId: customer.id,
                                  updates: { preferences: { ...currentPrefs, notifications: notificationPrefs } },
                                })
                                toast.success(t('toast.notificationsSaved'))
                              } catch {
                                toast.error(t('toast.settingsSaveFailed'))
                              }
                            }}
                            className="w-full py-2 bg-amber-700 text-white text-sm rounded-lg font-medium hover:bg-amber-800 transition"
                          >
                            {t('settings.save')}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Privacy */}
                    <div className="bg-stone-50 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedSetting(expandedSetting === 'privacy' ? null : 'privacy')}
                        className="w-full flex items-center justify-between p-4 hover:bg-stone-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          <Lock className="w-5 h-5 text-stone-600" />
                          <span className="font-medium text-stone-900">{t('settings.privacy.title')}</span>
                        </div>
                        {expandedSetting === 'privacy' ? (
                          <ChevronUp className="w-5 h-5 text-stone-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-stone-400" />
                        )}
                      </button>
                      {expandedSetting === 'privacy' && (
                        <div className="px-4 pb-4 space-y-4">
                          {[
                            { key: 'public_profile' as const, label: t('settings.privacy.publicProfile'), desc: t('settings.privacy.publicProfileDesc') },
                            { key: 'marketing_emails' as const, label: t('settings.privacy.marketingEmails'), desc: t('settings.privacy.marketingEmailsDesc') },
                          ].map((item) => (
                            <label key={item.key} className="flex items-center justify-between cursor-pointer">
                              <div>
                                <p className="font-medium text-stone-800 text-sm">{item.label}</p>
                                <p className="text-xs text-stone-500">{item.desc}</p>
                              </div>
                              <div
                                onClick={(e) => {
                                  e.preventDefault()
                                  setPrivacyPrefs(prev => ({ ...prev, [item.key]: !prev[item.key] }))
                                }}
                                className={`relative w-11 h-6 rounded-full transition cursor-pointer ${privacyPrefs[item.key] ? 'bg-amber-600' : 'bg-stone-300'}`}
                              >
                                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${privacyPrefs[item.key] ? 'translate-x-5' : ''}`} />
                              </div>
                            </label>
                          ))}
                          <button
                            onClick={async () => {
                              if (!customer) return
                              try {
                                const currentPrefs = (customer.preferences as any) || {}
                                await updateCustomer.mutateAsync({
                                  customerId: customer.id,
                                  updates: { preferences: { ...currentPrefs, privacy: privacyPrefs } },
                                })
                                toast.success(t('toast.privacySaved'))
                              } catch {
                                toast.error(t('toast.settingsSaveFailed'))
                              }
                            }}
                            className="w-full py-2 bg-amber-700 text-white text-sm rounded-lg font-medium hover:bg-amber-800 transition"
                          >
                            {t('settings.save')}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Language */}
                    <div className="bg-stone-50 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedSetting(expandedSetting === 'language' ? null : 'language')}
                        className="w-full flex items-center justify-between p-4 hover:bg-stone-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          <Globe className="w-5 h-5 text-stone-600" />
                          <span className="font-medium text-stone-900">{t('settings.language.title')}</span>
                        </div>
                        {expandedSetting === 'language' ? (
                          <ChevronUp className="w-5 h-5 text-stone-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-stone-400" />
                        )}
                      </button>
                      {expandedSetting === 'language' && (
                        <div className="px-4 pb-4 space-y-3">
                          {[
                            { code: 'th', label: t('settings.language.thai'), flag: '🇹🇭' },
                            { code: 'en', label: t('settings.language.english'), flag: '🇬🇧' },
                            { code: 'cn', label: t('settings.language.chinese'), flag: '🇨🇳' },
                          ].map((lang) => (
                            <label
                              key={lang.code}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                                selectedLanguage === lang.code
                                  ? 'border-amber-500 bg-amber-50'
                                  : 'border-stone-200 hover:border-amber-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="language"
                                value={lang.code}
                                checked={selectedLanguage === lang.code}
                                onChange={() => setSelectedLanguage(lang.code)}
                                className="sr-only"
                              />
                              <span className="text-xl">{lang.flag}</span>
                              <span className="font-medium text-stone-800">{lang.label}</span>
                              {selectedLanguage === lang.code && (
                                <span className="ml-auto text-amber-600 text-sm font-medium">{t('settings.language.selected')}</span>
                              )}
                            </label>
                          ))}
                          <button
                            onClick={async () => {
                              try {
                                const { data: { user } } = await supabase.auth.getUser()
                                if (!user) return
                                const { error } = await supabase.from('profiles').update({ language: selectedLanguage }).eq('id', user.id)
                                if (error) throw error
                                changeAppLanguage(selectedLanguage)
                                toast.success(t('toast.languageSaved'))
                              } catch {
                                toast.error(t('toast.languageSaveFailed'))
                              }
                            }}
                            className="w-full py-2 bg-amber-700 text-white text-sm rounded-lg font-medium hover:bg-amber-800 transition"
                          >
                            {t('settings.save')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-stone-900">{t('addresses.title')}</h3>
                  <button
                    onClick={handleAddAddress}
                    className="bg-amber-700 text-white px-4 py-2 rounded-xl font-medium hover:bg-amber-800 transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t('addresses.addNew')}
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
                            {t('addresses.default')}
                          </span>
                        )}
                        <h4 className="font-semibold text-stone-900 mb-2">{address.label} - {address.recipient_name}</h4>
                        <p className="text-stone-600 text-sm mb-1">{address.phone}</p>
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
                            {t('addresses.edit')}
                          </button>
                          <span className="text-stone-300">|</span>
                          {!address.is_default && (
                            <>
                              <button
                                onClick={() => handleSetDefaultAddress(address.id)}
                                className="text-amber-700 hover:text-amber-900 font-medium text-sm"
                              >
                                {t('addresses.setDefault')}
                              </button>
                              <span className="text-stone-300">|</span>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteAddress(address.id)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            {t('addresses.delete')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-stone-50 rounded-xl">
                    <MapPin className="w-12 h-12 text-stone-400 mx-auto" />
                    <p className="text-stone-500 mt-4">{t('addresses.noAddresses')}</p>
                    <button
                      onClick={handleAddAddress}
                      className="mt-4 bg-amber-700 text-white px-6 py-2 rounded-xl font-medium hover:bg-amber-800 transition flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      {t('addresses.addFirst')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Payment Methods Tab */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-stone-900">{t('payment.title')}</h3>
                  <button
                    onClick={handleAddPaymentMethod}
                    className="bg-amber-700 text-white px-4 py-2 rounded-xl font-medium hover:bg-amber-800 transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t('payment.addNew')}
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
                                {t('payment.expires')} {method.card_expiry_month}/{method.card_expiry_year}
                              </p>
                              {method.is_default && (
                                <span className="inline-block px-2 py-1 bg-amber-700 text-white text-xs rounded-full mt-1">
                                  {t('payment.default')}
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
                                {t('payment.setDefault')}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePaymentMethod(method.id)}
                              className="text-red-600 hover:text-red-800 font-medium text-sm"
                            >
                              {t('payment.delete')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-stone-50 rounded-xl">
                    <CreditCard className="w-12 h-12 text-stone-400 mx-auto" />
                    <p className="text-stone-500 mt-4">{t('payment.noMethods')}</p>
                    <button
                      onClick={handleAddPaymentMethod}
                      className="mt-4 bg-amber-700 text-white px-6 py-2 rounded-xl font-medium hover:bg-amber-800 transition flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      {t('payment.addFirst')}
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
                    <h3 className="text-lg font-semibold text-stone-900 mb-4">{t('tax.title')}</h3>
                    <p className="text-sm text-stone-600 mb-6">
                      {t('tax.subtitle')}
                    </p>

                    {/* Tax Type Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-stone-700 mb-3">
                        {t('tax.type')} <span className="text-red-500">*</span>
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
                          <p className="font-medium text-stone-900">{t('tax.individual')}</p>
                          <p className="text-xs text-stone-500 mt-1">{t('tax.individualEn')}</p>
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
                          <p className="font-medium text-stone-900">{t('tax.company')}</p>
                          <p className="text-xs text-stone-500 mt-1">{t('tax.companyEn')}</p>
                        </button>
                      </div>
                    </div>

                    {/* Tax ID */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        {taxForm.tax_type === 'individual' ? t('tax.nationalId') : t('tax.taxId')}{' '}
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
                            {t('tax.companyName')} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={taxForm.company_name}
                            onChange={(e) => setTaxForm({ ...taxForm, company_name: e.target.value })}
                            placeholder={t('tax.companyPlaceholder')}
                            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-stone-700 mb-2">
                            {t('tax.branch')}
                          </label>
                          <input
                            type="text"
                            value={taxForm.branch_code}
                            onChange={(e) => setTaxForm({ ...taxForm, branch_code: e.target.value })}
                            placeholder={t('tax.branchPlaceholder')}
                            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                        </div>
                      </>
                    )}

                  {/* Tax Address */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      {t('tax.taxAddress')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={taxForm.address_line}
                      onChange={(e) => setTaxForm({ ...taxForm, address_line: e.target.value })}
                      placeholder={t('tax.addressPlaceholder')}
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-4 mb-6">
                    <ThaiAddressFields
                      province={taxForm.province}
                      district={taxForm.district}
                      subdistrict={taxForm.subdistrict}
                      zipcode={taxForm.zipcode}
                      onChange={(fields) => setTaxForm((prev) => ({ ...prev, ...fields }))}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveTaxInfo}
                      className="bg-amber-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-800 transition"
                    >
                      {t('tax.save')}
                    </button>
                  </div>

                  {/* Info Box */}
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">{t('tax.note')}</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>{t('tax.noteItems.usage')}</li>
                          <li>{t('tax.noteItems.accuracy')}</li>
                          <li>{t('tax.noteItems.editable')}</li>
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
          confirmText={t('confirm.delete')}
          cancelText={t('confirm.cancel')}
          variant="danger"
        />
      </div>
    </div>
  )
}

export default Profile
