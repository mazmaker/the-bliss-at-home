import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Wallet, Users, Banknote, ArrowUpRight, Filter, Download, Check, X, Loader2, Clock, AlertCircle } from 'lucide-react'

// ============================================================
// Types
// ============================================================

interface PayoutRow {
  id: string
  staff_id: string
  period_start: string
  period_end: string
  gross_earnings: number
  net_amount: number
  total_jobs: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  payout_round: string | null
  is_carry_forward: boolean
  carry_forward_amount: number
  transfer_reference: string | null
  created_at: string
  staff_name?: string
  payout_schedule?: string
  has_bank?: boolean
}

// ============================================================
// Helpers
// ============================================================

function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString('th-TH')}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusLabel(status: string): { text: string; color: string } {
  switch (status) {
    case 'pending': return { text: 'รอจ่าย', color: 'bg-amber-100 text-amber-800' }
    case 'processing': return { text: 'กำลังโอน', color: 'bg-blue-100 text-blue-800' }
    case 'completed': return { text: 'จ่ายแล้ว', color: 'bg-green-100 text-green-800' }
    case 'failed': return { text: 'ล้มเหลว', color: 'bg-red-100 text-red-800' }
    case 'carry_forward': return { text: 'ยกยอด', color: 'bg-orange-100 text-orange-800' }
    case 'not_due': return { text: 'ยังไม่ถึงรอบ', color: 'bg-gray-100 text-gray-500' }
    default: return { text: status, color: 'bg-gray-100 text-gray-800' }
  }
}

function roundLabel(round: string | null): string {
  if (round === 'mid-month') return 'งวดแรก'
  if (round === 'end-month') return 'งวดหลัง'
  return '-'
}

// ============================================================
// Data Hooks
// ============================================================

