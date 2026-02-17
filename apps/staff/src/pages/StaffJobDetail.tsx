import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  ArrowLeft, MapPin, Clock, User, Phone, Navigation, Calendar,
  Banknote, FileText, CheckCircle, XCircle, Play, Loader2
} from 'lucide-react'
import { useAuth } from '@bliss/supabase/auth'
import { useJob, useJobs, type JobStatus } from '@bliss/supabase'
import { ServiceTimer, JobCancellationModal, SOSButton } from '../components'
import { useStaffEligibility } from '@bliss/supabase'
import { NotificationSounds, isSoundEnabled } from '../utils/soundNotification'
import { playBackgroundMusic, stopBackgroundMusic } from '../utils/backgroundMusic'

function StaffJobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { job, isLoading, error } = useJob(id || null)
  const { acceptJob, startJob, completeJob } = useJobs({ realtime: false })
  const { eligibility } = useStaffEligibility()

  const [isProcessing, setIsProcessing] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/staff/jobs', { replace: true })
    }
  }

  const handleAccept = async () => {
    if (!job) return
    setIsProcessing(true)
    setActionError(null)
    try {
      await acceptJob(job.id)
      if (isSoundEnabled()) NotificationSounds.jobAccepted()
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถรับงานได้')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStart = async () => {
    if (!job) return
    setIsProcessing(true)
    setActionError(null)
    try {
      await startJob(job.id)
      if (isSoundEnabled()) NotificationSounds.jobStarted()
      await playBackgroundMusic()
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถเริ่มงานได้')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleComplete = async () => {
    if (!job) return
    setIsProcessing(true)
    setActionError(null)
    try {
      await completeJob(job.id)
      stopBackgroundMusic()
      if (isSoundEnabled()) NotificationSounds.jobCompleted()
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถเสร็จสิ้นงานได้')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmCancel = async (reason: string, notes?: string) => {
    if (!job) return
    setIsProcessing(true)
    setActionError(null)
    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'
      const res = await fetch(`${serverUrl}/api/notifications/job-cancelled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, reason, notes }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'ไม่สามารถยกเลิกงานได้')
      stopBackgroundMusic()
      if (isSoundEnabled()) NotificationSounds.jobCancelled()
      setShowCancelModal(false)
      navigate('/staff/jobs', { replace: true })
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถยกเลิกงานได้')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: JobStatus) => {
    const badges: Record<JobStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      assigned: 'bg-orange-100 text-orange-700 border-orange-200',
      confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
      traveling: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      arrived: 'bg-purple-100 text-purple-700 border-purple-200',
      in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
    }
    const labels: Record<JobStatus, string> = {
      pending: 'รอมอบหมาย',
      assigned: 'มอบหมายแล้ว',
      confirmed: 'ยืนยันแล้ว',
      traveling: 'กำลังเดินทาง',
      arrived: 'ถึงแล้ว',
      in_progress: 'กำลังดำเนินการ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badges[status]}`}>
        {labels[status]}
      </span>
    )
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5) + ' น.'
  }

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="p-4">
        <button onClick={goBack} className="flex items-center gap-2 text-stone-600 mb-4">
          <ArrowLeft className="w-5 h-5" />
          <span>กลับ</span>
        </button>
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-center">
          ไม่พบข้อมูลงาน
        </div>
      </div>
    )
  }

  const isMyJob = job.staff_id === user?.id
  const isPending = job.status === 'pending'
  const canStart = isMyJob && ['confirmed', 'traveling', 'arrived'].includes(job.status)
  const isInProgress = isMyJob && job.status === 'in_progress'
  const isFinished = job.status === 'completed' || job.status === 'cancelled'

  return (
    <div className="pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={goBack} className="p-2 -ml-2 text-stone-600 hover:bg-stone-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-stone-900 flex-1">รายละเอียดงาน</h1>
        {getStatusBadge(job.status)}
      </div>

      {/* Service Timer (in_progress) */}
      {isInProgress && job.started_at && (
        <ServiceTimer startedAt={job.started_at} durationMinutes={job.duration_minutes} />
      )}

      {/* Service Info Card */}
      <div className="bg-white rounded-xl shadow border border-stone-100 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-700 to-amber-800 text-white p-4">
          <h2 className="text-xl font-bold">{job.service_name}</h2>
          <p className="text-amber-100 text-sm mt-1">{job.duration_minutes} นาที</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Date & Time */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-xs text-stone-500">วันที่และเวลา</p>
              <p className="font-medium text-stone-900">{formatDate(job.scheduled_date)}</p>
              <p className="text-sm text-stone-700">{formatTime(job.scheduled_time)}</p>
            </div>
          </div>

          {/* Customer */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-blue-700" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-stone-500">ลูกค้า</p>
              <p className="font-medium text-stone-900">{job.customer_name}</p>
            </div>
            {job.customer_phone && (
              <a
                href={`tel:${job.customer_phone}`}
                className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
              >
                <Phone className="w-5 h-5" />
              </a>
            )}
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-red-700" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-stone-500">สถานที่</p>
              {job.hotel_name ? (
                <>
                  <p className="font-medium text-stone-900">{job.hotel_name}</p>
                  {job.room_number && <p className="text-sm text-stone-600">ห้อง {job.room_number}</p>}
                </>
              ) : (
                <p className="font-medium text-stone-900">{job.address}</p>
              )}
              {job.distance_km && (
                <p className="text-sm text-stone-500 mt-1">ระยะทาง {job.distance_km} กม.</p>
              )}
            </div>
            {job.latitude && job.longitude && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition"
              >
                <Navigation className="w-5 h-5" />
              </a>
            )}
          </div>

          {/* Earnings */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Banknote className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-xs text-stone-500">รายได้</p>
              <p className="text-xl font-bold text-amber-700">฿{Number(job.staff_earnings).toLocaleString()}</p>
            </div>
          </div>

          {/* Customer Notes */}
          {job.customer_notes && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-stone-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-stone-500" />
              </div>
              <div>
                <p className="text-xs text-stone-500">หมายเหตุจากลูกค้า</p>
                <p className="text-sm text-stone-700 mt-1">{job.customer_notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timestamps */}
      {(job.accepted_at || job.started_at || job.completed_at || job.cancelled_at) && (
        <div className="bg-white rounded-xl shadow border border-stone-100 p-4">
          <h3 className="font-semibold text-stone-900 mb-3 text-sm">ไทม์ไลน์</h3>
          <div className="space-y-2 text-sm">
            {job.accepted_at && (
              <div className="flex items-center gap-2 text-stone-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>รับงาน: {new Date(job.accepted_at).toLocaleString('th-TH')}</span>
              </div>
            )}
            {job.started_at && (
              <div className="flex items-center gap-2 text-stone-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span>เริ่มงาน: {new Date(job.started_at).toLocaleString('th-TH')}</span>
              </div>
            )}
            {job.completed_at && (
              <div className="flex items-center gap-2 text-stone-600">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>เสร็จสิ้น: {new Date(job.completed_at).toLocaleString('th-TH')}</span>
              </div>
            )}
            {job.cancelled_at && (
              <div className="flex items-center gap-2 text-stone-600">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>ยกเลิก: {new Date(job.cancelled_at).toLocaleString('th-TH')}</span>
                {job.cancellation_reason && (
                  <span className="text-stone-500">({job.cancellation_reason})</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {actionError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm">{actionError}</div>
      )}

      {/* Action Buttons */}
      {!isFinished && (
        <div className="space-y-2">
          {isPending && (
            <button
              onClick={handleAccept}
              disabled={isProcessing || !eligibility?.canWork}
              className="w-full py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              รับงานนี้
            </button>
          )}

          {canStart && (
            <button
              onClick={handleStart}
              disabled={isProcessing || !eligibility?.canWork}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              เริ่มงาน
            </button>
          )}

          {isInProgress && (
            <button
              onClick={handleComplete}
              disabled={isProcessing}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              เสร็จสิ้นงาน
            </button>
          )}

          {isMyJob && !isPending && (
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={isProcessing}
              className="w-full py-3 bg-stone-100 text-stone-700 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <XCircle className="w-5 h-5" />
              ยกเลิกงาน
            </button>
          )}
        </div>
      )}

      {/* SOS Button */}
      {isMyJob && !isFinished && <SOSButton currentJobId={job.id} />}

      {/* Cancel Modal */}
      <JobCancellationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
        jobId={job.id}
        serviceName={job.service_name}
      />
    </div>
  )
}

export default StaffJobDetail
