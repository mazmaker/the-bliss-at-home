import { useState } from 'react'
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
} from 'lucide-react'

const skills = [
  { id: 'all', name: 'ทั้งหมด', icon: Filter },
  { id: 'massage', name: 'นวด', icon: Sparkles },
  { id: 'nail', name: 'เล็บ', icon: Hand },
  { id: 'spa', name: 'สปา', icon: Flower2 },
]

const staffList = [
  {
    id: 'STF001',
    name: 'สมหญิง นวดเก่ง',
    phone: '081-234-5678',
    email: 'somying@email.com',
    skills: ['massage'],
    rating: 4.8,
    reviews: 156,
    experience: 5,
    status: 'active',
    completedJobs: 1250,
    earnings: 450000,
    joinDate: '2023-01-15',
  },
  {
    id: 'STF002',
    name: 'ดอกไม้ ทำเล็บเก่ง',
    phone: '082-345-6789',
    email: 'dokmai@email.com',
    skills: ['nail'],
    rating: 4.9,
    reviews: 203,
    experience: 3,
    status: 'active',
    completedJobs: 890,
    earnings: 320000,
    joinDate: '2023-06-20',
  },
  {
    id: 'STF003',
    name: 'แก้ว สปาชำนาญ',
    phone: '083-456-7890',
    email: 'kaew@email.com',
    skills: ['spa', 'massage'],
    rating: 4.7,
    reviews: 89,
    experience: 7,
    status: 'active',
    completedJobs: 670,
    earnings: 520000,
    joinDate: '2022-03-10',
  },
  {
    id: 'STF004',
    name: 'มานี มีตา',
    phone: '084-567-8901',
    email: 'manee@email.com',
    skills: ['nail', 'spa'],
    rating: 4.6,
    reviews: 67,
    experience: 2,
    status: 'inactive',
    completedJobs: 234,
    earnings: 89000,
    joinDate: '2024-01-05',
  },
  {
    id: 'STF005',
    name: 'ประยุทธ์ นวดแข็ง',
    phone: '085-678-9012',
    email: 'prayut@email.com',
    skills: ['massage'],
    rating: 4.5,
    reviews: 45,
    experience: 4,
    status: 'pending',
    completedJobs: 0,
    earnings: 0,
    joinDate: '2025-12-20',
  },
]

function Staff() {
  const [selectedSkill, setSelectedSkill] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all')

  const filteredStaff = staffList.filter((staff) => {
    const matchesSkill = selectedSkill === 'all' || staff.skills.includes(selectedSkill as any)
    const matchesSearch =
      searchQuery === '' ||
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || staff.status === statusFilter
    return matchesSkill && matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-stone-100 text-stone-600',
      pending: 'bg-yellow-100 text-yellow-700',
    }
    const labels = {
      active: 'ใช้งานอยู่',
      inactive: 'ไม่ใช้งาน',
      pending: 'รออนุมัติ',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">จัดการพนักงาน</h1>
          <p className="text-stone-500">Staff Management</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition">
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
                {staffList.filter((s) => s.status === 'active').length}
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
                {staffList.filter((s) => s.status === 'pending').length}
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
                {staffList.filter((s) => s.status === 'inactive').length}
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
              <p className="text-2xl font-bold text-stone-900">4.7</p>
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
              placeholder="ค้นหาชื่อ, อีเมล..."
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
            <option value="inactive">ไม่ใช้งาน</option>
            <option value="pending">รออนุมัติ</option>
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ประสบการณ์</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">เรตติ้ง</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">งานที่เสร็จ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">รายได้รวม</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">สถานะ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((staff) => (
                <tr key={staff.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-full flex items-center justify-center text-white font-semibold">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-stone-900">{staff.name}</p>
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {staff.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {staff.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-stone-600">{staff.experience} ปี</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-medium text-stone-700">{staff.rating}</span>
                      <span className="text-xs text-stone-400">({staff.reviews})</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-stone-900">{staff.completedJobs}</td>
                  <td className="py-3 px-4 text-sm font-medium text-amber-700">฿{staff.earnings.toLocaleString()}</td>
                  <td className="py-3 px-4">{getStatusBadge(staff.status)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-stone-100 rounded-lg transition" title="ดูรายละเอียด">
                        <Eye className="w-4 h-4 text-stone-600" />
                      </button>
                      {staff.status === 'pending' && (
                        <>
                          <button className="p-2 hover:bg-green-100 rounded-lg transition" title="อนุมัติ">
                            <Check className="w-4 h-4 text-green-600" />
                          </button>
                          <button className="p-2 hover:bg-red-100 rounded-lg transition" title="ปฏิเสธ">
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Staff
