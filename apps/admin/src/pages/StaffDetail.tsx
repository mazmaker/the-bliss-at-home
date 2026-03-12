import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  TrendingUp,
  FileText,
  Clock,
  DollarSign,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  Eye,
  UserCheck,
  UserX,
  Ban,
  Loader2,
  Award,
  Briefcase,
  Users,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Plus,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { type BankAccount, THAI_BANKS } from '@bliss/supabase'
import { supabase } from '../lib/supabase'
import { useStaffDetail } from '../hooks/useStaff'
import { Staff } from '../services/staffService'
import {
  useStaffDocuments,
  useDocumentStats,
  useUpdateDocumentStatus,
  useDeleteDocument,
  useDownloadDocument,
} from '../hooks/useStaffDocuments'
import {
  useStaffEarningsSummary,
  useStaffPayouts,
} from '../hooks/useStaffEarnings'
import {
  useStaffJobs,
  useStaffJobsStats,
} from '../hooks/useStaffJobs'
import {
  useStaffPerformanceMetrics,
  useCurrentMonthPerformance,
  usePlatformAverages,
  calculateTrend,
  formatMonthThai,
  generateRecommendations,
} from '../hooks/useStaffPerformance'
import { DocumentViewerModal } from '../components/DocumentViewerModal'
import { UploadDocumentModal } from '../components/UploadDocumentModal'
import { PayoutDetailModal } from '../components/PayoutDetailModal'
import { ProcessPayoutModal } from '../components/ProcessPayoutModal'
import { CreatePayoutModal } from '../components/CreatePayoutModal'
import { PayoutCalculationModal } from '../components/PayoutCalculationModal'
import { EditBankModal } from '../components/EditBankModal'
import { StatusManagementModal } from '../components/StatusManagementModal'
import { JobDetailModal } from '../components/JobDetailModal'
import EditStaffModal from '../components/EditStaffModal'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { ReviewsTabContent } from '../components/ReviewsTabContent'

type TabType = 'overview' | 'documents' | 'schedule' | 'performance' | 'reviews' | 'earnings'

function StaffDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const adminAuth = useAdminAuth()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const {
    data: staff,
    isLoading,
    error,
  } = useStaffDetail(id!)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-amber-600" />
          <p className="text-stone-600">กำลังโหลดข้อมูลพนักงาน...</p>
        </div>
      </div>
    )
  }

  if (error || !staff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-900 mb-2">ไม่พบข้อมูลพนักงาน</h3>
          <button
            onClick={() => navigate('/admin/staff')}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
          >
            กลับหน้ารายการ
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'ภาพรวม', icon: Users },
    { id: 'documents', label: 'เอกสาร KYC', icon: FileText },
    { id: 'schedule', label: 'ตารางงาน', icon: Calendar },
    { id: 'performance', label: 'ประสิทธิภาพ', icon: TrendingUp },
    { id: 'reviews', label: 'รีวิว', icon: MessageSquare },
    { id: 'earnings', label: 'รายได้', icon: DollarSign },
  ]

  const getStatusBadge = (status: Staff['status']) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'ใช้งานอยู่', icon: CheckCircle },
      inactive: { bg: 'bg-stone-100', text: 'text-stone-600', label: 'ไม่ใช้งาน', icon: XCircle },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'รออนุมัติ', icon: Clock },
      suspended: { bg: 'bg-red-100', text: 'text-red-700', label: 'ระงับการใช้งาน', icon: Ban },
    }
    const badge = badges[status]
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/staff')}
          className="p-2 hover:bg-stone-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">รายละเอียดพนักงาน</h1>
          <p className="text-stone-500">Staff Profile & Management</p>
        </div>
      </div>

      {/* Staff Header Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-amber-700 to-amber-800" />
        <div className="px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 -mt-16">
            <div className="flex items-end gap-4">
              <div className="w-32 h-32 bg-white rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-4xl font-bold text-amber-700">
                {staff.name_th.charAt(0)}
              </div>
              <div className="pb-2 pt-16">
                <h2 className="text-2xl font-bold text-stone-900">{staff.name_th}</h2>
                <p className="text-stone-500">{staff.name_en}</p>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge(staff.status)}
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium text-stone-700">
                      {staff.rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-stone-400">
                      ({staff.total_reviews} รีวิว)
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                แก้ไขข้อมูล
              </button>
              <button
                onClick={() => setShowStatusModal(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                จัดการสถานะ
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{staff.total_jobs}</p>
                  <p className="text-xs text-stone-500">งานทั้งหมด</p>
                </div>
              </div>
            </div>
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{staff.completed_jobs || 0}</p>
                  <p className="text-xs text-stone-500">งานสำเร็จ</p>
                </div>
              </div>
            </div>
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">
                    ฿{staff.total_earnings.toLocaleString()}
                  </p>
                  <p className="text-xs text-stone-500">รายได้รวม</p>
                </div>
              </div>
            </div>
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">
                    {((staff.completed_jobs || 0) / (staff.total_jobs || 1) * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-stone-500">อัตราความสำเร็จ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100">
        <div className="border-b border-stone-200 px-6">
          <div className="flex gap-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-amber-600 text-amber-600'
                      : 'border-transparent text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab staff={staff} />}
          {activeTab === 'documents' && <DocumentsTab staff={staff} />}
          {activeTab === 'schedule' && <ScheduleTab staff={staff} />}
          {activeTab === 'performance' && <PerformanceTab staff={staff} />}
          {activeTab === 'reviews' && <ReviewsTab staff={staff} />}
          {activeTab === 'earnings' && <EarningsTab staff={staff} />}
        </div>
      </div>

      {/* Status Management Modal */}
      {showStatusModal && (
        <StatusManagementModal
          staff={staff}
          onClose={() => setShowStatusModal(false)}
        />
      )}

      {/* Edit Staff Modal */}
      {showEditModal && (
        <EditStaffModal
          staff={staff}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ staff }: { staff: Staff }) {
  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <div>
        <h3 className="text-lg font-semibold text-stone-900 mb-4">ข้อมูลติดต่อ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-stone-400 mt-1" />
            <div>
              <p className="text-sm text-stone-500">เบอร์โทรศัพท์</p>
              <p className="font-medium text-stone-900">{staff.phone}</p>
            </div>
          </div>
          {staff.profile?.email && (
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-stone-400 mt-1" />
              <div>
                <p className="text-sm text-stone-500">อีเมล</p>
                <p className="font-medium text-stone-900">{staff.profile.email}</p>
              </div>
            </div>
          )}
          {staff.address && (
            <div className="flex items-start gap-3 md:col-span-2">
              <MapPin className="w-5 h-5 text-stone-400 mt-1" />
              <div>
                <p className="text-sm text-stone-500">ที่อยู่</p>
                <p className="font-medium text-stone-900">{staff.address}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-stone-400 mt-1" />
            <div>
              <p className="text-sm text-stone-500">วันที่เริ่มงาน</p>
              <p className="font-medium text-stone-900">
                {new Date(staff.created_at).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div>
        <h3 className="text-lg font-semibold text-stone-900 mb-4">ทักษะและบริการ</h3>
        <div className="flex flex-wrap gap-2">
          {staff.skills?.length ? (
            staff.skills.map((skill) => (
              <span
                key={skill.id}
                className="px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium"
              >
                {skill.skill?.name_th || skill.skill?.name_en}
              </span>
            ))
          ) : (
            <p className="text-stone-500">ไม่มีข้อมูลทักษะ</p>
          )}
        </div>
      </div>

      {/* Bio */}
      <div>
        <h3 className="text-lg font-semibold text-stone-900 mb-4">ข้อมูลเพิ่มเติม</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-stone-400 mt-1" />
            <div>
              <p className="text-sm text-stone-500">ข้อมูลเพิ่มเติม (ภาษาไทย)</p>
              <p className="font-medium text-stone-900 leading-relaxed">
                {staff.bio_th || <span className="text-stone-400">ไม่ระบุ</span>}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-stone-400 mt-1" />
            <div>
              <p className="text-sm text-stone-500">ข้อมูลเพิ่มเติม (ภาษาอังกฤษ)</p>
              <p className="font-medium text-stone-900 leading-relaxed">
                {staff.bio_en || <span className="text-stone-400">ไม่ระบุ</span>}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Documents Tab Component
function DocumentsTab({ staff }: { staff: Staff }) {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<any>(null)
  const [showViewerModal, setShowViewerModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)

  // Get admin auth
  const adminAuth = useAdminAuth()
  console.log('🟢 DocumentsTab - adminAuth:', adminAuth)
  console.log('🟢 DocumentsTab - adminAuth.user?.id:', adminAuth?.user?.id)

  // Fetch real documents
  const { data: documents, isLoading, error } = useStaffDocuments(staff.id)
  const { data: stats } = useDocumentStats(staff.id)
  const updateStatusMutation = useUpdateDocumentStatus()
  const deleteMutation = useDeleteDocument()
  const downloadMutation = useDownloadDocument()

  const handleViewDocument = (doc: any) => {
    setSelectedDocument(doc)
    setShowViewerModal(true)
  }

  const handleDownload = (doc: any) => {
    downloadMutation.mutate({
      documentId: doc.id,
      fileName: doc.file_name,
    })
  }

  const handleApprove = async (documentId: string) => {
    console.log('🔵 handleApprove called!')
    console.log('🔵 documentId:', documentId)
    console.log('🔵 adminAuth:', adminAuth)
    console.log('🔵 adminAuth.user?.id:', adminAuth.user?.id)

    const adminId = adminAuth.user?.id
    if (!adminId) {
      console.error('❌ No admin ID available')
      return
    }

    await updateStatusMutation.mutateAsync({
      documentId,
      updates: { verification_status: 'verified' },
      adminId,
    })
  }

  const handleReject = (doc: any) => {
    setSelectedDocument(doc)
    setShowRejectModal(true)
  }

  const handleDelete = async (doc: any) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบเอกสารนี้?')) {
      await deleteMutation.mutateAsync({
        documentId: doc.id,
        staffId: staff.id,
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'รอตรวจสอบ', icon: Clock },
      reviewing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'กำลังตรวจสอบ', icon: Clock },
      verified: { bg: 'bg-green-100', text: 'text-green-700', label: 'ยืนยันแล้ว', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'ถูกปฏิเสธ', icon: XCircle },
    }
    const badge = badges[status as keyof typeof badges] || badges.pending
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      id_card: 'สำเนาบัตรประชาชน',
      license: 'ใบประกอบวิชาชีพ',
      certificate: 'ใบรับรองการอบรม',
      bank_statement: 'สำเนาบัญชีธนาคาร',
      other: 'เอกสารอื่นๆ',
    }
    return labels[type] || type
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-amber-600" />
        <p className="text-stone-600">กำลังโหลดเอกสาร...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-stone-600">เกิดข้อผิดพลาดในการโหลดเอกสาร</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-stone-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
            <p className="text-xs text-stone-500">เอกสารทั้งหมด</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
            <p className="text-xs text-yellow-600">รอตรวจสอบ</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-blue-900">{stats.reviewing}</p>
            <p className="text-xs text-blue-600">กำลังตรวจสอบ</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-green-900">{stats.verified}</p>
            <p className="text-xs text-green-600">ยืนยันแล้ว</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
            <p className="text-xs text-red-600">ถูกปฏิเสธ</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-stone-900">เอกสาร KYC</h3>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          เพิ่มเอกสาร
        </button>
      </div>

      {/* Documents Grid */}
      {documents && documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="border border-stone-200 rounded-xl p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-stone-900">{getDocumentTypeLabel(doc.document_type)}</p>
                    <p className="text-xs text-stone-500">{doc.file_name}</p>
                    <p className="text-xs text-stone-400 mt-1">
                      {new Date(doc.uploaded_at).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                {getStatusBadge(doc.verification_status)}
              </div>

              {/* Rejection Reason */}
              {doc.verification_status === 'rejected' && doc.rejection_reason && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700">
                    <strong>เหตุผล:</strong> {doc.rejection_reason}
                  </p>
                </div>
              )}

              {/* Notes */}
              {doc.notes && (
                <div className="mb-3 p-2 bg-stone-50 rounded-lg">
                  <p className="text-xs text-stone-600">
                    <strong>หมายเหตุ:</strong> {doc.notes}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewDocument(doc)}
                  className="flex-1 px-3 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition text-sm flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  ดู
                </button>
                <button
                  onClick={() => handleDownload(doc)}
                  disabled={downloadMutation.isPending}
                  className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  ดาวน์โหลด
                </button>
                {doc.verification_status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        console.log('🚀 BUTTON CLICKED! Document ID:', doc.id)
                        handleApprove(doc.id)
                      }}
                      disabled={updateStatusMutation.isPending}
                      className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm disabled:opacity-50"
                      title="อนุมัติ"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReject(doc)}
                      disabled={updateStatusMutation.isPending}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm disabled:opacity-50"
                      title="ปฏิเสธ"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
                {doc.verification_status !== 'verified' && (
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm disabled:opacity-50"
                    title="ลบ"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-stone-50 rounded-xl">
          <FileText className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500">ยังไม่มีเอกสาร</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm"
          >
            เพิ่มเอกสารแรก
          </button>
        </div>
      )}

      {/* Modals */}
      <UploadDocumentModal
        staffId={staff.id}
        staffName={staff.name_th}
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />

      <DocumentViewerModal
        document={selectedDocument}
        isOpen={showViewerModal}
        onClose={() => {
          setShowViewerModal(false)
          setSelectedDocument(null)
        }}
      />

      {/* Reject Modal */}
      {showRejectModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-stone-900 mb-4">
              ระบุเหตุผลในการปฏิเสธ
            </h3>
            <textarea
              placeholder="กรุณาระบุเหตุผลที่ชัดเจน..."
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setSelectedDocument(null)
                }}
                className="flex-1 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  await updateStatusMutation.mutateAsync({
                    documentId: selectedDocument.id,
                    updates: {
                      verification_status: 'rejected',
                      rejection_reason: 'เอกสารไม่ชัดเจน', // TODO: Get from textarea
                    },
                    adminId: adminAuth.user?.id,
                  })
                  setShowRejectModal(false)
                  setSelectedDocument(null)
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                ยืนยันปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Schedule Tab Component
function ScheduleTab({ staff }: { staff: Staff }) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week')
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [showJobModal, setShowJobModal] = useState(false)

  // Calculate date range based on selected period
  const getDateRange = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (selectedPeriod) {
      case 'today':
        return {
          dateFrom: today.toISOString().split('T')[0],
          dateTo: today.toISOString().split('T')[0],
        }
      case 'week': {
        const weekAgo = new Date(today)
        weekAgo.setDate(today.getDate() - 7)
        return {
          dateFrom: weekAgo.toISOString().split('T')[0],
          dateTo: undefined,
        }
      }
      case 'month': {
        const monthAgo = new Date(today)
        monthAgo.setMonth(today.getMonth() - 1)
        return {
          dateFrom: monthAgo.toISOString().split('T')[0],
          dateTo: undefined,
        }
      }
      default:
        return {}
    }
  }

  const dateRange = getDateRange()

  const { data: jobs, isLoading } = useStaffJobs(staff.id, {
    status: selectedStatus,
    ...dateRange,
  })

  const { data: stats } = useStaffJobsStats(staff.id)

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string; icon: any }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'รอยืนยัน', icon: Clock },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'ยืนยันแล้ว', icon: CheckCircle },
      in_progress: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'กำลังดำเนินการ', icon: Clock },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'เสร็จสิ้น', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'ยกเลิก', icon: XCircle },
    }
    const badge = badges[status] || badges.pending
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        <span className="ml-2 text-stone-500">กำลังโหลดข้อมูล...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-stone-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
            <p className="text-xs text-stone-500">ทั้งหมด</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
            <p className="text-xs text-yellow-600">รอยืนยัน</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-blue-900">{stats.confirmed}</p>
            <p className="text-xs text-blue-600">ยืนยันแล้ว</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-purple-900">{stats.in_progress}</p>
            <p className="text-xs text-purple-600">กำลังดำเนินการ</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
            <p className="text-xs text-green-600">เสร็จสิ้น</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-red-900">{stats.cancelled}</p>
            <p className="text-xs text-red-600">ยกเลิก</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="text-sm font-medium text-stone-700 mr-2">ช่วงเวลา:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="today">วันนี้</option>
            <option value="week">7 วันที่ผ่านมา</option>
            <option value="month">30 วันที่ผ่านมา</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-stone-700 mr-2">สถานะ:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">ทั้งหมด</option>
            <option value="pending">รอยืนยัน</option>
            <option value="confirmed">ยืนยันแล้ว</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {jobs && jobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">วันที่</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">เวลา</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">บริการ</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ลูกค้า</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">สถานที่</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ราคา</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">รายได้พนักงาน</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => {
                      setSelectedJob(job)
                      setShowJobModal(true)
                    }}
                    className="border-b border-stone-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-stone-900">
                      {new Date(job.scheduled_date).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-sm text-stone-900">{job.scheduled_time}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-stone-900">{job.service_name}</p>
                        {job.notes && (
                          <p className="text-xs text-stone-500 mt-1">{job.notes}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-stone-900">{job.customer_name}</td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-stone-600 max-w-xs truncate">{job.address}</p>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-amber-700">
                      ฿{job.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-purple-700">
                      ฿{Number(job.staff_earnings).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(job.status)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-stone-50 border-t-2 border-stone-300">
                  <td colSpan={5} className="py-3 px-4 text-sm font-bold text-stone-900 text-right">รวม</td>
                  <td className="py-3 px-4 text-sm font-bold text-amber-700">
                    ฿{jobs.reduce((sum, j) => sum + Number(j.amount), 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm font-bold text-purple-700">
                    ฿{jobs.reduce((sum, j) => sum + Number(j.staff_earnings), 0).toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500">ไม่พบงานในช่วงเวลาที่เลือก</p>
            <p className="text-sm text-stone-400 mt-2">ลองเปลี่ยนตัวกรองเพื่อดูงานอื่นๆ</p>
          </div>
        )}
      </div>

      {/* Job Detail Modal */}
      {showJobModal && selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => {
            setShowJobModal(false)
            setSelectedJob(null)
          }}
        />
      )}
    </div>
  )
}

// Performance Tab Component
function PerformanceTab({ staff }: { staff: Staff }) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  // Map period to number of months
  const getMonthsFromPeriod = (period: 'week' | 'month' | 'quarter' | 'year') => {
    switch (period) {
      case 'week':
        return 2 // Show 2 months
      case 'month':
        return 6 // Show 6 months (default)
      case 'quarter':
        return 3 // Show 3 months
      case 'year':
        return 12 // Show 12 months
      default:
        return 6
    }
  }

  const months = getMonthsFromPeriod(selectedPeriod)

  // Fetch real performance data
  const { data: performanceHistory = [], isLoading: historyLoading } = useStaffPerformanceMetrics(staff.id, months)
  const { data: currentMetrics, isLoading: currentLoading } = useCurrentMonthPerformance(staff.id)
  const { data: platformAverage } = usePlatformAverages()

  // Show loading state
  if (historyLoading || currentLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    )
  }

  // Use current metrics or fallback to latest history
  const current = currentMetrics || performanceHistory[performanceHistory.length - 1]

  // Extract current values
  const completionRate = current?.completion_rate?.toFixed(1) || '0.0'
  const responseRate = current?.response_rate || 0
  const cancelRate = current?.cancel_rate || 0
  const customerSatisfaction = current?.avg_rating || 0
  const performanceScore = current?.performance_score || 0

  // Calculate trends (compare with previous month)
  const previous = performanceHistory.length >= 2 ? performanceHistory[performanceHistory.length - 2] : null
  const completionTrend = previous ? calculateTrend(parseFloat(completionRate), previous.completion_rate) : { direction: 'stable' as const, value: '0.0', color: 'text-stone-500' }
  const responseTrend = previous ? calculateTrend(responseRate, previous.response_rate) : { direction: 'stable' as const, value: '0.0', color: 'text-stone-500' }
  const cancelTrend = previous ? calculateTrend(cancelRate, previous.cancel_rate) : { direction: 'stable' as const, value: '0.0', color: 'text-stone-500' }

  // Safe platform average with fallback
  const platformAverageData = platformAverage || {
    avg_completion_rate: 88.5,
    avg_response_rate: 89.2,
    avg_cancel_rate: 5.8,
    avg_rating: 4.3,
  }

  // Generate recommendations
  const recommendations = generateRecommendations(current || null, performanceHistory, platformAverageData)

  return (
    <div className="space-y-6">
      {/* Overall Performance Score */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-stone-900 mb-1">Performance Score</h3>
            <p className="text-sm text-stone-600">คะแนนประสิทธิภาพรวม</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold text-purple-600">{performanceScore}</div>
            <div className="text-sm text-stone-500 mt-1">/ 100</div>
          </div>
        </div>
        <div className="mt-4 h-3 bg-purple-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
            style={{ width: `${performanceScore}%` }}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completion Rate */}
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <ThumbsUp className="w-8 h-8 text-green-600" />
            <span className={`text-xs font-medium ${completionTrend.color}`}>
              {completionTrend.direction === 'up' ? '↑' : completionTrend.direction === 'down' ? '↓' : '−'} {completionTrend.value}%
            </span>
          </div>
          <div className="text-3xl font-bold text-stone-900 mb-1">{completionRate}%</div>
          <p className="text-sm font-medium text-stone-700">Job Completion</p>
          <p className="text-xs text-stone-500 mt-1">อัตราความสำเร็จในการทำงาน</p>
          <div className="mt-3 pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500">Platform Avg.</span>
              <span className="font-medium text-stone-700">{platformAverageData.avg_completion_rate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Response Rate */}
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-8 h-8 text-blue-600" />
            <span className={`text-xs font-medium ${responseTrend.color}`}>
              {responseTrend.direction === 'up' ? '↑' : responseTrend.direction === 'down' ? '↓' : '−'} {responseTrend.value}%
            </span>
          </div>
          <div className="text-3xl font-bold text-stone-900 mb-1">{responseRate}%</div>
          <p className="text-sm font-medium text-stone-700">Response Rate</p>
          <p className="text-xs text-stone-500 mt-1">อัตราการตอบรับงาน</p>
          <div className="mt-3 pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500">Platform Avg.</span>
              <span className="font-medium text-stone-700">{platformAverageData.avg_response_rate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Cancel Rate */}
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <ThumbsDown className="w-8 h-8 text-red-600" />
            <span className={`text-xs font-medium ${cancelTrend.direction === 'down' ? 'text-green-600' : 'text-red-600'}`}>
              {cancelTrend.direction === 'up' ? '↑' : cancelTrend.direction === 'down' ? '↓' : '−'} {cancelTrend.value}%
            </span>
          </div>
          <div className="text-3xl font-bold text-stone-900 mb-1">{cancelRate}%</div>
          <p className="text-sm font-medium text-stone-700">Cancel Rate</p>
          <p className="text-xs text-stone-500 mt-1">อัตราการยกเลิกงาน</p>
          <div className="mt-3 pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500">Platform Avg.</span>
              <span className="font-medium text-stone-700">{platformAverageData.avg_cancel_rate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Customer Satisfaction */}
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
            <span className="text-xs font-medium text-green-600">
              ↑ 0.1
            </span>
          </div>
          <div className="text-3xl font-bold text-stone-900 mb-1">{customerSatisfaction}</div>
          <p className="text-sm font-medium text-stone-700">Satisfaction</p>
          <p className="text-xs text-stone-500 mt-1">ความพึงพอใจของลูกค้า</p>
          <div className="mt-3 pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500">Platform Avg.</span>
              <span className="font-medium text-stone-700">{platformAverageData.avg_rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance History Chart */}
      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-stone-900">Performance Trend</h3>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 bg-stone-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
          >
            <option value="week">2 เดือนล่าสุด</option>
            <option value="month">6 เดือนที่ผ่านมา</option>
            <option value="quarter">3 เดือนที่ผ่านมา</option>
            <option value="year">12 เดือนที่ผ่านมา</option>
          </select>
        </div>

        {/* Simple Chart Visualization */}
        <div className="space-y-4">
          {performanceHistory.length > 0 ? (
            performanceHistory.map((data, index) => (
              <div key={data.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-stone-700 w-16">{formatMonthThai(data.year, data.month)}</span>
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <div className="text-xs text-stone-500 mb-1">Complete</div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${data.completion_rate}%` }}
                        />
                      </div>
                      <div className="text-xs font-medium text-stone-700 mt-1">{data.completion_rate.toFixed(1)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-stone-500 mb-1">Response</div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${data.response_rate}%` }}
                        />
                      </div>
                      <div className="text-xs font-medium text-stone-700 mt-1">{data.response_rate.toFixed(1)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-stone-500 mb-1">Cancel</div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${Math.min(data.cancel_rate * 10, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs font-medium text-stone-700 mt-1">{data.cancel_rate.toFixed(1)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-stone-500 mb-1">Rating</div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${(data.avg_rating / 5) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs font-medium text-stone-700 mt-1">{data.avg_rating.toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-stone-500">
              ยังไม่มีข้อมูลประสิทธิภาพย้อนหลัง
            </div>
          )}
        </div>
      </div>

      {/* Performance Comparison */}
      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">เปรียบเทียบกับ Platform Average</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-stone-600">Job Completion Rate</span>
              <span className="text-sm font-medium text-stone-900">
                {(parseFloat(completionRate) - (platformAverage?.avg_completion_rate || 88.5)).toFixed(1)}% {parseFloat(completionRate) > (platformAverage?.avg_completion_rate || 88.5) ? 'สูงกว่า' : 'ต่ำกว่า'}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${platformAverage?.avg_completion_rate || 88.5}%` }}
                />
              </div>
              <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-stone-500 mt-1">
              <span>Avg: {(platformAverage?.avg_completion_rate || 88.5).toFixed(1)}%</span>
              <span>You: {completionRate}%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-stone-600">Response Rate</span>
              <span className="text-sm font-medium text-stone-900">
                {(responseRate - (platformAverage?.avg_response_rate || 89.2)).toFixed(1)}% {responseRate > (platformAverage?.avg_response_rate || 89.2) ? 'สูงกว่า' : 'ต่ำกว่า'}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${platformAverage?.avg_response_rate || 89.2}%` }}
                />
              </div>
              <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${responseRate}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-stone-500 mt-1">
              <span>Avg: {(platformAverage?.avg_response_rate || 89.2).toFixed(1)}%</span>
              <span>You: {responseRate.toFixed(1)}%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-stone-600">Cancel Rate</span>
              <span className="text-sm font-medium text-green-600">
                {((platformAverage?.avg_cancel_rate || 5.8) - cancelRate).toFixed(1)}% ดีกว่า
              </span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${(platformAverage?.avg_cancel_rate || 5.8) * 10}%` }}
                />
              </div>
              <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-400"
                  style={{ width: `${cancelRate * 10}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-stone-500 mt-1">
              <span>Avg: {(platformAverage?.avg_cancel_rate || 5.8).toFixed(1)}%</span>
              <span>You: {cancelRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-stone-900 mb-2">Performance Insights</h3>
            <ul className="space-y-2 text-sm text-stone-600">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  {recommendation.startsWith('✅') || recommendation.startsWith('🏆') ? (
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : recommendation.startsWith('🔴') || recommendation.startsWith('📉') ? (
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  )}
                  <span>{recommendation.replace(/^[✅🏆🔴📉⚡⚠️⭐💪]\s*/, '')}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// Reviews Tab Component
function ReviewsTab({ staff }: { staff: Staff }) {
  return <ReviewsTabContent staff={staff} />
}

// Earnings Tab Component
function EarningsTab({ staff }: { staff: Staff }) {
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [showBankModal, setShowBankModal] = useState(false)
  const [showPayoutDetailModal, setShowPayoutDetailModal] = useState(false)
  const [showCalculationModal, setShowCalculationModal] = useState(false)
  const [showCreatePayoutModal, setShowCreatePayoutModal] = useState(false)
  const [showDeleteBankConfirm, setShowDeleteBankConfirm] = useState(false)
  const [showAddBankModal, setShowAddBankModal] = useState(false)
  const [newBankForm, setNewBankForm] = useState({ bank_code: '', account_number: '', account_name: '' })
  const [isAddingBank, setIsAddingBank] = useState(false)
  const [selectedPayout, setSelectedPayout] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month')

  // Fetch real earnings data from API
  const { data: earningsSummary, isLoading: isLoadingSummary } = useStaffEarningsSummary(staff.id)
  const { data: payouts, isLoading: isLoadingPayouts } = useStaffPayouts(staff.id)

  // Download report as CSV
  const handleDownloadReport = () => {
    if (!payoutHistory || payoutHistory.length === 0) {
      toast.error('ไม่มีข้อมูลให้ดาวน์โหลด')
      return
    }

    // Create CSV content
    const headers = ['วันที่', 'ช่วงเวลา', 'จำนวนงาน', 'จำนวนเงิน (฿)', 'สถานะ', 'วันที่จ่าย', 'วิธีการจ่าย']
    const statusMap: Record<string, string> = {
      paid: 'จ่ายแล้ว',
      pending: 'รอดำเนินการ',
      processing: 'กำลังดำเนินการ',
      failed: 'ล้มเหลว'
    }

    const rows = payoutHistory.map(payout => [
      new Date(payout.date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      payout.period,
      `${payout.jobs_count} งาน`,
      payout.amount.toLocaleString(),
      statusMap[payout.status] || payout.status,
      payout.payment_date
        ? new Date(payout.payment_date).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : '-',
      payout.payment_method || '-'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Add BOM for proper Thai character encoding in Excel
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    const periodMap = {
      week: 'สัปดาห์นี้',
      month: 'เดือนนี้',
      year: 'ปีนี้'
    }

    link.setAttribute('href', url)
    link.setAttribute('download', `รายงานการจ่ายเงิน_${staff.name_th}_${periodMap[selectedPeriod]}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`ดาวน์โหลดรายงาน${periodMap[selectedPeriod]}สำเร็จ (${payoutHistory.length} รายการ)`)
  }

  // Format payout history for display
  const allPayoutHistory = payouts?.map((payout) => {
    const periodStart = new Date(payout.period_start)
    const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                       'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
    const periodText = `${monthNames[periodStart.getMonth()]} ${periodStart.getFullYear()}`

    // Map database status to display status
    const statusMap: Record<string, 'paid' | 'pending' | 'processing' | 'failed'> = {
      'completed': 'paid',
      'pending': 'pending',
      'processing': 'processing',
      'failed': 'failed'
    }

    return {
      id: payout.id,
      date: payout.period_end,
      period: periodText,
      amount: parseFloat(payout.net_amount),
      jobs_count: payout.total_jobs,
      status: statusMap[payout.status] || 'pending',
      payment_date: payout.transferred_at || null,
      payment_method: payout.status === 'completed' ? 'Bank Transfer' : null,
    }
  }) || []

  // Filter payout history based on selected period
  const payoutHistory = allPayoutHistory.filter((payout) => {
    const payoutDate = new Date(payout.date)
    const now = new Date()

    switch (selectedPeriod) {
      case 'week': {
        const weekAgo = new Date()
        weekAgo.setDate(now.getDate() - 7)
        return payoutDate >= weekAgo
      }
      case 'month': {
        const monthAgo = new Date()
        monthAgo.setMonth(now.getMonth() - 1)
        return payoutDate >= monthAgo
      }
      case 'year': {
        const yearAgo = new Date()
        yearAgo.setFullYear(now.getFullYear() - 1)
        return payoutDate >= yearAgo
      }
      default:
        return true
    }
  })

  // Bank account info state
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [isBankLoading, setIsBankLoading] = useState(true)

  // Fetch bank account data using admin's own supabase client
  useEffect(() => {
    const fetchBankAccount = async () => {
      if (!staff?.id) return

      setIsBankLoading(true)
      try {
        const { data: accounts, error } = await supabase
          .from('bank_accounts')
          .select('*')
          .eq('staff_id', staff.id)
          .order('is_primary', { ascending: false })

        if (error) throw error

        const primaryAccount = accounts?.find((a: BankAccount) => a.is_primary) || accounts?.[0]
        setBankAccount(primaryAccount || null)
      } catch (error) {
        console.error('Error fetching bank account:', error)
        setBankAccount(null)
      } finally {
        setIsBankLoading(false)
      }
    }

    fetchBankAccount()
  }, [staff?.id])

  const getStatusBadge = (status: 'paid' | 'pending' | 'processing' | 'failed') => {
    const badges = {
      paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'จ่ายแล้ว', icon: CheckCircle },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'รอดำเนินการ', icon: Clock },
      processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'กำลังดำเนินการ', icon: Clock },
      failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'ล้มเหลว', icon: XCircle },
    }
    const badge = badges[status]
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  // Show loading state
  if (isLoadingSummary || isLoadingPayouts) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
        <span className="ml-2 text-stone-500">กำลังโหลดข้อมูล...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-amber-900">
            ฿{(earningsSummary?.total_earnings || 0).toLocaleString()}
          </p>
          <p className="text-sm font-medium text-amber-700 mt-1">รายได้รวมทั้งหมด</p>
          <p className="text-xs text-amber-600 mt-1">Total Earnings</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-yellow-900">
            ฿{(earningsSummary?.pending_payout || 0).toLocaleString()}
          </p>
          <p className="text-sm font-medium text-yellow-700 mt-1">ยอดค้างจ่าย</p>
          <p className="text-xs text-yellow-600 mt-1">Pending Payout</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">
            ฿{(earningsSummary?.paid_this_month || 0).toLocaleString()}
          </p>
          <p className="text-sm font-medium text-green-700 mt-1">จ่ายเดือนนี้</p>
          <p className="text-xs text-green-600 mt-1">Paid This Month</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">
            ฿{(earningsSummary?.total_paid || 0).toLocaleString()}
          </p>
          <p className="text-sm font-medium text-blue-700 mt-1">จ่ายแล้วทั้งหมด</p>
          <p className="text-xs text-blue-600 mt-1">Total Paid</p>
        </div>
      </div>

      {/* Bank Information */}
      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-stone-900">ข้อมูลบัญชีธนาคาร</h3>
          {bankAccount && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBankModal(true)}
                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition text-sm flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                แก้ไข
              </button>
              <button
                onClick={() => setShowDeleteBankConfirm(true)}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                ลบ
              </button>
            </div>
          )}
        </div>
        {isBankLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
            <span className="ml-2 text-stone-500">กำลังโหลดข้อมูลบัญชี...</span>
          </div>
        ) : bankAccount ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-stone-500">ธนาคาร</p>
              <p className="font-medium text-stone-900">{bankAccount.bank_name}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">ชื่อบัญชี</p>
              <p className="font-medium text-stone-900">{bankAccount.account_name}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">เลขที่บัญชี</p>
              <p className="font-medium text-stone-900">{bankAccount.account_number}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-stone-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-stone-300" />
            <p className="text-sm mb-4">ยังไม่มีข้อมูลบัญชีธนาคาร</p>
            <button
              onClick={() => setShowAddBankModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              เพิ่มบัญชี
            </button>
          </div>
        )}
      </div>

      {/* Payout History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-stone-900">ประวัติการจ่ายเงิน</h3>
          <div className="flex items-center gap-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-3 py-2 bg-stone-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
            >
              <option value="week">สัปดาห์นี้</option>
              <option value="month">เดือนนี้</option>
              <option value="year">ปีนี้</option>
            </select>
            <button
              onClick={handleDownloadReport}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              ดาวน์โหลดรายงาน
            </button>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">วันที่</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ช่วงเวลา</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">จำนวนงาน</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">จำนวนเงิน</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">สถานะ</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">วันที่จ่าย</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">การกระทำ</th>
                </tr>
              </thead>
              <tbody>
                {payoutHistory.map((payout) => (
                  <tr key={payout.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 px-4 text-sm text-stone-900">
                      {new Date(payout.date).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-sm text-stone-900">{payout.period}</td>
                    <td className="py-3 px-4 text-sm text-stone-600">{payout.jobs_count} งาน</td>
                    <td className="py-3 px-4 text-sm font-medium text-amber-700">
                      ฿{payout.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(payout.status)}</td>
                    <td className="py-3 px-4 text-sm text-stone-600">
                      {payout.payment_date
                        ? new Date(payout.payment_date).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {payout.status === 'pending' && (
                          <button
                            onClick={() => {
                              setSelectedPayout(payout.id)
                              setShowPayoutModal(true)
                            }}
                            className="px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-xs"
                          >
                            ดำเนินการจ่าย
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedPayout(payout.id)
                            setShowPayoutDetailModal(true)
                          }}
                          className="p-1 hover:bg-stone-100 rounded transition"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4 text-stone-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 rounded-xl">
            <DollarSign className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-stone-900 mb-2">การจัดการการจ่ายเงิน</h3>
            <p className="text-sm text-stone-600 mb-4">
              ระบบจะคำนวณรายได้และจ่ายเงินให้พนักงานตามรอบที่กำหนด (รายสัปดาห์/รายเดือน)
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowCreatePayoutModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                สร้างรอบจ่ายเงิน
              </button>
              <button
                onClick={() => {
                  // Find first pending payout
                  const firstPending = payoutHistory.find(p => p.status === 'pending')
                  if (firstPending) {
                    setSelectedPayout(firstPending.id)
                    setShowPayoutModal(true)
                  } else {
                    toast.error('ไม่มีรายการรอดำเนินการในขณะนี้')
                  }
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm"
              >
                ดำเนินการจ่ายเงิน
              </button>
              <button
                onClick={() => setShowCalculationModal(true)}
                className="px-4 py-2 bg-white text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-50 transition text-sm"
              >
                ดูรายละเอียดการคำนวณ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payout Detail Modal */}
      {showPayoutDetailModal && selectedPayout && (
        <PayoutDetailModal
          payoutId={selectedPayout}
          onClose={() => {
            setShowPayoutDetailModal(false)
            setSelectedPayout(null)
          }}
        />
      )}

      {/* Process Payout Modal */}
      {showPayoutModal && (
        <ProcessPayoutModal
          payoutId={selectedPayout}
          staffId={staff.id}
          onClose={() => {
            setShowPayoutModal(false)
            setSelectedPayout(null)
          }}
        />
      )}

      {/* Calculation Modal */}
      {showCalculationModal && (
        <PayoutCalculationModal
          onClose={() => setShowCalculationModal(false)}
        />
      )}

      {/* Create Payout Modal */}
      {showCreatePayoutModal && (
        <CreatePayoutModal
          staffId={staff.id}
          staffName={staff.name_th || staff.name_en || ''}
          onClose={() => setShowCreatePayoutModal(false)}
        />
      )}

      {/* Edit Bank Modal */}
      {showBankModal && bankAccount && (
        <EditBankModal
          bankInfo={{
            bank_name: bankAccount.bank_name,
            account_name: bankAccount.account_name,
            account_number: bankAccount.account_number,
          }}
          onClose={() => setShowBankModal(false)}
          onSave={async (updatedInfo) => {
            try {
              // Update bank account in database
              const { error: updateError } = await supabase
                .from('bank_accounts')
                .update({
                  bank_name: updatedInfo.bank_name,
                  account_name: updatedInfo.account_name,
                  account_number: updatedInfo.account_number,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', bankAccount.id)

              if (updateError) throw updateError

              // Refresh bank account data after update
              const { data: accounts, error: fetchError } = await supabase
                .from('bank_accounts')
                .select('*')
                .eq('staff_id', staff.id)
                .order('is_primary', { ascending: false })

              if (fetchError) throw fetchError

              const primaryAccount = accounts?.find((a: BankAccount) => a.is_primary) || accounts?.[0]
              setBankAccount(primaryAccount || null)
              setShowBankModal(false)
              toast.success('อัปเดตข้อมูลบัญชีเรียบร้อย')
            } catch (error) {
              console.error('Error updating bank account:', error)
              toast.error('ไม่สามารถบันทึกข้อมูลบัญชีได้')
            }
          }}
        />
      )}

      {/* Delete Bank Account Confirm Modal */}
      {showDeleteBankConfirm && bankAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900 mb-2">ยืนยันการลบ</h3>
              <p className="text-sm text-stone-500 mb-6">
                ต้องการลบบัญชีธนาคาร {bankAccount.bank_name} ({bankAccount.account_number}) หรือไม่?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteBankConfirm(false)}
                  className="flex-1 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('bank_accounts')
                        .delete()
                        .eq('id', bankAccount.id)

                      if (error) throw error

                      setBankAccount(null)
                      setShowDeleteBankConfirm(false)
                      toast.success('ลบข้อมูลบัญชีธนาคารเรียบร้อย')
                    } catch (error) {
                      console.error('Error deleting bank account:', error)
                      toast.error('ไม่สามารถลบข้อมูลบัญชีได้')
                    }
                  }}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition"
                >
                  ลบ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Bank Account Modal */}
      {showAddBankModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg text-stone-900">เพิ่มบัญชีธนาคาร</h3>
              <button
                onClick={() => {
                  setShowAddBankModal(false)
                  setNewBankForm({ bank_code: '', account_number: '', account_name: '' })
                }}
                className="p-2 hover:bg-stone-100 rounded-lg transition"
              >
                <XCircle className="w-5 h-5 text-stone-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">ธนาคาร</label>
                <select
                  value={newBankForm.bank_code}
                  onChange={(e) => setNewBankForm({ ...newBankForm, bank_code: e.target.value })}
                  className="w-full px-3 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">เลือกธนาคาร</option>
                  {THAI_BANKS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">เลขที่บัญชี</label>
                <input
                  type="text"
                  value={newBankForm.account_number}
                  onChange={(e) => setNewBankForm({ ...newBankForm, account_number: e.target.value })}
                  placeholder="xxx-x-xxxxx-x"
                  className="w-full px-3 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">ชื่อบัญชี</label>
                <input
                  type="text"
                  value={newBankForm.account_name}
                  onChange={(e) => setNewBankForm({ ...newBankForm, account_name: e.target.value })}
                  placeholder="ชื่อ-นามสกุล ตามบัญชี"
                  className="w-full px-3 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={async () => {
                  const bank = THAI_BANKS.find((b) => b.code === newBankForm.bank_code)
                  if (!bank) {
                    toast.error('กรุณาเลือกธนาคาร')
                    return
                  }
                  if (!newBankForm.account_number.trim()) {
                    toast.error('กรุณากรอกเลขที่บัญชี')
                    return
                  }
                  if (!newBankForm.account_name.trim()) {
                    toast.error('กรุณากรอกชื่อบัญชี')
                    return
                  }

                  setIsAddingBank(true)
                  try {
                    const { data, error } = await supabase
                      .from('bank_accounts')
                      .insert({
                        staff_id: staff.id,
                        bank_code: newBankForm.bank_code,
                        bank_name: bank.name,
                        account_number: newBankForm.account_number,
                        account_name: newBankForm.account_name,
                        is_primary: true,
                        is_verified: false,
                      })
                      .select()
                      .single()

                    if (error) throw error

                    setBankAccount(data)
                    setShowAddBankModal(false)
                    setNewBankForm({ bank_code: '', account_number: '', account_name: '' })
                    toast.success('เพิ่มบัญชีธนาคารเรียบร้อย')
                  } catch (error) {
                    console.error('Error adding bank account:', error)
                    toast.error('ไม่สามารถเพิ่มบัญชีธนาคารได้')
                  } finally {
                    setIsAddingBank(false)
                  }
                }}
                disabled={isAddingBank}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isAddingBank ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'เพิ่มบัญชี'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffDetail
