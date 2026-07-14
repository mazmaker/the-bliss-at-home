import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Loader2,
  Play,
  RefreshCw,
  Settings,
  Wallet,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getPayoutScheduleLabel, PayoutSchedule } from '../types/staff'

interface StaffPayoutRow {
  id: string
  profile_id: string
  name_th: string
  payout_schedule: string
  custom_payout_interval: number | null
  next_payout_date: string
  last_payout_processed_at: string | null
  days: number
  unpaid_jobs: number      // completed jobs in the current period not yet linked to any payout
  unpaid_amount: number    // sum of staff earnings for those unpaid jobs
}

interface RecentPayout {
  id: string
  staff_name: string
  gross_earnings: number
  created_at: string
  status: string
  is_automated: boolean
  total_jobs: number
}

interface DashboardData {
  overdue: StaffPayoutRow[]
  today: StaffPayoutRow[]
  this_week: StaffPayoutRow[]
  this_month: StaffPayoutRow[]
  later: StaffPayoutRow[]
  recent_payouts: RecentPayout[]
  schedule_counts: { weekly: number; bi_monthly: number; monthly: number; custom_days: number }
}

// Normalize: prod sets VITE_API_URL WITH a trailing /api, but the fetch calls below already
// append /api/... — strip a trailing /api so the URL isn't doubled to /api/api (→ 404 "Not Found").
const API_BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')).replace(/\/api\/?$/, '')

const SCHEDULE_LABEL: Record<string, string> = {
  weekly: 'รายสัปดาห์',
  bi_monthly: 'กลาง+สิ้นเดือน',
  monthly: 'รายเดือน',
  custom_days: 'กำหนดเอง',
}

function scheduleLabel(row: StaffPayoutRow) {
  return getPayoutScheduleLabel(row.payout_schedule as PayoutSchedule, row.custom_payout_interval ?? undefined)
}

// Mirrors the server's payout period logic (packages/supabase/src/earnings/automatedPayout.ts
// calculatePayoutPeriod): period_start = day after last payout, or payout_start_date for the
// first payout, else one interval ago. Kept in sync so the dashboard shows a staff iff the
// automated run would actually create a payout for them (unpaid completed jobs in this period).
function payoutIntervalDays(schedule: string | undefined, custom: number | null | undefined): number {
  switch (schedule) {
    case 'weekly': return 7
    case 'bi_monthly': return 15
    case 'monthly': return 30
    case 'custom_days': return custom || 30
    default: return 30
  }
}

function payoutPeriodStart(
  staff: { last_payout_processed_at: string | null; payout_start_date?: string | null; payout_schedule: string; custom_payout_interval: number | null },
  todayStr: string,
): string {
  if (staff.last_payout_processed_at) {
    const d = new Date(staff.last_payout_processed_at.split('T')[0])
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }
  if (staff.payout_start_date) return staff.payout_start_date.split('T')[0]
  const d = new Date(todayStr)
  d.setDate(d.getDate() - payoutIntervalDays(staff.payout_schedule, staff.custom_payout_interval))
  return d.toISOString().split('T')[0]
}

function formatBaht(amount: number): string {
  return `฿${amount.toLocaleString('th-TH')}`
}

