import { useState, useEffect } from 'react'
import { X, Wallet, AlertCircle, Plus, Loader2, CheckCircle, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import PayoutScheduleSelector from './PayoutScheduleSelector'
import { PayoutSchedule, calculateNextPayoutDate } from '../types/staff'

interface UnpaidJob {
  id: string
  service_name: string
  scheduled_date: string
  staff_earnings: number
  total_staff_earnings?: number
  status: string
  booking_id: string
}

interface CreatePayoutModalProps {
  staffId: string // staff table id
  staffName: string
  onClose: () => void
}

export function CreatePayoutModal({ staffId, staffName, onClose }: CreatePayoutModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [unpaidJobs, setUnpaidJobs] = useState<UnpaidJob[]>([])
  const [profileId, setProfileId] = useState<string | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<PayoutSchedule>('monthly')
  const [customInterval, setCustomInterval] = useState(30)
  const [currentPayoutSchedule, setCurrentPayoutSchedule] = useState<PayoutSchedule>('bi_monthly')
  const [hasBankAccount, setHasBankAccount] = useState(true)
  const queryClient = useQueryClient()

  // Fetch unpaid jobs on mount
  useEffect(() => {
    fetchUnpaidJobs()
  }, [staffId])

  const fetchUnpaidJobs = async () => {
    setIsLoading(true)
    try {
      // Get profile_id and payout schedule from staff table
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('profile_id, payout_schedule, custom_payout_interval')
        .eq('id', staffId)
        .single()

      if (staffError) throw staffError
      if (!staffData?.profile_id) {
        toast.error('ไม่พบข้อมูลโปรไฟล์พนักงาน')
        return
      }

      setProfileId(staffData.profile_id)
      setCurrentPayoutSchedule(staffData.payout_schedule || 'bi_monthly')
      setSelectedSchedule(staffData.payout_schedule || 'monthly')
      setCustomInterval(staffData.custom_payout_interval || 30)

      // Check whether this staff has a bank account (bank_accounts.staff_id = staff.id).
      // Missing bank account does NOT block creating the payout — we only warn.
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('staff_id', staffId)
        .limit(1)
      setHasBankAccount((bankAccounts?.length || 0) > 0)

      // Get all job_ids already in payout_jobs
      const { data: paidJobIds } = await supabase
        .from('payout_jobs')
        .select('job_id')

      const paidSet = new Set((paidJobIds || []).map((pj) => pj.job_id))

      // Get completed jobs for this staff
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, service_name, scheduled_date, staff_earnings, total_staff_earnings, status, booking_id')
        .eq('staff_id', staffData.profile_id)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false })

      if (jobsError) throw jobsError

      // Filter out jobs already in a payout
      const unpaid = (jobs || []).filter((j) => !paidSet.has(j.id))
      setUnpaidJobs(unpaid)
    } catch (error: any) {
      console.error('Error fetching unpaid jobs:', error)
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePayout = async () => {
    if (!profileId || unpaidJobs.length === 0) return

    setIsCreating(true)
    try {
      // Calculate next payout date based on selected schedule starting from today
      const today = new Date().toISOString().split('T')[0]
      const nextPayoutDate = calculateNextPayoutDate(
        selectedSchedule,
        selectedSchedule === 'custom_days' ? customInterval : undefined,
        undefined,
        today
      )

      // Update staff payout schedule + advance next_payout_date
      const { error: updateError } = await supabase
        .from('staff')
        .update({
          payout_schedule: selectedSchedule,
          custom_payout_interval: selectedSchedule === 'custom_days' ? customInterval : null,
          payout_start_date: today,
          next_payout_date: nextPayoutDate.toISOString().split('T')[0],
          last_payout_processed_at: new Date().toISOString(),
        })
        .eq('id', staffId)

      if (updateError) throw updateError

      // Calculate totals
      const grossEarnings = unpaidJobs.reduce((sum, j) => sum + (j.total_staff_earnings ?? j.staff_earnings ?? 0), 0)
      const totalJobs = unpaidJobs.length

      // Determine period from job dates
      const dates = unpaidJobs.map((j) => j.scheduled_date).sort()
      const periodStart = dates[0]
      const periodEnd = dates[dates.length - 1]

      // Create payout record with schedule info
      const { data: payout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          staff_id: profileId,
          period_start: periodStart,
          period_end: periodEnd,
          gross_earnings: grossEarnings,
          platform_fee: 0,
          net_amount: grossEarnings, // No platform fee deduction
          total_jobs: totalJobs,
          status: 'pending'
          // Removed payout_round to avoid constraint issues
        })
        .select()
        .single()

      if (payoutError) throw payoutError

      // Create payout_jobs records
      const payoutJobsData = unpaidJobs.map((job) => ({
        payout_id: payout.id,
        job_id: job.id,
        amount: job.total_staff_earnings || job.staff_earnings || 0,
      }))

      const { error: pjError } = await supabase
        .from('payout_jobs')
        .insert(payoutJobsData)

      if (pjError) throw pjError

      // Get schedule display name for toast
      const scheduleNames = {
        weekly: 'ทุกสัปดาห์ (7 วัน)',
        monthly: 'รายเดือน (30 วัน)',
        bi_monthly: 'กลางเดือน + สิ้นเดือน',
        custom_days: `กำหนดเอง (${customInterval} วัน)`
      }

      toast.success(`อัปเดตรอบการจ่ายเป็น "${scheduleNames[selectedSchedule]}" และสร้างรอบจ่ายเงินสำเร็จ (${totalJobs} งาน, ฿${grossEarnings.toLocaleString()})`)

      // Reminder: bank account still required before the actual transfer.
      if (!hasBankAccount) {
        toast('อย่าลืมเพิ่มบัญชีธนาคารของพนักงานก่อนโอนเงินจริง', { icon: '⚠️', duration: 6000 })
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['staff', staffId, 'payouts'] })
      queryClient.invalidateQueries({ queryKey: ['staff', staffId, 'earnings', 'summary'] })
      queryClient.invalidateQueries({ queryKey: ['staff', staffId] }) // Refresh staff data

      onClose()
    } catch (error: any) {
      console.error('Error creating payout:', error)
      toast.error(error.message || 'เกิดข้อผิดพลาดในการสร้างรอบจ่ายเงิน')
    } finally {
      setIsCreating(false)
    }
  }

  const totalEarnings = unpaidJobs.reduce((sum, j) => sum + (j.total_staff_earnings || j.staff_earnings || 0), 0)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-bliss-700 to-bliss-800 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white leading-tight">สร้างรอบจ่ายเงิน</h2>
                <p className="text-xs text-bliss-200 truncate">{staffName}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition flex-shrink-0"
              disabled={isCreating}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-bliss-400 animate-spin" />
              <span className="ml-3 text-bliss-500">กำลังโหลดข้อมูล...</span>
            </div>
          ) : unpaidJobs.length === 0 ? (
            <div className="space-y-4">
              {/* Bank account warning still shown even when there are no pending jobs */}
              {!hasBankAccount && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 flex items-start gap-3 text-left">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-semibold mb-0.5">พนักงานยังไม่มีบัญชีธนาคาร</p>
                    <p>กรุณาเพิ่มบัญชีธนาคารในหน้าข้อมูลพนักงานก่อน จึงจะโอนเงินให้พนักงานคนนี้ได้</p>
                  </div>
                </div>
              )}
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-bliss-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-bliss-900 mb-2">ไม่มีงานค้างจ่าย</h3>
                <p className="text-sm text-bliss-600">งานที่เสร็จสิ้นทั้งหมดถูกรวมในรอบจ่ายเงินแล้ว</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bank account warning (does not block creating the payout) */}
              {!hasBankAccount && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-semibold mb-0.5">พนักงานยังไม่มีบัญชีธนาคาร</p>
                    <p>สามารถสร้างรอบจ่ายได้ตามปกติ แต่ <span className="font-medium">ต้องเพิ่มบัญชีธนาคารก่อนถึงจะโอนเงินจริงได้</span> — กรุณาไปเพิ่มบัญชีในหน้าข้อมูลพนักงาน (แท็บข้อมูล/บัญชีธนาคาร) ก่อนกด "ดำเนินการจ่ายเงิน"</p>
                  </div>
                </div>
              )}

              {/* Schedule Summary */}
              <div className="bg-gradient-to-r from-bliss-50 to-bliss-50 border border-bliss-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-bliss-500 rounded-full animate-pulse"></div>
                    <Settings className="w-5 h-5 text-bliss-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-bliss-900 mb-1">รอบการจ่ายที่เลือกแล้ว</h3>
                    <p className="text-sm text-bliss-700 font-medium">
                      • {selectedSchedule === 'weekly' && 'ทุกสัปดาห์ (7 วัน)'}
                      • {selectedSchedule === 'monthly' && 'รายเดือน (30 วัน)'}
                      • {selectedSchedule === 'bi_monthly' && 'กลางเดือน + สิ้นเดือน'}
                      • {selectedSchedule === 'custom_days' && `กำหนดเอง (${customInterval} วัน)`}
                    </p>
                    <p className="text-xs text-bliss-600 mt-1">
                      ระบบจะอัปเดตรอบการจ่ายนี้ให้พนักงานคนนี้
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-bliss-100 rounded-lg">
                    <Wallet className="w-5 h-5 text-bliss-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-bliss-900 mb-2">สรุปรอบจ่ายเงินใหม่</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-bliss-600">จำนวนงาน:</span>
                        <span className="font-medium text-bliss-900">{unpaidJobs.length} งาน</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bliss-600">ช่วงเวลา:</span>
                        <span className="font-medium text-bliss-900">
                          {new Date(unpaidJobs[unpaidJobs.length - 1].scheduled_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                          {' - '}
                          {new Date(unpaidJobs[0].scheduled_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="border-t border-bliss-300 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-bliss-900">ยอดรวมทั้งหมด:</span>
                          <span className="font-bold text-xl text-bliss-700">฿{totalEarnings.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Jobs List */}
              <div>
                <h4 className="text-sm font-semibold text-bliss-700 mb-2">รายการงานที่รวมในรอบนี้ ({unpaidJobs.length} งาน)</h4>
                <div className="border border-bliss-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-bliss-50 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 text-left text-bliss-600 font-medium">วันที่</th>
                        <th className="py-2 px-3 text-left text-bliss-600 font-medium">บริการ</th>
                        <th className="py-2 px-3 text-right text-bliss-600 font-medium">รายได้</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bliss-100">
                      {unpaidJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-bliss-50">
                          <td className="py-2 px-3 text-bliss-600">
                            {new Date(job.scheduled_date).toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </td>
                          <td className="py-2 px-3 text-bliss-900">{job.service_name}</td>
                          <td className="py-2 px-3 text-right font-medium text-bliss-700">
                            ฿{Number(job.total_staff_earnings ?? job.staff_earnings ?? 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-bliss-50 border border-bliss-200 rounded-b-xl p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-bliss-900">ยอดรวมทั้งหมด:</span>
                    <span className="font-bold text-xl text-bliss-700">฿{totalEarnings.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="bg-bliss-50 border border-bliss-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-bliss-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-bliss-800">
                  <p>
                    ระบบจะอัปเดตรอบการจ่ายเงินของพนักงานและสร้างรอบจ่ายเงินสถานะ "รอดำเนินการ"
                    จากนั้นสามารถกดปุ่ม "ดำเนินการจ่ายเงิน" เพื่อบันทึกการโอนเงินจริง
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-bliss-200 bg-bliss-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white text-bliss-700 border border-bliss-300 rounded-lg hover:bg-bliss-100 transition"
            disabled={isCreating}
          >
            ยกเลิก
          </button>

          <div className="flex items-center gap-3">
            {unpaidJobs.length > 0 ? (
              <button
                onClick={handleCreatePayout}
                disabled={isCreating}
                className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-bliss-600 to-bliss-700 text-white rounded-xl hover:from-bliss-700 hover:to-bliss-800 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังสร้าง...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    สร้างรอบจ่ายเงิน ({unpaidJobs.length} งาน)
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-bliss-600 text-white rounded-lg hover:bg-bliss-700 transition"
              >
                ปิด
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
