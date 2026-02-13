import { useState, useEffect } from 'react'
import {
  X,
  Copy,
  QrCode,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { staffService, InviteLinkData } from '../services/staffService'

interface InviteLinkModalProps {
  isOpen: boolean
  onClose: () => void
  staffId: string
  staffName: string
}

export default function InviteLinkModal({ isOpen, onClose, staffId, staffName }: InviteLinkModalProps) {
  const [inviteData, setInviteData] = useState<InviteLinkData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch invite data when modal opens
  useEffect(() => {
    if (isOpen && staffId) {
      fetchInviteData()
    }
    return () => {
      setInviteData(null)
      setError(null)
      setCopied(false)
    }
  }, [isOpen, staffId])

  async function fetchInviteData() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await staffService.getInviteLink(staffId)
      if (data) {
        setInviteData(data)
      } else {
        // No invite token exists yet — generate one
        await handleRegenerate()
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลคำเชิญได้')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRegenerate() {
    setIsRegenerating(true)
    setError(null)
    try {
      const data = await staffService.regenerateInvite(staffId)
      setInviteData(data)
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถสร้างลิงก์ใหม่ได้')
    } finally {
      setIsRegenerating(false)
    }
  }

  async function copyInviteLink() {
    if (!inviteData) return
    try {
      await navigator.clipboard.writeText(inviteData.inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = inviteData.inviteLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function formatExpiryDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-stone-900">ลิงก์คำเชิญ</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Staff Info */}
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-700 to-amber-800 rounded-full flex items-center justify-center text-white font-semibold text-lg mx-auto mb-2">
              {staffName.charAt(0)}
            </div>
            <p className="font-medium text-stone-900">{staffName}</p>
            <p className="text-sm text-stone-500">ส่งลิงก์นี้ให้พนักงานเพื่อลงทะเบียนเข้าระบบ</p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-4">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
              <p className="text-sm text-stone-500">กำลังโหลด...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Invite Data */}
          {inviteData && !isLoading && (
            <>
              {/* Expiry Warning */}
              {inviteData.isExpired ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">ลิงก์หมดอายุแล้ว</p>
                    <p className="text-xs text-red-600 mt-1">กดปุ่มด้านล่างเพื่อสร้างลิงก์ใหม่</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">ลิงก์ใช้งานได้</p>
                    {inviteData.expiresAt && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        หมดอายุ: {formatExpiryDate(inviteData.expiresAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* QR Code */}
              {!inviteData.isExpired && (
                <div className="text-center">
                  <div className="bg-white border border-stone-200 rounded-xl p-4 inline-block">
                    <img
                      src={inviteData.qrCode}
                      alt="QR Code for LINE invitation"
                      className="w-48 h-48 mx-auto"
                    />
                    <p className="text-xs text-stone-500 mt-2">สแกนเพื่อเข้าสู่ระบบ</p>
                  </div>
                </div>
              )}

              {/* Invite Link */}
              {!inviteData.isExpired && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Invitation Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inviteData.inviteLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={copyInviteLink}
                      className={`px-4 py-2 rounded-lg transition flex items-center gap-1 ${
                        copied
                          ? 'bg-green-600 text-white'
                          : 'bg-stone-600 text-white hover:bg-stone-700'
                      }`}
                      title="คัดลอกลิงก์"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs">copied</span>
                        </>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Regenerate Button */}
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-amber-300 text-amber-700 bg-amber-50 rounded-xl font-medium hover:bg-amber-100 transition disabled:opacity-50"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังสร้างลิงก์ใหม่...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    {inviteData.isExpired ? 'สร้างลิงก์ใหม่' : 'สร้างลิงก์ใหม่ (รีเซ็ตวันหมดอายุ)'}
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}