function StaffRow({ row, showDate = true }: { row: StaffPayoutRow; showDate?: boolean }) {
  const navigate = useNavigate()
  const days = row.days
  const isOverdue = days < 0
  const isToday = days === 0

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-white border border-bliss-100">
      <div className="min-w-0">
        <p className="font-medium text-bliss-900 truncate">{row.name_th}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs px-1.5 py-0.5 rounded bg-bliss-100 text-bliss-600">
            {scheduleLabel(row)}
          </span>
          {showDate && (
            <span className="text-xs text-bliss-500">
              {new Date(row.next_payout_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
          {row.last_payout_processed_at && (
            <span className="text-xs text-bliss-400">
              จ่ายล่าสุด {new Date(row.last_payout_processed_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 ml-3 flex items-center gap-2">
        <div className="text-right">
          <p className="font-semibold text-bliss-900 text-sm">{formatBaht(row.unpaid_amount)}</p>
          <p className="text-[11px] text-bliss-400">{row.unpaid_jobs} งานค้างจ่าย</p>
        </div>
        {isOverdue ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            เลย {Math.abs(days)} วัน
          </span>
        ) : isToday ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            วันนี้
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-bliss-100 text-bliss-600">
            อีก {days} วัน
          </span>
        )}
        <button
          onClick={() => navigate(`/admin/staff/${row.id}?tab=earnings`)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-bliss-700 bg-bliss-100 rounded-lg hover:bg-bliss-200 transition whitespace-nowrap"
          title="สร้างรายการจ่ายของพนักงาน"
        >
          <Wallet className="w-3.5 h-3.5" />
          สร้างรายการจ่าย
        </button>
      </div>
    </div>
  )
}

function SectionHeader({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <div className={`flex items-center justify-between mb-2`}>
      <p className={`text-sm font-semibold ${color}`}>{title}</p>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-bliss-100 text-bliss-600`}>
        {count} คน
      </span>
    </div>
  )
}

export function AutomatedPayoutDashboard() {
  const [isTriggering, setIsTriggering] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['payout-dashboard-v2'],
    queryFn: fetchDashboardData,
    refetchInterval: 30000,
  })

  async function fetchDashboardData(): Promise<DashboardData> {
    // Use UTC midnight for both today and next_payout_date (which are date-only strings)
    // to avoid timezone offset causing off-by-one day errors in Thailand (UTC+7)
    const todayStr = new Date().toISOString().split('T')[0]
    const today = new Date(todayStr)

    // All active staff with a payout schedule/date
    const { data: staffRows, error: staffError } = await supabase
      .from('staff')
      .select('id, profile_id, name_th, payout_schedule, custom_payout_interval, next_payout_date, last_payout_processed_at, payout_start_date')
      .eq('status', 'active')
      .not('next_payout_date', 'is', null)
      .not('profile_id', 'is', null)
      .order('next_payout_date', { ascending: true })

    if (staffError) throw staffError

    // Per-staff current payout period start (mirrors the server) — the window we look for unpaid jobs in
    const staffWithPeriod = (staffRows || []).map(s => ({
      ...s,
      period_start: payoutPeriodStart(s as any, todayStr),
    }))

    // ── Only show staff who actually have work to pay ──
    // A staff has unpaid earnings iff they have completed jobs in their period that are NOT yet
    // linked to any payout (payout_jobs) — the SAME definition the automated run (getCompletedJobs)
    // uses, so the list matches what "ประมวลผลทั้งหมด" would create. Staff with 0 unpaid jobs are
    // hidden to avoid confusion when confirming payments.
    const profileIds = staffWithPeriod.map(s => s.profile_id).filter(Boolean) as string[]
    const unpaidByProfile = new Map<string, { count: number; amount: number }>()

    if (profileIds.length > 0) {
      const floor = staffWithPeriod.reduce((min, s) => (s.period_start < min ? s.period_start : min), todayStr)
      const { data: completedJobs } = await supabase
        .from('jobs')
        .select('id, staff_id, scheduled_date, staff_earnings, total_staff_earnings')
        .eq('status', 'completed')
        .in('staff_id', profileIds)
        .gte('scheduled_date', floor)

      const jobIds = (completedJobs || []).map(j => j.id)
      const paidSet = new Set<string>()
      if (jobIds.length > 0) {
        const { data: paidJobs } = await supabase
          .from('payout_jobs')
          .select('job_id')
          .in('job_id', jobIds)
        ;(paidJobs || []).forEach(pj => paidSet.add(pj.job_id))
      }

      const periodStartByProfile = new Map(staffWithPeriod.map(s => [s.profile_id, s.period_start]))
      for (const j of completedJobs || []) {
        if (paidSet.has(j.id)) continue
        const ps = periodStartByProfile.get(j.staff_id)
        if (!ps || j.scheduled_date < ps) continue
        const cur = unpaidByProfile.get(j.staff_id) || { count: 0, amount: 0 }
        cur.count += 1
        cur.amount += Number(j.total_staff_earnings ?? j.staff_earnings ?? 0)
        unpaidByProfile.set(j.staff_id, cur)
      }
    }

    const rows: StaffPayoutRow[] = staffWithPeriod
      .map(s => {
        const u = unpaidByProfile.get(s.profile_id) || { count: 0, amount: 0 }
        return {
          ...s,
          days: Math.round((new Date(s.next_payout_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
          unpaid_jobs: u.count,
          unpaid_amount: u.amount,
        }
      })
      .filter(r => r.unpaid_jobs > 0)

    const overdue    = rows.filter(r => r.days < 0)
    const todayDue   = rows.filter(r => r.days === 0)
    const this_week  = rows.filter(r => r.days >= 1 && r.days <= 7)
    const this_month = rows.filter(r => r.days >= 8 && r.days <= 30)
    const later      = rows.filter(r => r.days > 30)

    // Recent payouts — last 30 days, all types
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: payouts } = await supabase
      .from('payouts')
      .select('id, staff_id, gross_earnings, created_at, status, is_automated, total_jobs')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    const staffIdSet = [...new Set((payouts || []).map(p => p.staff_id))]
    const nameMap = new Map<string, string>()
    if (staffIdSet.length > 0) {
      const { data: names } = await supabase
        .from('staff')
        .select('profile_id, name_th')
        .in('profile_id', staffIdSet)
      names?.forEach(s => nameMap.set(s.profile_id, s.name_th))
    }

    const recent_payouts: RecentPayout[] = (payouts || []).map(p => ({
      id: p.id,
      staff_name: nameMap.get(p.staff_id) || 'ไม่ทราบชื่อ',
      gross_earnings: parseFloat(p.gross_earnings) || 0,
      created_at: p.created_at,
      status: p.status,
      is_automated: p.is_automated || false,
      total_jobs: p.total_jobs || 0,
    }))

    // Count ALL active staff by their payout schedule (7d / 15d / 30d / custom) — this is a
    // roster-distribution overview, so it uses the full active set, NOT the payable-only list.
    const schedule_counts = {
      weekly: staffWithPeriod.filter(r => r.payout_schedule === 'weekly').length,
      bi_monthly: staffWithPeriod.filter(r => r.payout_schedule === 'bi_monthly').length,
      monthly: staffWithPeriod.filter(r => r.payout_schedule === 'monthly').length,
      custom_days: staffWithPeriod.filter(r => r.payout_schedule === 'custom_days').length,
    }

    return { overdue, today: todayDue, this_week, this_month, later, recent_payouts, schedule_counts }
  }

  async function runPayoutCheck() {
    setIsTriggering(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/cron/daily-payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()
      const errCount = result.errors?.length || 0
      // Previously this only checked result.success and showed a green toast even when
      // errors[] was populated — hiding real failures. Surface partial/total failures.
      if (result.success && errCount === 0) {
        toast.success(
          result.processed > 0
            ? `สร้างรายการรอจ่ายให้ ${result.processed} คนแล้ว`
            : 'ตรวจสอบแล้ว — ยังไม่มีพนักงานที่ถึงรอบและมีงานค้างจ่าย'
        )
        queryClient.invalidateQueries({ queryKey: ['payout-dashboard-v2'] })
      } else {
        toast.error(`ทำรายการไม่สำเร็จ${errCount ? ` (${errCount} รายการ)` : ''}: ${result.errors?.[0] || 'Unknown error'}`)
        if (result.processed > 0) queryClient.invalidateQueries({ queryKey: ['payout-dashboard-v2'] })
      }
    } catch {
      toast.error('ไม่สามารถเชื่อมต่อระบบอัตโนมัติได้')
    } finally {
      setIsTriggering(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-bliss-400" />
        <span className="ml-3 text-bliss-500">กำลังโหลด...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <span className="text-red-800">เกิดข้อผิดพลาดในการโหลดข้อมูล</span>
      </div>
    )
  }


  return (
    <div className="space-y-5">

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl p-4 border bg-white border-bliss-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-bliss-500 to-bliss-600 rounded-xl flex flex-col items-center justify-center flex-shrink-0 leading-none">
              <span className="text-sm font-bold text-white">7</span>
              <span className="text-[9px] text-white/80">วัน</span>
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-bliss-900 leading-none">{data?.schedule_counts.weekly || 0}</p>
              <p className="text-xs text-bliss-500 mt-1">รายสัปดาห์ (คน)</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 border bg-white border-bliss-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-bliss-500 to-bliss-600 rounded-xl flex flex-col items-center justify-center flex-shrink-0 leading-none">
              <span className="text-sm font-bold text-white">15</span>
              <span className="text-[9px] text-white/80">วัน</span>
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-bliss-900 leading-none">{data?.schedule_counts.bi_monthly || 0}</p>
              <p className="text-xs text-bliss-500 mt-1">กลาง+สิ้นเดือน (คน)</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 border bg-white border-bliss-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-bliss-500 to-bliss-600 rounded-xl flex flex-col items-center justify-center flex-shrink-0 leading-none">
              <span className="text-sm font-bold text-white">30</span>
              <span className="text-[9px] text-white/80">วัน</span>
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-bliss-900 leading-none">{data?.schedule_counts.monthly || 0}</p>
              <p className="text-xs text-bliss-500 mt-1">รายเดือน (คน)</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 border bg-white border-bliss-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-bliss-500 to-bliss-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-bliss-900 leading-none">{data?.schedule_counts.custom_days || 0}</p>
              <p className="text-xs text-bliss-500 mt-1">กำหนดเอง (คน)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue alert */}
      {!!data?.overdue.length && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="font-semibold text-red-900">ค้างจ่าย {data.overdue.length} คน — ต้องดำเนินการ</p>
            </div>
            <button
              onClick={runPayoutCheck}
              disabled={isTriggering}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              {isTriggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              ประมวลผลทั้งหมด
            </button>
          </div>
          <div className="space-y-2">
            {data.overdue.map(row => <StaffRow key={row.id} row={row} />)}
          </div>
        </div>
      )}

      {/* Upcoming grouped */}
      <div className="bg-white border border-bliss-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-bliss-900">รอบจ่ายเงินที่กำลังมาถึง</h3>
          {!data?.overdue.length && (
            <button
              onClick={runPayoutCheck}
              disabled={isTriggering}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bliss-800 text-white text-sm rounded-lg hover:bg-bliss-700 transition disabled:opacity-50"
            >
              {isTriggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              เรียกระบบออโต้
            </button>
          )}
        </div>

        {(data?.today.length || 0) + (data?.this_week.length || 0) + (data?.this_month.length || 0) + (data?.later.length || 0) === 0 ? (
          <div className="text-center py-8 text-bliss-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">ไม่มีรอบจ่ายที่กำลังมาถึง</p>
          </div>
        ) : (
          <div className="space-y-5">
            {!!data?.today.length && (
              <div>
                <SectionHeader title="วันนี้" count={data.today.length} color="text-red-700" />
                <div className="space-y-2">
                  {data.today.map(row => <StaffRow key={row.id} row={row} />)}
                </div>
              </div>
            )}

            {!!data?.this_week.length && (
              <div>
                <SectionHeader title="สัปดาห์นี้ (1–7 วัน)" count={data.this_week.length} color="text-bliss-700" />
                <div className="space-y-2">
                  {data.this_week.map(row => <StaffRow key={row.id} row={row} />)}
                </div>
              </div>
            )}

            {!!data?.this_month.length && (
              <div>
                <SectionHeader title="เดือนนี้ (8–30 วัน)" count={data.this_month.length} color="text-bliss-700" />
                <div className="space-y-2">
                  {data.this_month.map(row => <StaffRow key={row.id} row={row} />)}
                </div>
              </div>
            )}

            {!!data?.later.length && (
              <div>
                <SectionHeader title="ถัดไป (30+ วัน)" count={data.later.length} color="text-bliss-500" />
                <div className="space-y-2">
                  {data.later.map(row => <StaffRow key={row.id} row={row} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent payouts history */}
      <div className="bg-white border border-bliss-200 rounded-xl p-5">
        <h3 className="font-semibold text-bliss-900 mb-4">ประวัติรอบจ่าย 30 วันที่ผ่านมา</h3>

        {!data?.recent_payouts.length ? (
          <div className="text-center py-8 text-bliss-400">
            <RefreshCw className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">ยังไม่มีรอบจ่ายในช่วงนี้</p>
          </div>
        ) : (
          <div className="divide-y divide-bliss-100">
            {data.recent_payouts.map(payout => (
              <div key={payout.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-bliss-900 truncate">{payout.staff_name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${payout.is_automated ? 'bg-bliss-100 text-bliss-700' : 'bg-bliss-100 text-bliss-600'}`}>
                      {payout.is_automated ? 'อัตโนมัติ' : 'Manual'}
                    </span>
                  </div>
                  <p className="text-xs text-bliss-400 mt-0.5">
                    {payout.total_jobs} งาน • {new Date(payout.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-4 text-right">
                  <p className="font-semibold text-bliss-900">฿{payout.gross_earnings.toLocaleString()}</p>
                  <span className={`text-xs ${
                    payout.status === 'completed' ? 'text-green-600' :
                    payout.status === 'pending' ? 'text-bliss-600' : 'text-red-600'
                  }`}>
                    {payout.status === 'completed' ? 'จ่ายแล้ว' :
                     payout.status === 'pending' ? 'รออนุมัติ' : 'ล้มเหลว'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AutomatedPayoutDashboard
