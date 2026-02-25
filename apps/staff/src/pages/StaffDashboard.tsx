import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Clock, User, Phone, Navigation, CheckCircle, XCircle, Play, Loader2, AlertTriangle, ChevronRight } from 'lucide-react'
import { useAuth } from '@bliss/supabase/auth'
import { useJobs, useStaffStats, useStaffEligibility, type Job, type JobStatus } from '@bliss/supabase'
import { SOSButton, JobCancellationModal, ServiceTimer } from '../components'
import { NotificationSounds, initializeAudio, isSoundEnabled } from '../utils/soundNotification'
import { playBackgroundMusic, stopBackgroundMusic } from '../utils/backgroundMusic'

function StaffDashboard() {
  const { user } = useAuth()
  const { jobs, pendingJobs, isLoading, error, refresh, acceptJob, startJob, completeJob } = useJobs({
    realtime: true,
    onNewJob: handleNewJob,
  })
  const { stats } = useStaffStats()
  const { eligibility, isLoading: isEligibilityLoading } = useStaffEligibility()

  const [currentJob, setCurrentJob] = useState<Job | null>(null)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [jobToCancel, setJobToCancel] = useState<Job | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Initialize audio on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      initializeAudio()
      document.removeEventListener('click', handleInteraction)
    }
    document.addEventListener('click', handleInteraction)
    return () => document.removeEventListener('click', handleInteraction)
  }, [])

  // Find current in-progress job
  useEffect(() => {
    const inProgressJob = jobs.find(j => j.status === 'in_progress' || j.status === 'traveling' || j.status === 'arrived')
    setCurrentJob(inProgressJob || null)
  }, [jobs])

  // Handle new job notification
  function handleNewJob(job: Job) {
    if (isSoundEnabled()) {
      NotificationSounds.newJob()
    }
  }

  const handleAcceptJob = async (jobId: string) => {
    setIsProcessing(jobId)
    setActionError(null)
    try {
      await acceptJob(jobId)
      if (isSoundEnabled()) {
        NotificationSounds.jobAccepted()
      }
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถรับงานได้')
    } finally {
      setIsProcessing(null)
    }
  }

  const handleStartJob = async (jobId: string) => {
    setIsProcessing(jobId)
    setActionError(null)
    try {
      await startJob(jobId)
      if (isSoundEnabled()) {
        NotificationSounds.jobStarted()
      }
      // Start background music for relaxing atmosphere during service
      await playBackgroundMusic()
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถเริ่มงานได้')
    } finally {
      setIsProcessing(null)
    }
  }

  const handleCompleteJob = async () => {
    if (!currentJob) return
    setIsProcessing(currentJob.id)
    setActionError(null)
    try {
      await completeJob(currentJob.id)
      // Stop background music when job is completed
      stopBackgroundMusic()
      if (isSoundEnabled()) {
        NotificationSounds.jobCompleted()
      }
      setCurrentJob(null)
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถเสร็จสิ้นงานได้')
    } finally {
      setIsProcessing(null)
    }
  }

  const handleCancelJobClick = (job: Job) => {
    setJobToCancel(job)
    setShowCancelModal(true)
  }

  const handleConfirmCancel = async (reason: string, notes?: string) => {
    if (!jobToCancel) return
    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'
      const res = await fetch(`${serverUrl}/api/notifications/job-cancelled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobToCancel.id, reason, notes }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'ไม่สามารถยกเลิกงานได้')
      // Stop background music when job is cancelled
      stopBackgroundMusic()
      if (isSoundEnabled()) {
        NotificationSounds.jobCancelled()
      }
      if (currentJob?.id === jobToCancel.id) {
        setCurrentJob(null)
      }
      setJobToCancel(null)
      refresh()
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถยกเลิกงานได้')
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

  // Filter jobs for display
  const myJobs = jobs.filter(j => ['confirmed', 'traveling', 'arrived'].includes(j.status))
  const completedTodayJobs = jobs.filter(j => j.status === 'completed')

  // Get upcoming jobs (scheduled for future) or recent completed jobs for empty state
  const upcomingJobs = jobs.filter(j =>
    j.status === 'assigned' || j.status === 'confirmed'
  ).slice(0, 5)

  const recentCompletedJobs = jobs.filter(j => j.status === 'completed').slice(0, 5)

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-amber-600 mx-auto" />
          <p className="text-gray-500 mt-3">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Staff Info Card */}
      <div className="bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl shadow-lg p-4 text-white">
        <div className="flex items-center gap-4">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name || 'Staff'}
              className="w-14 h-14 rounded-full border-2 border-white/30 object-cover"
            />
          ) : (
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
              {(user?.full_name || 'S').charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <h2 className="font-semibold text-lg">{user?.full_name || 'Staff'}</h2>
            <p className="text-sm opacity-90">
              {currentJob ? 'กำลังทำงาน' : eligibility?.canWork ? 'พร้อมรับงาน' : 'ยังไม่พร้อมรับงาน'}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <span className="text-yellow-300">★</span>
              <span className="font-semibold">{stats?.average_rating?.toFixed(1) || '0.0'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Eligibility Warning Banner */}
      {!isEligibilityLoading && eligibility && !eligibility.canWork && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">ยังไม่สามารถรับงานได้</h3>
              <p className="text-sm text-amber-800 mb-2">
                คุณต้องดำเนินการให้ครบก่อนจึงจะสามารถรับงานได้:
              </p>
              <ul className="text-sm text-amber-800 space-y-1 ml-4">
                {!eligibility.requirements?.status && (
                  <li className="list-disc">รอการอนุมัติจากผู้ดูแลระบบ</li>
                )}
                {!eligibility.requirements?.hasIdCard && (
                  <li className="list-disc">อัพโหลดและรอการตรวจสอบบัตรประชาชน</li>
                )}
                {!eligibility.requirements?.hasBankStatement && (
                  <li className="list-disc">อัพโหลดและรอการตรวจสอบสำเนาบัญชีธนาคาร</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Today's Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow p-3 text-center">
          <p className="text-2xl font-bold text-stone-900">{stats?.today_jobs_count || 0}</p>
          <p className="text-xs text-stone-500">งานวันนี้</p>
        </div>
        <div className="bg-white rounded-xl shadow p-3 text-center">
          <p className="text-2xl font-bold text-green-600">
            ฿{(stats?.today_earnings || 0).toLocaleString()}
          </p>
          <p className="text-xs text-stone-500">รายได้วันนี้</p>
        </div>
        <div className="bg-white rounded-xl shadow p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats?.today_completed || 0}</p>
          <p className="text-xs text-stone-500">เสร็จสิ้น</p>
        </div>
      </div>

      {/* Error Message */}
      {(error || actionError) && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm">
          {error?.message || actionError}
        </div>
      )}

      {/* Current Job (if any) */}
      {currentJob && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-stone-100">
          <Link to={`/staff/jobs/${currentJob.id}`} className="block bg-gradient-to-r from-purple-700 to-purple-800 text-white p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">กำลังดำเนินการ</span>
              </div>
              <ChevronRight className="w-5 h-5 opacity-70" />
            </div>
            <p className="text-2xl font-bold">{currentJob.service_name}</p>
          </Link>
          <div className="p-4 space-y-3">
            {/* Service Timer - Show countdown */}
            {currentJob.started_at && (
              <ServiceTimer
                startedAt={currentJob.started_at}
                durationMinutes={currentJob.duration_minutes}
              />
            )}

            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-stone-400" />
              <div>
                <p className="text-sm text-stone-500">ลูกค้า</p>
                <p className="font-medium text-stone-900">{currentJob.customer_name}</p>
              </div>
            </div>
            {currentJob.hotel_name && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-stone-400" />
                <div>
                  <p className="text-sm text-stone-500">สถานที่</p>
                  <p className="font-medium text-stone-900">
                    {currentJob.hotel_name} {currentJob.room_number ? `ห้อง ${currentJob.room_number}` : ''}
                  </p>
                </div>
              </div>
            )}
            {!currentJob.hotel_name && currentJob.address && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-stone-400" />
                <div className="flex-1">
                  <p className="text-sm text-stone-500">ที่อยู่</p>
                  <p className="font-medium text-stone-900">{currentJob.address}</p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${currentJob.latitude},${currentJob.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-amber-100 text-amber-700 rounded-lg"
                >
                  <Navigation className="w-5 h-5" />
                </a>
              </div>
            )}
            {currentJob.customer_phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-stone-400" />
                <a href={`tel:${currentJob.customer_phone}`} className="font-medium text-amber-700">
                  โทรติดต่อลูกค้า
                </a>
              </div>
            )}
          </div>
          <div className="flex gap-2 p-4 pt-0">
            <button
              onClick={handleCompleteJob}
              disabled={isProcessing === currentJob.id}
              className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing === currentJob.id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              เสร็จสิ้นงาน
            </button>
            <button
              onClick={() => handleCancelJobClick(currentJob)}
              disabled={isProcessing === currentJob.id}
              className="px-4 py-3 bg-stone-100 text-stone-700 rounded-xl font-medium disabled:opacity-50"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* My Upcoming Jobs */}
      {myJobs.length > 0 && !currentJob && (
        <div>
          <h3 className="font-semibold text-stone-900 mb-3">งานของฉัน</h3>
          <div className="space-y-3">
            {myJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl shadow p-4 border border-stone-100">
                <Link to={`/staff/jobs/${job.id}`} className="block mb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-stone-900">{job.service_name}</h4>
                      <p className="text-sm text-stone-500">
                        {job.scheduled_time} • {job.duration_minutes} นาที
                      </p>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-stone-600">
                      <User className="w-4 h-4" />
                      <span>{job.customer_name}</span>
                    </div>
                    {job.hotel_name ? (
                      <div className="flex items-center gap-2 text-stone-600">
                        <MapPin className="w-4 h-4" />
                        <span>{job.hotel_name} {job.room_number ? `ห้อง ${job.room_number}` : ''}</span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-stone-600">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <span className="flex-1">{job.address}</span>
                      </div>
                    )}
                    {job.distance_km && (
                      <div className="flex items-center gap-2 text-stone-600">
                        <Navigation className="w-4 h-4" />
                        <span>{job.distance_km} กม.</span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-amber-700">฿{job.staff_earnings}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCancelJobClick(job)}
                      disabled={isProcessing === job.id}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      ยกเลิก
                    </button>
                    <button
                      onClick={() => handleStartJob(job.id)}
                      disabled={isProcessing === job.id || !eligibility?.canWork}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium text-sm flex items-center gap-1 disabled:opacity-50"
                      title={!eligibility?.canWork ? 'คุณยังไม่สามารถเริ่มงานได้ในขณะนี้' : undefined}
                    >
                      {isProcessing === job.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      เริ่มงาน
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Jobs (pending) */}
      {pendingJobs.length > 0 && (
        <div>
          <h3 className="font-semibold text-stone-900 mb-3">งานที่รอมอบหมาย</h3>
          <div className="space-y-3">
            {pendingJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl shadow p-4 border border-stone-100">
                <Link to={`/staff/jobs/${job.id}`} className="block mb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-stone-900">{job.service_name}</h4>
                      <p className="text-sm text-stone-500">
                        {job.scheduled_date} • {job.scheduled_time} • {job.duration_minutes} นาที
                      </p>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-stone-600">
                      <User className="w-4 h-4" />
                      <span>{job.customer_name}</span>
                    </div>
                    {job.hotel_name ? (
                      <div className="flex items-center gap-2 text-stone-600">
                        <MapPin className="w-4 h-4" />
                        <span>{job.hotel_name} {job.room_number ? `ห้อง ${job.room_number}` : ''}</span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-stone-600">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <span className="flex-1">{job.address}</span>
                      </div>
                    )}
                    {job.distance_km && (
                      <div className="flex items-center gap-2 text-stone-600">
                        <Navigation className="w-4 h-4" />
                        <span>{job.distance_km} กม.</span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-amber-700">฿{job.staff_earnings}</p>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/staff/jobs/${job.id}`}
                      className="px-3 py-2 text-stone-600 hover:bg-stone-50 rounded-xl text-sm flex items-center gap-1"
                    >
                      ดูรายละเอียด
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      disabled={isProcessing === job.id || !eligibility?.canWork}
                      className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium text-sm disabled:opacity-50 flex items-center gap-1"
                      title={!eligibility?.canWork ? 'คุณยังไม่สามารถรับงานได้ในขณะนี้' : undefined}
                    >
                      {isProcessing === job.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      รับงาน
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State - Show Upcoming or Recent Jobs */}
      {!currentJob && myJobs.length === 0 && pendingJobs.length === 0 && (
        <div>
          {upcomingJobs.length > 0 ? (
            <div>
              <h3 className="font-semibold text-stone-900 mb-3">งานที่กำลังจะมาถึง</h3>
              <div className="space-y-3">
                {upcomingJobs.map((job) => (
                  <Link key={job.id} to={`/staff/jobs/${job.id}`} className="block bg-white rounded-xl shadow p-4 border border-stone-100">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-stone-900">{job.service_name}</h4>
                        <p className="text-sm text-stone-500">
                          {job.scheduled_date} • {job.scheduled_time} • {job.duration_minutes} นาที
                        </p>
                      </div>
                      {getStatusBadge(job.status)}
                    </div>

                    <div className="space-y-2 mb-3 text-sm">
                      <div className="flex items-center gap-2 text-stone-600">
                        <User className="w-4 h-4" />
                        <span>{job.customer_name}</span>
                      </div>
                      {job.hotel_name ? (
                        <div className="flex items-center gap-2 text-stone-600">
                          <MapPin className="w-4 h-4" />
                          <span>{job.hotel_name} {job.room_number ? `ห้อง ${job.room_number}` : ''}</span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 text-stone-600">
                          <MapPin className="w-4 h-4 mt-0.5" />
                          <span className="flex-1">{job.address}</span>
                        </div>
                      )}
                      {job.distance_km && (
                        <div className="flex items-center gap-2 text-stone-600">
                          <Navigation className="w-4 h-4" />
                          <span>{job.distance_km} กม.</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-amber-700">฿{job.staff_earnings}</p>
                      <div className="flex items-center gap-1 text-stone-500 text-xs">
                        <span>ดูรายละเอียด</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : recentCompletedJobs.length > 0 ? (
            <div>
              <h3 className="font-semibold text-stone-900 mb-3">งานที่เสร็จสิ้นล่าสุด</h3>
              <div className="space-y-3">
                {recentCompletedJobs.map((job) => (
                  <Link key={job.id} to={`/staff/jobs/${job.id}`} className="block bg-white rounded-xl shadow p-4 border border-stone-100 opacity-75">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-stone-900">{job.service_name}</h4>
                        <p className="text-sm text-stone-500">
                          {job.scheduled_date} • {job.scheduled_time}
                        </p>
                        <p className="text-sm text-stone-600 mt-1">{job.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">+฿{job.staff_earnings}</p>
                      </div>
                    </div>
                    {job.hotel_name && (
                      <div className="flex items-center gap-2 text-stone-500 text-sm mt-2">
                        <MapPin className="w-4 h-4" />
                        <span>{job.hotel_name} {job.room_number ? `ห้อง ${job.room_number}` : ''}</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-stone-400" />
              </div>
              <h3 className="font-semibold text-stone-900 mb-2">ยังไม่มีงานใหม่</h3>
              <p className="text-sm text-stone-500">รอรับงานใหม่ได้เลย ระบบจะแจ้งเตือนเมื่อมีงานเข้ามา</p>
              <button
                onClick={refresh}
                className="mt-4 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition"
              >
                รีเฟรช
              </button>
            </div>
          )}
        </div>
      )}

      {/* Completed Jobs */}
      {completedTodayJobs.length > 0 && (
        <div>
          <h3 className="font-semibold text-stone-900 mb-3">เสร็จสิ้นแล้ว</h3>
          <div className="space-y-3">
            {completedTodayJobs.map((job) => (
              <Link key={job.id} to={`/staff/jobs/${job.id}`} className="block bg-white rounded-xl shadow p-4 border border-stone-100 opacity-75">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-stone-900">{job.service_name}</h4>
                    <p className="text-sm text-stone-500">{job.scheduled_time} • {job.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">+฿{job.staff_earnings}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* SOS Button */}
      <SOSButton currentJobId={currentJob?.id} />

      {/* Cancel Modal */}
      <JobCancellationModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false)
          setJobToCancel(null)
        }}
        onConfirm={handleConfirmCancel}
        jobId={jobToCancel?.id || ''}
        serviceName={jobToCancel?.service_name}
      />
    </div>
  )
}

export default StaffDashboard
