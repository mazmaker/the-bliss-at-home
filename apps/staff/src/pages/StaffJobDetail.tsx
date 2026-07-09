import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@bliss/supabase/auth'
import {
  ArrowLeft, MapPin, Clock, User, Phone, Navigation, Calendar,
  Banknote, FileText, CheckCircle, Play, Loader2, AlertTriangle
} from 'lucide-react'
import { useAuth } from '@bliss/supabase/auth'
import { useJob, useJobs, type JobStatus, isSpecificPreference, getProviderPreferenceLabel, getProviderPreferenceBadgeStyle } from '@bliss/supabase'
import { ServiceTimer, SOSButton, ExtensionInfo, ExtensionAlertBanner, JobLocationMap } from '../components'
import JobGPSControls from '../components/JobGPSControls'
import JobStatusBadge from '../components/JobStatusBadge'
import { useJobGPSStatus } from '../hooks/useJobGPSStatus'
import { useCompleteGate } from '../hooks/useCompleteGate'
import { useStartGate } from '../hooks/useStartGate'
import { canStaffSeeCustomerPhone, maskCustomerNotesPhone } from '../utils/customerContact'
import { useResumeBackgroundMusic } from '../hooks/useResumeBackgroundMusic'
import { useStaffEligibility } from '@bliss/supabase'
import { NotificationSounds, isSoundEnabled } from '../utils/soundNotification'
import { playBackgroundMusic, stopBackgroundMusic, setMusicManuallyMuted } from '../utils/backgroundMusic'
import { normalizeCommissionRate, calculateExtensionEarnings } from '../utils/commissionUtils'
import { useGPSTracking } from '../hooks/useGPSTracking'
import { withTimeout } from '../utils/withTimeout'

function StaffJobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { job, isLoading, error, refetch } = useJob(id || null)
  const { acceptJob, startJob, completeJob, getScheduleConflict } = useJobs({ realtime: false })
  const { eligibility } = useStaffEligibility()

  // Get GPS tracking status for this specific job
  const jobGPSStatus = useJobGPSStatus(job?.id || '')

  // Keep global GPS hook for controls and map display
  const { currentPosition, checkExistingJourney } = useGPSTracking()

  // Query service commission rate
  const { data: serviceData } = useQuery({
    queryKey: ['service-commission', job?.booking_id],
    queryFn: async () => {
      if (!job?.booking_id) return null

      const SERVICE_FIELDS = 'staff_commission_rate, use_fixed_rate, staff_earning_60, staff_earning_90, staff_earning_120'

      // Try direct join via bookings.service_id first
      const { data } = await supabase
        .from('bookings')
        .select(`service_id, services(${SERVICE_FIELDS})`)
        .eq('id', job.booking_id)
        .single()

      if (data?.services) return data.services

      // Fallback: get service from original (non-extension) booking_services row
      const { data: bsList } = await supabase
        .from('booking_services')
        .select(`service_id, services(${SERVICE_FIELDS}), is_extension`)
        .eq('booking_id', job.booking_id)
        .order('sort_order', { ascending: true })

      // Pick first row that is NOT an extension (handle null is_extension for older rows)
      const original = (bsList || []).find(bs => !bs.is_extension)
      return (original as any)?.services || null
    },
    enabled: !!job?.booking_id
  })

  // Query customer health declaration (ข้อควรระวังก่อนให้บริการ)
  const { data: healthDeclaration } = useQuery({
    queryKey: ['health-declaration', job?.booking_id],
    queryFn: async () => {
      if (!job?.booking_id) return null

      const { data: booking } = await supabase
        .from('bookings')
        .select('customer_id')
        .eq('id', job.booking_id)
        .single()

      if (!booking?.customer_id) return null

      const { data } = await (supabase as any)
        .from('customer_health_declarations')
        .select('conditions, other_detail, has_no_condition')
        .eq('customer_id', booking.customer_id)
        .maybeSingle()

      return data
    },
    enabled: !!job?.booking_id,
  })

  // Query booking services for extension info (with fallback for missing columns).
  // COUPLE/simultaneous bookings have ONE booking_services row PER RECIPIENT (recipient_index
  // 0,1) served IN PARALLEL by separate staff. This job serves ONLY its own recipient
  // (recipient_index = job.job_index - 1), so scope the rows to that recipient — otherwise the
  // durations/prices/extensions get summed across both recipients (e.g. 120+120=240 min), which
  // wrongly doubles the ServiceTimer, the complete-gate window, and the earnings breakdown.
  // Single bookings (total_jobs=1) are left unfiltered so legacy rows with a null recipient_index
  // still resolve.
  const { data: bookingServices } = useQuery({
    queryKey: ['booking-services', job?.id],
    queryFn: async () => {
      if (!job?.id) return []
      const isCouple = (job.total_jobs ?? 1) > 1
      const recipientIndex = (job.job_index ?? 1) - 1
      try {
        // Try with extension columns first
        let query = supabase
          .from('booking_services')
          .select('id, duration, price, is_extension, extended_at, sort_order, recipient_index')
          .eq('booking_id', job.booking_id)
        if (isCouple) query = query.eq('recipient_index', recipientIndex)

        const { data, error } = await query.order('sort_order')

        if (error) throw error
        return data || []
      } catch (error) {
        console.warn('Extension columns not available, using basic booking_services data:', error)
        // Fallback to basic columns only
        try {
          let fbQuery = supabase
            .from('booking_services')
            .select('id, duration, price, sort_order, recipient_index')
            .eq('booking_id', job.booking_id)
          if (isCouple) fbQuery = fbQuery.eq('recipient_index', recipientIndex)

          const { data, error: fallbackError } = await fbQuery.order('sort_order')

          if (fallbackError) throw fallbackError
          // Add default extension fields
          return (data || []).map(service => ({
            ...service,
            is_extension: false,
            extended_at: null
          }))
        } catch (fallbackError) {
          console.error('Booking services query failed:', fallbackError)
          return []
        }
      }
    },
    enabled: !!job?.id
  })

  // #7 Couple: fetch the PARTNER staff's contact (name + phone). RLS blocks a client read of the
  // sibling job, so the SECURITY DEFINER RPC get_couple_partner_contact returns it (IDOR-safe: it
  // only answers for a job the caller owns). Couple bookings only; returns [] for single bookings.
  const { data: couplePartners } = useQuery({
    queryKey: ['couple-partner-contact', job?.id],
    enabled: !!job?.id && (job?.total_jobs ?? 1) > 1,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_couple_partner_contact', { p_job_id: job!.id })
      if (error) {
        console.error('get_couple_partner_contact error:', error)
        return []
      }
      return (data ?? []) as Array<{ partner_name: string | null; partner_phone: string | null; job_index: number; status: string }>
    },
    // Poll while the partner hasn't accepted yet (RPC returns 0 rows); stop once we have their contact,
    // so the card appears live if the partner accepts after this page is already open.
    refetchInterval: (q: any) => (q?.state?.data?.length ? false : 20000),
    refetchOnWindowFocus: true,
  })

  // Process extension data with safety checks
  const originalServices = bookingServices?.filter(s => s && !s.is_extension) || []
  const extensionServices = bookingServices?.filter(s => s && s.is_extension) || []

  // Debug logging
  console.log('🔍 StaffJobDetail Debug:', {
    jobId: job?.id,
    bookingServices,
    originalServices,
    extensionServices,
    extensionCount: extensionServices.length
  })

  const originalDuration = originalServices.reduce((sum, s) => sum + (s?.duration || 0), 0)
  // Use job's staff earnings (fixed amount) for original price
  const originalPrice = job?.staff_earnings || 0
  const totalDuration = bookingServices?.reduce((sum, s) => sum + (s?.duration || 0), 0) || job?.duration_minutes || 0

  // Gate the "เสร็จสิ้นงาน" button: only within the last 10 min of service (overtime allowed).
  // totalDuration already includes extension services; started_at gates before service start.
  const completeGate = useCompleteGate(job, totalDuration)

  // Gate the "เริ่มงาน" button: only startable once the scheduled service time has arrived
  // (no early start). ANDed with the KYC eligibility gate at the JobGPSControls call site.
  const startGate = useStartGate(job)

  // Resume the spa music after a refresh/navigation onto an in-progress job (audio-only). See #6.
  useResumeBackgroundMusic(job)

  // Get earnings config from service query
  const svcData = serviceData as any
  const useFixedRate = svcData?.use_fixed_rate || false
  const rawCommissionRate = svcData?.staff_commission_rate || 30;
  const commissionRate = normalizeCommissionRate(rawCommissionRate);

  // Calculate extension earnings: fixed rate or commission %
  const extensionEarnings = useFixedRate
    ? extensionServices.reduce((sum: number, ext: any) => {
        const dur = ext.duration || 90
        const fixed = dur === 60 ? svcData?.staff_earning_60
          : dur === 120 ? svcData?.staff_earning_120
          : svcData?.staff_earning_90
        return sum + Math.round(Number(fixed) || 0)
      }, 0)
    : calculateExtensionEarnings(extensionServices, commissionRate);
  // Always calculate from fixed rates when extension data + service config are loaded
  // Avoids showing stale/wrong total_staff_earnings from DB (e.g., from old test runs)
  const totalPrice = (extensionServices.length > 0 && svcData != null)
    ? (originalPrice + extensionEarnings)
    : (job?.total_staff_earnings ?? originalPrice)

  const [isProcessing, setIsProcessing] = useState(false)
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
      // [FIX] time-boxed: a stalled mutation used to leave the button disabled+spinning
      // forever, trapping the staff mid-job-lifecycle
      await withTimeout(acceptJob(job.id), 15000, 'acceptJob')
      await withTimeout(refetch(), 10000, 'refetch after accept')
      if (isSoundEnabled()) NotificationSounds.jobAccepted()
      // Notify hotel if this is a hotel booking (non-blocking)
      try {
        const serverUrl = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')
        fetch(`${serverUrl}/api/notifications/job-accepted`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: job.id }),
        }).catch(() => {})
      } catch {}
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถรับงานได้')
      // A timed-out mutation may still have succeeded server-side — re-sync silently
      refetch().catch(() => {})
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStart = async () => {
    if (!job) return
    setIsProcessing(true)
    setActionError(null)
    try {
      await withTimeout(startJob(job.id), 15000, 'startJob')
      await withTimeout(refetch(), 10000, 'refetch after start')
      if (isSoundEnabled()) NotificationSounds.jobStarted()
      // Fresh start clears any prior manual mute, then plays the service music.
      setMusicManuallyMuted(false)
      await playBackgroundMusic()
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถเริ่มงานได้')
      refetch().catch(() => {})
    } finally {
      setIsProcessing(false)
    }
  }

  const handleComplete = async () => {
    if (!job) return
    setIsProcessing(true)
    setActionError(null)
    try {
      await withTimeout(completeJob(job.id), 15000, 'completeJob')
      await withTimeout(refetch(), 10000, 'refetch after complete')
      stopBackgroundMusic()
      if (isSoundEnabled()) NotificationSounds.jobCompleted()
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถเสร็จสิ้นงานได้')
      refetch().catch(() => {})
    } finally {
      setIsProcessing(false)
    }
  }

  // ✅ getStatusBadge function removed - now using JobStatusBadge component

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
        <Loader2 className="w-10 h-10 animate-spin text-bliss-600" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="p-4">
        <button onClick={goBack} className="flex items-center gap-2 text-bliss-600 mb-4">
          <ArrowLeft className="w-5 h-5" />
          <span>กลับ</span>
        </button>
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-center">
          ไม่พบข้อมูลงาน
        </div>
      </div>
    )
  }

  // Fix ID matching: job.staff_id might be profile_id or staff table id
  const isMyJob = job.staff_id === user?.id ||
                 job.staff_id === eligibility?.staffData?.id
  const isPending = job.status === 'pending'
  // JobGPSControls handles all job start actions, so no main "เริ่มงาน" button needed
  const canStart = false // Disabled - let JobGPSControls handle job progression
  const isInProgress = isMyJob && job.status === 'in_progress'
  const isFinished = job.status === 'completed' || job.status === 'cancelled'

  // Debug log for GPS controls visibility
  console.log('🔍 StaffJobDetail GPS Controls Debug:', {
    jobId: job.id,
    staffId: job.staff_id,
    userId: user?.id,
    isMyJob,
    isFinished,
    jobStatus: job.status,
    shouldShowGPS: isMyJob && !isFinished
  })

  return (
    <div className="pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={goBack} className="p-2 -ml-2 text-bliss-600 hover:bg-bliss-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-bliss-900 flex-1">รายละเอียดงาน</h1>
        <JobStatusBadge status={job.status} isGPSTracking={jobGPSStatus.isTracking} />
      </div>

      {/* Extension Alert Banner */}
      <ExtensionAlertBanner jobId={job.id} />

      {/* Enhanced Service Timer */}
      {isInProgress && (
        <ServiceTimer
          startedAt={job.started_at}
          durationMinutes={totalDuration}
        />
      )}

      {/* Service Info Card */}
      <div className="bg-white rounded-xl shadow border border-bliss-100 overflow-hidden">
        <div className="bg-gradient-to-r from-bliss-700 to-bliss-800 text-white p-4">
          <h2 className="text-xl font-bold">{job.service_name}</h2>
          <p className="text-bliss-100 text-sm mt-1">{job.total_duration_minutes || job.duration_minutes} นาที</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Date & Time */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-bliss-50 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-bliss-700" />
            </div>
            <div>
              <p className="text-xs text-bliss-500">วันที่และเวลา</p>
              <p className="font-medium text-bliss-900">{formatDate(job.scheduled_date)}</p>
              <p className="text-sm text-bliss-700">{formatTime(job.scheduled_time)}</p>
            </div>
          </div>

          {/* Provider Preference */}
          {isSpecificPreference(job.provider_preference) && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-bliss-50 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-bliss-700" />
              </div>
              <div>
                <p className="text-xs text-bliss-500">ความต้องการผู้ให้บริการ</p>
                <span className={`inline-block text-xs px-2 py-1 rounded-full mt-1 ${getProviderPreferenceBadgeStyle(job.provider_preference)}`}>
                  {getProviderPreferenceLabel(job.provider_preference)}
                </span>
              </div>
            </div>
          )}

          {/* Customer */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-bliss-50 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-bliss-700" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-bliss-500">ลูกค้า</p>
              <p className="font-medium text-bliss-900">{job.customer_name}</p>
            </div>
            {canStaffSeeCustomerPhone(job.status) && job.customer_phone && (
              <a
                href={`tel:${job.customer_phone}`}
                className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
              >
                <Phone className="w-5 h-5" />
              </a>
            )}
          </div>

          {/* #7 Couple partner(s) — shows only for couple bookings once the partner has accepted */}
          {couplePartners && couplePartners.map((partner, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-purple-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-bliss-500">พนักงานที่รับงานคู่เดียวกัน</p>
                <p className="font-medium text-bliss-900">{partner.partner_name || 'พนักงาน'}</p>
              </div>
              {partner.partner_phone && (
                <a
                  href={`tel:${partner.partner_phone}`}
                  className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
                >
                  <Phone className="w-5 h-5" />
                </a>
              )}
            </div>
          ))}

          {/* Location */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-red-700" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-bliss-500">สถานที่</p>
              {job.hotel_name ? (
                <>
                  <p className="font-medium text-bliss-900">{job.hotel_name}</p>
                  {job.room_number && <p className="text-sm text-bliss-600">ห้อง {job.room_number}</p>}
                </>
              ) : (
                <p className="font-medium text-bliss-900">{job.address}</p>
              )}
              {job.distance_km && (
                <p className="text-sm text-bliss-500 mt-1">ระยะทาง {job.distance_km} กม.</p>
              )}
            </div>
            {job.latitude && job.longitude && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-bliss-50 text-bliss-700 rounded-lg hover:bg-bliss-100 transition"
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
              <p className="text-xs text-bliss-500">รายได้</p>
              <p className="text-xl font-bold text-bliss-700">฿{Number(totalPrice).toLocaleString()}</p>
            </div>
          </div>

          {/* Gender Preference */}
          {job.bookings?.provider_preference && job.bookings.provider_preference !== 'no-preference' && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-bliss-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-bliss-500" />
              </div>
              <div>
                <p className="text-xs text-bliss-500">ความต้องการเพศของผู้ให้บริการ</p>
                <div className="flex items-center gap-2 mt-1">
                  {job.bookings.provider_preference === 'female-only' && (
                    <span className="px-2 py-1 text-xs font-medium bg-bliss-100 text-bliss-700 rounded-full">
                      ผู้หญิงเท่านั้น (บังคับ)
                    </span>
                  )}
                  {job.bookings.provider_preference === 'male-only' && (
                    <span className="px-2 py-1 text-xs font-medium bg-bliss-100 text-bliss-700 rounded-full">
                      ผู้ชายเท่านั้น (บังคับ)
                    </span>
                  )}
                  {job.bookings.provider_preference === 'prefer-female' && (
                    <span className="px-2 py-1 text-xs font-medium bg-bliss-50 text-bliss-600 rounded-full">
                      ต้องการผู้หญิง (ยืดหยุ่น)
                    </span>
                  )}
                  {job.bookings.provider_preference === 'prefer-male' && (
                    <span className="px-2 py-1 text-xs font-medium bg-bliss-50 text-bliss-600 rounded-full">
                      ต้องการผู้ชาย (ยืดหยุ่น)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Customer Notes */}
          {job.customer_notes && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-bliss-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-bliss-500" />
              </div>
              <div>
                <p className="text-xs text-bliss-500">หมายเหตุจากลูกค้า</p>
                <p className="text-sm text-bliss-700 mt-1">{maskCustomerNotesPhone(job.customer_notes, job.status)}</p>
              </div>
            </div>
          )}

          {/* Health Declaration (ข้อควรระวังก่อนให้บริการ) */}
          {healthDeclaration && !healthDeclaration.has_no_condition && healthDeclaration.conditions.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm font-semibold text-red-800 mb-2">
                ข้อควรระวังด้านสุขภาพของลูกค้า
              </p>
              <ul className="space-y-1">
                {healthDeclaration.conditions.map((key: string) => {
                  const labels: Record<string, string> = {
                    heart_disease: 'โรคหัวใจ',
                    blood_pressure: 'โรคความดันโลหิต (สูง / ต่ำ)',
                    diabetes: 'โรคเบาหวาน',
                    pregnancy: 'อยู่ระหว่างการตั้งครรภ์',
                    post_surgery: 'พักฟื้นจากการผ่าตัด / แผลผ่าตัดยังไม่หายดี',
                    skin_disease: 'โรคผิวหนัง',
                    other: `อื่น ๆ${healthDeclaration.other_detail ? `: ${healthDeclaration.other_detail}` : ''}`,
                  }
                  return (
                    <li key={key} className="text-sm text-red-700">
                      • {labels[key] || key}
                    </li>
                  )
                })}
              </ul>
              <p className="text-xs text-red-600 mt-2">
                โปรดปรับรูปแบบการนวดให้เหมาะสมเพื่อความปลอดภัยของลูกค้า
              </p>
            </div>
          )}
          {healthDeclaration?.has_no_condition && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">ลูกค้าแจ้งว่าไม่มีโรคประจำตัวหรือข้อควรระวัง</p>
            </div>
          )}
        </div>
      </div>

      {/* Location Map */}
      {isMyJob && (job.latitude || job.longitude || job.address || job.hotel_name) && (
        <JobLocationMap
          jobId={job.id}
          destinationLat={job.latitude}
          destinationLng={job.longitude}
          destinationName={job.hotel_name ? `${job.hotel_name}${job.room_number ? ` ห้อง ${job.room_number}` : ''}` : job.address}
          customerPhone={canStaffSeeCustomerPhone(job.status) ? job.customer_phone ?? undefined : undefined}
          showMap={jobGPSStatus.isTracking}
          currentLat={currentPosition?.latitude}
          currentLng={currentPosition?.longitude}
        />
      )}

      {/* Extension Information */}
      {extensionServices.length > 0 && (
        <ExtensionInfo
          originalDuration={originalDuration}
          originalPrice={originalPrice}
          extensions={extensionServices}
          totalDuration={totalDuration}
          totalPrice={totalPrice}
          useFixedRate={useFixedRate}
          staffEarning60={Number(svcData?.staff_earning_60 ?? 0)}
          staffEarning90={Number(svcData?.staff_earning_90 ?? 0)}
          staffEarning120={Number(svcData?.staff_earning_120 ?? 0)}
          staffCommissionRate={commissionRate}
          className=""
        />
      )}

      {/* Timestamps */}
      {(job.accepted_at || job.started_at || job.completed_at || job.cancelled_at) && (
        <div className="bg-white rounded-xl shadow border border-bliss-100 p-4">
          <h3 className="font-semibold text-bliss-900 mb-3 text-sm">ไทม์ไลน์</h3>
          <div className="space-y-2 text-sm">
            {job.accepted_at && (
              <div className="flex items-center gap-2 text-bliss-600">
                <div className="w-2 h-2 bg-bliss-500 rounded-full" />
                <span>รับงาน: {new Date(job.accepted_at).toLocaleString('th-TH')}</span>
              </div>
            )}
            {job.started_at && (
              <div className="flex items-center gap-2 text-bliss-600">
                <div className="w-2 h-2 bg-bliss-500 rounded-full" />
                <span>เริ่มงาน: {new Date(job.started_at).toLocaleString('th-TH')}</span>
              </div>
            )}
            {job.completed_at && (
              <div className="flex items-center gap-2 text-bliss-600">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>เสร็จสิ้น: {new Date(job.completed_at).toLocaleString('th-TH')}</span>
              </div>
            )}
            {job.cancelled_at && (
              <div className="flex items-center gap-2 text-bliss-600">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>ยกเลิก: {new Date(job.cancelled_at).toLocaleString('th-TH')}</span>
                {job.cancellation_reason && (
                  <span className="text-bliss-500">({job.cancellation_reason})</span>
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

      {/* GPS Tracking Controls */}
      {isMyJob && !isFinished && (
        <JobGPSControls
          job={{
            id: job.id,
            status: job.status,
            customer_name: job.customer_name,
            customer_address: job.hotel_name ? `${job.hotel_name}${job.room_number ? ` ห้อง ${job.room_number}` : ''}` : job.address,
            customer_phone: job.customer_phone,
            booking_id: job.id, // Use the same field as in dashboard
            scheduled_date: job.scheduled_date,
            scheduled_time: job.scheduled_time
          }}
          onRefresh={refetch}
          onStartJob={handleStart}
          isProcessing={isProcessing}
          canStartWork={!!eligibility?.canWork && startGate.canStart}
        />
      )}
      {isMyJob && !isFinished && job.status === 'arrived' && !startGate.canStart && (
        <p className="text-xs text-center text-bliss-500">
          เริ่มงานได้ก่อนเวลานัด {job.scheduled_time?.slice(0, 5)} น. 15 นาที (อีก {startGate.minsUntilStart} นาที)
        </p>
      )}

      {/* Action Buttons */}
      {!isFinished && (
        <div className="space-y-2">
          {isPending && job && getScheduleConflict(job) && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>เวลาทับซ้อนกับงานที่คุณรับไว้แล้ว — ไม่สามารถรับงานนี้ได้</span>
            </div>
          )}
          {isPending && (
            <button
              onClick={handleAccept}
              disabled={isProcessing || !eligibility?.canWork || !!(job && getScheduleConflict(job))}
              className="w-full py-3 bg-gradient-to-r from-bliss-700 to-bliss-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              title={job && getScheduleConflict(job) ? 'เวลาทับซ้อนกับงานที่คุณรับไว้แล้ว' : undefined}
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              รับงานนี้
            </button>
          )}

          {canStart && (
            <button
              onClick={handleStart}
              disabled={isProcessing || !eligibility?.canWork}
              className="w-full py-3 bg-gradient-to-r from-bliss-600 to-bliss-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              เริ่มงาน
            </button>
          )}

          {isInProgress && (
            <div className="w-full">
              <button
                onClick={handleComplete}
                disabled={isProcessing || !completeGate.canComplete}
                className="w-full py-3 bg-gradient-to-r from-bliss-600 to-bliss-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                เสร็จสิ้นงาน
              </button>
              {!completeGate.canComplete && (
                <p className="text-xs text-center text-bliss-500 mt-2">
                  กดเสร็จสิ้นได้เมื่อใกล้ครบเวลาบริการ (อีก {completeGate.minsUntilEligible} นาที)
                </p>
              )}
            </div>
          )}

          {isMyJob && !isPending && (
            <div className="w-full py-3 px-4 bg-bliss-50 border border-bliss-200 rounded-xl text-center">
              <p className="text-sm text-bliss-500">หากต้องการยกเลิกงาน กรุณาติดต่อ Admin</p>
            </div>
          )}
        </div>
      )}

      {/* SOS Button */}
      {isMyJob && !isFinished && <SOSButton currentJobId={job.id} />}

    </div>
  )
}

export default StaffJobDetail
