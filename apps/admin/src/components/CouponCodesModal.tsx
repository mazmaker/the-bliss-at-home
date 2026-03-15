import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  X,
  Plus,
  Copy,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Tag,
  Calendar,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react'

interface CouponCode {
  id: string
  promotion_id: string
  code: string
  usage_limit: number
  usage_count: number
  is_active: boolean
  expires_at?: string
  created_at: string
}

interface CouponCodesModalProps {
  isOpen: boolean
  onClose: () => void
  promotionId: string
  promotionName: string
  promotionCode: string
}

export function CouponCodesModal({ isOpen, onClose, promotionId, promotionName, promotionCode }: CouponCodesModalProps) {
  const [coupons, setCoupons] = useState<CouponCode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [newCouponCount, setNewCouponCount] = useState(5)
  const [showAddForm, setShowAddForm] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [manualUsageLimit, setManualUsageLimit] = useState(1)
  const [manualExpiresAt, setManualExpiresAt] = useState('')

  useEffect(() => {
    if (isOpen && promotionId) {
      fetchCoupons()
    }
  }, [isOpen, promotionId])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const fetchCoupons = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('coupon_codes')
        .select('*')
        .eq('promotion_id', promotionId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCoupons(data || [])
    } catch (err) {
      console.error('Error fetching coupons:', err)
      setError('ไม่สามารถโหลดข้อมูลคูปองได้')
    } finally {
      setIsLoading(false)
    }
  }

  const generateCoupons = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.rpc('create_coupon_codes_for_promotion', {
        promotion_id_param: promotionId,
        count: newCouponCount
      })

      if (error) throw error

      setSuccessMessage(`สร้างคูปอง ${newCouponCount} รหัสเรียบร้อยแล้ว`)
      fetchCoupons()
    } catch (err) {
      console.error('Error generating coupons:', err)
      setError('ไม่สามารถสร้างคูปองได้')
    } finally {
      setIsLoading(false)
    }
  }

  const createManualCoupon = async () => {
    if (!manualCode.trim()) {
      setError('กรุณากรอกรหัสคูปอง')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('coupon_codes')
        .insert({
          promotion_id: promotionId,
          code: manualCode.toUpperCase(),
          usage_limit: manualUsageLimit,
          expires_at: manualExpiresAt ? new Date(manualExpiresAt).toISOString() : null
        })

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('รหัสคูปองนี้มีอยู่แล้ว')
        }
        throw error
      }

      setSuccessMessage('สร้างคูปองเรียบร้อยแล้ว')
      setManualCode('')
      setManualUsageLimit(1)
      setManualExpiresAt('')
      setShowAddForm(false)
      fetchCoupons()
    } catch (err: any) {
      console.error('Error creating manual coupon:', err)
      setError(err.message || 'ไม่สามารถสร้างคูปองได้')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleCouponStatus = async (coupon: CouponCode) => {
    try {
      const { error } = await supabase
        .from('coupon_codes')
        .update({ is_active: !coupon.is_active })
        .eq('id', coupon.id)

      if (error) throw error

      setSuccessMessage(`${coupon.is_active ? 'ปิด' : 'เปิด'}ใช้งานคูปองเรียบร้อยแล้ว`)
      fetchCoupons()
    } catch (err) {
      console.error('Error toggling coupon status:', err)
      setError('ไม่สามารถเปลี่ยนสถานะคูปองได้')
    }
  }

  const deleteCoupon = async (couponId: string) => {
    if (!confirm('ยืนยันการลบคูปองนี้?')) return

    try {
      const { error } = await supabase
        .from('coupon_codes')
        .delete()
        .eq('id', couponId)

      if (error) throw error

      setSuccessMessage('ลบคูปองเรียบร้อยแล้ว')
      fetchCoupons()
    } catch (err) {
      console.error('Error deleting coupon:', err)
      setError('ไม่สามารถลบคูปองได้')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccessMessage('คัดลอกรหัสแล้ว')
  }

  const copyAllCodes = () => {
    const activeCodes = coupons
      .filter(c => c.is_active)
      .map(c => c.code)
      .join('\n')

    navigator.clipboard.writeText(activeCodes)
    setSuccessMessage(`คัดลอกรหัสทั้งหมด ${activeCodes.split('\n').length} รหัส`)
  }

  const getStatusColor = (coupon: CouponCode) => {
    const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date()
    const isUsedUp = coupon.usage_count >= coupon.usage_limit

    if (isExpired) return 'bg-red-100 text-red-700'
    if (isUsedUp) return 'bg-gray-100 text-gray-700'
    if (!coupon.is_active) return 'bg-orange-100 text-orange-700'
    return 'bg-green-100 text-green-700'
  }

  const getStatusText = (coupon: CouponCode) => {
    const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date()
    const isUsedUp = coupon.usage_count >= coupon.usage_limit

    if (isExpired) return 'หมดอายุ'
    if (isUsedUp) return 'ใช้หมดแล้ว'
    if (!coupon.is_active) return 'ระงับ'
    return 'ใช้งานได้'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div>
            <h2 className="text-xl font-bold text-stone-900">จัดการคูปอง</h2>
            <p className="text-sm text-stone-500 mt-1">
              โปรโมชั่น: {promotionName} ({promotionCode})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <p className="text-sm">{successMessage}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-amber-700">สร้างคูปองอัตโนมัติ:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newCouponCount}
                  onChange={(e) => setNewCouponCount(parseInt(e.target.value) || 5)}
                  className="w-20 px-2 py-1 border border-amber-300 rounded text-sm"
                />
                <span className="text-sm text-amber-600">รหัส</span>
              </div>
              <button
                onClick={generateCoupons}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                สร้าง
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Tag className="w-4 h-4" />
                สร้างคูปองเอง
              </button>

              {coupons.length > 0 && (
                <button
                  onClick={copyAllCodes}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  <Copy className="w-4 h-4" />
                  คัดลอกทั้งหมด
                </button>
              )}
            </div>
          </div>

          {/* Manual Coupon Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800 mb-3">สร้างคูปองเอง</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">รหัสคูปอง *</label>
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="SPECIAL20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">จำนวนครั้งใช้งาน</label>
                  <input
                    type="number"
                    min="1"
                    value={manualUsageLimit}
                    onChange={(e) => setManualUsageLimit(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">วันหมดอายุ (เลือกได้)</label>
                  <input
                    type="date"
                    value={manualExpiresAt}
                    onChange={(e) => setManualExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-blue-600 hover:text-blue-800"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={createManualCoupon}
                  disabled={isLoading || !manualCode.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <Plus className="w-4 h-4" />
                  สร้าง
                </button>
              </div>
            </div>
          )}

          {/* Coupons List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-900">คูปองทั้งหมด ({coupons.length} รหัส)</h3>
              <button
                onClick={fetchCoupons}
                disabled={isLoading}
                className="p-2 text-stone-600 hover:text-stone-800 rounded-lg transition"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {coupons.length === 0 ? (
              <div className="text-center py-12 text-stone-500">
                <Tag className="w-12 h-12 mx-auto mb-4 text-stone-400" />
                <p className="text-lg font-medium mb-2">ยังไม่มีคูปอง</p>
                <p className="text-sm">เริ่มต้นด้วยการสร้างคูปองอัตโนมัติหรือสร้างเอง</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="bg-stone-50 border border-stone-200 rounded-xl p-4"
                  >
                    {/* Code Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-mono font-bold text-lg text-stone-900">
                        {coupon.code}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(coupon)}`}>
                        {getStatusText(coupon)}
                      </div>
                    </div>

                    {/* Usage Stats */}
                    <div className="mb-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-600">การใช้งาน:</span>
                        <span className="font-medium">{coupon.usage_count}/{coupon.usage_limit}</span>
                      </div>
                      {coupon.usage_limit > 1 && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min((coupon.usage_count / coupon.usage_limit) * 100, 100)}%`
                            }}
                          ></div>
                        </div>
                      )}
                      {coupon.expires_at && (
                        <div className="text-xs text-stone-500">
                          หมดอายุ: {new Date(coupon.expires_at).toLocaleDateString('th-TH')}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(coupon.code)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition"
                      >
                        <Copy className="w-3 h-3" />
                        คัดลอก
                      </button>

                      <button
                        onClick={() => toggleCouponStatus(coupon)}
                        className={`flex items-center justify-center px-3 py-2 text-sm rounded-lg transition ${
                          coupon.is_active
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {coupon.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>

                      <button
                        onClick={() => deleteCoupon(coupon.id)}
                        className="flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition"
                        disabled={coupon.usage_count > 0}
                        title={coupon.usage_count > 0 ? 'ไม่สามารถลบคูปองที่มีการใช้งานแล้ว' : 'ลบคูปอง'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end mt-6 pt-4 border-t border-stone-200">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-stone-600 text-white rounded-xl font-medium hover:bg-stone-700 transition"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}