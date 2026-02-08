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
  total_tips: number
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

/**
 * Fetch performance metrics for a specific staff member
 */
export function useStaffPerformanceMetrics(staffId: string, months: number = 6) {
  return useQuery({
    queryKey: ['staff-performance', staffId, months],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_performance_metrics')
        .select('*')
        .eq('staff_id', staffId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(months)

      if (error) {
        console.error('Error fetching performance metrics:', error)
        throw error
      }

      // Sort by date ascending for display (oldest to newest)
      const sorted = data?.sort((a, b) => {
        const dateA = new Date(a.year, a.month - 1)
        const dateB = new Date(b.year, b.month - 1)
        return dateA.getTime() - dateB.getTime()
      })

      return sorted as StaffPerformanceMetrics[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch current month's performance for a staff member
 */
export function useCurrentMonthPerformance(staffId: string) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  return useQuery({
    queryKey: ['staff-performance-current', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_performance_metrics')
        .select('*')
        .eq('staff_id', staffId)
        .eq('year', currentYear)
        .eq('month', currentMonth)

      if (error) {
        console.error('Error fetching current performance:', error)
        throw error
      }

      // Return first item or null if no data
      return (data && data.length > 0 ? data[0] : null) as StaffPerformanceMetrics | null
    },
    staleTime: 1000 * 60, // 1 minute
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
    color: 'text-stone-500',
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
