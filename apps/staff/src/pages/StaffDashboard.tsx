import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Clock, User, Phone, Navigation, CheckCircle, Loader2, AlertTriangle, ChevronRight } from 'lucide-react'
import { useAuth } from '@bliss/supabase/auth'
import { useJobs, useStaffStats, useStaffEligibility, type Job, type JobStatus, isSpecificPreference, getProviderPreferenceLabel, getProviderPreferenceBadgeStyle } from '@bliss/supabase'
import { SOSButton, ServiceTimer, ExtensionAcceptanceCard, JobStatusBadge } from '../components'
import JobGPSControls from '../components/JobGPSControls'
import { useJobGPSStatus } from '../hooks/useJobGPSStatus'
import { useCompleteGate } from '../hooks/useCompleteGate'
import { useStartGate } from '../hooks/useStartGate'
import { canStaffSeeCustomerPhone } from '../utils/customerContact'
import { useResumeBackgroundMusic } from '../hooks/useResumeBackgroundMusic'
import { useExtendSessionNotifications } from '../hooks/useExtendSessionNotifications'
import { NotificationSounds, initializeAudio, isSoundEnabled } from '../utils/soundNotification'
import { playBackgroundMusic, stopBackgroundMusic, setMusicManuallyMuted } from '../utils/backgroundMusic'
import { withTimeout } from '../utils/withTimeout'

