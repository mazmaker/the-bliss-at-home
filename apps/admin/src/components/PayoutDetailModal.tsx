import { X, Calendar, DollarSign, Briefcase } from 'lucide-react'
import { usePayoutJobs } from '../hooks/useStaffEarnings'

interface PayoutDetailModalProps {
  payoutId: string
  onClose: () => void
}

export function PayoutDetailModal({ payoutId, onClose }: PayoutDetailModalProps) {
  const { data: payoutJobs, isLoading } = usePayoutJobs(payoutId)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">รายละเอียดการจ่ายเงิน</h2>
            <p className="text-sm text-stone-500 mt-1">รายการงานทั้งหมดในรอบนี้</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
              <span className="ml-2 text-stone-500">กำลังโหลดข้อมูล...</span>
            </div>
          ) : payoutJobs && payoutJobs.length > 0 ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-medium text-amber-900">จำนวนงาน</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-900">{payoutJobs.length}</p>
                  <p className="text-xs text-amber-600">งาน</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">รายได้รวม</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    ฿{payoutJobs.reduce((sum, job) => sum + parseFloat(job.amount), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">จากบริการ</p>
                </div>
              </div>

              {/* Jobs List */}
              <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">บริการ</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">วันที่</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-stone-700">รายได้</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutJobs.map((job) => (
                      <tr key={job.id} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-stone-900">{job.job?.service_name || '-'}</p>
                            <p className="text-xs text-stone-500">ID: {job.job_id.slice(0, 8)}...</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-stone-600">
                          {job.job?.scheduled_date
                            ? new Date(job.job.scheduled_date).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-green-700">
                          ฿{parseFloat(job.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-50 border-t-2 border-amber-200">
                      <td colSpan={2} className="py-3 px-4 text-right font-semibold text-stone-900">
                        รวมทั้งหมด:
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-green-700">
                        ฿{payoutJobs.reduce((sum, job) => sum + parseFloat(job.amount), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-stone-500">ไม่พบข้อมูลงาน</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 bg-stone-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-100 transition"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}