function usePayoutDashboard(filters: { round: string; status: string; month: string }) {
  return useQuery({
    queryKey: ['payout-dashboard', filters],
    queryFn: async () => {
      // Fetch payouts with staff info
      let query = supabase
        .from('payouts')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters.round && filters.round !== 'all') {
        query = query.eq('payout_round', filters.round)
      }
      if (filters.month) {
        const [year, month] = filters.month.split('-')
        const startOfMonth = `${year}-${month}-01`
        const endOfMonth = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]
        query = query.gte('period_end', startOfMonth).lte('period_start', endOfMonth)
      }

      const { data: payouts, error } = await query

      if (error) throw error

      // Get staff names for each payout
      const staffIds = [...new Set(payouts?.map(p => p.staff_id) || [])]
      const { data: staffProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', staffIds)

      const { data: staffRecords } = await supabase
        .from('staff')
        .select('profile_id, name_th, payout_schedule')
        .in('profile_id', staffIds)

      // Check bank accounts
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('staff_id')
        .in('staff_id', staffIds)

      const hasBankSet = new Set(bankAccounts?.map(b => b.staff_id) || [])

      const nameMap = new Map<string, string>()
      const scheduleMap = new Map<string, string>()
      staffRecords?.forEach(s => {
        nameMap.set(s.profile_id, s.name_th)
        scheduleMap.set(s.profile_id, s.payout_schedule || 'monthly')
      })
      staffProfiles?.forEach(p => {
        if (!nameMap.has(p.id)) nameMap.set(p.id, p.full_name || 'Unknown')
      })

      const enrichedPayouts: PayoutRow[] = (payouts || []).map(p => ({
        ...p,
        staff_name: nameMap.get(p.staff_id) || 'Unknown',
        payout_schedule: scheduleMap.get(p.staff_id) || 'monthly',
        has_bank: hasBankSet.has(p.staff_id),
      }))

      // ── Virtual rows: carry forward ──
      const now = new Date()
      const currentPeriodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const { data: carryForwardRecords } = await supabase
        .from('payout_notifications')
        .select('staff_id, payout_round, period_month, created_at')
        .eq('notification_type', 'payout_carry_forward')
        .eq('period_month', currentPeriodMonth)

      const carryForwardRows: PayoutRow[] = (carryForwardRecords || []).map(cf => ({
        id: `cf-${cf.staff_id}-${cf.payout_round}`,
        staff_id: cf.staff_id,
        period_start: '',
        period_end: '',
        gross_earnings: 0,
        net_amount: 0,
        total_jobs: 0,
        status: 'carry_forward' as any,
        payout_round: cf.payout_round,
        is_carry_forward: true,
        carry_forward_amount: 0,
        transfer_reference: null,
        created_at: cf.created_at,
        staff_name: nameMap.get(cf.staff_id) || 'Unknown',
        payout_schedule: scheduleMap.get(cf.staff_id) || 'monthly',
        has_bank: hasBankSet.has(cf.staff_id),
      }))

      // ── Virtual rows: not due (monthly staff during mid-month period) ──
      const currentDay = now.getDate()
      let notDueRows: PayoutRow[] = []
      if (currentDay <= 10) {
        // Before mid-month cutoff → monthly staff are "not due"
        const { data: monthlyStaff } = await supabase
          .from('staff')
          .select('id, profile_id, name_th, payout_schedule')
          .eq('payout_schedule', 'monthly')
          .eq('is_active', true)
          .not('profile_id', 'is', null)

        const payoutStaffIds = new Set(enrichedPayouts.map(p => p.staff_id))
        notDueRows = (monthlyStaff || [])
          .filter(s => !payoutStaffIds.has(s.profile_id))
          .map(s => ({
            id: `nd-${s.profile_id}`,
            staff_id: s.profile_id,
            period_start: '',
            period_end: '',
            gross_earnings: 0,
            net_amount: 0,
            total_jobs: 0,
            status: 'not_due' as any,
            payout_round: null,
            is_carry_forward: false,
            carry_forward_amount: 0,
            transfer_reference: null,
            created_at: now.toISOString(),
            staff_name: s.name_th,
            payout_schedule: 'monthly',
            has_bank: hasBankSet.has(s.profile_id),
          }))
      }

      // Merge all rows (filter virtual rows based on status filter)
      let allRows = [...enrichedPayouts, ...carryForwardRows, ...notDueRows]
      if (filters.status && filters.status !== 'all') {
        allRows = allRows.filter(p => p.status === filters.status)
      }

      // Stats
      const pendingPayouts = enrichedPayouts.filter(p => p.status === 'pending')
      const totalStaff = new Set([...enrichedPayouts.map(p => p.staff_id), ...carryForwardRows.map(p => p.staff_id), ...notDueRows.map(p => p.staff_id)]).size
      const pendingAmount = pendingPayouts.reduce((sum, p) => sum + Number(p.net_amount), 0)

      return {
        payouts: allRows,
        stats: {
          totalStaff,
          pendingCount: pendingPayouts.length,
          pendingAmount,
          carryForwards: carryForwardRows.length,
        },
      }
    },
  })
}

// ============================================================
// Batch Payout Modal
// ============================================================

