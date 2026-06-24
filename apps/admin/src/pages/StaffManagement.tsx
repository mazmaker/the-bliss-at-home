import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  Filter,
  Eye,
  Check,
  X,
  UserCheck,
  UserX,
  MapPin,
  Star,
  Phone,
  Mail,
  Calendar,
  Clock,
  Sparkles,
  Hand,
  Flower2,
  Loader2,
  AlertCircle,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'
import {
  getStaffApplications,
  getPendingStaffApplications,
  getStaffProfiles,
  getStaffStats,
  approveStaffApplication,
  rejectStaffApplication,
  toggleStaffStatus,
  type StaffApplication,
  type StaffProfile
} from '../lib/staffQueries'
import { useAdminAuth } from '../hooks/useAdminAuth'

const skills = [
  { id: 'all', name: 'ทั้งหมด', icon: Filter },
  { id: 'นวดไทย', name: 'นวดไทย', icon: Sparkles },
  { id: 'เจลเล็บ', name: 'เล็บ', icon: Hand },
  { id: 'สปา', name: 'สปา', icon: Flower2 },
]

function StaffManagement() {
  const [selectedSkill, setSelectedSkill] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all')
  const [showApplicationDetails, setShowApplicationDetails] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const queryClient = useQueryClient()
  const { user } = useAdminAuth()

  // Fetch staff applications
  const { data: applications = [], isLoading: applicationsLoading } = useQuery({
    queryKey: ['staff-applications', statusFilter],
    queryFn: () => getStaffApplications(statusFilter),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Fetch staff profiles (approved staff)
  const { data: staffProfiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['staff-profiles'],
    queryFn: () => getStaffProfiles({ is_active: true }),
    refetchInterval: 60000, // Refetch every 60 seconds
  })

  // Fetch staff statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['staff-stats'],
    queryFn: getStaffStats,
    refetchInterval: 60000,
  })

  // Approve application mutation with enhanced feedback
  const approveApplication = useMutation({
    mutationFn: (applicationId: string) => approveStaffApplication(applicationId, user?.id || ''),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['staff-applications'] })
      queryClient.invalidateQueries({ queryKey: ['staff-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] })

      if (result.success) {
        alert(`✅ ${result.message}\n\n🔗 LINE User ID: ${result.lineUserId}\n📝 Staff Profile ID: ${result.staffProfileId}`)
      } else {
        alert(`❌ ${result.message}`)
      }
    },
    onError: (error) => {
      console.error('Error approving application:', error)
      alert('เกิดข้อผิดพลาดในการอนุมัติ')
    },
  })

  // Reject application mutation
  const rejectApplication = useMutation({
    mutationFn: ({ applicationId, reason }: { applicationId: string, reason: string }) =>
      rejectStaffApplication(applicationId, user?.id || '', reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-applications'] })
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] })
      setRejectionReason('')
      setShowApplicationDetails(null)
      alert('ปฏิเสธใบสมัครเรียบร้อยแล้ว!')
    },
    onError: (error) => {
      console.error('Error rejecting application:', error)
      alert('เกิดข้อผิดพลาดในการปฏิเสธ')
    },
  })

  // Filter applications
  const filteredApplications = applications.filter((app) => {
    const matchesSkill = selectedSkill === 'all' || app.skills.some(skill => skill.includes(selectedSkill))
    const matchesSearch =
      searchQuery === '' ||
      app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.email && app.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      app.phone_number.includes(searchQuery)
    return matchesSkill && matchesSearch
  })

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
      SUSPENDED: 'bg-bliss-100 text-bliss-600',
    }
    const labels = {
      PENDING: 'รออนุมัติ',
      APPROVED: 'อนุมัติแล้ว',
      REJECTED: 'ปฏิเสธแล้ว',
      SUSPENDED: 'ระงับการใช้งาน',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const handleApprove = (applicationId: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการอนุมัติใบสมัครนี้?')) {
      approveApplication.mutate(applicationId)
    }
  }

  const handleReject = (applicationId: string) => {
    const reason = window.prompt('กรุณาระบุเหตุผลในการปฏิเสธ:')
    if (reason && reason.trim()) {
      rejectApplication.mutate({ applicationId, reason: reason.trim() })
    }
  }

  if (applicationsLoading || profilesLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-bliss-600" />
        <span className="ml-2 text-bliss-600">กำลังโหลดข้อมูลพนักงาน...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-bliss-900">จัดการพนักงาน</h1>
          <p className="text-bliss-500">Staff Management - LINE LIFF Integration</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://line.me/R/app/your-liff-id"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
          >
            <ExternalLink className="w-5 h-5" />
            LINE LIFF สมัครงาน
          </a>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-bliss-700 to-bliss-800 text-white rounded-xl font-medium hover:from-bliss-800 hover:to-bliss-900 transition">
            <MessageSquare className="w-5 h-5" />
            ส่งแจ้งเตือน LINE
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border border-bliss-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-bliss-900">
                {stats?.pending_applications || 0}
              </p>
              <p className="text-xs text-bliss-500">รออนุมัติ</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-bliss-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-bliss-900">
                {stats?.active_staff || 0}
              </p>
              <p className="text-xs text-bliss-500">พนักงานใช้งาน</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-bliss-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <UserX className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-bliss-900">
                {stats?.rejected_applications || 0}
              </p>
              <p className="text-xs text-bliss-500">ปฏิเสธ</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-bliss-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bliss-100 rounded-lg">
              <Star className="w-5 h-5 text-bliss-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-bliss-900">
                {stats?.average_rating ? stats.average_rating.toFixed(1) : '0.0'}
              </p>
              <p className="text-xs text-bliss-500">คะแนนเฉลี่ย</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-bliss-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-bliss-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bliss-100 border-0 rounded-xl focus:ring-2 focus:ring-bliss-500 focus:bg-white transition"
            />
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => {
              const Icon = skill.icon
              return (
                <button
                  key={skill.id}
                  onClick={() => setSelectedSkill(skill.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition ${
                    selectedSkill === skill.id
                      ? 'bg-gradient-to-r from-bliss-700 to-bliss-800 text-white'
                      : 'bg-bliss-100 text-bliss-600 hover:bg-bliss-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{skill.name}</span>
                </button>
              )
            })}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-bliss-100 border-0 rounded-xl focus:ring-2 focus:ring-bliss-500"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="PENDING">รออนุมัติ</option>
            <option value="APPROVED">อนุมัติแล้ว</option>
            <option value="REJECTED">ปฏิเสธแล้ว</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-bliss-500">
        พบ {filteredApplications.length} ใบสมัคร
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-bliss-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-bliss-50 border-b border-bliss-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-bliss-700">ผู้สมัคร</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bliss-700">ทักษะ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bliss-700">ประสบการณ์</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bliss-700">วันที่สมัคร</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bliss-700">สถานะ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bliss-700">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map((application) => (
                <tr key={application.id} className="border-b border-bliss-100 hover:bg-bliss-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-bliss-700 to-bliss-800 rounded-full flex items-center justify-center text-white font-semibold">
                        {application.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-bliss-900">{application.full_name}</p>
                        <div className="flex items-center gap-2 text-xs text-bliss-500">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {application.phone_number}
                          </span>
                          {application.line_display_name && (
                            <span className="text-green-600">
                              LINE: {application.line_display_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {application.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-1 bg-bliss-100 text-bliss-700 rounded-full text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-bliss-600">{application.experience_years} ปี</td>
                  <td className="py-3 px-4 text-sm text-bliss-600">
                    {new Date(application.application_date).toLocaleDateString('th-TH')}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(application.status)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 hover:bg-bliss-100 rounded-lg transition"
                        title="ดูรายละเอียด"
                        onClick={() => setShowApplicationDetails(application.id)}
                      >
                        <Eye className="w-4 h-4 text-bliss-600" />
                      </button>
                      {application.status === 'PENDING' && (
                        <>
                          <button
                            className="p-2 hover:bg-green-100 rounded-lg transition"
                            title="อนุมัติ"
                            onClick={() => handleApprove(application.id)}
                            disabled={approveApplication.isPending}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            className="p-2 hover:bg-red-100 rounded-lg transition"
                            title="ปฏิเสธ"
                            onClick={() => handleReject(application.id)}
                            disabled={rejectApplication.isPending}
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredApplications.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-bliss-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-bliss-400" />
                    ไม่พบใบสมัครพนักงาน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LINE Integration Guide */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 rounded-xl">
            <MessageSquare className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-bliss-900 mb-2">
              🔗 การเชื่อมต่อ LINE LIFF
            </h3>
            <div className="text-sm text-bliss-600 space-y-2">
              <p>• พนักงานสมัครผ่าน LINE LIFF → ข้อมูลเข้าสู่ระบบอัตโนมัติ</p>
              <p>• แอดมินอนุมัติ/ปฏิเสธ → ส่งแจ้งเตือนทาง LINE ทันที</p>
              <p>• พนักงานที่ได้รับอนุมัติ → สามารถเข้าใช้ Staff App ได้</p>
              <p>• ระบบ One-time Approval → อนุมัติเพียงครั้งเดียวต่อ LINE User ID</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StaffManagement