import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Play,
  RefreshCw,
  Users,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getPayoutScheduleLabel, PayoutSchedule } from '../types/staff'

interface StaffPayoutRow {
  id: string
  name_th: string
  payout_schedule: string
  custom_payout_interval: number | null
  next_payout_date: string
  last_payout_processed_at: string | null
  days: number
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
}

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')

const SCHEDULE_LABEL: Record<string, string> = {
  weekly: 'รายสัปดาห์',
  bi_monthly: 'กลาง+สิ้นเดือน',
  monthly: 'รายเดือน',
  custom_days: 'กำหนดเอง',
}

function scheduleLabel(row: StaffPayoutRow) {
  return getPayoutScheduleLabel(row.payout_schedule as PayoutSchedule, row.custom_payout_interval ?? undefined)
}

function StaffRow({ row, showDate = true }: { row: StaffPayoutRow; showDate?: boolean }) {
  const days = row.days
  const isOverdue = days < 0
  const isToday = days === 0

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-white border border-stone-100">
      <div className="min-w-0">
        <p className="font-medium text-stone-900 truncate">{row.name_th}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
            {scheduleLabel(row)}
          </span>
          {showDate && (
            <span className="text-xs text-stone-500">
              {new Date(row.next_payout_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
          {row.last_payout_processed_at && (
            <span className="text-xs text-stone-400">
              จ่ายล่าสุด {new Date(row.last_payout_processed_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 ml-3">
        {isOverdue ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            เลย {Math.abs(days)} วัน
          </span>
        ) : isToday ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            วันนี้
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-600">
            อีก {days} วัน
          </span>
        )}
      </div>
    </div>
  )
}

function SectionHeader({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <div className={`flex items-center justify-between mb-2`}>
      <p className={`text-sm font-semibold ${color}`}>{title}</p>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600`}>
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
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // All active staff — no date ceiling, show everyone
    const { data: staffRows, error: staffError } = await supabase
      .from('staff')
      .select('id, name_th, payout_schedule, custom_payout_interval, next_payout_date, last_payout_processed_at')
      .eq('status', 'active')
      .not('next_payout_date', 'is', null)
      .order('next_payout_date', { ascending: true })

    if (staffError) throw staffError

    const rows: StaffPayoutRow[] = (staffRows || []).map(s => ({
      ...s,
      days: Math.ceil((new Date(s.next_payout_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    }))

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

    return { overdue, today: todayDue, this_week, this_month, later, recent_payouts }
  }

  async function runPayoutCheck() {
    setIsTriggering(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/cron/daily-payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()
      if (result.success) {
        toast.success(`ดำเนินการสำเร็จ ${result.processed} คน`)
        queryClient.invalidateQueries({ queryKey: ['payout-dashboard-v2'] })
      } else {
        toast.error(`เกิดข้อผิดพลาด: ${result.errors?.[0] || 'Unknown error'}`)
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
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        <span className="ml-3 text-stone-500">กำลังโหลด...</span>
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

  const totalStaff = (data?.overdue.length || 0) + (data?.today.length || 0) +
    (data?.this_week.length || 0) + (data?.this_month.length || 0) + (data?.later.length || 0)

  return (
    <div className="space-y-5">

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`rounded-xl p-4 border ${data?.overdue.length ? 'bg-red-50 border-red-200' : 'bg-white border-stone-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-4 h-4 ${data?.overdue.length ? 'text-red-500' : 'text-stone-400'}`} />
            <p className={`text-xs font-medium ${data?.overdue.length ? 'text-red-700' : 'text-stone-500'}`}>ค้างจ่าย</p>
          </div>
          <p className={`text-2xl font-bold ${data?.overdue.length ? 'text-red-900' : 'text-stone-400'}`}>
            {data?.overdue.length || 0}
          </p>
          <p className={`text-xs mt-0.5 ${data?.overdue.length ? 'text-red-600' : 'text-stone-400'}`}>คน</p>
        </div>

        <div className="rounded-xl p-4 border bg-white border-stone-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-medium text-stone-500">สัปดาห์นี้</p>
          </div>
          <p className="text-2xl font-bold text-stone-900">
            {(data?.today.length || 0) + (data?.this_week.length || 0)}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">คน</p>
        </div>

        <div className="rounded-xl p-4 border bg-white border-stone-200">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-blue-500" />
            <p className="text-xs font-medium text-stone-500">เดือนนี้</p>
          </div>
          <p className="text-2xl font-bold text-stone-900">{data?.this_month.length || 0}</p>
          <p className="text-xs text-stone-400 mt-0.5">คน</p>
        </div>

        <div className="rounded-xl p-4 border bg-white border-stone-200">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-stone-400" />
            <p className="text-xs font-medium text-stone-500">พนักงานทั้งหมด</p>
          </div>
          <p className="text-2xl font-bold text-stone-900">{totalStaff}</p>
          <p className="text-xs text-stone-400 mt-0.5">คน active</p>
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
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-900">รอบจ่ายเงินที่กำลังมาถึง</h3>
          {!data?.overdue.length && (
            <button
              onClick={runPayoutCheck}
              disabled={isTriggering}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 text-white text-sm rounded-lg hover:bg-stone-700 transition disabled:opacity-50"
            >
              {isTriggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              เรียกระบบออโต้
            </button>
          )}
        </div>

        {(data?.today.length || 0) + (data?.this_week.length || 0) + (data?.this_month.length || 0) + (data?.later.length || 0) === 0 ? (
          <div className="text-center py-8 text-stone-400">
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
                <SectionHeader title="สัปดาห์นี้ (1–7 วัน)" count={data.this_week.length} color="text-amber-700" />
                <div className="space-y-2">
                  {data.this_week.map(row => <StaffRow key={row.id} row={row} />)}
                </div>
              </div>
            )}

            {!!data?.this_month.length && (
              <div>
                <SectionHeader title="เดือนนี้ (8–30 วัน)" count={data.this_month.length} color="text-blue-700" />
                <div className="space-y-2">
                  {data.this_month.map(row => <StaffRow key={row.id} row={row} />)}
                </div>
              </div>
            )}

            {!!data?.later.length && (
              <div>
                <SectionHeader title="ถัดไป (30+ วัน)" count={data.later.length} color="text-stone-500" />
                <div className="space-y-2">
                  {data.later.map(row => <StaffRow key={row.id} row={row} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent payouts history */}
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <h3 className="font-semibold text-stone-900 mb-4">ประวัติรอบจ่าย 30 วันที่ผ่านมา</h3>

        {!data?.recent_payouts.length ? (
          <div className="text-center py-8 text-stone-400">
            <RefreshCw className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">ยังไม่มีรอบจ่ายในช่วงนี้</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {data.recent_payouts.map(payout => (
              <div key={payout.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-900 truncate">{payout.staff_name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${payout.is_automated ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-600'}`}>
                      {payout.is_automated ? 'อัตโนมัติ' : 'Manual'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {payout.total_jobs} งาน • {new Date(payout.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-4 text-right">
                  <p className="font-semibold text-stone-900">฿{payout.gross_earnings.toLocaleString()}</p>
                  <span className={`text-xs ${
                    payout.status === 'completed' ? 'text-green-600' :
                    payout.status === 'pending' ? 'text-amber-600' : 'text-red-600'
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
