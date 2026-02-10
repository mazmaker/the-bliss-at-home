/**
 * React Hooks for Job Management
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/hooks'
import type { Job, JobFilter, StaffStats } from './types'
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
} from './jobService'

interface UseJobsOptions {
  filter?: JobFilter
  realtime?: boolean
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
}

export function useJobs(options: UseJobsOptions = {}): UseJobsReturn {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [pendingJobs, setPendingJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const staffId = user?.id

  const refresh = useCallback(async () => {
    if (!staffId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [staffJobs, available] = await Promise.all([
        getStaffJobs(staffId, options.filter),
        getPendingJobs(),
      ])
      setJobs(staffJobs)
      setPendingJobs(available)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching jobs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [staffId, options.filter])

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

    const handleNewJob = (job: Job) => {
      setPendingJobs((prev) => [...prev, job])
      if (options.onNewJob) {
        options.onNewJob(job)
      }
    }

    const unsubscribe = subscribeToJobs(staffId, handleJobUpdate, handleNewJob)
    return unsubscribe
  }, [staffId, options.realtime, options.onNewJob])

  const handleAcceptJob = useCallback(
    async (jobId: string) => {
      if (!staffId) throw new Error('Not authenticated')
      const job = await acceptJob(jobId, staffId)
      setJobs((prev) => [...prev, job])
      setPendingJobs((prev) => prev.filter((j) => j.id !== jobId))
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
  }
}

export function useJob(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

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

  return { job, isLoading, error }
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
    } catch (err) {
      setError(err as Error)
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

        await reportSOS(user.id, jobId, location, message)
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
