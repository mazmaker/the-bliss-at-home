import { ArrowLeft, ArrowRight } from 'lucide-react'

interface Props {
  service: any
  bookingDate: string
  bookingTime: string
  duration: number
  selectedStaff?: any
  onStaffSelect: (staff: any) => void
  onNext?: () => void
  onBack: () => void
}

export default function StaffAssignment({
  service,
  bookingDate,
  bookingTime,
  duration,
  selectedStaff,
  onStaffSelect,
  onNext,
  onBack
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">มอบหมายพนักงาน</h2>
        <p className="text-gray-600">เลือกพนักงานสำหรับบริการ {service?.name_th}</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">🚧 Staff Assignment - กำลังพัฒนา</p>
        <p className="text-yellow-600 text-sm mt-1">
          ส่วนนี้จะมี: แสดงพนักงานที่ว่าง, Auto-assignment, Manual selection
        </p>
      </div>

      {/* Temporary mock selection */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <button
          onClick={() => {
            // Mock staff data
            const mockStaff = {
              id: 'mock-staff-1',
              profile: {
                full_name: 'พนักงาน Mock',
                avatar_url: null
              },
              rating: 4.5,
              status: 'active'
            }

            onStaffSelect(mockStaff)
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          เลือกพนักงาน Mock (ชั่วคราว)
        </button>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับ
        </button>

        {selectedStaff && onNext && (
          <button
            onClick={onNext}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            ถัดไป: บันทึกการชำระเงิน
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}