function BatchPayoutModal({
  selectedPayouts,
  onClose,
  onComplete,
}: {
  selectedPayouts: PayoutRow[]
  onClose: () => void
  onComplete: () => void
}) {
  const [transferRef, setTransferRef] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const totalAmount = selectedPayouts.reduce((sum, p) => sum + Number(p.net_amount), 0)

  const handleProcess = async () => {
    if (!transferRef.trim()) return
    setIsProcessing(true)
    const serverUrl = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')
    try {
      for (const payout of selectedPayouts) {
        const transferredAt = new Date().toISOString()
        await supabase
          .from('payouts')
          .update({
            status: 'completed',
            transfer_reference: transferRef,
            transferred_at: transferredAt,
          })
          .eq('id', payout.id)

        // Send in-app notification to staff
        await supabase.from('notifications').insert({
          user_id: payout.staff_id,
          title: 'ได้รับเงินแล้ว',
          message: `ยอด ${formatCurrency(Number(payout.net_amount))} โอนเรียบร้อยแล้ว (Ref: ${transferRef})`,
          type: 'payout',
          is_read: false,
        })

        // Send LINE push notification via server (uses existing payout-completed endpoint)
        try {
          await fetch(`${serverUrl}/api/notifications/payout-completed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payout_id: payout.id }),
          })
        } catch (lineErr) {
          console.warn('LINE notification failed (non-blocking):', lineErr)
        }
      }
      onComplete()
    } catch (err) {
      console.error('Batch payout error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">จ่ายเงิน Staff</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-amber-700">จำนวน Staff</span>
            <span className="font-bold text-amber-900">{selectedPayouts.length} คน</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-amber-700">ยอดรวม</span>
            <span className="font-bold text-amber-900 text-lg">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Reference</label>
          <input
            type="text"
            value={transferRef}
            onChange={e => setTransferRef(e.target.value)}
            placeholder="เลขอ้างอิงการโอน"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="max-h-40 overflow-y-auto mb-4">
          {selectedPayouts.map(p => (
            <div key={p.id} className="flex justify-between py-1.5 text-sm border-b border-gray-100">
              <span className="text-gray-700">{p.staff_name}</span>
              <span className="font-medium">{formatCurrency(Number(p.net_amount))}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleProcess}
            disabled={isProcessing || !transferRef.trim()}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> กำลังจ่าย...</>
            ) : (
              <><Check className="w-4 h-4" /> ยืนยันจ่ายเงิน</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Export CSV
// ============================================================

function exportCSV(payouts: PayoutRow[]) {
  const headers = ['ชื่อ Staff', 'รอบ', 'ช่วงเวลา', 'จำนวนงาน', 'ยอดรวม', 'สถานะ', 'Ref']
  const rows = payouts.map(p => [
    p.staff_name || '',
    roundLabel(p.payout_round),
    `${p.period_start} - ${p.period_end}`,
    p.total_jobs,
    p.net_amount,
    statusLabel(p.status).text,
    p.transfer_reference || '',
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `payout-report-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================================
// Main Component
// ============================================================

export default function PayoutDashboard() {
  const [filters, setFilters] = useState({ round: 'all', status: 'all', month: '' })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBatchModal, setShowBatchModal] = useState(false)

  const { data, isLoading, refetch } = usePayoutDashboard(filters)
  const stats = data?.stats
  const payouts = data?.payouts || []

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    const pendingIds = payouts.filter(p => p.status === 'pending').map(p => p.id)
    if (selectedIds.size === pendingIds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingIds))
    }
  }

  const selectedPayouts = payouts.filter(p => selectedIds.has(p.id))

  // Current payout round info
  const now = new Date()
  const day = now.getDate()
  let currentRoundText = ''
  if (day <= 10) currentRoundText = `งวดแรก (ตัดรอบ 10, จ่าย 16)`
  else if (day <= 25) currentRoundText = `งวดหลัง (ตัดรอบ 25, จ่าย 1 เดือนถัดไป)`
  else currentRoundText = `งวดแรกเดือนถัดไป (ตัดรอบ 10, จ่าย 16)`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="w-7 h-7 text-amber-600" />
          รอบจ่ายเงิน Staff
        </h1>
        <p className="text-gray-500 mt-1">Staff Payout Management</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalStaff}</p>
            <p className="text-sm text-gray-500">Staff ทั้งหมด</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingCount}</p>
            <p className="text-sm text-gray-500">ครบกำหนดรอบนี้</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Banknote className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.pendingAmount)}</p>
            <p className="text-sm text-gray-500">ยอดรวมรอจ่าย</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.carryForwards}</p>
            <p className="text-sm text-gray-500">ยกยอด (ต่ำกว่าขั้นต่ำ)</p>
          </div>
        </div>
      )}

      {/* Current Round Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="text-sm text-amber-800">
          <span className="font-medium">รอบปัจจุบัน:</span> {currentRoundText}
        </span>
      </div>

      {/* Filters + Actions */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filters.round}
            onChange={e => setFilters(f => ({ ...f, round: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">ทุกรอบ</option>
            <option value="mid-month">งวดแรก</option>
            <option value="end-month">งวดหลัง</option>
          </select>
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="pending">รอจ่าย</option>
            <option value="processing">กำลังโอน</option>
            <option value="completed">จ่ายแล้ว</option>
            <option value="failed">ล้มเหลว</option>
            <option value="carry_forward">ยกยอด</option>
            <option value="not_due">ยังไม่ถึงรอบ</option>
          </select>
          <input
            type="month"
            value={filters.month}
            onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
          />

          <div className="ml-auto flex gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={() => setShowBatchModal(true)}
                className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1.5"
              >
                <Banknote className="w-4 h-4" />
                จ่ายเงินที่เลือก ({selectedIds.size})
              </button>
            )}
            <button
              onClick={() => exportCSV(payouts)}
              className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>ไม่มีรายการ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-3 px-2 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === payouts.filter(p => p.status === 'pending').length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="py-3 px-2">ชื่อ</th>
                  <th className="py-3 px-2">รอบ</th>
                  <th className="py-3 px-2">ช่วงเวลา</th>
                  <th className="py-3 px-2 text-right">งาน</th>
                  <th className="py-3 px-2 text-right">ยอด</th>
                  <th className="py-3 px-2 text-center">สถานะ</th>
                  <th className="py-3 px-2 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map(p => {
                  const st = statusLabel(p.status)
                  return (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        {p.status === 'pending' && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="rounded border-gray-300"
                          />
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-medium text-gray-900">{p.staff_name}</div>
                        <div className="text-xs text-gray-400">
                          {p.payout_schedule === 'bi-monthly' ? 'ครึ่งเดือน' : 'รายเดือน'}
                        </div>
                        {p.has_bank === false && (
                          <div className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3" />
                            ยังไม่มีบัญชีธนาคาร
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-gray-600">{roundLabel(p.payout_round)}</td>
                      <td className="py-3 px-2 text-gray-600 text-xs">
                        {p.period_start ? `${formatDate(p.period_start)} - ${formatDate(p.period_end)}` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-700">
                        {p.status === 'not_due' || p.status === 'carry_forward' ? <span className="text-gray-300">—</span> : p.total_jobs}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-gray-900">
                        {p.status === 'not_due' ? (
                          <span className="text-gray-300">—</span>
                        ) : p.status === 'carry_forward' ? (
                          <span className="text-xs text-orange-500 font-normal">ต่ำกว่าขั้นต่ำ</span>
                        ) : (
                          <>
                            {formatCurrency(Number(p.net_amount))}
                            {p.is_carry_forward && Number(p.carry_forward_amount) > 0 && (
                              <div className="text-xs text-orange-500 font-normal">
                                +{formatCurrency(Number(p.carry_forward_amount))} ยกยอด
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                          {st.text}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {p.status === 'pending' ? (
                          <button
                            onClick={() => { setSelectedIds(new Set([p.id])); setShowBatchModal(true) }}
                            className="text-green-600 hover:text-green-800 font-medium text-xs"
                          >
                            จ่าย
                          </button>
                        ) : p.transfer_reference ? (
                          <span className="text-xs text-gray-400">Ref: {p.transfer_reference}</span>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Batch Payout Modal */}
      {showBatchModal && selectedPayouts.length > 0 && (
        <BatchPayoutModal
          selectedPayouts={selectedPayouts}
          onClose={() => setShowBatchModal(false)}
          onComplete={() => {
            setShowBatchModal(false)
            setSelectedIds(new Set())
            refetch()
          }}
        />
      )}
    </div>
  )
}
