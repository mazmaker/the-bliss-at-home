import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Filter,
  Eye,
  Check,
  X,
  UserCheck,
  UserX,
  Star,
  Phone,
  Clock,
  Sparkles,
  Hand,
  Flower2,
  QrCode,
  MessageCircle,
  ExternalLink,
  Loader2,
  AlertCircle,
  Link2,
} from 'lucide-react'
import { useStaff, useStaffStats, useUpdateStaffStatus } from '../hooks/useStaff'
import { Staff } from '../services/staffService'
import AddStaffModal from '../components/AddStaffModal'
import InviteLinkModal from '../components/InviteLinkModal'
import SearchInput from '../components/SearchInput'

const skills = [
  { id: 'all', name: 'ทั้งหมด', icon: Filter },
  { id: 'massage', name: 'นวด', icon: Sparkles },
  { id: 'nail', name: 'เล็บ', icon: Hand },
  { id: 'spa', name: 'สปา', icon: Flower2 },
]

function StaffPage() {
  const navigate = useNavigate()
  const [selectedSkill, setSelectedSkill] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending' | 'suspended'>('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [inviteModalStaff, setInviteModalStaff] = useState<{ id: string; name: string } | null>(null)

  // Memoize filters to prevent unnecessary re-renders
  const filters = useMemo(() => ({
    status: statusFilter,
    search: searchQuery,
  }), [statusFilter, searchQuery])

  // Real data from database
  const {
    data: staffData,
    isLoading: staffLoading,
    error: staffError,
    refetch: refetchStaff,
    isFetching: staffFetching,
  } = useStaff(filters)

  const {
    data: statsData,
    isLoading: statsLoading,
  } = useStaffStats()

  const updateStatusMutation = useUpdateStaffStatus()

  // Handle status updates
  const handleStatusUpdate = async (id: string, status: Staff['status']) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status })
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  // Filter staff by skills (memoized to prevent unnecessary re-renders)
  const filteredStaff = useMemo(() => {
    // Map skill button IDs to skill name patterns
    const skillNameMap: Record<string, string[]> = {
      'massage': ['massage', 'นวด', 'Thai Massage'],
      'nail': ['nail', 'เล็บ', 'Nail Art'],
      'spa': ['spa', 'สปา', 'Spa Treatment']
    }

    return staffData?.filter((staff) => {
      // R7: availability filter (พร้อมรับงาน/หยุดรับงาน) — client-side; is_available===true is the
      // positive test so null coerces to "หยุดรับงาน" (matches getStaffStats + the dispatch gate).
      if (availabilityFilter === 'available' && staff.is_available !== true) return false
      if (availabilityFilter === 'unavailable' && staff.is_available === true) return false

      if (selectedSkill === 'all') return true

      return staff.skills?.some(skill => {
        const namePatterns = skillNameMap[selectedSkill] || []
        const skillNameTh = skill.skill?.name_th?.toLowerCase() || ''
        const skillNameEn = skill.skill?.name_en?.toLowerCase() || ''

        return namePatterns.some(pattern =>
          skillNameTh.includes(pattern.toLowerCase()) ||
          skillNameEn.includes(pattern.toLowerCase())
        )
      })
    }) || []
  }, [staffData, selectedSkill, availabilityFilter])

  const getStatusBadge = (status: Staff['status']) => {
    const badges = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-bliss-100 text-bliss-600',
      pending: 'bg-yellow-100 text-yellow-700',
      suspended: 'bg-red-100 text-red-700',
    }
    const labels = {
      active: 'ใช้งานอยู่',
      inactive: 'ไม่ใช้งาน',
      pending: 'รออนุมัติ',
      suspended: 'ระงับการใช้งาน',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badges[status]}`}>
        {labels[status]}
      </span>
    )
  }

  // Initial loading state (only show spinner if there's no data yet)
  if ((staffLoading && !staffData) || (statsLoading && !statsData)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-bliss-600" />
          <p className="text-bliss-600">กำลังโหลดข้อมูลพนักงาน...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (staffError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-bliss-900 mb-2">เกิดข้อผิดพลาด</h3>
          <p className="text-bliss-600 mb-4">ไม่สามารถโหลดข้อมูลพนักงานได้</p>
          <button
            onClick={() => refetchStaff()}
            className="px-4 py-2 bg-bliss-600 text-white rounded-lg hover:bg-bliss-700 transition"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-bliss-900">จัดการพนักงาน</h1>
          <div className="flex items-center gap-2">
            <p className="text-bliss-500">Staff Management</p>
            {import.meta.env.VITE_USE_MOCK_AUTH === 'true' && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                🧪 Mock Data Mode
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-bliss-700 to-bliss-800 text-white rounded-xl font-medium hover:from-bliss-800 hover:to-bliss-900 transition"
        >
          <Plus className="w-5 h-5" />
          เพิ่มพนักงานใหม่
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border border-bliss-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-gradient-to-br from-bliss-500 to-bliss-600 rounded-xl animate-pulse flex-shrink-0">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-bliss-700">พร้อมรับงาน</p>
                <span className="inline-block mt-1.5 px-2.5 py-1 rounded-lg bg-bliss-100 text-bliss-700 text-xs font-bold border border-bliss-300">
                  พนักงานทำงาน: {statsData?.active ?? 0} คน
                </span>
              </div>
            </div>
            <p className="text-3xl font-bold text-bliss-900 flex-shrink-0">{statsData?.available ?? 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-bliss-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-gradient-to-br from-bliss-500 to-bliss-600 rounded-xl flex-shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-medium text-bliss-700">รออนุมัติ</p>
            </div>
            <p className="text-3xl font-bold text-bliss-900 flex-shrink-0">{statsData?.pending || 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-bliss-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-gradient-to-br from-bliss-500 to-bliss-600 rounded-xl flex-shrink-0">
                <UserX className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-medium text-bliss-700">ไม่ใช้งาน</p>
            </div>
            <p className="text-3xl font-bold text-bliss-900 flex-shrink-0">{(statsData?.inactive || 0) + (statsData?.suspended || 0)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-bliss-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-gradient-to-br from-bliss-500 to-bliss-600 rounded-xl flex-shrink-0">
                <Star className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-medium text-bliss-700">คะแนนเฉลี่ย</p>
            </div>
            <p className="text-3xl font-bold text-bliss-900 flex-shrink-0">{statsData?.averageRating ? statsData.averageRating.toFixed(1) : '–'}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-bliss-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <SearchInput
            onDebouncedChange={setSearchQuery}
            placeholder="ค้นหาชื่อ, โทรศัพท์..."
          />

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
            <option value="active">ใช้งานอยู่</option>
            <option value="pending">รออนุมัติ</option>
            <option value="inactive">ไม่ใช้งาน</option>
            <option value="suspended">ระงับการใช้งาน</option>
          </select>

          {/* R7: availability filter (การรับงาน) */}
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value as any)}
            className="px-4 py-2 bg-bliss-100 border-0 rounded-xl focus:ring-2 focus:ring-bliss-500"
          >
            <option value="all">การรับงานทั้งหมด</option>
            <option value="available">พร้อมรับงาน</option>
            <option value="unavailable">หยุดรับงาน</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-bliss-500">
        พบ {filteredStaff.length} พนักงาน
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-bliss-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-bliss-50 border-b border-bliss-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-bliss-700 whitespace-nowrap">พนักงาน</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bliss-700 whitespace-nowrap">เพศ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bliss-700 whitespace-nowrap">การรับงาน</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bliss-700 whitespace-nowrap">เรตติ้ง</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bliss-700 whitespace-nowrap">งานที่เสร็จ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bliss-700 whitespace-nowrap">รายได้รวม</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bliss-700 whitespace-nowrap">สถานะ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-bliss-700 whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-bliss-500">
                    ไม่พบข้อมูลพนักงาน
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="border-b border-bliss-100 hover:bg-bliss-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-bliss-700 to-bliss-800 rounded-full flex items-center justify-center text-white font-semibold">
                          {staff.name_th.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-bliss-900">{staff.name_th}</p>
                          <div className="flex items-center gap-2 text-xs text-bliss-500">
                            <span className="flex items-center gap-1 whitespace-nowrap">
                              <Phone className="w-3 h-3" />
                              {staff.phone}
                            </span>
                            {staff.profile?.email && (
                              <span className="max-w-[180px] truncate">• {staff.profile.email}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {staff.gender === 'female' ? (
                        <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium whitespace-nowrap">หญิง</span>
                      ) : staff.gender === 'male' ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium whitespace-nowrap">ชาย</span>
                      ) : (
                        <span className="text-xs text-bliss-400 whitespace-nowrap">ไม่ระบุ</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {/* R7: การรับงาน (availability) badge from staff.is_available; null -> หยุดรับงาน */}
                      {staff.is_available === true ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                          พร้อมรับงาน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-bliss-100 text-bliss-600 rounded-full text-xs font-medium whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-bliss-400 flex-shrink-0" />
                          หยุดรับงาน
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {staff.total_reviews > 0 ? (
                          <>
                            <Star className="w-4 h-4 text-bliss-500 fill-bliss-500" />
                            <span className="text-sm font-medium text-bliss-700">
                              {staff.rating.toFixed(1)}
                            </span>
                            <span className="text-xs text-bliss-400">
                              ({staff.total_reviews})
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-bliss-400">ยังไม่มีรีวิว</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-bliss-900 whitespace-nowrap">
                      {staff.total_jobs}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-bliss-700 whitespace-nowrap">
                      ฿{staff.total_earnings.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(staff.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/staff/${staff.id}`)}
                          className="p-2 hover:bg-bliss-100 rounded-lg transition"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4 text-bliss-600" />
                        </button>

                        {/* Show invite link button for staff not yet registered */}
                        {!staff.profile_id && (
                          <button
                            onClick={() => setInviteModalStaff({ id: staff.id, name: staff.name_th })}
                            className="p-2 hover:bg-bliss-100 rounded-lg transition"
                            title="ดูลิงก์คำเชิญ"
                          >
                            <Link2 className="w-4 h-4 text-bliss-600" />
                          </button>
                        )}

                        {staff.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(staff.id, 'active')}
                              disabled={updateStatusMutation.isPending}
                              className="p-2 hover:bg-green-100 rounded-lg transition"
                              title="อนุมัติ"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(staff.id, 'inactive')}
                              disabled={updateStatusMutation.isPending}
                              className="p-2 hover:bg-red-100 rounded-lg transition"
                              title="ปฏิเสธ"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        )}

                        {staff.status === 'active' && (
                          <button
                            onClick={() => handleStatusUpdate(staff.id, 'inactive')}
                            disabled={updateStatusMutation.isPending}
                            className="p-2 hover:bg-red-100 rounded-lg transition"
                            title="ระงับการใช้งาน"
                          >
                            <UserX className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Invite Link Modal */}
      {inviteModalStaff && (
        <InviteLinkModal
          isOpen={!!inviteModalStaff}
          onClose={() => setInviteModalStaff(null)}
          staffId={inviteModalStaff.id}
          staffName={inviteModalStaff.name}
        />
      )}
    </div>
  )
}

export default StaffPage