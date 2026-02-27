import { X, Calendar, Clock, User, MapPin, DollarSign, FileText, CheckCircle, XCircle, AlertCircle, Briefcase, Users } from 'lucide-react'
import { Job } from '../hooks/useStaffJobs'
import { isSpecificPreference, getProviderPreferenceLabel, getProviderPreferenceBadgeStyle } from '@bliss/supabase'

interface JobDetailModalProps {
  job: Job
  onClose: () => void
}

export function JobDetailModal({ job, onClose }: JobDetailModalProps) {
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string; icon: any }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'รอยืนยัน', icon: Clock },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'ยืนยันแล้ว', icon: CheckCircle },
      in_progress: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'กำลังดำเนินการ', icon: Clock },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'เสร็จสิ้น', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'ยกเลิก', icon: XCircle },
    }
    const badge = badges[status] || badges.pending
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">รายละเอียดงาน</h2>
            <p className="text-sm text-stone-600 mt-1">Job ID: {job.id.slice(0, 8)}...</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-700">สถานะงาน</span>
            {getStatusBadge(job.status)}
          </div>

          {/* Service Information */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-stone-900 mb-1">บริการ</h3>
                <p className="text-lg font-medium text-amber-900">{job.service_name}</p>
              </div>
            </div>
          </div>

          {/* Provider Preference */}
          {isSpecificPreference(job.provider_preference) && (
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-stone-600" />
                <span className="text-sm font-medium text-stone-700">ความต้องการผู้ให้บริการ</span>
                <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${getProviderPreferenceBadgeStyle(job.provider_preference)}`}>
                  {getProviderPreferenceLabel(job.provider_preference)}
                </span>
              </div>
            </div>
          )}

          {/* Schedule Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">วันที่นัดหมาย</span>
              </div>
              <p className="font-semibold text-blue-900">{formatDate(job.scheduled_date)}</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">เวลา</span>
              </div>
              <p className="font-semibold text-purple-900">{job.scheduled_time}</p>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-stone-600" />
              <span className="text-sm font-medium text-stone-700">ข้อมูลลูกค้า</span>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-stone-500">ชื่อลูกค้า</p>
                <p className="font-medium text-stone-900">{job.customer_name}</p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="w-5 h-5 text-stone-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-stone-700">สถานที่ให้บริการ</span>
                <p className="text-stone-900 mt-1">{job.address}</p>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">ข้อมูลการเงิน</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-green-700">ราคาบริการ</span>
                <span className="font-semibold text-green-900">฿{job.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-green-200 pt-2">
                <span className="text-sm text-green-700">รายได้พนักงาน (85%)</span>
                <span className="font-bold text-lg text-green-900">฿{job.staff_earnings.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-600">ค่าแพลตฟอร์ม (15%)</span>
                <span className="text-green-600">฿{(job.amount - job.staff_earnings).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {job.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <FileText className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-yellow-900">หมายเหตุ</span>
                  <p className="text-sm text-yellow-800 mt-1">{job.notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-stone-600">
              <div>
                <p className="text-stone-500">วันที่สร้าง</p>
                <p className="font-medium text-stone-900 mt-1">
                  {new Date(job.created_at).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <p className="text-stone-500">อัปเดตล่าสุด</p>
                <p className="font-medium text-stone-900 mt-1">
                  {new Date(job.updated_at).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 bg-stone-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}
