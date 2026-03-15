import { describe, it, expect, vi } from 'vitest'

// Mock supabase before importing the module (it imports supabase at top level)
vi.mock('../../lib/supabase', () => ({
  supabase: {},
}))

import {
  calculateTrend,
  formatMonthThai,
  generateRecommendations,
} from '../useStaffPerformance'
import type { StaffPerformanceMetrics, PlatformAverages } from '../useStaffPerformance'

// ============================================
// calculateTrend
// ============================================

describe('calculateTrend', () => {
  it('returns "up" with green color when current > previous', () => {
    const result = calculateTrend(90, 85)
    expect(result.direction).toBe('up')
    expect(result.value).toBe('5.0')
    expect(result.color).toBe('text-green-600')
  })

  it('returns "down" with red color when current < previous', () => {
    const result = calculateTrend(80, 90)
    expect(result.direction).toBe('down')
    expect(result.value).toBe('10.0')
    expect(result.color).toBe('text-red-600')
  })

  it('returns "stable" with stone color when current === previous', () => {
    const result = calculateTrend(85, 85)
    expect(result.direction).toBe('stable')
    expect(result.value).toBe('0.0')
    expect(result.color).toBe('text-stone-500')
  })

  it('formats value to 1 decimal place', () => {
    const result = calculateTrend(90.567, 85.123)
    expect(result.value).toBe('5.4')
  })

  it('handles very small positive difference', () => {
    const result = calculateTrend(0.1, 0)
    expect(result.direction).toBe('up')
    expect(result.value).toBe('0.1')
  })

  it('handles negative numbers', () => {
    const result = calculateTrend(-5, -10)
    expect(result.direction).toBe('up')
    expect(result.value).toBe('5.0')
  })
})

// ============================================
// formatMonthThai
// ============================================

describe('formatMonthThai', () => {
  const expectedMonths = [
    { month: 1, name: 'ม.ค.' },
    { month: 2, name: 'ก.พ.' },
    { month: 3, name: 'มี.ค.' },
    { month: 4, name: 'เม.ย.' },
    { month: 5, name: 'พ.ค.' },
    { month: 6, name: 'มิ.ย.' },
    { month: 7, name: 'ก.ค.' },
    { month: 8, name: 'ส.ค.' },
    { month: 9, name: 'ก.ย.' },
    { month: 10, name: 'ต.ค.' },
    { month: 11, name: 'พ.ย.' },
    { month: 12, name: 'ธ.ค.' },
  ]

  expectedMonths.forEach(({ month, name }) => {
    it(`returns "${name}" for month ${month}`, () => {
      const result = formatMonthThai(2026, month)
      expect(result).toContain(name)
    })
  })

  it('converts to Buddhist year (short format) for 2026', () => {
    const result = formatMonthThai(2026, 1)
    // 2026 + 543 = 2569 → "69"
    expect(result).toBe('ม.ค. 69')
  })

  it('converts to Buddhist year (short format) for 2025', () => {
    const result = formatMonthThai(2025, 6)
    // 2025 + 543 = 2568 → "68"
    expect(result).toBe('มิ.ย. 68')
  })

  it('handles year 2000', () => {
    const result = formatMonthThai(2000, 12)
    // 2000 + 543 = 2543 → "43"
    expect(result).toBe('ธ.ค. 43')
  })
})

// ============================================
// generateRecommendations
// ============================================

function makeMetrics(overrides: Partial<StaffPerformanceMetrics> = {}): StaffPerformanceMetrics {
  return {
    id: 'metric-1',
    staff_id: 'staff-1',
    year: 2026,
    month: 2,
    total_jobs: 30,
    completed_jobs: 28,
    cancelled_jobs: 1,
    pending_jobs: 1,
    completion_rate: 90,
    cancel_rate: 3,
    response_rate: 92,
    total_ratings: 20,
    avg_rating: 4.5,
    total_earnings: 50000,
    performance_score: 88,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
    ...overrides,
  }
}

const defaultPlatformAvg: PlatformAverages = {
  avg_completion_rate: 88.5,
  avg_response_rate: 89.2,
  avg_cancel_rate: 5.8,
  avg_rating: 4.3,
}

