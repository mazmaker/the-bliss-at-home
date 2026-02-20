import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Phone,
  Navigation,
  X,
  XCircle,
  Filter,
  List,
  Grid3X3,
  CalendarDays,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { useJobs, type Job, type JobStatus } from '@bliss/supabase'
import { useAuth } from '@bliss/supabase/auth'
import { JobCancellationModal } from '../components'
import { NotificationSounds, isSoundEnabled } from '../utils/soundNotification'
import { stopBackgroundMusic } from '../utils/backgroundMusic'

type ViewMode = 'day' | 'week' | 'month'
type FilterMode = 'all' | 'upcoming' | 'completed'

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const THAI_DAYS_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

// Format date to YYYY-MM-DD in local timezone (avoids UTC offset bug from toISOString)
function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function StaffSchedule() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { jobs, isLoading, refresh } = useJobs({ realtime: true })
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [jobToCancel, setJobToCancel] = useState<Job | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  // Handle cancel job
  const handleCancelJobClick = (job: Job) => {
    setJobToCancel(job)
    setShowCancelModal(true)
    setSelectedJob(null) // Close detail modal
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
      stopBackgroundMusic()
      if (isSoundEnabled()) NotificationSounds.jobCancelled()
      setJobToCancel(null)
      refresh()
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถยกเลิกงานได้')
    }
  }

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    if (viewMode === 'day') {
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
    } else if (viewMode === 'week') {
      const dayOfWeek = start.getDay()
      start.setDate(start.getDate() - dayOfWeek)
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
    } else {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)
      end.setHours(23, 59, 59, 999)
    }

    return { start, end }
  }, [currentDate, viewMode])

  // Filter jobs based on filter mode and date range
  const filteredJobs = useMemo(() => {
    const now = new Date()

    return jobs.filter((job) => {
      // Parse job scheduled date
      const jobDate = new Date(job.scheduled_date)
      const [hours, minutes] = (job.scheduled_time || '00:00').split(':').map(Number)
      jobDate.setHours(hours, minutes, 0, 0)

      // Filter by status
      if (filterMode === 'upcoming' && (job.status === 'completed' || job.status === 'cancelled')) {
        return false
      }
      if (filterMode === 'completed' && job.status !== 'completed') {
        return false
      }

      // Filter by date range (use string comparison to avoid timezone issues)
      const jobDateStr = job.scheduled_date
      if (viewMode === 'day') {
        return jobDateStr === formatLocalDate(currentDate)
      }
      const startStr = formatLocalDate(dateRange.start)
      const endStr = formatLocalDate(dateRange.end)
      return jobDateStr >= startStr && jobDateStr <= endStr
    })
  }, [jobs, filterMode, dateRange, viewMode])

  // Sort jobs by time
  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time || '00:00'}`)
      const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time || '00:00'}`)
      return dateA.getTime() - dateB.getTime()
    })
  }, [filteredJobs])

  // Group jobs by date for calendar view
  const jobsByDate = useMemo(() => {
    const grouped: Record<string, Job[]> = {}
    filteredJobs.forEach((job) => {
      const dateKey = job.scheduled_date
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(job)
    })
    return grouped
  }, [filteredJobs])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalJobs = filteredJobs.length
    const completedJobs = filteredJobs.filter((j) => j.status === 'completed').length
    const upcomingJobs = filteredJobs.filter(
      (j) => !['completed', 'cancelled'].includes(j.status)
    ).length
    const totalEarnings = filteredJobs
      .filter((j) => j.status === 'completed')
      .reduce((sum, j) => sum + (j.staff_earnings || 0), 0)
    const totalHours = filteredJobs
      .filter((j) => j.status !== 'cancelled')
      .reduce((sum, j) => sum + (j.duration_minutes || 0), 0) / 60

    return { totalJobs, completedJobs, upcomingJobs, totalEarnings, totalHours }
  }, [filteredJobs])

  // Navigation handlers
  const goToPrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') newDate.setDate(newDate.getDate() - 1)
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7)
    else newDate.setMonth(newDate.getMonth() - 1)
    setCurrentDate(newDate)
  }

  const goToNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') newDate.setDate(newDate.getDate() + 1)
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7)
    else newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Format date for display
  const getDateLabel = () => {
    if (viewMode === 'day') {
      return `${currentDate.getDate()} ${THAI_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear() + 543}`
    } else if (viewMode === 'week') {
      const weekStart = new Date(currentDate)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return `${weekStart.getDate()} - ${weekEnd.getDate()} ${THAI_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear() + 543}`
    } else {
      return `${THAI_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear() + 543}`
    }
  }

  // Get status badge
  const getStatusBadge = (status: JobStatus) => {
    const badges: Record<JobStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      assigned: 'bg-orange-100 text-orange-700',
      confirmed: 'bg-blue-100 text-blue-700',
      traveling: 'bg-indigo-100 text-indigo-700',
      arrived: 'bg-purple-100 text-purple-700',
      in_progress: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
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
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    )
  }

  // Render week view calendar
  const renderWeekView = () => {
    const weekStart = new Date(currentDate)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())

    const days: JSX.Element[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      const dateKey = formatLocalDate(date)
      const dayJobs = jobsByDate[dateKey] || []
      const isToday = date.toDateString() === new Date().toDateString()

      days.push(
        <div key={i} className="flex-1 min-w-0">
          <div
            className={`text-center py-2 border-b ${isToday ? 'bg-amber-50' : 'bg-stone-50'}`}
          >
            <div className="text-xs text-stone-500">{THAI_DAYS[i]}</div>
            <div
              className={`text-lg font-semibold ${
                isToday ? 'text-amber-700' : 'text-stone-900'
              }`}
            >
              {date.getDate()}
            </div>
          </div>
          <div className="p-1 space-y-1 min-h-[100px]">
            {(expandedDates.has(dateKey) ? dayJobs : dayJobs.slice(0, 3)).map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`w-full text-left p-1.5 rounded text-xs truncate ${
                  job.status === 'completed'
                    ? 'bg-green-50 text-green-700'
                    : job.status === 'cancelled'
                    ? 'bg-red-50 text-red-700 line-through'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                <div className="font-medium truncate">{job.scheduled_time}</div>
                <div className="truncate opacity-75">{job.service_name}</div>
              </button>
            ))}
            {dayJobs.length > 3 && (
              <button
                onClick={() => {
                  setExpandedDates((prev) => {
                    const next = new Set(prev)
                    if (next.has(dateKey)) {
                      next.delete(dateKey)
                    } else {
                      next.add(dateKey)
                    }
                    return next
                  })
                }}
                className="w-full text-xs text-center text-amber-700 font-medium py-1 hover:bg-amber-50 rounded transition"
              >
                {expandedDates.has(dateKey) ? 'ย่อ' : `+${dayJobs.length - 3} งาน`}
              </button>
            )}
          </div>
        </div>
      )
    }

    return <div className="flex border rounded-xl overflow-hidden bg-white">{days}</div>
  }

  // Render month view calendar
  const renderMonthView = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const startDay = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const weeks: JSX.Element[] = []
    let days: JSX.Element[] = []

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square p-1"></div>)
    }

    // Add cells for each day of the month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateKey = formatLocalDate(date)
      const dayJobs = jobsByDate[dateKey] || []
      const isToday = date.toDateString() === new Date().toDateString()

      days.push(
        <div
          key={day}
          className={`aspect-square p-1 border-t ${isToday ? 'bg-amber-50' : ''}`}
        >
          <div
            className={`text-xs font-medium ${isToday ? 'text-amber-700' : 'text-stone-700'}`}
          >
            {day}
          </div>
          {dayJobs.length > 0 && (
            <button
              onClick={() => {
                setCurrentDate(date)
                setViewMode('day')
              }}
              className="w-full mt-0.5"
            >
              <div className="flex gap-0.5 flex-wrap">
                {dayJobs.slice(0, 3).map((job, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      job.status === 'completed'
                        ? 'bg-green-500'
                        : job.status === 'cancelled'
                        ? 'bg-red-500'
                        : 'bg-amber-500'
                    }`}
                  />
                ))}
              </div>
              {dayJobs.length > 0 && (
                <div className="text-[10px] text-stone-500 mt-0.5">{dayJobs.length} งาน</div>
              )}
            </button>
          )}
        </div>
      )

      if ((startDay + day) % 7 === 0 || day === totalDays) {
        weeks.push(
          <div key={`week-${weeks.length}`} className="grid grid-cols-7">
            {days}
          </div>
        )
        days = []
      }
    }

    return (
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-stone-50">
          {THAI_DAYS.map((day) => (
            <div key={day} className="text-center py-2 text-xs font-medium text-stone-600">
              {day}
            </div>
          ))}
        </div>
        {weeks}
      </div>
    )
  }

  // Render day view (list of jobs)
  const renderDayView = () => {
    const todayJobs = sortedJobs.filter(
      (job) => job.scheduled_date === formatLocalDate(currentDate)
    )

    if (todayJobs.length === 0) {
      return (
        <div className="bg-white rounded-xl p-8 text-center">
          <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">ไม่มีงานในวันนี้</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {todayJobs.map((job) => (
          <button
            key={job.id}
            onClick={() => setSelectedJob(job)}
            className="w-full bg-white rounded-xl shadow p-4 text-left border border-stone-100 hover:border-amber-200 transition"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 text-amber-700 font-semibold">
                  <Clock className="w-4 h-4" />
                  {job.scheduled_time}
                </div>
                <h4 className="font-medium text-stone-900 mt-1">{job.service_name}</h4>
              </div>
              {getStatusBadge(job.status)}
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <User className="w-4 h-4" />
              <span>{job.customer_name}</span>
            </div>
            {job.hotel_name && (
              <div className="flex items-center gap-2 text-sm text-stone-600 mt-1">
                <MapPin className="w-4 h-4" />
                <span>{job.hotel_name}</span>
              </div>
            )}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
              <span className="text-sm text-stone-500">{job.duration_minutes} นาที</span>
              <span className="font-bold text-amber-700">฿{job.staff_earnings}</span>
            </div>
          </button>
        ))}
      </div>
    )
  }

  // Render upcoming jobs list
  const renderUpcomingList = () => {
    const now = new Date()
    const upcoming = sortedJobs.filter((job) => {
      const jobDate = new Date(`${job.scheduled_date}T${job.scheduled_time || '00:00'}`)
      return jobDate > now && !['completed', 'cancelled'].includes(job.status)
    })

    if (upcoming.length === 0) {
      return (
        <div className="bg-white rounded-xl p-6 text-center">
          <Calendar className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-sm text-stone-500">ไม่มีงานที่กำลังจะมาถึง</p>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {upcoming.slice(0, 5).map((job) => {
          const jobDate = new Date(job.scheduled_date)
          const isToday = jobDate.toDateString() === now.toDateString()
          const isTomorrow =
            jobDate.toDateString() === new Date(now.getTime() + 86400000).toDateString()

          return (
            <button
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className="w-full flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-stone-100 hover:border-amber-200 transition"
            >
              <div
                className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center ${
                  isToday ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'
                }`}
              >
                <span className="text-xs">
                  {isToday ? 'วันนี้' : isTomorrow ? 'พรุ่งนี้' : THAI_DAYS[jobDate.getDay()]}
                </span>
                <span className="text-lg font-bold">{jobDate.getDate()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-amber-700">{job.scheduled_time}</span>
                  {getStatusBadge(job.status)}
                </div>
                <p className="text-sm text-stone-900 truncate">{job.service_name}</p>
                <p className="text-xs text-stone-500 truncate">{job.customer_name}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-400" />
            </button>
          )
        })}
      </div>
    )
  }

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
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-stone-900">ตารางงาน</h1>
        <p className="text-stone-500 text-sm">Schedule</p>
      </div>

      {/* View Mode Selector */}
      <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm">
        <button
          onClick={() => setViewMode('day')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
            viewMode === 'day'
              ? 'bg-amber-700 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <List className="w-4 h-4" />
          วัน
        </button>
        <button
          onClick={() => setViewMode('week')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
            viewMode === 'week'
              ? 'bg-amber-700 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          สัปดาห์
        </button>
        <button
          onClick={() => setViewMode('month')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
            viewMode === 'month'
              ? 'bg-amber-700 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          เดือน
        </button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-3">
        <button onClick={goToPrevious} className="p-2 hover:bg-stone-100 rounded-lg transition">
          <ChevronLeft className="w-5 h-5 text-stone-600" />
        </button>
        <div className="text-center">
          <p className="font-semibold text-stone-900">{getDateLabel()}</p>
          <button
            onClick={goToToday}
            className="text-xs text-amber-700 font-medium hover:underline"
          >
            วันนี้
          </button>
        </div>
        <button onClick={goToNext} className="p-2 hover:bg-stone-100 rounded-lg transition">
          <ChevronRight className="w-5 h-5 text-stone-600" />
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-stone-500" />
        <div className="flex gap-1 flex-1">
          {[
            { key: 'all', label: 'ทั้งหมด' },
            { key: 'upcoming', label: 'กำลังมา' },
            { key: 'completed', label: 'เสร็จแล้ว' },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterMode(filter.key as FilterMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterMode === filter.key
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-stone-900">{summaryStats.totalJobs}</p>
          <p className="text-xs text-stone-500">ทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-blue-600">{summaryStats.upcomingJobs}</p>
          <p className="text-xs text-stone-500">กำลังมา</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-green-600">{summaryStats.completedJobs}</p>
          <p className="text-xs text-stone-500">เสร็จสิ้น</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-amber-600">
            {summaryStats.totalHours.toFixed(1)}
          </p>
          <p className="text-xs text-stone-500">ชั่วโมง</p>
        </div>
      </div>

      {/* Calendar/List View */}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}

      {/* Upcoming Jobs Section (always show) */}
      {viewMode !== 'day' && (
        <div className="mt-6">
          <h3 className="font-semibold text-stone-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            งานที่กำลังจะมาถึง
          </h3>
          {renderUpcomingList()}
        </div>
      )}

      {/* Period Summary */}
      <div className="bg-gradient-to-r from-amber-700 to-amber-800 rounded-xl p-4 text-white">
        <h3 className="font-semibold mb-3">สรุป{viewMode === 'day' ? 'วันนี้' : viewMode === 'week' ? 'สัปดาห์นี้' : 'เดือนนี้'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-amber-200 text-sm">รายได้รวม</p>
            <p className="text-2xl font-bold">฿{summaryStats.totalEarnings.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-amber-200 text-sm">งานทั้งหมด</p>
            <p className="text-2xl font-bold">{summaryStats.totalJobs} งาน</p>
          </div>
        </div>
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[75vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - fixed */}
            <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-lg text-stone-900">รายละเอียดงาน</h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-1.5 hover:bg-stone-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-stone-600" />
              </button>
            </div>

            {/* Content - scrollable */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              {/* Status & Service */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-stone-900">{selectedJob.service_name}</h4>
                  <p className="text-xs text-stone-500">{selectedJob.service_name_en}</p>
                </div>
                {getStatusBadge(selectedJob.status)}
              </div>

              {/* Date & Time */}
              <div className="flex items-center gap-3 px-3 py-2 bg-amber-50 rounded-xl">
                <Calendar className="w-5 h-5 text-amber-700 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900 text-sm">
                    {new Date(selectedJob.scheduled_date).toLocaleDateString('th-TH', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-amber-700">
                    {selectedJob.scheduled_time} • {selectedJob.duration_minutes} นาที
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-2">
                <h5 className="font-medium text-stone-900 text-sm">ข้อมูลลูกค้า</h5>
                <div className="flex items-center gap-3">
                  {selectedJob.customer_avatar_url ? (
                    <img
                      src={selectedJob.customer_avatar_url}
                      alt={selectedJob.customer_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-stone-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-stone-500" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-stone-900 text-sm">{selectedJob.customer_name}</p>
                    {selectedJob.customer_phone && (
                      <a
                        href={`tel:${selectedJob.customer_phone}`}
                        className="text-xs text-amber-700 flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        {selectedJob.customer_phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <h5 className="font-medium text-stone-900 text-sm">สถานที่</h5>
                {selectedJob.hotel_name && (
                  <p className="text-sm text-stone-700">
                    {selectedJob.hotel_name}
                    {selectedJob.room_number && ` ห้อง ${selectedJob.room_number}`}
                  </p>
                )}
                {selectedJob.address && (
                  <p className="text-xs text-stone-600">{selectedJob.address}</p>
                )}
                {selectedJob.latitude && selectedJob.longitude && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedJob.latitude},${selectedJob.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    นำทาง
                    {selectedJob.distance_km && (
                      <span className="text-amber-600">({selectedJob.distance_km} กม.)</span>
                    )}
                  </a>
                )}
              </div>

              {/* Notes */}
              {selectedJob.customer_notes && (
                <div className="space-y-1">
                  <h5 className="font-medium text-stone-900 text-sm">หมายเหตุจากลูกค้า</h5>
                  <p className="text-xs text-stone-600 bg-stone-50 p-2 rounded-lg">
                    {selectedJob.customer_notes}
                  </p>
                </div>
              )}

              {/* Earnings */}
              <div className="bg-green-50 rounded-xl px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-green-700 text-sm">รายได้</span>
                  <span className="text-xl font-bold text-green-700">
                    ฿{selectedJob.staff_earnings}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons - fixed at bottom */}
            <div className="p-3 border-t border-stone-100 flex gap-2 shrink-0">
              <button
                onClick={() => {
                  setSelectedJob(null)
                  navigate(`/staff/jobs/${selectedJob.id}`)
                }}
                className="flex-1 py-2.5 bg-amber-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                ดูรายละเอียด
              </button>
              {['confirmed', 'assigned', 'traveling', 'arrived'].includes(selectedJob.status) && (
                <button
                  onClick={() => handleCancelJobClick(selectedJob)}
                  className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium flex items-center gap-2 text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  ยกเลิก
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {actionError && (
        <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm" onClick={() => setActionError(null)}>
          {actionError}
        </div>
      )}

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

      {/* Custom CSS for animation */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default StaffSchedule
