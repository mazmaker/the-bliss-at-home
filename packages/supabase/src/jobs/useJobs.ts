/**
 * React Hooks for Job Management
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../auth/hooks'
import { supabase } from '../auth/supabaseClient'
import { ensureLiveSession } from '../auth/ensureLiveSession'
import type { Job, JobFilter, StaffStats } from './types'
import { isJobMatchingStaffGender } from '../utils/providerPreference'
import {
  getStaffJobs,
  getPendingJobs,
  getJob,
  acceptJob,
  declineJob,
  updateJobStatus,
  cancelJob,
  getStaffStats,
  subscribeToJobs,
  reportSOS,
  findScheduleConflict,
} from './jobService'

interface UseJobsOptions {
  filter?: JobFilter
  realtime?: boolean
  staffGender?: string | null
  onNewJob?: (job: Job) => void
}

interface UseJobsReturn {
  jobs: Job[]
  pendingJobs: Job[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  acceptJob: (jobId: string) => Promise<void>
  declineJob: (jobId: string) => Promise<void>
  startJob: (jobId: string) => Promise<void>
  completeJob: (jobId: string) => Promise<void>
  cancelJob: (jobId: string, reason: string, notes?: string) => Promise<void>
  // B7: returns the staff's already-held job whose time window overlaps `job`, else null.
  // Lets the UI pre-disable an accept button before the acceptJob hard block fires.
  getScheduleConflict: (job: Job) => Job | null
}

export function useJobs(options: UseJobsOptions = {}): UseJobsReturn {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [pendingJobs, setPendingJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const staffId = user?.id

  // Track job IDs currently being accepted to prevent realtime race condition
  const acceptingJobIds = useRef(new Set<string>())
  // Only the FIRST load shows the full-screen spinner; background refetches keep last-known-good.
  const hasLoadedRef = useRef(false)

  const refresh = useCallback(async () => {
    if (!staffId) {
      setIsLoading(false)
      return
    }

    if (!hasLoadedRef.current) setIsLoading(true)

    // 🔴 v5 §3D — never issue the gated reads on a lapsed session: under the anon downgrade they return
    // a RESOLVED empty-200 that would blank the list. If the session isn't confirmed live, keep
    // last-known-good and let the resume nudge / backstop retry — do NOT setError, do NOT clear jobs.
    const live = await ensureLiveSession()
    if (live.status !== 'live') {
      setIsLoading(false)
      return
    }

    try {
      const [staffJobs, available] = await Promise.all([
        getStaffJobs(staffId, options.filter),
        getPendingJobs(options.staffGender),
      ])
      setJobs(staffJobs)
      setPendingJobs(available)
      setError(null)
      hasLoadedRef.current = true
    } catch (err) {
      // 🔴 v5 §3D — a benign browser/network fetch abort (WebView backgrounded) must NOT show the red
      // "AbortError: signal is aborted without reason" banner or blank the list. Keep last-known-good;
      // only surface a genuine hard error.
      const e = err as Error
      if (e?.name === 'AbortError' || /aborted|signal is aborted/i.test(e?.message || '')) {
        console.warn('[useJobs] benign fetch abort — keeping last-known-good (no banner)')
      } else {
        setError(e)
        console.error('Error fetching jobs:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [staffId, options.filter, options.staffGender])

  // Initial load - wait for auth to complete first
  useEffect(() => {
    if (!isAuthLoading) {
      refresh()
    }
  }, [refresh, isAuthLoading])

  // Real-time subscription
  useEffect(() => {
    if (!staffId || !options.realtime) return

    const handleJobUpdate = (job: Job) => {
      // Skip if this job is currently being accepted via handleAcceptJob
      if (acceptingJobIds.current.has(job.id)) return

      setJobs((prev) => {
        const index = prev.findIndex((j) => j.id === job.id)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = job
          return updated
        }
        return [...prev, job]
      })
    }

    const handleNewJob = async (job: Job) => {
      // For realtime jobs, fetch provider_preference and check gender match
      if (job.booking_id && options.staffGender !== undefined) {
        try {
          const { data: booking } = await supabase
            .from('bookings')
            .select('provider_preference')
            .eq('id', job.booking_id)
            .single()
          job.provider_preference = booking?.provider_preference || null
          if (!isJobMatchingStaffGender(job.provider_preference, options.staffGender)) {
            return // Skip this job - doesn't match staff gender
          }
        } catch {
          // If fetch fails, still show the job
        }
      }

      setPendingJobs((prev) => {
        // Duplicate protection: don't add if already exists
        if (prev.some((j) => j.id === job.id)) return prev
        return [...prev, job]
      })
      if (options.onNewJob) {
        options.onNewJob(job)
      }
    }

    const handlePendingJobRemoved = (job: Job) => {
      setPendingJobs((prev) => prev.filter((j) => j.id !== job.id))
    }

    const unsubscribe = subscribeToJobs(
      staffId,
      handleJobUpdate,
      handleNewJob,
      handlePendingJobRemoved
    )
    return unsubscribe
  }, [staffId, options.realtime, options.onNewJob, options.staffGender])

  // 🔴 v5 §2.4/§3D (G3) — event-independent backstop. The LINE WebView may fire NO resume DOM event,
  // so on a timer we (1) re-prime realtime with a no-arg setAuth() (exits the manual-token mode
  // supabase-js forces on every SIGNED_IN/TOKEN_REFRESHED, restoring the hardened accessToken callback)
  // and (2) run a SILENT full refresh() — getStaffJobs AND getPendingJobs — so both missed "งานใหม่"
  // INSERTs and admin UPDATEs to already-held jobs self-correct. refresh() is service-layer-gated by
  // ensureLiveSession, so a naive tick can never re-anon-downgrade.
  useEffect(() => {
    if (!staffId || !options.realtime) return
    const id = setInterval(() => {
      try {
        ;(supabase.realtime as any).setAuth()
      } catch {
        /* best-effort */
      }
      void refresh()
    }, 60_000)
    return () => clearInterval(id)
  }, [staffId, options.realtime, refresh])

  const handleAcceptJob = useCallback(
    async (jobId: string) => {
      if (!staffId) throw new Error('Not authenticated')
      acceptingJobIds.current.add(jobId)
      try {
        const job = await acceptJob(jobId, staffId)
        setJobs((prev) => {
          const index = prev.findIndex((j) => j.id === job.id)
          if (index >= 0) {
            const updated = [...prev]
            updated[index] = job
            return updated
          }
          return [...prev, job]
        })
        setPendingJobs((prev) => prev.filter((j) => j.id !== jobId))
      } finally {
        // Remove lock after delay to catch late realtime events
        setTimeout(() => acceptingJobIds.current.delete(jobId), 3000)
      }
    },
    [staffId]
  )

  const handleDeclineJob = useCallback(
    async (jobId: string) => {
      if (!staffId) throw new Error('Not authenticated')
      await declineJob(jobId, staffId)
      setJobs((prev) => prev.filter((j) => j.id !== jobId))
    },
    [staffId]
  )

  const handleStartJob = useCallback(async (jobId: string) => {
    const job = await updateJobStatus(jobId, 'in_progress')
    setJobs((prev) => prev.map((j) => (j.id === jobId ? job : j)))
  }, [])

  const handleCompleteJob = useCallback(async (jobId: string) => {
    const job = await updateJobStatus(jobId, 'completed')
    setJobs((prev) => prev.map((j) => (j.id === jobId ? job : j)))
  }, [])

  const handleCancelJob = useCallback(
    async (jobId: string, reason: string, notes?: string) => {
      if (!staffId) throw new Error('Not authenticated')
      const job = await cancelJob(jobId, staffId, reason, notes)
      setJobs((prev) => prev.map((j) => (j.id === jobId ? job : j)))
    },
    [staffId]
  )

  const getScheduleConflict = useCallback(
    (job: Job): Job | null => {
      // Check the candidate job against the staff's currently-held jobs (findScheduleConflict
      // skips completed/cancelled and the job itself). Returns the conflicting held job or null.
      return (findScheduleConflict(job, jobs) as Job) || null
    },
    [jobs]
  )

  return {
    jobs,
    pendingJobs,
    isLoading,
    error,
    refresh,
    acceptJob: handleAcceptJob,
    declineJob: handleDeclineJob,
    startJob: handleStartJob,
    completeJob: handleCompleteJob,
    cancelJob: handleCancelJob,
    getScheduleConflict,
  }
}

