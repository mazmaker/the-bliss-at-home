import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Search, CheckCircle, Clock, DollarSign, Calendar, Users, RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface PayoutVerificationResult {
  recent_payouts: Array<{
    id: string
    staff_name: string
    amount: number
    status: string
    created_at: string
    is_automated: boolean
    jobs_count: number
    period: string
  }>
  automated_stats: {
    today_count: number
    today_amount: number
    weekly_count: number
    weekly_amount: number
  }
  staff_status: Array<{
    id: string
    name_th: string
    next_payout_date: string
    last_payout_processed_at: string
    payout_schedule: string
  }>
}

export function PayoutVerificationPanel() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const { data: verification, isLoading, refetch } = useQuery({
    queryKey: ['payout-verification', selectedDate],
    queryFn: () => fetchPayoutVerification(selectedDate),
    refetchInterval: 15000, // Auto-refresh every 15 seconds
  })

  async function fetchPayoutVerification(date: string): Promise<PayoutVerificationResult> {
    const startOfDay = `${date}T00:00:00.000Z`
    const endOfDay = `${date}T23:59:59.999Z`

    // Get recent payouts
    const { data: payouts, error: payoutsError } = await supabase
      .from('payouts')
      .select(`
        id,
        staff_id,
        gross_earnings,
        status,
        created_at,
        is_automated,
        total_jobs,
        period_start,
        period_end,
        staff:staff!payouts_staff_id_fkey(name_th)
      `)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false })

    if (payoutsError) throw payoutsError

    const recentPayouts = payouts?.map(payout => ({
      id: payout.id,
      staff_name: (payout.staff as any)?.name_th || 'Unknown',
      amount: payout.gross_earnings || 0,
      status: payout.status,
      created_at: payout.created_at,
      is_automated: payout.is_automated || false,
      jobs_count: payout.total_jobs || 0,
      period: `${payout.period_start} - ${payout.period_end}`
    })) || []

    // Get automated stats
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { data: weeklyPayouts, error: weeklyError } = await supabase
      .from('payouts')
      .select('gross_earnings, created_at')
      .eq('is_automated', true)
      .gte('created_at', weekAgo.toISOString())

    if (weeklyError) throw weeklyError

    const todayPayouts = weeklyPayouts?.filter(p =>
      p.created_at.startsWith(date)
    ) || []

    const automatedStats = {
      today_count: todayPayouts.length,
      today_amount: todayPayouts.reduce((sum, p) => sum + (p.gross_earnings || 0), 0),
      weekly_count: weeklyPayouts?.length || 0,
      weekly_amount: weeklyPayouts?.reduce((sum, p) => sum + (p.gross_earnings || 0), 0) || 0
    }

    // Get staff payout status
    const { data: staffStatus, error: staffError } = await supabase
      .from('staff')
      .select('id, name_th, next_payout_date, last_payout_processed_at, payout_schedule')
      .eq('status', 'active')
      .order('next_payout_date', { ascending: true })
      .limit(20)

    if (staffError) throw staffError

    return {
      recent_payouts: recentPayouts,
      automated_stats: automatedStats,
      staff_status: staffStatus || []
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Search className="w-5 h-5" />
            ตรวจสอบผลการทำงาน
          </h3>
          <p className="text-sm text-stone-600 mt-1">
            ตรวจสอบ payout อัตโนมัติและสถานะพนักงาน
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-stone-300 rounded-lg text-sm"
          />
          <button
            onClick={() => refetch()}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-green-600">วันนี้สร้าง</p>
              <p className="text-xl font-bold text-green-900">
                {verification?.automated_stats.today_count || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-600">ยอดวันนี้</p>
              <p className="text-xl font-bold text-blue-900">
                ฿{(verification?.automated_stats.today_amount || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-purple-600">7 วันที่ผ่านมา</p>
              <p className="text-xl font-bold text-purple-900">
                {verification?.automated_stats.weekly_count || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-sm text-amber-600">ยอดรวม 7 วัน</p>
              <p className="text-xl font-bold text-amber-900">
                ฿{(verification?.automated_stats.weekly_amount || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payouts Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200">
          <h4 className="font-semibold text-stone-900">
            Payout ที่สร้างวันที่ {new Date(selectedDate).toLocaleDateString('th-TH')}
          </h4>
        </div>

        {verification?.recent_payouts.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">ไม่มี payout ในวันนี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                    พนักงาน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                    จำนวนเงิน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                    งาน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                    ประเภท
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                    เวลา
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {verification?.recent_payouts.map(payout => (
                  <tr key={payout.id} className="hover:bg-stone-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-stone-900">{payout.staff_name}</div>
                      <div className="text-sm text-stone-500">{payout.period}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-stone-900">
                        ฿{payout.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-stone-600">{payout.jobs_count} งาน</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        payout.is_automated
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {payout.is_automated ? 'อัตโนมัติ' : 'Manual'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        payout.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {payout.status === 'pending' ? 'รอการอนุมัติ' :
                         payout.status === 'completed' ? 'จ่ายแล้ว' : 'ล้มเหลว'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-500">
                      {new Date(payout.created_at).toLocaleTimeString('th-TH')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff Status */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200">
          <h4 className="font-semibold text-stone-900">สถานะพนักงาน (20 คนแรก)</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                  ชื่อ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                  รอบจ่าย
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                  วันจ่ายถัดไป
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                  ประมวลผลล่าสุด
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {verification?.staff_status.map(staff => (
                <tr key={staff.id} className="hover:bg-stone-50">
                  <td className="px-6 py-4 font-medium text-stone-900">
                    {staff.name_th}
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-600">
                    {staff.payout_schedule}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`${
                      staff.next_payout_date === new Date().toISOString().split('T')[0]
                        ? 'text-red-600 font-medium'
                        : 'text-stone-600'
                    }`}>
                      {new Date(staff.next_payout_date).toLocaleDateString('th-TH')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-500">
                    {staff.last_payout_processed_at
                      ? new Date(staff.last_payout_processed_at).toLocaleDateString('th-TH')
                      : 'ยังไม่เคย'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default PayoutVerificationPanel