function StaffDashboard() {
  const { user } = useAuth()
  const { eligibility, isLoading: isEligibilityLoading } = useStaffEligibility()
  const { jobs, pendingJobs, isLoading, error, refresh, acceptJob, startJob, completeJob, getScheduleConflict } = useJobs({
    realtime: true,
    staffGender: eligibility?.gender,
    onNewJob: handleNewJob,
  })
  const { stats } = useStaffStats()

  // Extend session notifications
  const { latestExtension, clearLatestExtension } = useExtendSessionNotifications(user?.id)

  const [currentJob, setCurrentJob] = useState<Job | null>(null)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
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

  // Gate the "เสร็จสิ้นงาน" button: only within the last 10 min of service (overtime allowed).
  // Extension-aware via total_duration_minutes; disabled until the service actually starts.
  const completeGate = useCompleteGate(
    currentJob,
    currentJob?.total_duration_minutes || currentJob?.duration_minutes
  )

  // Gate the "เริ่มงาน" button: only startable once the scheduled service time has arrived
  // (no early start). ANDed with the KYC eligibility gate below; fail-open if the schedule is odd.
  const startGate = useStartGate(currentJob)

  // Resume the spa music after a refresh/navigation onto an in-progress job (audio-only, never
  // rewrites started_at). See #6.
  useResumeBackgroundMusic(currentJob)

  // Handle extend session notifications
  useEffect(() => {
    if (latestExtension) {
      console.log('🔔 Extension detected, refreshing job data:', latestExtension)
      refresh() // Refresh job data to get updated information
      clearLatestExtension()
    }
  }, [latestExtension, refresh, clearLatestExtension])

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
      // [FIX] time-boxed: a stalled mutation used to leave the button disabled+spinning forever
      await withTimeout(acceptJob(jobId), 15000, 'acceptJob (dashboard)')
      if (isSoundEnabled()) {
        NotificationSounds.jobAccepted()
      }
      // Notify hotel if this is a hotel booking (non-blocking)
      try {
        const serverUrl = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')
        fetch(`${serverUrl}/api/notifications/job-accepted`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: jobId }),
        }).catch(() => {})
      } catch {}
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถรับงานได้')
      // NOTE: deliberately NOT calling refresh() here — it flips isLoading=true
      // (full-screen spinner) and is itself un-time-boxed, so on a hung network it
      // would wedge the dashboard and hide this error. The filtered realtime
      // subscription re-syncs the true state instead.
    } finally {
      setIsProcessing(null)
    }
  }

  const handleStartJob = async (jobId: string) => {
    setIsProcessing(jobId)
    setActionError(null)
    try {
      await withTimeout(startJob(jobId), 15000, 'startJob (dashboard)')
      if (isSoundEnabled()) {
        NotificationSounds.jobStarted()
      }
      // Fresh start clears any prior manual mute, then plays the relaxing service music.
      setMusicManuallyMuted(false)
      await playBackgroundMusic()
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถเริ่มงานได้')
      // No refresh() here — see handleAcceptJob note (would wedge the dashboard on a hung network)
    } finally {
      setIsProcessing(null)
    }
  }

  const handleCompleteJob = async () => {
    if (!currentJob) return
    setIsProcessing(currentJob.id)
    setActionError(null)
    try {
      await withTimeout(completeJob(currentJob.id), 15000, 'completeJob (dashboard)')
      // Stop background music when job is completed
      stopBackgroundMusic()
      if (isSoundEnabled()) {
        NotificationSounds.jobCompleted()
      }
      setCurrentJob(null)
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถเสร็จสิ้นงานได้')
      // No refresh() here — see handleAcceptJob note (would wedge the dashboard on a hung network)
    } finally {
      setIsProcessing(null)
    }
  }

  // Smart status badge component that includes GPS tracking state
  function SmartJobStatusBadge({ job }: { job: { id: string; status: JobStatus } }) {
    const gpsStatus = useJobGPSStatus(job.id)
    return <JobStatusBadge status={job.status} isGPSTracking={gpsStatus.isTracking} />
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
          <Loader2 className="w-10 h-10 animate-spin text-bliss-600 mx-auto" />
          <p className="text-bliss-500 mt-3">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Staff Info Card */}
      <div className="bg-gradient-to-br from-bliss-700 to-bliss-800 rounded-2xl shadow-lg p-4 text-white">
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
          </div>
          {stats?.rating_count ? (
            <div className="text-right">
              <div className="flex items-center gap-1">
                <span className="text-yellow-300">★</span>
                <span className="font-semibold">{stats.average_rating.toFixed(1)}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Eligibility Warning Banner */}
      {!isEligibilityLoading && eligibility && !eligibility.canWork && (
        <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-bliss-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-bliss-900 mb-1">ยังไม่สามารถรับงานได้</h3>
              <p className="text-sm text-bliss-800 mb-2">
                คุณต้องดำเนินการให้ครบก่อนจึงจะสามารถรับงานได้:
              </p>
              <ul className="text-sm text-bliss-800 space-y-1 ml-4">
                {eligibility.status !== 'active' && (
                  <li className="list-disc">รอการอนุมัติจากผู้ดูแลระบบ</li>
                )}
                {!eligibility.gender && (
                  <li className="list-disc">
                    <Link to="/profile" className="underline hover:text-bliss-900">ระบุเพศในข้อมูลส่วนตัว</Link>
                  </li>
                )}
                {!eligibility.documents?.id_card?.verified && (
                  <li className="list-disc">อัพโหลดและรอการตรวจสอบบัตรประชาชน</li>
                )}
                {!eligibility.documents?.house_registration?.verified && (
                  <li className="list-disc">อัพโหลดและรอการตรวจสอบสำเนาทะเบียนบ้าน</li>
                )}
                {!eligibility.documents?.bank_statement?.verified && (
                  <li className="list-disc">อัพโหลดและรอการตรวจสอบสำเนาบัญชีธนาคาร</li>
                )}
                {!eligibility.documents?.license?.verified && (
                  <li className="list-disc">
                    <Link to="/staff/profile" className="underline hover:text-bliss-900">อัปโหลด/รออนุมัติ ใบประกอบวิชาชีพ</Link>
                  </li>
                )}
                {!eligibility.documents?.criminal_record?.verified && (
                  <li className="list-disc">
                    <Link to="/staff/profile" className="underline hover:text-bliss-900">อัปโหลด/รออนุมัติ ใบตรวจสอบประวัติอาชญากรรม</Link>
                  </li>
                )}
                {!eligibility.emergencyContact?.filled && (
                  <li className="list-disc">
                    <Link to="/staff/profile" className="underline hover:text-bliss-900">กรอกข้อมูลบุคคลอ้างอิง</Link>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Extension Acceptance Card */}
      <ExtensionAcceptanceCard />

      {/* Today's Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow p-3 text-center">
          <p className="text-2xl font-bold text-bliss-900">{stats?.today_jobs_count || 0}</p>
          <p className="text-xs text-bliss-500">งานวันนี้</p>
        </div>
        <div className="bg-white rounded-xl shadow p-3 text-center">
          <p className="text-2xl font-bold text-green-600">
            ฿{(stats?.today_earnings || 0).toLocaleString()}
          </p>
          <p className="text-xs text-bliss-500">รายได้วันนี้</p>
        </div>
        <div className="bg-white rounded-xl shadow p-3 text-center">
          <p className="text-2xl font-bold text-bliss-600">{stats?.today_completed || 0}</p>
          <p className="text-xs text-bliss-500">เสร็จสิ้น</p>
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
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-bliss-100">
          <Link to={`/staff/jobs/${currentJob.id}`} className="block bg-gradient-to-r from-bliss-700 to-bliss-800 text-white p-4">
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
                durationMinutes={currentJob.total_duration_minutes || currentJob.duration_minutes}
              />
            )}

            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-bliss-400" />
              <div>
                <p className="text-sm text-bliss-500">ลูกค้า</p>
                <p className="font-medium text-bliss-900">{currentJob.customer_name}</p>
              </div>
            </div>
            {currentJob.hotel_name && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-bliss-400" />
                <div>
                  <p className="text-sm text-bliss-500">สถานที่</p>
                  <p className="font-medium text-bliss-900">
                    {currentJob.hotel_name} {currentJob.room_number ? `ห้อง ${currentJob.room_number}` : ''}
                  </p>
                </div>
              </div>
            )}
            {!currentJob.hotel_name && currentJob.address && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-bliss-400" />
                <div className="flex-1">
                  <p className="text-sm text-bliss-500">ที่อยู่</p>
                  <p className="font-medium text-bliss-900">{currentJob.address}</p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${currentJob.latitude},${currentJob.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-bliss-100 text-bliss-700 rounded-lg"
                >
                  <Navigation className="w-5 h-5" />
                </a>
              </div>
            )}
            {canStaffSeeCustomerPhone(currentJob.status) && currentJob.customer_phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-bliss-400" />
                <a href={`tel:${currentJob.customer_phone}`} className="font-medium text-bliss-700">
                  โทรติดต่อลูกค้า
                </a>
              </div>
            )}
          </div>

          {/* GPS Tracking Controls for Current Job */}
          <div className="px-4 pb-2">
            <JobGPSControls
              job={{
                id: currentJob.id,
                status: currentJob.status,
                customer_name: currentJob.customer_name,
                customer_address: currentJob.address,
                customer_phone: currentJob.customer_phone,
                booking_id: currentJob.id,
                scheduled_date: currentJob.scheduled_date,
                scheduled_time: currentJob.scheduled_time
              }}
              onRefresh={refresh}
              onStartJob={handleStartJob}
              compact={false}
              isProcessing={isProcessing === currentJob.id}
              canStartWork={!!eligibility?.canWork && startGate.canStart}
            />
            {currentJob.status === 'arrived' && !startGate.canStart && (
              <p className="mt-2 text-xs text-center text-bliss-500">
                เริ่มงานได้ก่อนเวลานัด {currentJob.scheduled_time?.slice(0, 5)} น. 15 นาที (อีก {startGate.minsUntilStart} นาที)
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 p-4 pt-0">
            <button
              onClick={handleCompleteJob}
              disabled={isProcessing === currentJob.id || !completeGate.canComplete}
              className="w-full py-3 bg-gradient-to-r from-bliss-600 to-bliss-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing === currentJob.id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              เสร็จสิ้นงาน
            </button>
            {!completeGate.canComplete && (
              <p className="text-xs text-center text-bliss-500">
                {!completeGate.inProgress || !completeGate.hasStarted
                  ? 'เริ่มงานก่อนจึงจะกดเสร็จสิ้นได้'
                  : `กดเสร็จสิ้นได้เมื่อใกล้ครบเวลาบริการ (อีก ${completeGate.minsUntilEligible} นาที)`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Available Jobs (pending) — NEW / not yet accepted, shown FIRST so งานใหม่ ไม่ปนกับงานที่รับแล้ว */}
      {pendingJobs.length > 0 && (
        <div>
          <h3 className="font-semibold text-bliss-900 mb-3">งานใหม่ที่รอรับ</h3>
          <div className="space-y-3">
            {pendingJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl shadow p-4 border border-bliss-100">
                <Link to={`/staff/jobs/${job.id}`} className="block mb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-bliss-900">{job.service_name}</h4>
                      <p className="text-sm text-bliss-500">
                        {job.scheduled_date} • {job.scheduled_time} • {job.total_duration_minutes || job.duration_minutes} นาที
                      </p>
                    </div>
                    <SmartJobStatusBadge job={job} />
                  </div>

                  {isSpecificPreference(job.provider_preference) && (
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-2 ${getProviderPreferenceBadgeStyle(job.provider_preference)}`}>
                      {getProviderPreferenceLabel(job.provider_preference)}
                    </span>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-bliss-600">
                      <User className="w-4 h-4" />
                      <span>{job.customer_name}</span>
                    </div>
                    {job.hotel_name ? (
                      <div className="flex items-center gap-2 text-bliss-600">
                        <MapPin className="w-4 h-4" />
                        <span>{job.hotel_name} {job.room_number ? `ห้อง ${job.room_number}` : ''}</span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-bliss-600">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <span className="flex-1">{job.address}</span>
                      </div>
                    )}
                    {job.distance_km && (
                      <div className="flex items-center gap-2 text-bliss-600">
                        <Navigation className="w-4 h-4" />
                        <span>{job.distance_km} กม.</span>
                      </div>
                    )}
                  </div>
                </Link>

                {getScheduleConflict(job) && (
                  <div className="mb-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>เวลาทับซ้อนกับงานที่คุณรับไว้แล้ว — รับงานนี้ไม่ได้</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-bliss-700">฿{job.total_staff_earnings || job.staff_earnings}</p>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/staff/jobs/${job.id}`}
                      className="px-3 py-2 text-bliss-600 hover:bg-bliss-50 rounded-xl text-sm flex items-center gap-1"
                    >
                      ดูรายละเอียด
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      disabled={isProcessing === job.id || !eligibility?.canWork || !!getScheduleConflict(job)}
                      className="px-4 py-2 bg-gradient-to-r from-bliss-700 to-bliss-800 text-white rounded-xl font-medium text-sm disabled:opacity-50 flex items-center gap-1"
                      title={getScheduleConflict(job) ? 'เวลาทับซ้อนกับงานที่คุณรับไว้แล้ว' : !eligibility?.canWork ? 'คุณยังไม่สามารถรับงานได้ในขณะนี้' : undefined}
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

      {/* My Upcoming Jobs — ACCEPTED (รับแล้ว), shown BELOW the new/pending section */}
      {myJobs.length > 0 && !currentJob && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-bliss-900">งานที่รับแล้ว</h3>
            <Link
              to="/staff/tracking"
              className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1"
            >
              <Navigation className="w-4 h-4" />
              ดู GPS แยก
            </Link>
          </div>
          <div className="space-y-3">
            {myJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl shadow p-4 border border-bliss-100">
                <Link to={`/staff/jobs/${job.id}`} className="block mb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-bliss-900">{job.service_name}</h4>
                      <p className="text-sm text-bliss-500">
                        {job.scheduled_time} • {job.total_duration_minutes || job.duration_minutes} นาที
                      </p>
                    </div>
                    <SmartJobStatusBadge job={job} />
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-bliss-600">
                      <User className="w-4 h-4" />
                      <span>{job.customer_name}</span>
                    </div>
                    {job.hotel_name ? (
                      <div className="flex items-center gap-2 text-bliss-600">
                        <MapPin className="w-4 h-4" />
                        <span>{job.hotel_name} {job.room_number ? `ห้อง ${job.room_number}` : ''}</span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-bliss-600">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <span className="flex-1">{job.address}</span>
                      </div>
                    )}
                    {job.distance_km && (
                      <div className="flex items-center gap-2 text-bliss-600">
                        <Navigation className="w-4 h-4" />
                        <span>{job.distance_km} กม.</span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* GPS Tracking Controls */}
                <JobGPSControls
                  job={{
                    id: job.id,
                    status: job.status,
                    customer_name: job.customer_name,
                    customer_address: job.address,
                    customer_phone: job.customer_phone,
                    booking_id: job.id,
                    scheduled_date: job.scheduled_date,
                    scheduled_time: job.scheduled_time
                  }}
                  onRefresh={refresh}
                  onStartJob={handleStartJob}
                  compact={false}
                  isProcessing={isProcessing === job.id}
                  canStartWork={!!eligibility?.canWork}
                />

                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-bliss-700">฿{job.total_staff_earnings || job.staff_earnings}</p>
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
              <h3 className="font-semibold text-bliss-900 mb-3">งานที่กำลังจะมาถึง</h3>
              <div className="space-y-3">
                {upcomingJobs.map((job) => (
                  <Link key={job.id} to={`/staff/jobs/${job.id}`} className="block bg-white rounded-xl shadow p-4 border border-bliss-100">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-bliss-900">{job.service_name}</h4>
                        <p className="text-sm text-bliss-500">
                          {job.scheduled_date} • {job.scheduled_time} • {job.total_duration_minutes || job.duration_minutes} นาที
                        </p>
                      </div>
                      <SmartJobStatusBadge job={job} />
                    </div>

                    <div className="space-y-2 mb-3 text-sm">
                      <div className="flex items-center gap-2 text-bliss-600">
                        <User className="w-4 h-4" />
                        <span>{job.customer_name}</span>
                      </div>
                      {job.hotel_name ? (
                        <div className="flex items-center gap-2 text-bliss-600">
                          <MapPin className="w-4 h-4" />
                          <span>{job.hotel_name} {job.room_number ? `ห้อง ${job.room_number}` : ''}</span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 text-bliss-600">
                          <MapPin className="w-4 h-4 mt-0.5" />
                          <span className="flex-1">{job.address}</span>
                        </div>
                      )}
                      {job.distance_km && (
                        <div className="flex items-center gap-2 text-bliss-600">
                          <Navigation className="w-4 h-4" />
                          <span>{job.distance_km} กม.</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-bliss-700">฿{job.total_staff_earnings || job.staff_earnings}</p>
                      <div className="flex items-center gap-1 text-bliss-500 text-xs">
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
              <h3 className="font-semibold text-bliss-900 mb-3">งานที่เสร็จสิ้นล่าสุด</h3>
              <div className="space-y-3">
                {recentCompletedJobs.map((job) => (
                  <Link key={job.id} to={`/staff/jobs/${job.id}`} className="block bg-white rounded-xl shadow p-4 border border-bliss-100 opacity-75">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-bliss-900">{job.service_name}</h4>
                        <p className="text-sm text-bliss-500">
                          {job.scheduled_date} • {job.scheduled_time}
                        </p>
                        <p className="text-sm text-bliss-600 mt-1">{job.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">+฿{job.total_staff_earnings || job.staff_earnings}</p>
                      </div>
                    </div>
                    {job.hotel_name && (
                      <div className="flex items-center gap-2 text-bliss-500 text-sm mt-2">
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
              <div className="w-16 h-16 bg-bliss-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-bliss-400" />
              </div>
              <h3 className="font-semibold text-bliss-900 mb-2">ยังไม่มีงานใหม่</h3>
              <p className="text-sm text-bliss-500">รอรับงานใหม่ได้เลย ระบบจะแจ้งเตือนเมื่อมีงานเข้ามา</p>
              <button
                onClick={refresh}
                className="mt-4 px-4 py-2 bg-bliss-100 text-bliss-700 rounded-lg text-sm font-medium hover:bg-bliss-200 transition"
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
          <h3 className="font-semibold text-bliss-900 mb-3">เสร็จสิ้นแล้ว</h3>
          <div className="space-y-3">
            {completedTodayJobs.map((job) => (
              <Link key={job.id} to={`/staff/jobs/${job.id}`} className="block bg-white rounded-xl shadow p-4 border border-bliss-100 opacity-75">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-bliss-900">{job.service_name}</h4>
                    <p className="text-sm text-bliss-500">{job.scheduled_time} • {job.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">+฿{job.total_staff_earnings || job.staff_earnings}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* SOS Button */}
      <SOSButton currentJobId={currentJob?.id} />

    </div>
  )
}

export default StaffDashboard
