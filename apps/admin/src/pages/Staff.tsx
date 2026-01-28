import { useState } from 'react'
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
} from 'lucide-react'
import { useStaff, useStaffStats, useUpdateStaffStatus } from '../hooks/useStaff'
import { Staff } from '../services/staffService'
import AddStaffModal from '../components/AddStaffModal'

const skills = [
  { id: 'all', name: 'ทั้งหมด', icon: Filter },
  { id: 'massage', name: 'นวด', icon: Sparkles },
  { id: 'nail', name: 'เล็บ', icon: Hand },
  { id: 'spa', name: 'สปา', icon: Flower2 },
]

function StaffPage() {
  const [selectedSkill, setSelectedSkill] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending' | 'suspended'>('all')
  const [showAddModal, setShowAddModal] = useState(false)

  // Real data from database
  const {
    data: staffData,
    isLoading: staffLoading,
    error: staffError,
    refetch: refetchStaff,
  } = useStaff({
    status: statusFilter,
    search: searchQuery,
  })

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

  // Filter staff by skills
  const filteredStaff = staffData?.filter((staff) => {
    const hasSkill = selectedSkill === 'all' || staff.skills?.some(skill =>
      skill.skill?.name_en?.toLowerCase() === selectedSkill ||
      skill.skill?.name_th?.includes(selectedSkill)
    )
    return hasSkill
  }) || []

  const getStatusBadge = (status: Staff['status']) => {
    const badges = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-stone-100 text-stone-600',
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    )
  }

  const formatSkillName = (skill: any) => {
    return skill.skill?.name_th || skill.skill?.name_en || 'Unknown'
  }

  // Loading state
  if (staffLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-amber-600" />
          <p className="text-stone-600">กำลังโหลดข้อมูลพนักงาน...</p>
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
          <h3 className="text-lg font-semibold text-stone-900 mb-2">เกิดข้อผิดพลาด</h3>
          <p className="text-stone-600 mb-4">ไม่สามารถโหลดข้อมูลพนักงานได้</p>
          <button
            onClick={() => refetchStaff()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
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
          <h1 className="text-2xl font-bold text-stone-900">จัดการพนักงาน</h1>
          <div className="flex items-center gap-2">
            <p className="text-stone-500">Staff Management</p>
            {import.meta.env.VITE_USE_MOCK_AUTH === 'true' && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                🧪 Mock Data Mode
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition"
        >
          <Plus className="w-5 h-5" />
          เพิ่มพนักงานใหม่
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">
                {statsData?.active || 0}
              </p>
              <p className="text-xs text-stone-500">พนักงานทำงาน</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">
                {statsData?.pending || 0}
              </p>
              <p className="text-xs text-stone-500">รออนุมัติ</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-100 rounded-lg">
              <UserX className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">
                {(statsData?.inactive || 0) + (statsData?.suspended || 0)}
              </p>
              <p className="text-xs text-stone-500">ไม่ใช้งาน</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">
                {statsData?.averageRating?.toFixed(1) || '0.0'}
              </p>
              <p className="text-xs text-stone-500">คะแนนเฉลี่ย</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-stone-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, โทรศัพท์..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
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
                      ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
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
            className="px-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="active">ใช้งานอยู่</option>
            <option value="pending">รออนุมัติ</option>
            <option value="inactive">ไม่ใช้งาน</option>
            <option value="suspended">ระงับการใช้งาน</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-stone-500">
        พบ {filteredStaff.length} พนักงาน
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-stone-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">พนักงาน</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ทักษะ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">เรตติ้ง</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">งานที่เสร็จ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">รายได้รวม</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">สถานะ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-500">
                    ไม่พบข้อมูลพนักงาน
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-full flex items-center justify-center text-white font-semibold">
                          {staff.name_th.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-stone-900">{staff.name_th}</p>
                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {staff.phone}
                            </span>
                            {staff.profile?.email && (
                              <span>• {staff.profile.email}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {staff.skills?.length ? (
                          staff.skills.map((skill) => (
                            <span
                              key={skill.id}
                              className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs"
                            >
                              {formatSkillName(skill)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-stone-400">ไม่ระบุ</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-medium text-stone-700">
                          {staff.rating.toFixed(1)}
                        </span>
                        <span className="text-xs text-stone-400">
                          ({staff.total_reviews})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-stone-900">
                      {staff.total_jobs}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-amber-700">
                      ฿{staff.total_earnings.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(staff.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 hover:bg-stone-100 rounded-lg transition"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4 text-stone-600" />
                        </button>

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
    </div>
  )
}

export default StaffPage