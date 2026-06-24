import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ============================================
// Types
// ============================================

export interface StaffPerformanceMetrics {
  id: string
  staff_id: string
  year: number
  month: number
  total_jobs: number
  completed_jobs: number
  cancelled_jobs: number
  pending_jobs: number
  completion_rate: number
  cancel_rate: number
  response_rate: number
  total_ratings: number
  avg_rating: number
  total_earnings: number
  performance_score: number
  created_at: string
  updated_at: string
}

export interface PlatformAverages {
  avg_completion_rate: number
  avg_response_rate: number
  avg_cancel_rate: number
  avg_rating: number
}

export interface PerformanceTrend {
  direction: 'up' | 'down' | 'stable'
  value: string
  color: string
}

// ============================================
// Hooks
// ============================================

// Helper: calculate metrics from a set of jobs and reviews
function calcMetrics(
  staffId: string,
  year: number,
  month: number,
  jobs: { status: string; staff_earnings: string | null; total_staff_earnings: string | null }[],
  reviews: { rating: number }[]
): StaffPerformanceMetrics {
  const total = jobs.length
  const completed = jobs.filter(j => j.status === 'completed').length
  const cancelled = jobs.filter(j => j.status === 'cancelled').length
  const active = jobs.filter(j =>
    ['in_progress', 'traveling', 'arrived', 'assigned', 'confirmed'].includes(j.status)
  ).length

  const completionRate = total > 0 ? (completed / total) * 100 : 0
  const cancelRate = total > 0 ? (cancelled / total) * 100 : 0
  const responseRate = total > 0 ? ((completed + active) / total) * 100 : 0

  const totalEarnings = jobs
    .filter(j => j.status === 'completed')
    .reduce((sum, j) => sum + (parseFloat((j.total_staff_earnings ?? j.staff_earnings) || '0') || 0), 0)

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 0

  const performanceScore = Math.round(
    completionRate * 0.4 +
    responseRate * 0.3 +
    (100 - cancelRate) * 0.2 +
    (avgRating / 5 * 100) * 0.1
  )

  return {
    id: `${staffId}-${year}-${month}`,
    staff_id: staffId,
    year,
    month,
    total_jobs: total,
    completed_jobs: completed,
    cancelled_jobs: cancelled,
    pending_jobs: jobs.filter(j => j.status === 'pending').length,
    completion_rate: completionRate,
    cancel_rate: cancelRate,
    response_rate: responseRate,
    total_ratings: reviews.length,
    avg_rating: avgRating,
    total_earnings: totalEarnings,
    performance_score: performanceScore,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * Calculate performance metrics from jobs + reviews (no staff_performance_metrics table dependency)
 */
export function useStaffPerformanceMetrics(staffId: string, months: number = 6) {
  return useQuery({
    queryKey: ['staff-performance-calc', staffId, months],
    queryFn: async () => {
      if (!staffId) return []

      const now = new Date()
      const startOfRange = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
      const startStr = startOfRange.toISOString().split('T')[0]

      const [{ data: jobs }, { data: reviews }] = await Promise.all([
        supabase
          .from('jobs')
          .select('status, staff_earnings, total_staff_earnings, scheduled_date')
          .eq('staff_id', staffId)
          .gte('scheduled_date', startStr),
        supabase
          .from('reviews')
          .select('rating, created_at')
          .eq('staff_id', staffId)
          .gte('created_at', `${startStr}T00:00:00`),
      ])

      // Build month buckets
      const monthMap = new Map<string, { jobs: typeof jobs; reviews: typeof reviews }>()
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        monthMap.set(`${d.getFullYear()}-${d.getMonth() + 1}`, { jobs: [], reviews: [] })
      }

      for (const job of jobs || []) {
        const d = new Date(job.scheduled_date)
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`
        monthMap.get(key)?.jobs?.push(job)
      }
      for (const review of reviews || []) {
        const d = new Date(review.created_at)
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`
        monthMap.get(key)?.reviews?.push(review)
      }

      const results: StaffPerformanceMetrics[] = []
      for (const [key, { jobs: mJobs, reviews: mReviews }] of monthMap) {
        if (!mJobs || mJobs.length === 0) continue
        const [year, month] = key.split('-').map(Number)
        results.push(calcMetrics(staffId, year, month, mJobs, mReviews || []))
      }

      return results.sort((a, b) =>
        new Date(a.year, a.month - 1).getTime() - new Date(b.year, b.month - 1).getTime()
      )
    },
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Calculate current month's performance from jobs + reviews
 */
export function useCurrentMonthPerformance(staffId: string) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  return useQuery({
    queryKey: ['staff-performance-current-calc', staffId, year, month],
    queryFn: async () => {
      if (!staffId) return null

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const [{ data: jobs }, { data: reviews }] = await Promise.all([
        supabase
          .from('jobs')
          .select('status, staff_earnings, total_staff_earnings')
          .eq('staff_id', staffId)
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate),
        supabase
          .from('reviews')
          .select('rating')
          .eq('staff_id', staffId)
          .gte('created_at', `${startDate}T00:00:00`)
          .lte('created_at', `${endDate}T23:59:59`),
      ])

      if (!jobs || jobs.length === 0) return null
      return calcMetrics(staffId, year, month, jobs, reviews || [])
    },
    staleTime: 1000 * 60,
  })
}

/**
 * Fetch platform averages
 */
export function usePlatformAverages() {
  return useQuery({
    queryKey: ['platform-averages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_platform_averages')

      if (error) {
        console.error('Error fetching platform averages:', error)
        // Return default values if function doesn't exist yet
        return {
          avg_completion_rate: 88.5,
          avg_response_rate: 89.2,
          avg_cancel_rate: 5.8,
          avg_rating: 4.3,
        } as PlatformAverages
      }

      return data[0] as PlatformAverages
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate performance trend between two values
 */
export function calculateTrend(current: number, previous: number): PerformanceTrend {
  const diff = current - previous
  if (diff > 0) {
    return {
      direction: 'up',
      value: Math.abs(diff).toFixed(1),
      color: 'text-green-600',
    }
  }
  if (diff < 0) {
    return {
      direction: 'down',
      value: Math.abs(diff).toFixed(1),
      color: 'text-red-600',
    }
  }
  return {
    direction: 'stable',
    value: '0.0',
    color: 'text-bliss-500',
  }
}

/**
 * Format month name in Thai
 */
export function formatMonthThai(year: number, month: number): string {
  const monthNames = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ]

  // Convert to Buddhist year (short format)
  const buddhistYear = year + 543
  const yearShort = buddhistYear.toString().slice(-2)

  return `${monthNames[month - 1]} ${yearShort}`
}

/**
 * Generate Rule-Based Recommendations
 */
export function generateRecommendations(
  current: StaffPerformanceMetrics | null,
  history: StaffPerformanceMetrics[],
  platformAvg: PlatformAverages
): string[] {
  if (!current) {
    return ['ยังไม่มีข้อมูลประสิทธิภาพสำหรับเดือนนี้']
  }

  const recommendations: string[] = []

  // 1. High cancel rate
  if (current.cancel_rate > 5) {
    recommendations.push(
      `🔴 อัตราการยกเลิกงานสูง (${current.cancel_rate.toFixed(1)}%) - ควรลดการยกเลิกโดยรับงานที่มั่นใจว่าจะทำได้`
    )
  } else if (current.cancel_rate < platformAvg.avg_cancel_rate) {
    recommendations.push(
      `✅ อัตราการยกเลิกงานต่ำกว่าค่าเฉลี่ย ${(platformAvg.avg_cancel_rate - current.cancel_rate).toFixed(1)}% - ดีมาก!`
    )
  }

  // 2. Low response rate
  if (current.response_rate < 85) {
    recommendations.push(
      `⚡ อัตราการตอบรับงานต่ำ (${current.response_rate.toFixed(1)}%) - ควรเปิดการแจ้งเตือนเพื่อไม่พลาดโอกาส`
    )
  } else if (current.response_rate > platformAvg.avg_response_rate) {
    recommendations.push(
      `✅ อัตราการตอบรับงานสูงกว่าค่าเฉลี่ย ${(current.response_rate - platformAvg.avg_response_rate).toFixed(1)}%`
    )
  }

  // 3. Low completion rate
  if (current.completion_rate < 85) {
    recommendations.push(
      `⚠️ อัตราความสำเร็จต่ำ (${current.completion_rate.toFixed(1)}%) - ควรปรับปรุงคุณภาพงาน`
    )
  } else if (current.completion_rate > platformAvg.avg_completion_rate) {
    recommendations.push(
      `✅ อัตราความสำเร็จสูงกว่าค่าเฉลี่ย ${(current.completion_rate - platformAvg.avg_completion_rate).toFixed(1)}%`
    )
  }

  // 4. Low rating
  if (current.avg_rating < 4.0) {
    recommendations.push(
      `⭐ คะแนนรีวิวต่ำ (${current.avg_rating.toFixed(1)}/5.0) - ควรพัฒนาการบริการและสื่อสารกับลูกค้า`
    )
  }

  // 5. Declining trend (check last 3 months)
  if (history.length >= 3) {
    const recentHistory = history.slice(-3)
    const completionRates = recentHistory.map(h => h.completion_rate)
    const isDeclining = completionRates.every((rate, i) =>
      i === 0 || rate < completionRates[i - 1]
    )

    if (isDeclining) {
      recommendations.push(
        `📉 ประสิทธิภาพลดลงต่อเนื่อง 3 เดือน - ควรพักผ่อนและทบทวนวิธีการทำงาน`
      )
    }
  }

  // 6. Excellent performance
  if (
    current.performance_score >= 95 &&
    current.total_jobs >= 20 &&
    current.avg_rating >= 4.7
  ) {
    recommendations.push(
      `🏆 คุณอยู่ใน Top Performers! ประสิทธิภาพดีเยี่ยม - พิจารณารับงานระดับ Premium`
    )
  }

  // 7. Good performance - maintain
  if (
    recommendations.length === 0 ||
    (current.performance_score >= 85 && current.performance_score < 95)
  ) {
    recommendations.push(
      `💪 ประสิทธิภาพโดยรวมดี - รักษาระดับและพัฒนาทักษะเพิ่มเติมเพื่อเพิ่มโอกาส`
    )
  }

  return recommendations
}
