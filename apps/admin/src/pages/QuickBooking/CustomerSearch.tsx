import { useState, useEffect } from 'react'
import { Search, Plus, User, Phone, MapPin, Clock, ArrowRight } from 'lucide-react'
import { customerService } from '@bliss/supabase'
import { supabase } from '../../lib/supabase'

// Mock customers for testing when database is empty
const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'mock-customer-1',
    full_name: 'นางสาวทดสอบ ลูกค้าหนึ่ง',
    phone: '0812345678',
    birth_date: '1990-05-15',
    gender: 'female',
    total_bookings: 5,
    total_spent: 2500,
    loyalty_points: 150,
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-03-20T14:30:00Z',
    created_by_admin: false
  },
  {
    id: 'mock-customer-2',
    full_name: 'นายทดสอบ ลูกค้าสอง',
    phone: '0898765432',
    birth_date: '1985-12-03',
    gender: 'male',
    total_bookings: 12,
    total_spent: 8400,
    loyalty_points: 350,
    status: 'active',
    created_at: '2023-11-20T09:15:00Z',
    updated_at: '2024-03-18T16:45:00Z',
    created_by_admin: true
  }
]

// Mock addresses for testing auto-prefill
const MOCK_ADDRESSES = [
  {
    id: 'mock-address-1',
    customer_id: 'mock-customer-1',
    label: 'บ้าน',
    address_line: '123/45 หมู่บ้านสุขสันต์ ซอยรัชดา 15',
    district: 'หลักสี่',
    subdistrict: 'หลักสี่',
    province: '10',
    zipcode: '10210',
    latitude: 13.8847,
    longitude: 100.5775,
    is_default: true,
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 'mock-address-2',
    customer_id: 'mock-customer-2',
    label: 'ที่ทำงาน',
    address_line: '999 อาคารเอเซีย เซ็นเตอร์ ชั้น 25',
    district: 'บางนา',
    subdistrict: 'บางนา',
    province: '10',
    zipcode: '10260',
    latitude: 13.6904,
    longitude: 100.6089,
    is_default: true,
    created_at: '2023-11-20T09:15:00Z'
  }
]

function getMockCustomers(query: string): Customer[] {
  if (!query || query.length < 2) return []

  const searchTerm = query.toLowerCase()
  return MOCK_CUSTOMERS.filter(customer =>
    customer.full_name.toLowerCase().includes(searchTerm) ||
    customer.phone.includes(searchTerm)
  )
}

interface Customer {
  id: string
  profile_id?: string
  full_name: string
  phone: string
  birth_date?: string
  gender?: string
  avatar_url?: string
  total_bookings: number
  total_spent: number
  loyalty_points: number
  created_at: string
  updated_at: string
  status: string
  created_by_admin?: boolean
  email?: string // Email from customers table
}

interface Props {
  selectedCustomer?: Customer
  onCustomerSelect: (customer: Customer) => void
  onNext?: () => void
}

