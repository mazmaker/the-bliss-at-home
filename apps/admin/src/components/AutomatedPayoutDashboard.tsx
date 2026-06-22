import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  Clock,
  Play,
  CheckCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  Users,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface AutoPayoutStatus {
  upcoming_staff: Array<{
    id: string
    name_th: string
    payout_schedule: string
    next_payout_date: string
    days_until_payout: number
  }>
  recent_automated: Array<{
    id: string
    staff_name: string
    amount: number
    created_at: string
    status: string
    jobs_count: number
  }>
  stats: {
    total_automated_today: number
    total_amount_today: number
    pending_count: number
    errors_count: number
  }
}

export function AutomatedPayoutDashboard() {
  const [isTriggering, setIsTriggering] = useState(false)
  const queryClient = useQueryClient()

  // Fetch automated payout status
  const { data: status, isLoading, error } = useQuery({
    queryKey: ['automated-payout-status'],
    queryFn: fetchAutomatedPayoutStatus,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  async function fetchAutomatedPayoutStatus(): Promise<AutoPayoutStatus> {
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    // Get upcoming staff due for payout (next 7 days)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)

    const { data: upcomingStaff, error: upcomingError } = await supabase
      .from('staff')
      .select('id, name_th, payout_schedule, next_payout_date')
      .eq('status', 'active')
      .gte('next_payout_date', today)
      .lte('next_payout_date', nextWeek.toISOString().split('T')[0])
      .order('next_payout_date', { ascending: true })

    if (upcomingError) throw upcomingError

    // Calculate days until payout
    const upcomingWithDays = upcomingStaff?.map(staff => ({
      ...staff,
      days_until_payout: Math.ceil(
        (new Date(staff.next_payout_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    })) || []

    // Get recent automated payouts (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { data: recentPayouts, error: payoutsError } = await supabase
      .from('payouts')
      .select(`
        id,
        staff_id,
        gross_earnings,
        created_at,
        status,
        total_jobs,
        staff:staff!payouts_staff_id_fkey(name_th)
      `)
      .eq('is_automated', true)
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false })

    if (payoutsError) throw payoutsError

    const recentAutomated = recentPayouts?.map(payout => ({
      id: payout.id,
      staff_name: (payout.staff as any)?.name_th || 'Unknown',
      amount: payout.gross_earnings || 0,
      created_at: payout.created_at,
      status: payout.status,
      jobs_count: payout.total_jobs || 0
    })) || []

    // Get today's stats
    const { data: todayStats, error: statsError } = await supabase
      .from('payouts')
      .select('gross_earnings, status')
      .eq('is_automated', true)
      .gte('created_at', today + 'T00:00:00')
      .lte('created_at', tomorrowStr + 'T00:00:00')

    if (statsError) throw statsError

    const stats = {
      total_automated_today: todayStats?.length || 0,
      total_amount_today: todayStats?.reduce((sum, p) => sum + (p.gross_earnings || 0), 0) || 0,
      pending_count: todayStats?.filter(p => p.status === 'pending').length || 0,
      errors_count: 0 // TODO: Implement error tracking
    }

    return {
      upcoming_staff: upcomingWithDays,
      recent_automated: recentAutomated,
      stats
    }
  }

  async function triggerManualPayoutCheck() {
    setIsTriggering(true)
    try {
      const response = await fetch('/api/cron/daily-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`✅ ตรวจสอบสำเร็จ! ดำเนินการ ${result.processed} คน`)
        queryClient.invalidateQueries({ queryKey: ['automated-payout-status'] })
      } else {
        toast.error(`❌ เกิดข้อผิดพลาด: ${result.errors?.[0] || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error triggering manual payout check:', error)
      toast.error('❌ ไม่สามารถเรียกใช้ระบบอัตโนมัติได้')
    } finally {
      setIsTriggering(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
        <span className="ml-3 text-stone-500">กำลังโหลดข้อมูลระบบอัตโนมัติ...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">เกิดข้อผิดพลาดในการโหลดข้อมูล</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">🤖 ระบบจ่ายเงินอัตโนมัติ</h2>
          <p className="text-sm text-stone-600 mt-1">
            ระบบตรวจสอบและสร้างรอบจ่ายเงินอัตโนมัติทุกวันเวลา 00:01 น.
          </p>
        </div>
        <button
          onClick={triggerManualPayoutCheck}
          disabled={isTriggering}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTriggering ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              กำลังดำเนินการ...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              เรียกใช้เลย
            </>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-stone-600">วันนี้สร้างแล้ว</p>
              <p className="text-lg font-semibold text-stone-900">{status?.stats.total_automated_today || 0} รอบ</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-stone-600">ยอดรวมวันนี้</p>
              <p className="text-lg font-semibold text-stone-900">
                ฿{(status?.stats.total_amount_today || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-stone-600">รอการอนุมัติ</p>
              <p className="text-lg font-semibold text-stone-900">{status?.stats.pending_count || 0} รอบ</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-stone-600">ครบรอบ 7 วันข้างหน้า</p>
              <p className="text-lg font-semibold text-stone-900">{status?.upcoming_staff.length || 0} คน</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Payouts */}
      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          พนักงานที่ครบรอบจ่ายเงินในอีก 7 วันข้างหน้า
        </h3>

        {status?.upcoming_staff.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">ไม่มีพนักงานครบรอบในช่วงนี้</p>
          </div>
        ) : (
          <div className="space-y-2">
            {status?.upcoming_staff.map(staff => (
              <div
                key={staff.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  staff.days_until_payout === 0
                    ? 'bg-red-50 border-red-200'
                    : staff.days_until_payout <= 1
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div>
                  <p className="font-medium text-stone-900">{staff.name_th}</p>
                  <p className="text-sm text-stone-600">
                    {staff.payout_schedule} • วันที่ {new Date(staff.next_payout_date).toLocaleDateString('th-TH')}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      staff.days_until_payout === 0
                        ? 'bg-red-100 text-red-800'
                        : staff.days_until_payout <= 1
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {staff.days_until_payout === 0 ? 'วันนี้!' : `อีก ${staff.days_until_payout} วัน`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Automated Payouts */}
      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          รอบจ่ายอัตโนมัติล่าสุด (7 วันที่ผ่านมา)
        </h3>

        {status?.recent_automated.length === 0 ? (
          <div className="text-center py-8">
            <RefreshCw className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">ยังไม่มีรอบจ่ายอัตโนมัติ</p>
          </div>
        ) : (
          <div className="space-y-2">
            {status?.recent_automated.map(payout => (
              <div key={payout.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                <div>
                  <p className="font-medium text-stone-900">{payout.staff_name}</p>
                  <p className="text-sm text-stone-600">
                    🤖 อัตโนมัติ • {payout.jobs_count} งาน • {new Date(payout.created_at).toLocaleDateString('th-TH')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-stone-900">฿{payout.amount.toLocaleString()}</p>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      payout.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : payout.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {payout.status === 'pending' ? 'รอการอนุมัติ' :
                     payout.status === 'completed' ? 'จ่ายแล้ว' : 'ล้มเหลว'}
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