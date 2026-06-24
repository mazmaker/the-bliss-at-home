import { useState, useEffect } from 'react'
import {
  Users,
  UserCheck,
  DollarSign,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  RefreshCw,
  Download,
  AlertCircle,
  Star,
  Clock,
  Target,
  ShoppingBag,
  UserPlus,
  Repeat,
  Crown,
  MapPin,
  PhoneCall,
  Smartphone
} from 'lucide-react'
import supabase from '../../../lib/supabase'

interface CustomerSectionProps {
  selectedPeriod: 'daily' | 'weekly' | 'month' | '3_months' | '6_months' | 'year'
}

interface CustomerAnalytics {
  // Overview Metrics
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  activeCustomers: number

  // Engagement Metrics
  averageLifetimeValue: number
  averageBookingsPerCustomer: number
  repeatBookingRate: number
  customerRetentionRate: number
  churnRate: number

  // Demographic Analysis
  genderDistribution: { male: number; female: number; other: number; unknown: number }
  ageDistribution: { '18-25': number; '26-35': number; '36-45': number; '46-55': number; '55+': number; unknown: number }
  topProvinces: Array<{ province: string; count: number; percentage: number }>

  // Behavioral Patterns
  customerSegments: Array<{
    segment: string
    count: number
    percentage: number
    avgSpent: number
    avgBookings: number
    description: string
    criteria: string
  }>

  // Repeat Booking Analysis
  repeatBookingAnalysis: {
    newCustomers: { count: number; avgSpent: number; conversionRate: number }
    returningCustomers: { count: number; avgSpent: number; avgBookings: number }
    repeatRate: number
  }

  // Booking Patterns
  bookingFrequency: Array<{ frequency: string; count: number; percentage: number }>
  preferredServices: Array<{ service: string; count: number; percentage: number }>

  // Customer Journey Analysis
  customerJourney: Array<{
    stage: string
    customers: number
    percentage: number
    description: string
  }>

  // Communication Preferences
  communicationChannels: { phone: number; email: number; line: number }

  // Growth Trends
  customerGrowthTrend: Array<{ month: string; newCustomers: number; totalCustomers: number }>
  loyaltyPointsDistribution: Array<{ range: string; count: number; percentage: number }>
}

