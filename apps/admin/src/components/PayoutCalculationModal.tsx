import { X, Calculator, TrendingUp, Loader2, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface PayoutCalculationModalProps {
  staffId: string
  staffName: string
  onClose: () => void
}

interface JobRow {
  id: string
  service_name: string
  scheduled_date: string
  staff_earnings: number
  total_staff_earnings: number | null
}

export function PayoutCalculationModal({ staffId, staffName, onClose }: PayoutCalculationModalProps) {
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUnpaidJobs()
  }, [staffId])

  const fetchUnpaidJobs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Get profile_id from staff table
      const { data: staffData, error: staffErr } = await supabase
        .from('staff')
        .select('profile_id')
        .eq('id', staffId)
        .single()

      if (staffErr || !staffData?.profile_id) {
        setError('ไม่พบข้อมูลพนักงาน')
        return
      }

      // Get job IDs already in a payout
      const { data: paidJobIds } = await supabase
        .from('payout_jobs')
        .select('job_id')

      const paidSet = new Set((paidJobIds || []).map(p => p.job_id))

      // Get completed jobs for this staff
      const { data: jobData, error: jobErr } = await supabase
        .from('jobs')
        .select('id, service_name, scheduled_date, staff_earnings, total_staff_earnings')
        .eq('staff_id', staffData.profile_id)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false })

      if (jobErr) {
        setError('โหลดข้อมูลงานไม่ได้')
        return
      }

      // Filter out already-paid jobs
      const unpaid = (jobData || []).filter(j => !paidSet.has(j.id))
      setJobs(unpaid)
    } catch (e) {
      setError('เกิดข้อผิดพลาด')
    } finally {
      setIsLoading(false)
    }
  }

  const getJobEarnings = (job: JobRow) =>
    job.total_staff_earnings ?? job.staff_earnings ?? 0

  const total = jobs.reduce((sum, j) => sum + getJobEarnings(j), 0)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Calculator className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-stone-900">รายละเอียดการคำนวณ</h2>
              <p className="text-sm text-stone-600 mt-1">{staffName} — งานที่ยังไม่ได้รับเงิน</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              รายได้คำนวณจาก <strong>ยอดคงที่ที่ Admin กำหนด</strong> ต่อระยะเวลาบริการ (60/90/120 นาที)
              หรือ % commission ตามที่ตั้งค่าไว้ในแต่ละบริการ — รวมค่าเพิ่มเวลาบริการแล้ว
            </p>
          </div>

          {/* Job list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-stone-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>กำลังโหลด...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 text-red-600 py-8">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <p className="text-lg font-medium">ไม่มีงานที่ยังค้างจ่าย</p>
              <p className="text-sm mt-1">งานทั้งหมดอยู่ในรอบจ่ายเงินแล้ว</p>
            </div>
          ) : (
            <>
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="text-left py-3 px-4 text-stone-600 font-medium whitespace-nowrap">วันที่</th>
                      <th className="text-left py-3 px-4 text-stone-600 font-medium">บริการ</th>
                      <th className="text-right py-3 px-4 text-stone-600 font-medium whitespace-nowrap">รายได้</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {jobs.map(job => (
                      <tr key={job.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-4 text-stone-500 whitespace-nowrap">
                          {formatDate(job.scheduled_date)}
                        </td>
                        <td className="py-2.5 px-4 text-stone-900">{job.service_name}</td>
                        <td className="py-2.5 px-4 text-right font-medium text-green-700 whitespace-nowrap">
                          ฿{getJobEarnings(job).toLocaleString()}
                          {job.total_staff_earnings != null && job.total_staff_earnings !== job.staff_earnings && (
                            <span className="text-xs text-amber-600 block">รวมเพิ่มเวลา</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-amber-900">ยอดรวมทั้งหมด</p>
                    <p className="text-xs text-amber-700 mt-0.5">{jobs.length} งาน — ยังไม่ได้รับเงิน</p>
                  </div>
                  <p className="text-3xl font-bold text-amber-900">฿{total.toLocaleString()}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-stone-200 bg-stone-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}