describe('generateRecommendations', () => {
  it('returns "no data" message when current is null', () => {
    const result = generateRecommendations(null, [], defaultPlatformAvg)
    expect(result).toHaveLength(1)
    expect(result[0]).toContain('ยังไม่มีข้อมูล')
  })

  it('flags high cancel rate (> 5%)', () => {
    const current = makeMetrics({ cancel_rate: 8.5 })
    const result = generateRecommendations(current, [], defaultPlatformAvg)
    const cancelRec = result.find(r => r.includes('อัตราการยกเลิกงานสูง'))
    expect(cancelRec).toBeDefined()
    expect(cancelRec).toContain('8.5%')
  })

  it('praises low cancel rate below platform average', () => {
    const current = makeMetrics({ cancel_rate: 2.0 })
    const result = generateRecommendations(current, [], defaultPlatformAvg)
    const cancelRec = result.find(r => r.includes('อัตราการยกเลิกงานต่ำกว่าค่าเฉลี่ย'))
    expect(cancelRec).toBeDefined()
  })

  it('flags low response rate (< 85%)', () => {
    const current = makeMetrics({ response_rate: 70 })
    const result = generateRecommendations(current, [], defaultPlatformAvg)
    const respRec = result.find(r => r.includes('อัตราการตอบรับงานต่ำ'))
    expect(respRec).toBeDefined()
    expect(respRec).toContain('70.0%')
  })

  it('praises high response rate above platform average', () => {
    const current = makeMetrics({ response_rate: 95 })
    const result = generateRecommendations(current, [], defaultPlatformAvg)
    const respRec = result.find(r => r.includes('อัตราการตอบรับงานสูงกว่าค่าเฉลี่ย'))
    expect(respRec).toBeDefined()
  })

  it('flags low completion rate (< 85%)', () => {
    const current = makeMetrics({ completion_rate: 75 })
    const result = generateRecommendations(current, [], defaultPlatformAvg)
    const compRec = result.find(r => r.includes('อัตราความสำเร็จต่ำ'))
    expect(compRec).toBeDefined()
    expect(compRec).toContain('75.0%')
  })

  it('flags low rating (< 4.0)', () => {
    const current = makeMetrics({ avg_rating: 3.5 })
    const result = generateRecommendations(current, [], defaultPlatformAvg)
    const ratingRec = result.find(r => r.includes('คะแนนรีวิวต่ำ'))
    expect(ratingRec).toBeDefined()
    expect(ratingRec).toContain('3.5')
  })

  it('detects declining 3-month trend', () => {
    const history = [
      makeMetrics({ completion_rate: 95, month: 11, year: 2025 }),
      makeMetrics({ completion_rate: 90, month: 12, year: 2025 }),
      makeMetrics({ completion_rate: 85, month: 1 }),
    ]
    const current = makeMetrics({ completion_rate: 85 })
    const result = generateRecommendations(current, history, defaultPlatformAvg)
    const trendRec = result.find(r => r.includes('ประสิทธิภาพลดลงต่อเนื่อง'))
    expect(trendRec).toBeDefined()
  })

  it('does NOT flag declining trend with fewer than 3 months history', () => {
    const history = [
      makeMetrics({ completion_rate: 95, month: 12, year: 2025 }),
      makeMetrics({ completion_rate: 85, month: 1 }),
    ]
    const current = makeMetrics()
    const result = generateRecommendations(current, history, defaultPlatformAvg)
    const trendRec = result.find(r => r.includes('ประสิทธิภาพลดลงต่อเนื่อง'))
    expect(trendRec).toBeUndefined()
  })

  it('awards top performer for high score + jobs + rating', () => {
    const current = makeMetrics({
      performance_score: 98,
      total_jobs: 25,
      avg_rating: 4.8,
    })
    const result = generateRecommendations(current, [], defaultPlatformAvg)
    const topRec = result.find(r => r.includes('Top Performers'))
    expect(topRec).toBeDefined()
  })

  it('does NOT award top performer if total_jobs < 20', () => {
    const current = makeMetrics({
      performance_score: 98,
      total_jobs: 10,
      avg_rating: 4.8,
    })
    const result = generateRecommendations(current, [], defaultPlatformAvg)
    const topRec = result.find(r => r.includes('Top Performers'))
    expect(topRec).toBeUndefined()
  })

  it('includes "maintain" message for good performance (85-94)', () => {
    const current = makeMetrics({ performance_score: 90 })
    const result = generateRecommendations(current, [], defaultPlatformAvg)
    const maintainRec = result.find(r => r.includes('ประสิทธิภาพโดยรวมดี'))
    expect(maintainRec).toBeDefined()
  })

  it('includes "maintain" message when no other recommendations exist', () => {
    // Use custom platform averages where all thresholds avoid triggering
    const customPlatformAvg: PlatformAverages = {
      avg_completion_rate: 95, // current 88.5 < avg, so no praise
      avg_response_rate: 95,   // current 89.2 < avg, so no praise
      avg_cancel_rate: 3.0,    // current 4.0 > avg, so no praise; but 4.0 <= 5, so no warning
      avg_rating: 4.3,
    }
    const current = makeMetrics({
      cancel_rate: 4.0, // not > 5 (no warning), not < avg 3.0 (no praise)
      response_rate: 89.2, // not < 85, not > avg 95 (no praise)
      completion_rate: 88.5, // not < 85, not > avg 95 (no praise)
      avg_rating: 4.3, // not < 4.0
      performance_score: 50, // below 85, so rule 7 second branch doesn't fire
    })
    const result = generateRecommendations(current, [], customPlatformAvg)
    // recommendations.length === 0 at rule 7, so maintain message should appear
    const maintainRec = result.find(r => r.includes('ประสิทธิภาพโดยรวมดี'))
    expect(maintainRec).toBeDefined()
  })
})