function CustomerSection({ selectedPeriod }: CustomerSectionProps) {
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate date ranges based on selected period
  const getDateRange = () => {
    const now = new Date()
    const periodDaysMap = {
      daily: 1,
      weekly: 7,
      month: 30,
      '3_months': 90,
      '6_months': 180,
      year: 365
    }
    const days = periodDaysMap[selectedPeriod] || 30
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    return { startDate, endDate: now, days }
  }

  // Fetch comprehensive customer analytics
  const fetchCustomerAnalytics = async () => {
    setLoading(true)
    setError(null)

    try {
      const { startDate, days } = getDateRange()

      // 1. Get customer overview data (only confirmed existing columns)
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select(`
          id, created_at, total_bookings, total_spent,
          phone, full_name
        `)

      if (customersError) throw customersError

      // 2. Get address data for geographic analysis (optional, may not have data)
      const { data: addresses, error: addressesError } = await supabase
        .from('addresses')
        .select('customer_id, province')
        .eq('is_default', true)

      // Don't fail if addresses don't exist, just log and continue
      if (addressesError) {
        console.warn('Addresses data not available:', addressesError)
      }

      // 3. Get booking data for behavior analysis
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id, customer_id, created_at, final_price, status,
          booking_date, booking_time, service_id,
          services!inner(name_th)
        `)
        .neq('status', 'cancelled')
        .gte('created_at', startDate.toISOString())

      if (bookingsError) throw bookingsError

      // 4. Get all-time booking data for lifetime calculations
      const { data: allBookings, error: allBookingsError } = await supabase
        .from('bookings')
        .select('customer_id, final_price, created_at, status')
        .neq('status', 'cancelled')

      if (allBookingsError) throw allBookingsError

      // Process analytics data
      const analytics = processCustomerAnalytics(customers, addresses, bookings, allBookings, days)
      setAnalytics(analytics)

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to fetch customer analytics'
      const errorCode = err?.code || 'Unknown'
      console.error('Customer analytics error:', err)

      // Provide more specific error messages
      let userFriendlyError = errorMessage
      if (errorCode === '42703') {
        userFriendlyError = `ข้อมูลในฐานข้อมูลยังไม่พร้อม: ${errorMessage}`
      } else if (errorMessage.includes('does not exist')) {
        userFriendlyError = 'ตารางข้อมูลหรือคอลัมน์ที่ต้องการยังไม่พร้อมใช้งาน'
      }

      setError(userFriendlyError)
    } finally {
      setLoading(false)
    }
  }

  // Process raw data into analytics insights
  const processCustomerAnalytics = (
    customers: any[],
    addresses: any[],
    bookings: any[],
    allBookings: any[],
    days: number
  ): CustomerAnalytics => {
    const { startDate } = getDateRange()

    // Basic metrics
    const totalCustomers = customers?.length || 0
    const newCustomers = customers?.filter(c =>
      new Date(c.created_at) >= startDate
    ).length || 0

    // Customer segments based on booking behavior
    const segments = customers?.map(customer => {
      const customerBookings = allBookings?.filter(b => b.customer_id === customer.id) || []
      const totalSpent = customer.total_spent || 0
      const totalBookings = customer.total_bookings || 0

      if (totalBookings === 0) return { customer, segment: 'Inactive', value: 0 }
      if (totalBookings === 1) return { customer, segment: 'One-time', value: totalSpent }
      if (totalBookings <= 5 && totalSpent < 3000) return { customer, segment: 'Casual', value: totalSpent }
      if (totalBookings <= 10 || totalSpent < 8000) return { customer, segment: 'Regular', value: totalSpent }
      return { customer, segment: 'VIP', value: totalSpent }
    }) || []

    // Calculate segment statistics with criteria
    const customerSegments = ['VIP', 'Regular', 'Casual', 'One-time', 'Inactive'].map(segment => {
      const segmentCustomers = segments.filter(s => s.segment === segment)
      const count = segmentCustomers.length
      const percentage = totalCustomers > 0 ? (count / totalCustomers) * 100 : 0
      const avgSpent = count > 0 ? segmentCustomers.reduce((sum, s) => sum + s.value, 0) / count : 0
      const avgBookings = count > 0 ? segmentCustomers.reduce((sum, s) => sum + (s.customer.total_bookings || 0), 0) / count : 0

      const segmentData = {
        'VIP': {
          description: 'ลูกค้า VIP - ใช้บริการบ่อยและใช้จ่ายมาก',
          criteria: 'มากกว่า 10 ครั้ง หรือ ใช้จ่ายเกิน ฿8,000'
        },
        'Regular': {
          description: 'ลูกค้าประจำ - ใช้บริการสม่ำเสมอ',
          criteria: '6-10 ครั้ง หรือ ใช้จ่าย ฿3,000-8,000'
        },
        'Casual': {
          description: 'ลูกค้าทั่วไป - ใช้บริการเป็นครั้งคราว',
          criteria: '2-5 ครั้ง และ ใช้จ่ายต่ำกว่า ฿3,000'
        },
        'One-time': {
          description: 'ลูกค้าใช้บริการครั้งเดียว',
          criteria: 'จองและใช้บริการ 1 ครั้งเท่านั้น'
        },
        'Inactive': {
          description: 'ลูกค้าที่ยังไม่เคยใช้บริการ',
          criteria: 'สมัครแล้วแต่ยังไม่เคยจอง'
        }
      }

      return {
        segment,
        count,
        percentage,
        avgSpent,
        avgBookings,
        description: segmentData[segment as keyof typeof segmentData].description,
        criteria: segmentData[segment as keyof typeof segmentData].criteria
      }
    })

    // Repeat Booking Analysis
    const newCustomersCount = customers?.filter(c => (c.total_bookings || 0) === 1).length || 0
    const returningCustomersCount = customers?.filter(c => (c.total_bookings || 0) > 1).length || 0

    const newCustomersSpent = customers?.filter(c => (c.total_bookings || 0) === 1)
      .reduce((sum, c) => sum + (c.total_spent || 0), 0) || 0
    const returningCustomersSpent = customers?.filter(c => (c.total_bookings || 0) > 1)
      .reduce((sum, c) => sum + (c.total_spent || 0), 0) || 0
    const returningCustomersBookings = customers?.filter(c => (c.total_bookings || 0) > 1)
      .reduce((sum, c) => sum + (c.total_bookings || 0), 0) || 0

    const repeatBookingAnalysis = {
      newCustomers: {
        count: newCustomersCount,
        avgSpent: newCustomersCount > 0 ? newCustomersSpent / newCustomersCount : 0,
        conversionRate: totalCustomers > 0 ? (returningCustomersCount / totalCustomers) * 100 : 0
      },
      returningCustomers: {
        count: returningCustomersCount,
        avgSpent: returningCustomersCount > 0 ? returningCustomersSpent / returningCustomersCount : 0,
        avgBookings: returningCustomersCount > 0 ? returningCustomersBookings / returningCustomersCount : 0
      },
      repeatRate: totalCustomers > 0 ? (returningCustomersCount / totalCustomers) * 100 : 0
    }

    // Customer Journey Analysis
    const totalWithBookings = customers?.filter(c => (c.total_bookings || 0) > 0).length || 0
    const customerJourney = [
      {
        stage: 'ลูกค้าใหม่',
        customers: newCustomersCount,
        percentage: totalWithBookings > 0 ? (newCustomersCount / totalWithBookings) * 100 : 0,
        description: 'ลูกค้าที่ใช้บริการครั้งแรก'
      },
      {
        stage: 'ลูกค้าประจำ',
        customers: returningCustomersCount,
        percentage: totalWithBookings > 0 ? (returningCustomersCount / totalWithBookings) * 100 : 0,
        description: 'ลูกค้าที่กลับมาใช้บริการซ้ำ'
      }
    ]

    // Geographic analysis
    const provinceMap = new Map<string, number>()
    if (addresses && Array.isArray(addresses)) {
      addresses.forEach(addr => {
        if (addr?.province) {
          provinceMap.set(addr.province, (provinceMap.get(addr.province) || 0) + 1)
        }
      })
    }

    const topProvinces = provinceMap.size > 0
      ? Array.from(provinceMap.entries())
          .map(([province, count]) => ({
            province,
            count,
            percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      : [{ province: 'ไม่มีข้อมูลที่อยู่', count: 0, percentage: 0 }]

    // Age distribution - disabled since birth_date column doesn't exist yet
    const ageGroups = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '55+': 0, unknown: totalCustomers }

    // Gender distribution - disabled since gender column doesn't exist yet
    const genderDist = { male: 0, female: 0, other: 0, unknown: totalCustomers }

    // Service preferences
    const serviceMap = new Map<string, number>()
    if (bookings && Array.isArray(bookings)) {
      bookings.forEach(booking => {
        const serviceName = booking.services?.name_th || 'ไม่ระบุบริการ'
        serviceMap.set(serviceName, (serviceMap.get(serviceName) || 0) + 1)
      })
    }

    const preferredServices = serviceMap.size > 0
      ? Array.from(serviceMap.entries())
          .map(([service, count]) => ({
            service,
            count,
            percentage: bookings?.length > 0 ? (count / bookings.length) * 100 : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
      : [{ service: 'ยังไม่มีข้อมูลการจอง', count: 0, percentage: 0 }]

    // Calculate other metrics
    const activeCustomers = customers?.filter(c => c.total_bookings > 0).length || 0
    const returningCustomers = customers?.filter(c => (c.total_bookings || 0) > 1).length || 0
    const averageLifetimeValue = totalCustomers > 0 ?
      customers.reduce((sum, c) => sum + (c.total_spent || 0), 0) / totalCustomers : 0
    const averageBookingsPerCustomer = totalCustomers > 0 ?
      customers.reduce((sum, c) => sum + (c.total_bookings || 0), 0) / totalCustomers : 0
    const repeatBookingRate = activeCustomers > 0 ? (returningCustomers / activeCustomers) * 100 : 0

    // Communication preferences (based on available data)
    const withPhone = customers?.filter(c => c.phone).length || 0
    const communicationChannels = {
      phone: withPhone,
      email: 0, // Email column not available yet
      line: withPhone // Assume phone users can use LINE
    }

    // Customer growth trend (last 6 months)
    const customerGrowthTrend = Array.from({ length: 6 }, (_, i) => {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - (5 - i))
      monthStart.setDate(1)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const monthCustomers = customers?.filter(c => {
        const created = new Date(c.created_at)
        return created >= monthStart && created < monthEnd
      }).length || 0

      return {
        month: monthStart.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }),
        newCustomers: monthCustomers,
        totalCustomers: customers?.filter(c => new Date(c.created_at) < monthEnd).length || 0
      }
    })

    // Calculate loyalty points from total_spent (every 100 THB = 1 point)
    const customersWithPoints = customers?.map(customer => ({
      ...customer,
      calculatedPoints: Math.floor((customer.total_spent || 0) / 100)
    })) || []

    // Loyalty points distribution based on calculated points
    const loyaltyRanges = [
      { range: '0 แต้ม', min: 0, max: 0 },
      { range: '1-50 แต้ม', min: 1, max: 50 },
      { range: '51-100 แต้ม', min: 51, max: 100 },
      { range: '101-200 แต้ม', min: 101, max: 200 },
      { range: '201+ แต้ม', min: 201, max: Infinity }
    ]

    const loyaltyPointsDistribution = loyaltyRanges.map(range => {
      const count = customersWithPoints.filter(c => {
        const points = c.calculatedPoints
        return points >= range.min && (range.max === Infinity ? true : points <= range.max)
      }).length

      return {
        range: range.range,
        count,
        percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0
      }
    })

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      activeCustomers,
      averageLifetimeValue,
      averageBookingsPerCustomer,
      repeatBookingRate,
      customerRetentionRate: 0, // Would need historical data to calculate properly
      churnRate: 0, // Would need historical data to calculate properly
      genderDistribution: genderDist || { male: 0, female: 0, other: 0, unknown: 0 },
      ageDistribution: ageGroups || { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '55+': 0, unknown: 0 },
      topProvinces,
      customerSegments,
      repeatBookingAnalysis,
      bookingFrequency: [], // Would implement if needed
      preferredServices,
      customerJourney,
      communicationChannels,
      customerGrowthTrend,
      loyaltyPointsDistribution
    }
  }

  useEffect(() => {
    fetchCustomerAnalytics()
  }, [selectedPeriod])

  // Format number as Thai currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-2xl h-32"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">เกิดข้อผิดพลาด</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchCustomerAnalytics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    )
  }

  if (!analytics) {
    return <div>ไม่สามารถโหลดข้อมูลได้</div>
  }

  return (
    <div className="space-y-8">
      {/* Header - ใช้ theme เดียวกับโปรแกรม */}
      <div className="bg-gradient-to-r from-bliss-50 to-bliss-100 rounded-2xl p-6 border border-bliss-200 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-bliss-600 to-bliss-700 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-bliss-900">การวิเคราะห์ลูกค้า</h2>
              <p className="text-bliss-500">Customer Analytics Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-white rounded-lg border border-bliss-200">
              <p className="text-bliss-700 text-sm font-medium">ข้อมูลล่าสุด</p>
              <p className="text-bliss-500 text-xs">{new Date().toLocaleDateString('th-TH')}</p>
            </div>
            <button
              onClick={fetchCustomerAnalytics}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-bliss-600 text-white rounded-xl hover:bg-bliss-700 transition-all duration-200 font-medium shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรชข้อมูล
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards - Stone + Amber theme */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">

        <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-bliss-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-bliss-100 rounded-full translate-x-12 -translate-y-12"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-bliss-500 text-sm font-medium mb-1">ลูกค้าทั้งหมด</p>
              <p className="text-3xl font-bold text-bliss-900 mb-1">{analytics.totalCustomers.toLocaleString()}</p>
              <p className="text-xs text-bliss-400">Total Customers</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-bliss-600 to-bliss-700 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-bliss-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-bliss-100 rounded-full translate-x-12 -translate-y-12"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-bliss-500 text-sm font-medium mb-1">ลูกค้าใหม่</p>
              <p className="text-3xl font-bold text-bliss-900 mb-1">{analytics.newCustomers.toLocaleString()}</p>
              <p className="text-xs text-bliss-400">ช่วงที่เลือก</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-bliss-500 to-bliss-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-lg">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-bliss-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-bliss-100 rounded-full translate-x-12 -translate-y-12"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-bliss-500 text-sm font-medium mb-1">อัตราการกลับมา</p>
              <p className="text-3xl font-bold text-bliss-900 mb-1">{formatPercentage(analytics.repeatBookingRate)}</p>
              <p className="text-xs text-bliss-400">Repeat Rate</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-bliss-600 to-bliss-700 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-lg">
              <Repeat className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-bliss-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-bliss-100 rounded-full translate-x-12 -translate-y-12"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-bliss-500 text-sm font-medium mb-1">มูลค่าเฉลี่ย</p>
              <p className="text-3xl font-bold text-bliss-900 mb-1">{formatCurrency(analytics.averageLifetimeValue)}</p>
              <p className="text-xs text-bliss-400">ต่อลูกค้า</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-bliss-400 to-bliss-500 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

      </div>

      {/* Customer Segments - Stone/Amber Theme */}
      <div className="bg-white rounded-2xl border border-bliss-200 shadow-lg overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-bliss-50 to-bliss-100 p-6 border-b border-bliss-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-bliss-900 flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-r from-bliss-600 to-bliss-700 rounded-xl flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                การแบ่งกลุ่มลูกค้า
              </h3>
              <p className="text-bliss-600 text-lg">Customer Segmentation จากข้อมูลการจองจริง</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-bliss-900">{analytics.totalCustomers}</p>
              <p className="text-sm text-bliss-500">ลูกค้าทั้งหมด</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {analytics.customerSegments.map((segment, index) => {
              const segmentStyles = [
                { bg: 'bg-gradient-to-br from-bliss-600 to-bliss-700', icon: '👑', ring: 'ring-bliss-500/20' }, // VIP
                { bg: 'bg-gradient-to-br from-bliss-500 to-bliss-600', icon: '⭐', ring: 'ring-bliss-400/20' },   // Regular
                { bg: 'bg-gradient-to-br from-bliss-600 to-bliss-700', icon: '🌟', ring: 'ring-bliss-500/20' }, // Casual
                { bg: 'bg-gradient-to-br from-bliss-500 to-bliss-600', icon: '💫', ring: 'ring-bliss-400/20' }, // One-time
                { bg: 'bg-gradient-to-br from-bliss-400 to-bliss-500', icon: '😴', ring: 'ring-bliss-300/20' }     // Inactive
              ]

              const style = segmentStyles[index] || segmentStyles[4]

              return (
                <div key={segment.segment} className={`group relative ${style.bg} rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 ring-2 ${style.ring}`}>

                  {/* Background Pattern */}
                  <div className="absolute inset-0 bg-white/5 rounded-2xl"></div>

                  {/* Content */}
                  <div className="relative">
                    <div className="text-center mb-4">
                      <div className="text-3xl mb-2">{style.icon}</div>
                      <h4 className="font-bold text-lg mb-1">{segment.segment}</h4>
                      <div className="text-4xl font-black mb-1">{segment.count}</div>
                      <div className="text-sm opacity-90 font-medium">{formatPercentage(segment.percentage)}</div>
                    </div>

                    <div className="space-y-3 border-t border-white/20 pt-3">
                      <div className="bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                        <p className="text-xs font-medium mb-1">เกณฑ์การแบ่งกลุ่ม:</p>
                        <p className="text-xs opacity-90 leading-relaxed">{segment.criteria}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white/10 rounded-lg p-2 text-center">
                          <p className="font-medium">เฉลี่ย</p>
                          <p className="font-bold">{formatCurrency(segment.avgSpent)}</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-2 text-center">
                          <p className="font-medium">ครั้ง</p>
                          <p className="font-bold">{segment.avgBookings.toFixed(1)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 rounded-2xl transition-all duration-300"></div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Repeat Booking Analysis - Stone/Amber Theme */}
      <div className="bg-white rounded-2xl border border-bliss-200 shadow-lg overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-bliss-600 to-bliss-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Repeat className="w-6 h-6" />
                </div>
                พฤติกรรมการจองซ้ำ
              </h3>
              <p className="text-bliss-100 text-lg">การวิเคราะห์ลูกค้าเก่าและลูกค้าใหม่</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{formatPercentage(analytics.repeatBookingAnalysis.repeatRate)}</div>
              <div className="text-bliss-100 text-sm">อัตราการกลับมา</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* New Customers Card */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-bliss-500 to-bliss-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-bliss-50 to-bliss-100 rounded-2xl p-6 border border-bliss-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-bliss-600 to-bliss-700 rounded-xl flex items-center justify-center">
                      <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-bliss-900">ลูกค้าใหม่</h4>
                      <p className="text-bliss-600 text-sm">First-time Customers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-bliss-700">{analytics.repeatBookingAnalysis.newCustomers.count}</div>
                    <div className="text-bliss-600 text-sm">คน</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/70 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-bliss-800">{formatCurrency(analytics.repeatBookingAnalysis.newCustomers.avgSpent)}</div>
                    <div className="text-bliss-600 text-xs">ใช้จ่ายเฉลี่ย</div>
                  </div>
                  <div className="bg-white/70 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-bliss-800">{formatPercentage(analytics.repeatBookingAnalysis.newCustomers.conversionRate)}</div>
                    <div className="text-bliss-600 text-xs">อัตราการกลับมา</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Returning Customers Card */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-bliss-500 to-bliss-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-bliss-50 to-bliss-100 rounded-2xl p-6 border border-bliss-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-bliss-600 to-bliss-700 rounded-xl flex items-center justify-center">
                      <Repeat className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-bliss-900">ลูกค้าเก่า</h4>
                      <p className="text-bliss-600 text-sm">Returning Customers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-bliss-700">{analytics.repeatBookingAnalysis.returningCustomers.count}</div>
                    <div className="text-bliss-600 text-sm">คน</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/70 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-bliss-800">{formatCurrency(analytics.repeatBookingAnalysis.returningCustomers.avgSpent)}</div>
                    <div className="text-bliss-600 text-xs">ใช้จ่ายเฉลี่ย</div>
                  </div>
                  <div className="bg-white/70 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-bliss-800">{analytics.repeatBookingAnalysis.returningCustomers.avgBookings.toFixed(1)}</div>
                    <div className="text-bliss-600 text-xs">จองเฉลี่ย (ครั้ง)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-bliss-500 to-bliss-600 rounded-2xl blur opacity-10"></div>
            <div className="relative bg-gradient-to-r from-bliss-50 to-bliss-100 rounded-2xl p-6 border border-bliss-200">
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-r from-bliss-600 to-bliss-700 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-bliss-900">อัตราการจองซ้ำโดยรวม</h4>
                    <p className="text-bliss-600">Overall Repeat Booking Rate</p>
                  </div>
                </div>
                <div className="text-5xl font-black text-bliss-700 mb-2">{formatPercentage(analytics.repeatBookingAnalysis.repeatRate)}</div>
                <div className="text-bliss-600 text-lg font-medium">ของลูกค้าทั้งหมดกลับมาใช้บริการซ้ำ</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Customer Status Distribution */}
        <div className="bg-white rounded-2xl border border-bliss-200 shadow-lg">
          <div className="p-6 border-b border-bliss-200">
            <h3 className="text-xl font-bold text-bliss-900">สถานะลูกค้า</h3>
            <p className="text-bliss-600">Customer Status Distribution</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { key: 'active', label: 'ใช้งานปกติ', color: 'bg-green-500', count: analytics.totalCustomers },
                { key: 'inactive', label: 'ไม่ใช้งาน', color: 'bg-gray-500', count: 0 }
              ].map(item => {
                const percentage = analytics.totalCustomers > 0 ? (item.count / analytics.totalCustomers) * 100 : 0
                return (
                  <div key={item.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded ${item.color}`}></div>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{item.count}</span>
                      <span className="text-bliss-500 ml-2">({formatPercentage(percentage)})</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Contact Information Completeness */}
        <div className="bg-white rounded-2xl border border-bliss-200 shadow-lg">
          <div className="p-6 border-b border-bliss-200">
            <h3 className="text-xl font-bold text-bliss-900">ข้อมูลการติดต่อ</h3>
            <p className="text-bliss-600">Contact Information</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { key: 'phone', label: 'มีเบอร์โทร', color: 'bg-blue-500', count: analytics.communicationChannels.phone },
                { key: 'no_phone', label: 'ไม่มีเบอร์โทร', color: 'bg-gray-500', count: analytics.totalCustomers - analytics.communicationChannels.phone }
              ].map(item => {
                const percentage = analytics.totalCustomers > 0 ? (item.count / analytics.totalCustomers) * 100 : 0
                return (
                  <div key={item.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded ${item.color}`}></div>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{item.count}</span>
                      <span className="text-bliss-500 ml-2">({formatPercentage(percentage)})</span>
                    </div>
                  </div>
                )
              })}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">หมายเหตุ:</span> ข้อมูลอีเมลจะเพิ่มเติมในเร็วๆ นี้
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Provinces */}
        <div className="bg-white rounded-2xl border border-bliss-200 shadow-lg">
          <div className="p-6 border-b border-bliss-200">
            <h3 className="text-xl font-bold text-bliss-900 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-green-500" />
              จังหวัดที่มีลูกค้ามากที่สุด
            </h3>
            <p className="text-bliss-600">Top Provinces</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {analytics.topProvinces.slice(0, 8).map((province, index) => (
                <div key={province.province} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-bliss-500 w-6">#{index + 1}</span>
                    <span className="font-medium">{province.province}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{province.count}</span>
                    <span className="text-bliss-500 ml-2">({formatPercentage(province.percentage)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preferred Services - Stone/Amber Theme */}
      <div className="bg-white rounded-2xl border border-bliss-200 shadow-lg overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-bliss-600 to-bliss-700 p-6 text-white">
          <h3 className="text-2xl font-bold flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6" />
            </div>
            บริการที่ได้รับความนิยม
          </h3>
          <p className="text-bliss-100 text-lg">Most Popular Services</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.preferredServices.map((service, index) => {
              const rankColors = [
                'bg-gradient-to-r from-yellow-400 to-orange-500 text-white', // #1
                'bg-gradient-to-r from-gray-300 to-gray-400 text-white',     // #2
                'bg-gradient-to-r from-orange-300 to-orange-400 text-white', // #3
                'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',   // #4+
                'bg-gradient-to-r from-purple-500 to-violet-500 text-white',
                'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
                'bg-gradient-to-r from-pink-500 to-rose-500 text-white',
                'bg-gradient-to-r from-cyan-500 to-teal-500 text-white'
              ]

              const bgColors = [
                'from-bliss-50 to-bliss-100 border-bliss-200',
                'from-bliss-50 to-bliss-100 border-bliss-200',
                'from-bliss-50 to-orange-50 border-bliss-200',
                'from-bliss-100 to-bliss-150 border-bliss-200',
                'from-bliss-100 to-bliss-150 border-bliss-200',
                'from-bliss-50 to-bliss-100 border-bliss-200',
                'from-bliss-50 to-bliss-100 border-bliss-200',
                'from-bliss-100 to-bliss-150 border-bliss-200'
              ]

              return (
                <div key={service.service} className={`group relative bg-gradient-to-br ${bgColors[index] || bgColors[3]} rounded-2xl p-5 border transition-all duration-300 hover:shadow-lg`}>

                  {/* Rank Badge */}
                  <div className="absolute -top-3 -left-3 z-10">
                    <div className={`w-8 h-8 ${rankColors[index] || rankColors[3]} rounded-full flex items-center justify-center text-sm font-bold shadow-lg`}>
                      #{index + 1}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex-1 pr-4">
                      <h4 className="font-bold text-bliss-900 text-lg mb-1 group-hover:text-bliss-700 transition-colors">
                        {service.service}
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-bliss-800">{service.count}</div>
                        <div className="text-sm text-bliss-500">ครั้ง</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${index < 3 ? 'bg-white/70 text-bliss-800' : 'bg-bliss-100 text-bliss-700'}`}>
                        {formatPercentage(service.percentage)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 bg-white/50 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ease-out ${rankColors[index]?.replace('text-white', '') || rankColors[3]?.replace('text-white', '')}`}
                      style={{ width: `${service.percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Customer Growth Trend */}
      <div className="bg-white rounded-2xl border border-bliss-200 shadow-lg">
        <div className="p-6 border-b border-bliss-200">
          <h3 className="text-xl font-bold text-bliss-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-500" />
            แนวโน้มการเติบโตของลูกค้า
          </h3>
          <p className="text-bliss-600">Customer Growth Trend (6 เดือนย้อนหลัง)</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {analytics.customerGrowthTrend.map((month, index) => (
              <div key={index} className="text-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                <p className="font-semibold text-bliss-900">{month.month}</p>
                <p className="text-2xl font-bold text-blue-600">{month.newCustomers}</p>
                <p className="text-sm text-bliss-500">ลูกค้าใหม่</p>
                <p className="text-xs text-bliss-400 mt-1">รวม: {month.totalCustomers}</p>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Communication Channels - Available Data Only */}
      <div className="bg-white rounded-2xl border border-bliss-200 shadow-lg">
        <div className="p-6 border-b border-bliss-200">
          <h3 className="text-xl font-bold text-bliss-900 flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-blue-500" />
            ช่องทางการติดต่อ
          </h3>
          <p className="text-bliss-600">Communication Channels</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-6 bg-green-50 rounded-xl">
              <PhoneCall className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <p className="text-2xl font-bold text-green-700">{analytics.communicationChannels.phone}</p>
              <p className="text-green-600 font-medium">เบอร์โทร</p>
              <p className="text-sm text-bliss-500">
                {formatPercentage((analytics.communicationChannels.phone / analytics.totalCustomers) * 100)}
              </p>
            </div>
            <div className="text-center p-6 bg-purple-50 rounded-xl">
              <Users className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <p className="text-2xl font-bold text-purple-700">{analytics.communicationChannels.line}</p>
              <p className="text-purple-600 font-medium">LINE (ประมาณ)</p>
              <p className="text-sm text-bliss-500">ตามเบอร์โทร</p>
            </div>
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-xl text-center">
            <p className="text-blue-700 font-medium">ข้อมูลอีเมลจะเพิ่มเติมเร็วๆ นี้</p>
            <p className="text-sm text-blue-600">Email analytics coming soon</p>
          </div>
        </div>
      </div>

      {/* Loyalty Points Distribution - Real Data */}
      <div className="bg-white rounded-2xl border border-bliss-200 shadow-lg">
        <div className="p-6 border-b border-bliss-200">
          <h3 className="text-xl font-bold text-bliss-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-bliss-500" />
            การแจกแจงแต้มสะสม
          </h3>
          <p className="text-bliss-600">Loyalty Points Distribution (คำนวณจากยอดใช้จ่าย: ฿100 = 1 แต้ม)</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {analytics.loyaltyPointsDistribution.map((range, index) => {
              const colors = [
                'from-bliss-400 to-bliss-500',   // 0 แต้ม
                'from-bliss-500 to-bliss-600',   // 1-50 แต้ม
                'from-bliss-500 to-bliss-600',   // 51-100 แต้ม
                'from-bliss-600 to-bliss-700',   // 101-200 แต้ม
                'from-bliss-700 to-bliss-800'    // 201+ แต้ม
              ]
              return (
                <div key={range.range} className={`bg-gradient-to-r ${colors[index]} rounded-xl p-4 text-white text-center`}>
                  <h4 className="font-semibold text-lg">{range.range}</h4>
                  <p className="text-3xl font-bold">{range.count}</p>
                  <p className="text-sm opacity-90">{formatPercentage(range.percentage)}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-6 p-4 bg-bliss-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-bliss-600" />
              <h4 className="font-semibold text-bliss-900">วิธีการคำนวณแต้ม</h4>
            </div>
            <div className="text-sm text-bliss-700 space-y-1">
              <p>• ทุก ฿100 ที่ใช้จ่าย = 1 แต้ม</p>
              <p>• คำนวณจากยอดใช้จ่ายทั้งหมดของลูกค้า (total_spent)</p>
              <p>• แต้มจะสะสมตามการใช้บริการจริง</p>
            </div>
          </div>

          {/* Top Point Earners */}
          <div className="mt-6">
            <h4 className="font-semibold text-bliss-900 mb-4">ลูกค้าที่มีแต้มสะสมสูงสุด Top 5</h4>
            <div className="space-y-2">
              {analytics.loyaltyPointsDistribution
                .filter(range => range.count > 0 && range.range !== '0 แต้ม')
                .slice(0, 5)
                .map((range, index) => (
                  <div key={range.range} className="flex items-center justify-between p-3 bg-bliss-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-bliss-500 w-6">#{index + 1}</span>
                      <span className="font-medium">{range.range}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-bliss-600">{range.count} คน</span>
                      <span className="text-bliss-500 ml-2">({formatPercentage(range.percentage)})</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerSection