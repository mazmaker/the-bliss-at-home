import { useState } from 'react'
import { RefreshCw, Navigation } from 'lucide-react'
import BookingList from '../components/BookingList'

export default function StaffTrackingDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    // The BookingList component will handle its own refresh
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* GPS Tracking Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 sticky top-0 z-20 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">การติดตาม GPS</h1>
              <p className="text-sm opacity-90">จัดการเดินทางไปหาลูกค้า</p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* GPS Info */}
        <div className="mt-4 bg-white/10 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-4 text-center text-sm">
            <div>
              <div className="font-semibold">ฟรี 100%</div>
              <div className="opacity-90">ไม่มีค่าใช้จ่าย</div>
            </div>
            <div>
              <div className="font-semibold">Real-time</div>
              <div className="opacity-90">ลูกค้าดูได้สด</div>
            </div>
          </div>
        </div>
      </div>

      {/* Important Warning */}
      <div className="p-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">!</span>
            </div>
            <div>
              <h3 className="font-bold text-red-800 mb-2">ข้อสำคัญเพื่อการติดตาม GPS</h3>
              <ul className="space-y-1 text-sm text-red-700">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>ห้ามปิดแอป</strong> หรือเปลี่ยนหน้าอื่น</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>ห้ามล็อคหน้าจอ</strong> ขณะติดตาม</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>เสียบชาร์จ</strong> ป้องกันแบตหมด</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>เปิดแอปอื่น = หยุดติดตาม</strong></span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* How GPS Works */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-bold text-blue-800 mb-3">วิธีการทำงาน GPS ฟรี</h3>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold text-xs">1</span>
              </div>
              <div>
                <div className="font-medium text-blue-800">กด "เริ่มเดินทาง"</div>
                <div className="text-blue-600">เริ่มติดตาม GPS อัตโนมัติ</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-xs">2</span>
              </div>
              <div>
                <div className="font-medium text-blue-800">ลูกค้าเห็นตำแหน่ง</div>
                <div className="text-blue-600">อัพเดททุก 10 วินาที</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold text-xs">3</span>
              </div>
              <div>
                <div className="font-medium text-blue-800">กด "มาถึงแล้ว"</div>
                <div className="text-blue-600">หยุดติดตาม เริ่มงาน</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking List with GPS Tracking */}
      <BookingList />
    </div>
  )
}