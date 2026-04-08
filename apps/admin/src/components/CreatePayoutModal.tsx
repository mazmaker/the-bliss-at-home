import { useState, useEffect } from 'react'
import { X, DollarSign, AlertCircle, Plus, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'

interface UnpaidJob {
  id: string
  service_name: string
  scheduled_date: string
  staff_earnings: number
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
  const queryClient = useQueryClient()

  // Fetch unpaid jobs on mount
  useEffect(() => {
    fetchUnpaidJobs()
  }, [staffId])

  const fetchUnpaidJobs = async () => {
    setIsLoading(true)
    try {
      // Get profile_id from staff table
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('profile_id')
        .eq('id', staffId)
        .single()

      if (staffError) throw staffError
      if (!staffData?.profile_id) {
        toast.error('ไม่พบข้อมูลโปรไฟล์พนักงาน')
        return
      }

      setProfileId(staffData.profile_id)

      // Get all job_ids already in payout_jobs
      const { data: paidJobIds } = await supabase
        .from('payout_jobs')
        .select('job_id')

      const paidSet = new Set((paidJobIds || []).map((pj) => pj.job_id))

      // Get completed jobs for this staff
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, service_name, scheduled_date, staff_earnings, status, booking_id')
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
      // Calculate totals
      const grossEarnings = unpaidJobs.reduce((sum, j) => sum + (j.staff_earnings || 0), 0)
      const totalJobs = unpaidJobs.length

      // Determine period from job dates
      const dates = unpaidJobs.map((j) => j.scheduled_date).sort()
      const periodStart = dates[0]
      const periodEnd = dates[dates.length - 1]

      // Create payout record
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
          status: 'pending',
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

      toast.success(`สร้างรอบจ่ายเงินสำเร็จ (${totalJobs} งาน, ฿${grossEarnings.toLocaleString()})`)

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['staff', staffId, 'payouts'] })
      queryClient.invalidateQueries({ queryKey: ['staff', staffId, 'earnings', 'summary'] })

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
        <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Plus className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-stone-900">สร้างรอบจ่ายเงิน</h2>
              <p className="text-sm text-stone-600 mt-1">{staffName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition"
            disabled={isCreating}
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
              <span className="ml-3 text-stone-500">กำลังโหลดข้อมูล...</span>
            </div>
          ) : unpaidJobs.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-stone-900 mb-2">ไม่มีงานค้างจ่าย</h3>
              <p className="text-sm text-stone-600">งานที่เสร็จสิ้นทั้งหมดถูกรวมในรอบจ่ายเงินแล้ว</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-stone-900 mb-2">สรุปรอบจ่ายเงินใหม่</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-stone-600">จำนวนงาน:</span>
                        <span className="font-medium text-stone-900">{unpaidJobs.length} งาน</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-600">ช่วงเวลา:</span>
                        <span className="font-medium text-stone-900">
                          {new Date(unpaidJobs[unpaidJobs.length - 1].scheduled_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                          {' - '}
                          {new Date(unpaidJobs[0].scheduled_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="border-t border-green-300 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-stone-900">ยอดรวมทั้งหมด:</span>
                          <span className="font-bold text-xl text-green-700">฿{totalEarnings.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Jobs List */}
              <div>
                <h4 className="text-sm font-semibold text-stone-700 mb-2">รายการงานที่รวมในรอบนี้ ({unpaidJobs.length} งาน)</h4>
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50">
                      <tr>
                        <th className="py-2 px-3 text-left text-stone-600 font-medium">วันที่</th>
                        <th className="py-2 px-3 text-left text-stone-600 font-medium">บริการ</th>
                        <th className="py-2 px-3 text-right text-stone-600 font-medium">รายได้</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {unpaidJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-stone-50">
                          <td className="py-2 px-3 text-stone-600">
                            {new Date(job.scheduled_date).toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </td>
                          <td className="py-2 px-3 text-stone-900">{job.service_name}</td>
                          <td className="py-2 px-3 text-right font-medium text-green-700">
                            ฿{Number(job.staff_earnings || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-green-50 border-t-2 border-green-300">
                        <td colSpan={2} className="py-2 px-3 font-semibold text-stone-900 text-right">รวม</td>
                        <td className="py-2 px-3 text-right font-bold text-green-700">
                          ฿{totalEarnings.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p>
                    ระบบจะสร้างรอบจ่ายเงินสถานะ "รอดำเนินการ"
                    จากนั้นสามารถกดปุ่ม "ดำเนินการจ่ายเงิน" เพื่อบันทึกการโอนเงินจริง
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 bg-stone-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-100 transition"
            disabled={isCreating}
          >
            ยกเลิก
          </button>
          {unpaidJobs.length > 0 && (
            <button
              onClick={handleCreatePayout}
              disabled={isCreating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          )}
        </div>
      </div>
    </div>
  )
}