export default function CustomerSearch({ selectedCustomer, onCustomerSelect, onNext }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    full_name: '',
    phone: '',
    birth_date: '',
    gender: '',
    admin_notes: ''
  })
  const [createError, setCreateError] = useState('')
  const [usingMockData, setUsingMockData] = useState(false)


  // Test database connection and optionally create test data (explicit testing only)
  const testDatabaseConnection = async (showAlerts = true) => {
    try {
      console.log('🧪 Testing database connection...')

      // Test 1: Check if we can connect
      const { data: countResult, error: connectionError, count } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      if (connectionError) {
        console.error('❌ Database connection failed:', connectionError)
        if (showAlerts) {
          alert('❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้: ' + connectionError.message)
        }
        return false
      }

      console.log('✅ Database connected! Customer count:', count)

      // Test 2: Try to get any customers
      const { data: allCustomers, error: dataError } = await supabase
        .from('customers')
        .select('id, full_name, phone, total_bookings, total_spent')
        .limit(10)

      if (dataError) {
        console.error('❌ Data fetch failed:', dataError)
        if (showAlerts) {
          alert('❌ ไม่สามารถดึงข้อมูลได้: ' + dataError.message)
        }
        return false
      }

      console.log('📊 Customers in database:', allCustomers)

      // Only show interactive dialogs when explicitly testing
      if (showAlerts) {
        if (count === 0) {
          const shouldCreate = confirm(`📊 ฐานข้อมูลว่าง (${count} customers)\n\nต้องการสร้างข้อมูลทดสอบไหม?`)
          if (shouldCreate) {
            await createTestCustomers()
          }
        } else {
          alert(`✅ เชื่อมต่อสำเร็จ!\n📊 มีลูกค้า ${count} คน\n🔍 ลองค้นหาด้วยชื่อ หรือ เบอร์โทร`)
        }
      }

      return true

    } catch (error) {
      console.error('❌ Connection test failed:', error)
      if (showAlerts) {
        alert('❌ เกิดข้อผิดพลาด: ' + error.message)
      }
      return false
    }
  }

  // Create test customers
  const createTestCustomers = async () => {
    try {
      console.log('🔧 Creating test customers...')

      const testCustomers = [
        {
          full_name: 'ทดสอบ ลูกค้าหนึ่ง',
          phone: '0812345678',
          birth_date: '1990-05-15',
          gender: 'female'
        },
        {
          full_name: 'ทดสอบ ลูกค้าสอง',
          phone: '0898765432',
          birth_date: '1985-12-03',
          gender: 'male'
        }
      ]

      const results = []
      for (const customerData of testCustomers) {
        try {
          const result = await customerService.createCustomerForAdmin(supabase, customerData)
          results.push(result)
          console.log('✅ Created customer:', result.full_name)
        } catch (err) {
          console.error('❌ Failed to create customer:', customerData.full_name, err)
        }
      }

      alert(`✅ สร้างข้อมูลทดสอบเรียบร้อย (${results.length} คน)\n🔍 ลองค้นหาด้วย "ทดสอบ" หรือ "081"`)

    } catch (error) {
      console.error('❌ Failed to create test customers:', error)
      alert('❌ ไม่สามารถสร้างข้อมูลทดสอบได้: ' + error.message)
    }
  }

  // Search customers
  const searchCustomers = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([])
      setUsingMockData(false)
      return
    }

    setIsLoading(true)
    try {
      console.log('🔍 Searching customers for:', query.trim())

      // First, let's test a simple query to see if there are ANY customers
      const { data: allCustomers, error: testError } = await supabase
        .from('customers')
        .select('id, full_name, phone')
        .limit(5)

      console.log('🧪 Test query - All customers:', allCustomers)
      console.log('🧪 Test error:', testError)

      const results = await customerService.searchCustomersForAdmin(supabase, query.trim())
      console.log('📊 Search results from database:', results)
      setSearchResults(results)

      // If no results and in development, use mock data for testing
      if (results.length === 0 && import.meta.env.DEV) {
        console.log('⚠️ No customers found in database - using mock data for testing')
        const mockResults = getMockCustomers(query.trim())
        setSearchResults(mockResults)
        setUsingMockData(true)
        return
      }

      setUsingMockData(false)
    } catch (error) {
      console.error('❌ Search error:', error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Create new customer
  const createCustomer = async () => {
    if (!createFormData.full_name || !createFormData.phone) {
      setCreateError('กรุณากรอกชื่อและเบอร์โทรศัพท์')
      return
    }

    setIsLoading(true)
    setCreateError('')

    try {
      const newCustomer = await customerService.createCustomerForAdmin(supabase, createFormData)
      onCustomerSelect(newCustomer)
      setShowCreateForm(false)
      setCreateFormData({
        full_name: '',
        phone: '',
        birth_date: '',
        gender: '',
        admin_notes: ''
      })
    } catch (error: any) {
      setCreateError(error.message || 'เกิดข้อผิดพลาดในการสร้างลูกค้า')
    } finally {
      setIsLoading(false)
    }
  }

  // Format phone number for display
  const formatPhone = (phone: string) => {
    if (phone.length === 10) {
      return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`
    }
    return phone
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">ค้นหาลูกค้า</h2>
          <p className="text-stone-600">ค้นหาลูกค้าด้วยเบอร์โทร, ชื่อ, หรือ email</p>
        </div>
        {import.meta.env.DEV && (
          <button
            onClick={() => testDatabaseConnection(true)}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔧 ทดสอบ DB
          </button>
        )}
      </div>

      {/* Selected Customer Display */}
      {selectedCustomer && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                {selectedCustomer.avatar_url ? (
                  <img src={selectedCustomer.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-green-600" />
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <h3 className="text-lg font-semibold text-green-900">{selectedCustomer.full_name}</h3>
                  <div className="flex items-center gap-4 text-sm text-green-700 mt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {formatPhone(selectedCustomer.phone)}
                    </span>
                    {selectedCustomer.email && (
                      <span>{selectedCustomer.email}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-green-600">
                      <span className="font-medium">การจอง:</span> {selectedCustomer.total_bookings} ครั้ง
                    </p>
                    <p className="text-green-600">
                      <span className="font-medium">ยอดรวม:</span> {formatCurrency(selectedCustomer.total_spent)}
                    </p>
                    <p className="text-green-600">
                      <span className="font-medium">แต้มสะสม:</span> {selectedCustomer.loyalty_points} แต้ม
                    </p>
                  </div>
                  <div className="space-y-1">
                    {selectedCustomer.birth_date && (
                      <p className="text-green-600">
                        <span className="font-medium">วันเกิด:</span> {formatDate(selectedCustomer.birth_date)}
                      </p>
                    )}
                    {selectedCustomer.gender && (
                      <p className="text-green-600">
                        <span className="font-medium">เพศ:</span> {selectedCustomer.gender === 'male' ? 'ชาย' : selectedCustomer.gender === 'female' ? 'หญิง' : 'อื่นๆ'}
                      </p>
                    )}
                    <p className="text-green-600">
                      <span className="font-medium">สถานะ:</span> {selectedCustomer.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                    </p>
                  </div>
                </div>

                {selectedCustomer.created_by_admin && (
                  <div className="inline-flex items-center bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-medium">
                    สร้างโดย Admin
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => onCustomerSelect(undefined as any)}
              className="text-stone-400 hover:text-stone-600 px-3 py-1 rounded-lg hover:bg-stone-100 text-sm"
            >
              เปลี่ยน
            </button>
          </div>
        </div>
      )}

      {/* Search Interface */}
      {!selectedCustomer && (
        <>
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ลองค้นหา: ทดสอบ, 081, email@example.com"
              className="w-full pl-10 pr-4 py-3 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
            />
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="border border-stone-200 rounded-xl max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-stone-500">
                  <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  กำลังค้นหา...
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  {usingMockData && (
                    <div className="bg-yellow-50 border-b border-yellow-200 p-3 text-center">
                      <p className="text-yellow-800 text-sm">
                        🧪 <strong>ข้อมูลทดสอบ:</strong> ฐานข้อมูลยังไม่มีลูกค้า แสดงข้อมูล Mock สำหรับทดสอบ
                      </p>
                    </div>
                  )}
                  <div className="divide-y divide-stone-100">
                    {searchResults.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => onCustomerSelect(customer)}
                      className="p-4 hover:bg-stone-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-stone-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-stone-900">{customer.full_name}</h3>
                            <div className="flex items-center gap-4 text-sm text-stone-500">
                              <span className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {formatPhone(customer.phone)}
                              </span>
                              {customer.email && (
                                <span>{customer.email}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-stone-400 mt-1">
                              <span>การจอง: {customer.total_bookings} ครั้ง</span>
                              <span>ยอดรวม: {formatCurrency(customer.total_spent)}</span>
                              <span>แต้ม: {customer.loyalty_points}</span>
                              {customer.created_by_admin && (
                                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">
                                  Admin
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-stone-400" />
                      </div>
                    </div>
                  ))}
                  </div>
                </>
              ) : searchQuery.length >= 2 ? (
                <div className="p-8 text-center text-stone-500">
                  <User className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <p className="mb-4">ไม่พบลูกค้า "{searchQuery}"</p>
                  <button
                    onClick={() => {
                      setShowCreateForm(true)
                      setCreateFormData(prev => ({
                        ...prev,
                        phone: searchQuery.replace(/[^\d]/g, '').slice(0, 10)
                      }))
                    }}
                    className="bg-amber-600 text-white px-4 py-2 rounded-xl hover:bg-amber-700 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    สร้างลูกค้าใหม่
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* Create New Customer Button */}
          {!searchQuery && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full border-2 border-dashed border-stone-300 rounded-xl p-6 hover:border-amber-400 hover:bg-amber-50 transition-colors"
            >
              <Plus className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-stone-600 font-medium">สร้างลูกค้าใหม่</p>
              <p className="text-stone-400 text-sm">สำหรับลูกค้าที่ไม่เคยใช้บริการ</p>
            </button>
          )}
        </>
      )}

      {/* Create Customer Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">สร้างลูกค้าใหม่</h3>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {createError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  value={createFormData.full_name}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="กรอกชื่อลูกค้า"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  เบอร์โทรศัพท์ *
                </label>
                <input
                  type="tel"
                  value={createFormData.phone}
                  onChange={(e) => setCreateFormData(prev => ({
                    ...prev,
                    phone: e.target.value.replace(/[^\d]/g, '').slice(0, 10)
                  }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="0812345678"
                />
              </div>


              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    วันเกิด
                  </label>
                  <input
                    type="date"
                    value={createFormData.birth_date}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    เพศ
                  </label>
                  <select
                    value={createFormData.gender}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">เลือกเพศ</option>
                    <option value="male">ชาย</option>
                    <option value="female">หญิง</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  หมายเหตุ (Admin)
                </label>
                <input
                  type="text"
                  value={createFormData.admin_notes}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, admin_notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="หมายเหตุเพิ่มเติม"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setCreateError('')
                }}
                className="px-4 py-2 text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                disabled={isLoading}
              >
                ยกเลิก
              </button>
              <button
                onClick={createCustomer}
                disabled={isLoading || !createFormData.full_name || !createFormData.phone}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                สร้างลูกค้า
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Next Button */}
      {selectedCustomer && onNext && (
        <div className="flex justify-end">
          <button
            onClick={onNext}
            className="bg-amber-600 text-white px-6 py-3 rounded-xl hover:bg-amber-700 transition-colors flex items-center gap-2"
          >
            ถัดไป: เลือกบริการ
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}