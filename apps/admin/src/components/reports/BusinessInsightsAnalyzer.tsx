import { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  DollarSign,
  Users,
  Star,
  Calendar,
  Award,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle
} from 'lucide-react'
import supabase from '../../lib/supabase'

interface BusinessMetrics {
  totalRevenue: number
  revenueGrowth: number
  totalBookings: number
  bookingGrowth: number
  completionRate: number
  cancellationRate: number
  avgBookingValue: number
  customerRetentionRate: number
  staffUtilization: number
  avgServiceRating: number
}

interface BusinessInsight {
  type: 'success' | 'warning' | 'danger' | 'info'
  category: 'revenue' | 'operations' | 'customer' | 'staff'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  recommendation: string
  metric?: number
  target?: number
}

interface BusinessInsightsAnalyzerProps {
  selectedPeriod: 'daily' | 'weekly' | 'month' | '3_months' | '6_months' | 'year'
}

function BusinessInsightsAnalyzer({ selectedPeriod }: BusinessInsightsAnalyzerProps) {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null)
  const [insights, setInsights] = useState<BusinessInsight[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate metrics and generate insights
  const analyzeBusinessData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const days = {
        daily: 1,
        weekly: 7,
        month: 30,
        '3_months': 90,
        '6_months': 180,
        year: 365
      }[selectedPeriod]

      const currentPeriodStart = new Date()
      currentPeriodStart.setDate(currentPeriodStart.getDate() - days)

      const previousPeriodStart = new Date(currentPeriodStart)
      previousPeriodStart.setDate(previousPeriodStart.getDate() - days)

      // Fetch current period data
      const { data: currentBookings, error: currentError } = await supabase
        .from('bookings')
        .select('status, final_price, created_at, customer_id, staff_id')
        .gte('created_at', currentPeriodStart.toISOString())

      if (currentError) throw currentError

      // Fetch previous period data for comparison
      const { data: previousBookings, error: previousError } = await supabase
        .from('bookings')
        .select('status, final_price, created_at')
        .gte('created_at', previousPeriodStart.toISOString())
        .lt('created_at', currentPeriodStart.toISOString())

      if (previousError) throw previousError

      // Fetch staff data
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, rating, status')
        .eq('status', 'active')

      if (staffError) throw staffError

      // Calculate metrics
      const calculatedMetrics = calculateBusinessMetrics(
        currentBookings || [],
        previousBookings || [],
        staffData || []
      )

      setMetrics(calculatedMetrics)

      // Generate insights
      const generatedInsights = generateBusinessInsights(calculatedMetrics)
      setInsights(generatedInsights)

    } catch (err: any) {
      console.error('Error analyzing business data:', err)
      setError(err.message || 'ไม่สามารถวิเคราะห์ข้อมูลได้')
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate business metrics
  const calculateBusinessMetrics = (
    currentBookings: any[],
    previousBookings: any[],
    staffData: any[]
  ): BusinessMetrics => {
    // Current period calculations
    const currentCompleted = currentBookings.filter(b => b.status === 'completed')
    const currentCancelled = currentBookings.filter(b => b.status === 'cancelled')
    const currentRevenue = currentCompleted.reduce((sum, b) => sum + (b.final_price || 0), 0)

    // Previous period calculations
    const previousCompleted = previousBookings.filter(b => b.status === 'completed')
    const previousRevenue = previousCompleted.reduce((sum, b) => sum + (b.final_price || 0), 0)

    // Growth calculations
    const revenueGrowth = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0

    const bookingGrowth = previousBookings.length > 0
      ? ((currentBookings.length - previousBookings.length) / previousBookings.length) * 100
      : 0

    // Rates and averages
    const completionRate = currentBookings.length > 0
      ? (currentCompleted.length / currentBookings.length) * 100
      : 0

    const cancellationRate = currentBookings.length > 0
      ? (currentCancelled.length / currentBookings.length) * 100
      : 0

    const avgBookingValue = currentCompleted.length > 0
      ? currentRevenue / currentCompleted.length
      : 0

    // Customer retention (simplified)
    const uniqueCustomers = new Set(currentBookings.map(b => b.customer_id))
    const repeatCustomers = currentBookings.reduce((acc, booking) => {
      const customerId = booking.customer_id
      if (customerId) {
        acc[customerId] = (acc[customerId] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const customerRetentionRate = uniqueCustomers.size > 0
      ? (Object.values(repeatCustomers).filter(count => count > 1).length / uniqueCustomers.size) * 100
      : 0

    // Staff metrics
    const staffWithBookings = new Set(currentBookings.map(b => b.staff_id))
    const staffUtilization = staffData.length > 0
      ? (staffWithBookings.size / staffData.length) * 100
      : 0

    const avgServiceRating = staffData.length > 0
      ? staffData.reduce((sum, s) => sum + (s.rating || 0), 0) / staffData.length
      : 0

    return {
      totalRevenue: currentRevenue,
      revenueGrowth,
      totalBookings: currentBookings.length,
      bookingGrowth,
      completionRate,
      cancellationRate,
      avgBookingValue,
      customerRetentionRate,
      staffUtilization,
      avgServiceRating
    }
  }

  // Generate business insights based on metrics
  const generateBusinessInsights = (metrics: BusinessMetrics): BusinessInsight[] => {
    const insights: BusinessInsight[] = []

    // Revenue insights
    if (metrics.revenueGrowth > 10) {
      insights.push({
        type: 'success',
        category: 'revenue',
        title: 'รายได้เติบโตดีเยี่ยม',
        description: `รายได้เพิ่มขึ้น ${metrics.revenueGrowth.toFixed(1)}% เทียบกับช่วงก่อนหน้า`,
        impact: 'high',
        recommendation: 'ควรรักษาและขยายกลยุทธ์ปัจจุบันให้มากขึ้น พิจารณาเพิ่มบริการหรือขยายพื้นที่การให้บริการ',
        metric: metrics.revenueGrowth,
        target: 15
      })
    } else if (metrics.revenueGrowth < -5) {
      insights.push({
        type: 'danger',
        category: 'revenue',
        title: 'รายได้ลดลงอย่างต่อเนื่อง',
        description: `รายได้ลดลง ${Math.abs(metrics.revenueGrowth).toFixed(1)}% เทียบกับช่วงก่อนหน้า`,
        impact: 'high',
        recommendation: 'ควรทบทวนกลยุทธ์การตลาด เพิ่มโปรโมชั่น หรือปรับปรุงคุณภาพการบริการ',
        metric: metrics.revenueGrowth,
        target: 0
      })
    }

    // Booking completion insights
    if (metrics.completionRate < 80) {
      insights.push({
        type: 'warning',
        category: 'operations',
        title: 'อัตราการเสร็จสิ้นงานต่ำ',
        description: `การจองเสร็จสิ้นเพียง ${metrics.completionRate.toFixed(1)}% ซึ่งต่ำกว่าเป้าหมาย`,
        impact: 'high',
        recommendation: 'ตรวจสอบสาเหตุการยกเลิกหรือไม่สำเร็จ ปรับปรุงระบบการติดตามและแจ้งเตือน',
        metric: metrics.completionRate,
        target: 85
      })
    } else if (metrics.completionRate > 90) {
      insights.push({
        type: 'success',
        category: 'operations',
        title: 'อัตราการเสร็จสิ้นงานสูงมาก',
        description: `การจองเสร็จสิ้น ${metrics.completionRate.toFixed(1)}% แสดงถึงความเชื่อถือได้สูง`,
        impact: 'medium',
        recommendation: 'รักษาระดับการให้บริการนี้และใช้เป็นจุดขายในการตลาด',
        metric: metrics.completionRate,
        target: 95
      })
    }

    // Cancellation rate insights
    if (metrics.cancellationRate > 15) {
      insights.push({
        type: 'danger',
        category: 'operations',
        title: 'อัตราการยกเลิกสูงเกินไป',
        description: `มีการยกเลิก ${metrics.cancellationRate.toFixed(1)}% ซึ่งสูงกว่าปกติ`,
        impact: 'high',
        recommendation: 'วิเคราะห์สาเหตุการยกเลิก ปรับปรุงนโยบายการยกเลิก หรือเพิ่มความยืดหยุ่นในการจอง',
        metric: metrics.cancellationRate,
        target: 10
      })
    }

    // Average booking value insights
    if (metrics.avgBookingValue < 800) {
      insights.push({
        type: 'info',
        category: 'revenue',
        title: 'มูลค่าเฉลี่ยต่อการจองยังต่ำ',
        description: `มูลค่าเฉลี่ย ฿${metrics.avgBookingValue.toLocaleString()} ต่อการจอง`,
        impact: 'medium',
        recommendation: 'เพิ่ม upselling และ cross-selling เสนอแพ็กเกจบริการ หรือบริการเสริม',
        metric: metrics.avgBookingValue,
        target: 1200
      })
    } else if (metrics.avgBookingValue > 1500) {
      insights.push({
        type: 'success',
        category: 'revenue',
        title: 'มูลค่าเฉลี่ยต่อการจองสูงดี',
        description: `มูลค่าเฉลี่ย ฿${metrics.avgBookingValue.toLocaleString()} ต่อการจองสูงกว่าเป้าหมาย`,
        impact: 'medium',
        recommendation: 'รักษาระดับนี้และขยายกลุ่มลูกค้าที่มีกำลังซื้อสูง',
        metric: metrics.avgBookingValue,
        target: 1800
      })
    }

    // Customer retention insights
    if (metrics.customerRetentionRate < 30) {
      insights.push({
        type: 'warning',
        category: 'customer',
        title: 'อัตราการกลับมาของลูกค้าต่ำ',
        description: `ลูกค้ากลับมาใช้บริการซ้ำเพียง ${metrics.customerRetentionRate.toFixed(1)}%`,
        impact: 'high',
        recommendation: 'สร้างโปรแกรมสะสมแต้ม ส่งข้อเสนอพิเศษ หรือปรับปรุงการบริการหลังขาย',
        metric: metrics.customerRetentionRate,
        target: 40
      })
    } else if (metrics.customerRetentionRate > 50) {
      insights.push({
        type: 'success',
        category: 'customer',
        title: 'ลูกค้ามีความภักดีสูง',
        description: `ลูกค้ากลับมาใช้บริการซ้ำ ${metrics.customerRetentionRate.toFixed(1)}%`,
        impact: 'high',
        recommendation: 'ใช้ประโยชน์จากลูกค้าเก่าในการแนะนำลูกค้าใหม่ผ่านระบบ referral',
        metric: metrics.customerRetentionRate,
        target: 60
      })
    }

    // Staff utilization insights
    if (metrics.staffUtilization < 70) {
      insights.push({
        type: 'warning',
        category: 'staff',
        title: 'การใช้งานพนักงานไม่เต็มประสิทธิภาพ',
        description: `พนักงานทำงานเพียง ${metrics.staffUtilization.toFixed(1)}% ของกำลังการผลิต`,
        impact: 'medium',
        recommendation: 'ปรับปรุงการจัดตารางงาน ฝึกอบรมทักษะใหม่ หรือพิจารณาลดจำนวนพนักงาน',
        metric: metrics.staffUtilization,
        target: 80
      })
    } else if (metrics.staffUtilization > 90) {
      insights.push({
        type: 'warning',
        category: 'staff',
        title: 'พนักงานทำงานเกินกำลัง',
        description: `การใช้งานพนักงาน ${metrics.staffUtilization.toFixed(1)}% อาจทำให้เหนื่อยล้า`,
        impact: 'medium',
        recommendation: 'พิจารณาเพิ่มพนักงานใหม่หรือปรับปรุงกระบวนการทำงานให้มีประสิทธิภาพมากขึ้น',
        metric: metrics.staffUtilization,
        target: 85
      })
    }

    // Service quality insights
    if (metrics.avgServiceRating < 4.0) {
      insights.push({
        type: 'danger',
        category: 'staff',
        title: 'คุณภาพการบริการต้องปรับปรุง',
        description: `คะแนนเฉลี่ย ${metrics.avgServiceRating.toFixed(1)}/5.0 ซึ่งต่ำกว่าเกณฑ์`,
        impact: 'high',
        recommendation: 'จัดอบรมพนักงาน ปรับปรุงขั้นตอนการให้บริการ และติดตามผลอย่างต่อเนื่อง',
        metric: metrics.avgServiceRating,
        target: 4.5
      })
    } else if (metrics.avgServiceRating > 4.5) {
      insights.push({
        type: 'success',
        category: 'staff',
        title: 'คุณภาพการบริการยอดเยี่ยม',
        description: `คะแนนเฉลี่ย ${metrics.avgServiceRating.toFixed(1)}/5.0 แสดงถึงความพึงพอใจสูง`,
        impact: 'high',
        recommendation: 'ใช้ประโยชน์จากคะแนนนี้ในการตลาดและขอรีวิวจากลูกค้าเพิ่มเติม',
        metric: metrics.avgServiceRating,
        target: 4.8
      })
    }

    return insights.slice(0, 8) // Limit to top 8 insights
  }

  useEffect(() => {
    analyzeBusinessData()
  }, [selectedPeriod])

  const getInsightIcon = (type: BusinessInsight['type']) => {
    switch (type) {
      case 'success': return CheckCircle
      case 'warning': return AlertTriangle
      case 'danger': return XCircle
      case 'info': return Lightbulb
    }
  }

  const getInsightColor = (type: BusinessInsight['type']) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800'
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'danger': return 'bg-red-50 border-red-200 text-red-800'
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getCategoryIcon = (category: BusinessInsight['category']) => {
    switch (category) {
      case 'revenue': return DollarSign
      case 'operations': return Target
      case 'customer': return Users
      case 'staff': return Star
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-stone-600">กำลังวิเคราะห์ข้อมูลทางธุรกิจ...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">ไม่สามารถวิเคราะห์ข้อมูลได้</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
            <Lightbulb className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-900">
              การวิเคราะห์และข้อเสนอแนะทางธุรกิจ
            </h2>
            <p className="text-stone-600 mt-1">
              Business Intelligence & Strategic Recommendations • ข้อมูลเชิงลึกจากการวิเคราะห์ AI
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics Summary */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">การเติบโต</p>
                <p className="text-2xl font-bold text-stone-900">
                  {metrics.revenueGrowth > 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}%
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                metrics.revenueGrowth >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {metrics.revenueGrowth >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-green-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">การเสร็จสิ้น</p>
                <p className="text-2xl font-bold text-stone-900">{metrics.completionRate.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">ลูกค้าประจำ</p>
                <p className="text-2xl font-bold text-stone-900">{metrics.customerRetentionRate.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">คะแนนบริการ</p>
                <p className="text-2xl font-bold text-stone-900">{metrics.avgServiceRating.toFixed(1)}/5</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Insights */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-gradient-to-r from-stone-50 to-stone-100 p-6 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-amber-600 to-amber-700 rounded-xl flex items-center justify-center shadow-lg">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-stone-900">ข้อเสนอแนะเชิงกลยุทธ์</h3>
              <p className="text-stone-500 mt-1">Strategic Business Recommendations • แนวทางปรับปรุงและพัฒนาธุรกิจ</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {insights.length === 0 ? (
            <div className="text-center py-8">
              <Lightbulb className="w-16 h-16 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500">ไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {insights.map((insight, index) => {
                const Icon = getInsightIcon(insight.type)
                const CategoryIcon = getCategoryIcon(insight.category)

                return (
                  <div
                    key={index}
                    className={`rounded-xl p-6 border-2 ${getInsightColor(insight.type)}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Icon className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CategoryIcon className="w-4 h-4" />
                          <h4 className="font-bold text-lg">{insight.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            insight.impact === 'high' ? 'bg-red-100 text-red-700' :
                            insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {insight.impact === 'high' ? 'สำคัญมาก' :
                             insight.impact === 'medium' ? 'สำคัญปานกลาง' : 'สำคัญน้อย'}
                          </span>
                        </div>

                        <p className="text-sm mb-3 opacity-90">
                          {insight.description}
                        </p>

                        <div className="bg-white bg-opacity-50 rounded-lg p-3 border border-white border-opacity-30">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium mb-1">คำแนะนำ:</p>
                              <p className="text-sm">{insight.recommendation}</p>
                            </div>
                          </div>
                        </div>

                        {insight.metric !== undefined && insight.target !== undefined && (
                          <div className="mt-4 flex items-center gap-2">
                            <div className="flex-1 bg-white bg-opacity-50 rounded-full h-2">
                              <div
                                className="h-2 rounded-full bg-current opacity-60"
                                style={{ width: `${Math.min((insight.metric / insight.target) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">
                              {insight.metric.toFixed(1)} / {insight.target}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BusinessInsightsAnalyzer