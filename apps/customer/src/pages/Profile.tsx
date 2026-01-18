import { Link } from 'react-router-dom'
import { useState } from 'react'
import { User, Bell, Lock, Globe, MapPin, CreditCard, Banknote, Plus, LogOut } from 'lucide-react'

function Profile() {
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'payment'>('profile')

  // Mock user data
  const [user, setUser] = useState({
    firstName: 'สมชาย',
    lastName: 'ใจดี',
    email: 'somchai@example.com',
    phone: '081-234-5678',
    birthDate: '1990-01-15',
  })

  const [addresses, setAddresses] = useState([
    {
      id: 1,
      label: 'บ้าน',
      name: 'สมชาย ใจดี',
      phone: '081-234-5678',
      address: '123/45 หมู่บ้านสุขสันต์',
      district: 'เขตพระโขนง',
      subdistrict: 'แขวงบางนาใต้',
      province: 'กรุงเทพมหานคร',
      zipcode: '10260',
      isDefault: true,
    },
  ])

  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: 1,
      type: 'credit_card',
      name: 'Visa •••• 4242',
      isDefault: true,
    },
  ])

  const handleProfileSave = () => {
    // Mock save
    alert('Profile saved successfully')
  }

  const handleAddAddress = () => {
    // Mock add address
    alert('Add new address')
  }

  const handleEditAddress = (id: number) => {
    // Mock edit address
    alert(`Edit address ID: ${id}`)
  }

  const handleDeleteAddress = (id: number) => {
    // Mock delete address
    if (confirm('Confirm to delete this address?')) {
      setAddresses(addresses.filter(a => a.id !== id))
    }
  }

  const handleSetDefaultAddress = (id: number) => {
    setAddresses(addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    })))
  }

  const handleAddPaymentMethod = () => {
    // Mock add payment method
    alert('Add new payment method')
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
                <h2 className="text-xl font-bold">{user.firstName} {user.lastName}</h2>
                <p className="text-white/80">{user.email}</p>
                <p className="text-white/80 text-sm">{user.phone}</p>
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
                        First Name
                      </label>
                      <input
                        type="text"
                        value={user.firstName}
                        onChange={(e) => setUser({ ...user, firstName: e.target.value })}
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={user.lastName}
                        onChange={(e) => setUser({ ...user, lastName: e.target.value })}
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={user.email}
                        onChange={(e) => setUser({ ...user, email: e.target.value })}
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={user.phone}
                        onChange={(e) => setUser({ ...user, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={user.birthDate}
                        onChange={(e) => setUser({ ...user, birthDate: e.target.value })}
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

                {addresses.length > 0 ? (
                  <div className="space-y-4">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className={`border-2 rounded-xl p-4 ${
                          address.isDefault ? 'border-amber-500 bg-stone-50' : 'border-stone-200'
                        }`}
                      >
                        {address.isDefault && (
                          <span className="inline-block px-2 py-1 bg-amber-700 text-white text-xs rounded-full mb-2">
                            Default
                          </span>
                        )}
                        <h4 className="font-semibold text-stone-900 mb-2">{address.name}</h4>
                        <p className="text-stone-600 text-sm mb-1">{address.phone}</p>
                        <p className="text-stone-600 text-sm">{address.address}</p>
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
                          {!address.isDefault && (
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

                {paymentMethods.length > 0 ? (
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`border-2 rounded-xl p-4 ${
                          method.isDefault ? 'border-amber-500 bg-stone-50' : 'border-stone-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-8 h-8 text-stone-600" />
                            <div>
                              <h4 className="font-semibold text-stone-900">{method.name}</h4>
                              {method.isDefault && (
                                <span className="inline-block px-2 py-1 bg-amber-700 text-white text-xs rounded-full mt-1">
                                  Default
                                </span>
                              )}
                            </div>
                          </div>
                          <button className="text-red-600 hover:text-red-800 font-medium text-sm">
                            Delete
                          </button>
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

                {/* Cash Payment Option */}
                <div className="border-2 border-stone-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Banknote className="w-8 h-8 text-stone-600" />
                    <div>
                      <h4 className="font-semibold text-stone-900">Cash</h4>
                      <p className="text-sm text-stone-600">Pay cash to staff after service</p>
                    </div>
                  </div>
                </div>
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
      </div>
    </div>
  )
}

export default Profile