export function useJob(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!jobId) return
    try {
      const updated = await getJob(jobId)
      setJob(updated)
    } catch (err) {
      setError(err as Error)
    }
  }, [jobId])

  useEffect(() => {
    if (!jobId) {
      setJob(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    getJob(jobId)
      .then(setJob)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [jobId])

  return { job, isLoading, error, refetch }
}

export function useStaffStats() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [stats, setStats] = useState<StaffStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const staffId = user?.id

  const refresh = useCallback(async () => {
    if (!staffId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const data = await getStaffStats(staffId)
      setStats(data)
      setError(null) // 🔴 v5 §4 — clear any stale error latch on a successful read
    } catch (err) {
      // 🔴 v5 §3A/§4 — a lapsed-session throw (SessionNotLiveError) is not a real failure: keep
      // last-known-good stats and don't surface a scary error.
      const e = err as Error
      if (e?.name !== 'SessionNotLiveError') setError(e)
    } finally {
      setIsLoading(false)
    }
  }, [staffId])

  useEffect(() => {
    if (!isAuthLoading) {
      refresh()
    }
  }, [refresh, isAuthLoading])

  return { stats, isLoading, error, refresh }
}

export function useSOS() {
  const { user } = useAuth()
  const [isReporting, setIsReporting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const sendSOS = useCallback(
    async (jobId: string | null, message?: string) => {
      if (!user?.id) throw new Error('Not authenticated')

      setIsReporting(true)
      setError(null)

      try {
        // Try to get current location
        let location: { latitude: number; longitude: number } | null = null
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>(
              (resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  timeout: 5000,
                  enableHighAccuracy: true,
                })
            )
            location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }
          } catch {
            console.warn('Could not get location for SOS')
          }
        }

        const alertId = await reportSOS(user.id, jobId, location, message)
        return alertId
      } catch (err) {
        setError(err as Error)
        throw err
      } finally {
        setIsReporting(false)
      }
    },
    [user?.id]
  )

  return { sendSOS, isReporting, error }
}
