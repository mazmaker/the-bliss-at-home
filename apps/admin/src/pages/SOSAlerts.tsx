import { useState } from 'react'
import { ShieldAlert, MapPin, Phone, Calendar, CheckCircle, XCircle, AlertTriangle, Filter } from 'lucide-react'
import { useSOSAlerts, useSOSAlertActions } from '../hooks/useCustomers'
import { SOSAlert } from '../lib/customerQueries'

function SOSAlerts() {
  const { alerts, loading, error, refetch } = useSOSAlerts()
  const { acknowledge, resolve, cancel, loading: actionLoading } = useSOSAlertActions()
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'acknowledged' | 'resolved'>('all')
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null)
  const [resolveNotes, setResolveNotes] = useState('')
  const [showResolveModal, setShowResolveModal] = useState(false)

  const filteredAlerts = alerts.filter((alert) => {
    if (statusFilter === 'all') return true
    return alert.status === statusFilter
  })

  const handleAcknowledge = async (alertId: string) => {
    try {
      // TODO: Get actual admin ID from auth context
      await acknowledge(alertId, 'admin-user-id')
      refetch()
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const handleResolve = async () => {
    if (!selectedAlert) return
    try {
      // TODO: Get actual admin ID from auth context
      await resolve(selectedAlert.id, 'admin-user-id', resolveNotes)
      setShowResolveModal(false)
      setResolveNotes('')
      setSelectedAlert(null)
      refetch()
    } catch (error) {
      console.error('Failed to resolve alert:', error)
    }
  }

  const handleCancel = async (alertId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการแจ้งเตือนนี้?')) return
    try {
      await cancel(alertId)
      refetch()
    } catch (error) {
      console.error('Failed to cancel alert:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-red-100 text-red-700 border-red-200',
      acknowledged: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      resolved: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
    } as const
    const labels = {
      pending: 'รอดำเนินการ',
      acknowledged: 'รับทราบแล้ว',
      resolved: 'แก้ไขแล้ว',
      cancelled: 'ยกเลิก',
    } as const
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-blue-100 text-blue-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    } as const
    const labels = {
      low: 'ต่ำ',
      medium: 'ปานกลาง',
      high: 'สูง',
      critical: 'วิกฤต',
    } as const
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[priority as keyof typeof styles]}`}>
        {labels[priority as keyof typeof labels]}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4" />
          <p className="text-stone-600">กำลังโหลดการแจ้งเตือน SOS...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-red-800">เกิดข้อผิดพลาด: {error}</p>
      </div>
    )
  }

  const pendingCount = alerts.filter((a) => a.status === 'pending').length
  const acknowledgedCount = alerts.filter((a) => a.status === 'acknowledged').length
  const resolvedCount = alerts.filter((a) => a.status === 'resolved').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-red-600" />
            แจ้งเตือน SOS
          </h1>
          <p className="text-stone-500">Emergency Alerts from Customers</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-stone-900">{alerts.length}</p>
          <p className="text-xs text-stone-500">การแจ้งเตือนทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-red-100">
          <p className="text-2xl font-bold text-red-600">{pendingCount}</p>
          <p className="text-xs text-stone-500">รอดำเนินการ</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-yellow-100">
          <p className="text-2xl font-bold text-yellow-600">{acknowledgedCount}</p>
          <p className="text-xs text-stone-500">รับทราบแล้ว</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-green-100">
          <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
          <p className="text-xs text-stone-500">แก้ไขแล้ว</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-stone-100">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-stone-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-red-500"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="acknowledged">รับทราบแล้ว</option>
            <option value="resolved">แก้ไขแล้ว</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-stone-100">
          <ShieldAlert className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-600">ไม่มีการแจ้งเตือน SOS</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-2xl shadow-lg p-6 border ${
                alert.status === 'pending'
                  ? 'border-red-200'
                  : alert.status === 'acknowledged'
                  ? 'border-yellow-200'
                  : 'border-stone-100'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Alert Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-stone-900 text-lg">
                          {alert.customer_name || 'ลูกค้าไม่ระบุชื่อ'}
                        </h3>
                        {getStatusBadge(alert.status)}
                        {getPriorityBadge(alert.priority)}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-stone-600">
                        {alert.customer_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{alert.customer_phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(alert.created_at).toLocaleString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {alert.latitude && alert.longitude && (
                          <div className="flex items-center gap-2 col-span-2">
                            <MapPin className="w-4 h-4" />
                            <a
                              href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              ดูตำแหน่งบน Google Maps ({alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)})
                            </a>
                          </div>
                        )}
                      </div>
                      {alert.message && (
                        <div className="mt-3 p-3 bg-stone-50 rounded-lg">
                          <p className="text-sm text-stone-700">{alert.message}</p>
                        </div>
                      )}
                      {alert.resolution_notes && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-xs text-green-700 font-medium mb-1">บันทึกการแก้ไข:</p>
                          <p className="text-sm text-green-800">{alert.resolution_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 min-w-[180px]">
                  {alert.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        รับทราบ
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAlert(alert)
                          setShowResolveModal(true)
                        }}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        แก้ไขเสร็จสิ้น
                      </button>
                      <button
                        onClick={() => handleCancel(alert.id)}
                        disabled={actionLoading}
                        className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        ยกเลิก
                      </button>
                    </>
                  )}
                  {alert.status === 'acknowledged' && (
                    <button
                      onClick={() => {
                        setSelectedAlert(alert)
                        setShowResolveModal(true)
                      }}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      แก้ไขเสร็จสิ้น
                    </button>
                  )}
                  {(alert.status === 'resolved' || alert.status === 'cancelled') && (
                    <div className="text-center py-2 text-sm text-stone-500">
                      {alert.status === 'resolved' ? 'แก้ไขเรียบร้อย' : 'ถูกยกเลิก'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-stone-900 mb-4">แก้ไขการแจ้งเตือน SOS</h3>
            <p className="text-sm text-stone-600 mb-4">
              กรุณาบันทึกรายละเอียดการแก้ไขปัญหาสำหรับลูกค้า{' '}
              <strong>{selectedAlert.customer_name}</strong>
            </p>
            <textarea
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent mb-4"
              placeholder="กรอกรายละเอียดการแก้ไข..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResolveModal(false)
                  setResolveNotes('')
                  setSelectedAlert(null)
                }}
                className="flex-1 px-4 py-2 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-50 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolveNotes.trim() || actionLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-50"
              >
                {actionLoading ? 'กำลังบันทึก...' : 'บันทึกและแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SOSAlerts
